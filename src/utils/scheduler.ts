import { Doctor, DayAssignment, MonthlyRoster, HolidayInfo } from '../types';
import { getHolidayForDate } from '../data/holidays';

export interface SchedulerOptions {
  year: number;
  month: number; // 1-12
  doctors: Doctor[];
  customHolidays?: HolidayInfo[];
  poliklinikCount?: number;
  servisCount?: number;
  konsultanCount?: number;
  nobetciCount?: number;
  weekendHasDayRoles?: boolean;
  previousMonthLastDutyDoctorIds?: string[];
  doctorConfigs?: Record<string, import('../types').MonthlyDoctorConfig>;
  fixedDutyAssignments?: Record<string, { kidemliId?: string; kidemsizId?: string }>;
}

export interface ScheduleResult {
  days: DayAssignment[];
  warnings: string[];
  success: boolean;
  fairnessReport: {
    doctorId: string;
    doctorName: string;
    seniority: 'kidemli' | 'kidemsiz';
    assignedTotal: number;
    targetTotal: number;
    assignedWeekend: number;
    targetWeekend: number;
    assignedHoliday: number;
    historicalHolidays: number;
    status: 'perfect' | 'warning' | 'deficit';
  }[];
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatDateStr(year: number, month: number, day: number): string {
  const m = month < 10 ? `0${month}` : `${month}`;
  const d = day < 10 ? `0${day}` : `${day}`;
  return `${year}-${m}-${d}`;
}

export function generateSchedule(options: SchedulerOptions): ScheduleResult {
  const {
    year,
    month,
    doctors: rawDoctors,
    customHolidays = [],
    poliklinikCount = 2,
    servisCount = 1,
    konsultanCount = 1,
    weekendHasDayRoles = false,
    previousMonthLastDutyDoctorIds = [],
    doctorConfigs,
    fixedDutyAssignments,
  } = options;

  // Merge monthly configurations if provided
  const doctors = rawDoctors.map(doc => {
    const cfg = doctorConfigs?.[doc.id];
    if (!cfg) return doc;
    return {
      ...doc,
      primaryDuty: cfg.primaryDuty ?? (doc.isOnlyAmeliyathane ? 'ameliyathane' : doc.primaryDuty),
      compensationDuties: doc.isOnlyAmeliyathane ? [] : (cfg.compensationDuties ?? doc.compensationDuties),
      unavailableDates: cfg.unavailableDates ?? doc.unavailableDates,
      preferredDates: cfg.preferredDates ?? doc.preferredDates,
      preferredJuniorIds: cfg.preferredJuniorIds ?? doc.preferredJuniorIds,
    };
  });

  const warnings: string[] = [];
  const daysInMonth = getDaysInMonth(year, month);
  const activeDoctors = doctors.filter(d => (d.targetTotalShifts || 0) > 0);

  if (activeDoctors.length === 0) {
    const blankDays: DayAssignment[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateStr(year, month, day);
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      blankDays.push({
        date: dateStr,
        dayOfWeek,
        isWeekend,
        isHoliday: false,
        nobetciIds: [],
        poliklinikIds: [],
        servisIds: [],
        konsultanIds: [],
        urodinamiIds: [],
        ameliyathaneIds: [],
        dinlenmeIds: [],
        izinliIds: [],
      });
    }
    return {
      days: blankDays,
      warnings: [],
      success: true,
      fairnessReport: []
    };
  }

  // Doctor tracking stats
  const doctorStats = new Map<string, {
    total: number;
    weekend: number;
    holiday: number;
    clinicDays: number;
    serviceDays: number;
    consultantDays: number;
    urodinamiDays: number;
    ameliyathaneDays: number;
    lastDutyDay: number;
  }>();

  doctors.forEach(d => {
    doctorStats.set(d.id, {
      total: 0,
      weekend: 0,
      holiday: 0,
      clinicDays: 0,
      serviceDays: 0,
      consultantDays: 0,
      urodinamiDays: 0,
      ameliyathaneDays: 0,
      lastDutyDay: previousMonthLastDutyDoctorIds.includes(d.id) ? 0 : -99,
    });
  });

  // Check seniority pools
  const kidemliDoctors = activeDoctors.filter(d => d.seniority === 'kidemli');
  const kidemsizDoctors = activeDoctors.filter(d => d.seniority === 'kidemsiz');
  const hasDualPool = kidemliDoctors.length > 0 && kidemsizDoctors.length > 0;

  // Step 1: Pre-build empty day objects with calendar metadata
  const days: DayAssignment[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateStr(year, month, day);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0: Pazar, 1: Pazartesi ... 6: Cumartesi
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const holiday = getHolidayForDate(dateStr, customHolidays);
    const isHoliday = !!holiday;
    const isWeekendLike = isWeekend || isHoliday;

    days.push({
      date: dateStr,
      dayOfWeek,
      isWeekend,
      isHoliday,
      holidayName: holiday?.name,
      isHalfDayHoliday: holiday?.isHalfDay,
      isBridgeHoliday: holiday?.isBridgeHoliday,
      isWeekendLike,
      kidemliNobetciId: undefined,
      kidemsizNobetciId: undefined,
      nobetciIds: [],
      poliklinikIds: [],
      servisIds: [],
      konsultanIds: [],
      urodinamiIds: [],
      ameliyathaneIds: [],
      dinlenmeIds: [],
      izinliIds: [],
    });
  }

  // If doctors worked last day of previous month, mark them as resting on day 1
  if (days.length > 0 && previousMonthLastDutyDoctorIds.length > 0) {
    previousMonthLastDutyDoctorIds.forEach(id => {
      if (!days[0].dinlenmeIds.includes(id)) {
        days[0].dinlenmeIds.push(id);
      }
    });
  }

  // Mark unavailable dates as 'izinli'
  days.forEach(d => {
    doctors.forEach(doc => {
      if (doc.unavailableDates?.includes(d.date) && !d.izinliIds.includes(doc.id)) {
        d.izinliIds.push(doc.id);
      }
    });
  });

  // Day priority: Holidays -> Weekends -> Weekdays
  const dayIndicesByPriority: number[] = [];
  days.forEach((d, idx) => {
    if (d.isHoliday) dayIndicesByPriority.push(idx);
  });
  days.forEach((d, idx) => {
    if (d.isWeekend && !dayIndicesByPriority.includes(idx)) {
      dayIndicesByPriority.push(idx);
    }
  });
  days.forEach((_, idx) => {
    if (!dayIndicesByPriority.includes(idx)) {
      dayIndicesByPriority.push(idx);
    }
  });

  // Helper score function to pick the best doctor for a given slot
  const scoreCandidate = (
    doc: Doctor,
    dayIdx: number,
    isWeekendLike: boolean,
    isHoliday: boolean,
    dateStr: string,
    pairedSenior?: Doctor | null
  ) => {
    const stats = doctorStats.get(doc.id)!;
    let score = 0;

    // 1. Kıdemlinin kıdemsiz seçme hakkı (Tercih edilen kıdemsize +90 bonus)
    if (pairedSenior && pairedSenior.preferredJuniorIds?.includes(doc.id)) {
      score += 90;
    }

    // Remaining total shifts needed
    const remainingTotal = doc.targetTotalShifts - stats.total;

    // Remaining weekend/holiday shifts needed (Hafta sonu ve tatil kotası adaleti)
    if (isWeekendLike) {
      const remainingWeekend = doc.targetWeekendShifts - stats.weekend;
      if (remainingWeekend > 0) {
        score += remainingWeekend * 160;
      } else {
        // Hafta sonu / tatil kotasını dolduran hekime ağır ceza
        score -= (stats.weekend - doc.targetWeekendShifts + 1) * 350;
      }
      // Toplam kota sadece küçük bir eşitlik bozucu olarak eklenir
      score += remainingTotal * 10;
    } else {
      if (remainingTotal > 0) {
        score += remainingTotal * 40;
      } else {
        score -= (stats.total - doc.targetTotalShifts + 1) * 200;
      }
    }

    // Holiday fair rotation
    if (isHoliday) {
      const histHoliday = doc.historicalHolidays || 0;
      score += (10 - Math.min(10, histHoliday)) * 30;
      if (doc.lastHolidayWorkedDate) {
        const monthsSince = (new Date(dateStr).getTime() - new Date(doc.lastHolidayWorkedDate).getTime()) / (1000 * 3600 * 24 * 30);
        score += Math.min(20, monthsSince) * 2;
      } else {
        score += 50; // Never had holiday duty before!
      }
    }

    // Preferred date bonus
    if (doc.preferredDates?.includes(dateStr)) {
      score += 45;
    }

    // Historical balance (+ balance means they worked extra in previous months, so slightly deprioritize)
    score -= (doc.shiftBalance || 0) * 8;
    if (isWeekendLike) {
      score -= (doc.weekendBalance || 0) * 12;
    }

    // Spacing between shifts
    const lastDay = stats.lastDutyDay;
    if (lastDay > 0) {
      const gap = Math.abs(dayIdx + 1 - lastDay);
      if (gap < 2) score -= 100; // Heavily penalize 1-day gap
      else if (gap < 3) score -= 40;
      else score += Math.min(gap * 2, 20);
    }

    return score;
  };

  // Helper to pick doctor from a pool
  const pickDoctorFromPool = (
    pool: Doctor[],
    dayIdx: number,
    isWeekendLike: boolean,
    isHoliday: boolean,
    dateStr: string,
    alreadyAssignedIds: string[],
    pairedSenior?: Doctor | null
  ): Doctor | null => {
    const candidates = pool.filter(doc => {
      if (alreadyAssignedIds.includes(doc.id)) return false;
      if (doc.unavailableDates?.includes(dateStr)) return false;

      // CONSECUTIVE NIGHT SHIFT FORBIDDEN
      if (dayIdx === 0 && previousMonthLastDutyDoctorIds.includes(doc.id)) return false;
      if (dayIdx > 0 && days[dayIdx - 1].nobetciIds.includes(doc.id)) return false;
      if (dayIdx < daysInMonth - 1 && days[dayIdx + 1].nobetciIds.includes(doc.id)) return false;

      return true;
    });

    if (candidates.length === 0) {
      // Fallback: relax spacing, but maintain no-same-day
      const fallback = pool.filter(doc => !alreadyAssignedIds.includes(doc.id) && !doc.unavailableDates?.includes(dateStr));
      if (fallback.length > 0) {
        fallback.sort((a, b) => scoreCandidate(b, dayIdx, isWeekendLike, isHoliday, dateStr, pairedSenior) - scoreCandidate(a, dayIdx, isWeekendLike, isHoliday, dateStr, pairedSenior));
        return fallback[0];
      }
      return null;
    }

    // 1. ÖNCELİK: Nöbet sayılarının doğruluğu ve kotaların tam tutturulması
    let eligible = candidates;
    if (isWeekendLike) {
      // Hafta sonu ve resmi tatil günlerinde hem hafta sonu kotasını hem toplam kotasını aşmamış olanlar birinci önceliktir
      const needBoth = candidates.filter(doc => {
        const st = doctorStats.get(doc.id)!;
        return st.weekend < doc.targetWeekendShifts && st.total < doc.targetTotalShifts;
      });
      if (needBoth.length > 0) {
        eligible = needBoth;
      } else {
        // En azından hafta sonu kotası dolmamış olanlar
        const needWeekend = candidates.filter(doc => {
          const st = doctorStats.get(doc.id)!;
          return st.weekend < doc.targetWeekendShifts;
        });
        if (needWeekend.length > 0) {
          eligible = needWeekend;
        } else {
          // Hafta sonu dolmuşsa dahi toplam kotası dolmamış olanlar
          const needTotal = candidates.filter(doc => {
            const st = doctorStats.get(doc.id)!;
            return st.total < doc.targetTotalShifts;
          });
          if (needTotal.length > 0) {
            eligible = needTotal;
          }
        }
      }
    } else {
      // Hafta içi günlerinde henüz toplam kotasını doldurmamış hekimlere kesin öncelik verilir
      const needTotal = candidates.filter(doc => {
        const st = doctorStats.get(doc.id)!;
        return st.total < doc.targetTotalShifts;
      });
      if (needTotal.length > 0) {
        eligible = needTotal;
      }
    }

    eligible.sort((a, b) => {
      const scoreA = scoreCandidate(a, dayIdx, isWeekendLike, isHoliday, dateStr, pairedSenior);
      const scoreB = scoreCandidate(b, dayIdx, isWeekendLike, isHoliday, dateStr, pairedSenior);
      return scoreB - scoreA;
    });

    return eligible[0];
  };

  // STEP 1.5: APPLY FIXED DUTY ASSIGNMENTS (e.g. 28 Ekim Arife & 29 Ekim Bayramı)
  if (fixedDutyAssignments) {
    Object.entries(fixedDutyAssignments).forEach(([dateStr, duty]) => {
      const dayIdx = days.findIndex(d => d.date === dateStr);
      if (dayIdx === -1) return;
      const dayData = days[dayIdx];
      const isWeekendLike = dayData.isWeekend || dayData.isHoliday;
      const isHoliday = dayData.isHoliday;

      if (duty.kidemliId) {
        dayData.kidemliNobetciId = duty.kidemliId;
        if (!dayData.nobetciIds.includes(duty.kidemliId)) {
          dayData.nobetciIds.push(duty.kidemliId);
        }
        const st = doctorStats.get(duty.kidemliId);
        if (st) {
          st.total += 1;
          if (isWeekendLike) st.weekend += 1;
          if (isHoliday) st.holiday += 1;
          st.lastDutyDay = dayIdx + 1;
        }
        // Next day rest
        if (dayIdx < daysInMonth - 1) {
          if (!days[dayIdx + 1].dinlenmeIds.includes(duty.kidemliId)) {
            days[dayIdx + 1].dinlenmeIds.push(duty.kidemliId);
          }
        }
      }

      if (duty.kidemsizId) {
        dayData.kidemsizNobetciId = duty.kidemsizId;
        if (!dayData.nobetciIds.includes(duty.kidemsizId)) {
          dayData.nobetciIds.push(duty.kidemsizId);
        }
        const st = doctorStats.get(duty.kidemsizId);
        if (st) {
          st.total += 1;
          if (isWeekendLike) st.weekend += 1;
          if (isHoliday) st.holiday += 1;
          st.lastDutyDay = dayIdx + 1;
        }
        // Next day rest
        if (dayIdx < daysInMonth - 1) {
          if (!days[dayIdx + 1].dinlenmeIds.includes(duty.kidemsizId)) {
            days[dayIdx + 1].dinlenmeIds.push(duty.kidemsizId);
          }
        }
      }
    });
  }

  // STEP 2: ASSIGN KIDEMLİ & KIDEMSİZ NÖBETÇİLER
  for (const dayIdx of dayIndicesByPriority) {
    const dayData = days[dayIdx];
    const isWeekend = dayData.isWeekend;
    const isHoliday = dayData.isHoliday;
    const isWeekendLike = isWeekend || isHoliday;
    const dateStr = dayData.date;

    // If both slots were pre-assigned, skip
    if (dayData.kidemliNobetciId && dayData.kidemsizNobetciId) {
      continue;
    }

    if (hasDualPool) {
      // 1. KIDEMLİ NÖBETÇİ
      let chosenKidemli: Doctor | null = null;
      if (dayData.kidemliNobetciId) {
        chosenKidemli = kidemliDoctors.find(d => d.id === dayData.kidemliNobetciId) || null;
      } else {
        chosenKidemli = pickDoctorFromPool(
          kidemliDoctors,
          dayIdx,
          isWeekendLike,
          isHoliday,
          dateStr,
          dayData.nobetciIds
        );

        if (chosenKidemli) {
          dayData.kidemliNobetciId = chosenKidemli.id;
          dayData.nobetciIds.push(chosenKidemli.id);

          const st = doctorStats.get(chosenKidemli.id)!;
          st.total += 1;
          if (isWeekendLike) st.weekend += 1;
          if (isHoliday) st.holiday += 1;
          st.lastDutyDay = dayIdx + 1;

          // Next day rest
          if (dayIdx < daysInMonth - 1) {
            if (!days[dayIdx + 1].dinlenmeIds.includes(chosenKidemli.id)) {
              days[dayIdx + 1].dinlenmeIds.push(chosenKidemli.id);
            }
          }
        }
      }

      // 2. KIDEMSİZ NÖBETÇİ (Kıdemlinin tercihi varsa öncelikli eşleşir)
      if (!dayData.kidemsizNobetciId) {
        const chosenKidemsiz = pickDoctorFromPool(
          kidemsizDoctors,
          dayIdx,
          isWeekendLike,
          isHoliday,
          dateStr,
          dayData.nobetciIds,
          chosenKidemli
        );

        if (chosenKidemsiz) {
          dayData.kidemsizNobetciId = chosenKidemsiz.id;
          dayData.nobetciIds.push(chosenKidemsiz.id);

          const st = doctorStats.get(chosenKidemsiz.id)!;
          st.total += 1;
          if (isWeekendLike) st.weekend += 1;
          if (isHoliday) st.holiday += 1;
          st.lastDutyDay = dayIdx + 1;

          // Next day rest
          if (dayIdx < daysInMonth - 1) {
            if (!days[dayIdx + 1].dinlenmeIds.includes(chosenKidemsiz.id)) {
              days[dayIdx + 1].dinlenmeIds.push(chosenKidemsiz.id);
            }
          }
        }
      }
    } else {
      // Single pool fallback
      for (let s = 0; s < 2; s++) {
        if (s === 0 && dayData.kidemliNobetciId) continue;
        if (s === 1 && dayData.kidemsizNobetciId) continue;
        const chosen = pickDoctorFromPool(
          activeDoctors,
          dayIdx,
          isWeekendLike,
          isHoliday,
          dateStr,
          dayData.nobetciIds
        );
        if (chosen) {
          if (s === 0) dayData.kidemliNobetciId = chosen.id;
          else dayData.kidemsizNobetciId = chosen.id;
          dayData.nobetciIds.push(chosen.id);

          const st = doctorStats.get(chosen.id)!;
          st.total += 1;
          if (isWeekendLike) st.weekend += 1;
          if (isHoliday) st.holiday += 1;
          st.lastDutyDay = dayIdx + 1;

          if (dayIdx < daysInMonth - 1) {
            if (!days[dayIdx + 1].dinlenmeIds.includes(chosen.id)) {
              days[dayIdx + 1].dinlenmeIds.push(chosen.id);
            }
          }
        }
      }
    }
  }

  // STEP 2.5: KOTA VE HEDEF SAYILARIN KESİN DENGELEMESİ (EN YÜKSEK ÖNCELİK: Nöbet Sayılarının Doğruluğu)
  // Fazla nöbet alan hekimle eksik kalan hekim arasında, kuralları (izin, ardışık nöbet yasağı)
  // bozmadan nöbet günleri takas edilerek hedef sayılar 100% eşitlenir.
  const runQuotaBalancing = (pool: Doctor[], role: 'kidemli' | 'kidemsiz') => {
    let improved = true;
    let iterations = 0;
    while (improved && iterations < 50) {
      improved = false;
      iterations++;

      const deficitDocs = pool.filter(d => {
        const st = doctorStats.get(d.id)!;
        return st.total < d.targetTotalShifts || (d.targetWeekendShifts > 0 && st.weekend < d.targetWeekendShifts);
      });
      const surplusDocs = pool.filter(d => {
        const st = doctorStats.get(d.id)!;
        return st.total > d.targetTotalShifts || st.weekend > d.targetWeekendShifts;
      });

      if (deficitDocs.length === 0 || surplusDocs.length === 0) break;

      for (const underDoc of deficitDocs) {
        const underSt = doctorStats.get(underDoc.id)!;
        const needsWeekend = underSt.weekend < underDoc.targetWeekendShifts;

        for (const overDoc of surplusDocs) {
          const overSt = doctorStats.get(overDoc.id)!;
          const hasExcessWeekend = overSt.weekend > overDoc.targetWeekendShifts;

          for (let dayIdx = 0; dayIdx < daysInMonth; dayIdx++) {
            const dayData = days[dayIdx];
            const isTargetRole = role === 'kidemli'
              ? dayData.kidemliNobetciId === overDoc.id
              : dayData.kidemsizNobetciId === overDoc.id;

            if (!isTargetRole) continue;
            // Do not swap out explicitly fixed assignments (e.g. holidays)
            if (fixedDutyAssignments && fixedDutyAssignments[dayData.date]) continue;

            // Hafta sonu ihtiyacı/fazlası koşulu
            if (needsWeekend && !dayData.isWeekend) continue;
            if (hasExcessWeekend && !needsWeekend && !dayData.isWeekend) continue;

            // Hekimin o güne uygunluk kuralları
            if (underDoc.unavailableDates?.includes(dayData.date)) continue;
            if (dayData.nobetciIds.includes(underDoc.id)) continue;

            // Ardışık gün kısıtlamaları (Bir önceki veya bir sonraki gün nöbetçi olamaz)
            if (dayIdx === 0 && previousMonthLastDutyDoctorIds.includes(underDoc.id)) continue;
            if (dayIdx > 0 && days[dayIdx - 1].nobetciIds.includes(underDoc.id)) continue;
            if (dayIdx < daysInMonth - 1 && days[dayIdx + 1].nobetciIds.includes(underDoc.id)) continue;

            // Geçerli takas!
            if (role === 'kidemli') {
              dayData.kidemliNobetciId = underDoc.id;
            } else {
              dayData.kidemsizNobetciId = underDoc.id;
            }
            dayData.nobetciIds = dayData.nobetciIds.map(id => id === overDoc.id ? underDoc.id : id);

            overSt.total -= 1;
            if (dayData.isWeekend) overSt.weekend -= 1;

            underSt.total += 1;
            if (dayData.isWeekend) underSt.weekend += 1;

            // Ertesi gün dinlenme senkronizasyonu
            if (dayIdx < daysInMonth - 1) {
              const nextDay = days[dayIdx + 1];
              nextDay.dinlenmeIds = nextDay.dinlenmeIds.filter(id => id !== overDoc.id);
              if (!nextDay.dinlenmeIds.includes(underDoc.id)) {
                nextDay.dinlenmeIds.push(underDoc.id);
              }
            }

            improved = true;
            break;
          }
          if (improved) break;
        }
        if (improved) break;
      }
    }
  };

  if (hasDualPool) {
    runQuotaBalancing(kidemliDoctors, 'kidemli');
    runQuotaBalancing(kidemsizDoctors, 'kidemsiz');
  } else {
    runQuotaBalancing(activeDoctors, 'kidemli');
  }

  // STEP 3: GÜNDÜZ KLİNİK GÖREVLERİ & KOMPANSASYON DÖNGÜSÜ
  // (Poliklinik, Servis, ESWL+Kons, Ürodinami ve Ameliyathane)
  for (let dayIdx = 0; dayIdx < daysInMonth; dayIdx++) {
    const dayData = days[dayIdx];

    // On weekends (Cumartesi / Pazar) and official holidays / bridge holidays, hospital clinic daytime duties are closed
    if ((dayData.isWeekend || dayData.isHoliday) && !weekendHasDayRoles) {
      // On Saturday, Sunday or Holiday, ameliyathane may have 1 assistant on call if needed
      const availableWeekend = doctors.filter(doc => {
        if (dayData.dinlenmeIds.includes(doc.id)) return false;
        if (dayData.izinliIds.includes(doc.id)) return false;
        if (dayData.nobetciIds.includes(doc.id)) return false;
        return true;
      });
      if (availableWeekend.length > 0) {
        dayData.ameliyathaneIds = [availableWeekend[dayIdx % availableWeekend.length].id];
      }
      continue;
    }

    // Available doctors for clinic daytime roles:
    // Exclude: Resting from last night's duty, on vacation/izin
    // AND Exclude doctors who are marked as 'isOnlyAmeliyathane' (onlar sadece ameliyathane listesinde yer alır)
    const availableForClinic = doctors.filter(doc => {
      if (dayData.dinlenmeIds.includes(doc.id)) return false;
      if (dayData.izinliIds.includes(doc.id)) return false;
      if (doc.isOnlyAmeliyathane) return false;
      return true;
    });

    const assignedToday = new Set<string>();

    // Helper to pick doctor for a clinic role (first checks primaryDuty, then compensationDuties, then fallback)
    const pickForDuty = (
      role: 'konsultan' | 'urodinami' | 'servis' | 'poliklinik',
      fallbackCapability: (doc: Doctor) => boolean,
      getStatsDays: (docId: string) => number
    ): Doctor | null => {
      // 1. Primary duty doctors (Ana Döngüsü bu birim olanlar)
      const primaryCandidates = availableForClinic.filter(
        d => !assignedToday.has(d.id) && (d.primaryDuty === role)
      );
      if (primaryCandidates.length > 0) {
        primaryCandidates.sort((a, b) => getStatsDays(a.id) - getStatsDays(b.id));
        return primaryCandidates[0];
      }

      // 2. Compensation duty doctors (Ana hekim dinlenmede/izinliyse, kompanse edecekler)
      const compCandidates = availableForClinic.filter(
        d => !assignedToday.has(d.id) && (d.compensationDuties?.includes(role))
      );
      if (compCandidates.length > 0) {
        compCandidates.sort((a, b) => getStatsDays(a.id) - getStatsDays(b.id));
        return compCandidates[0];
      }

      // 3. Fallback candidates (Yetki bayrağı açık olan müsait hekimler)
      const fallbackCandidates = availableForClinic.filter(
        d => !assignedToday.has(d.id) && fallbackCapability(d)
      );
      if (fallbackCandidates.length > 0) {
        fallbackCandidates.sort((a, b) => getStatsDays(a.id) - getStatsDays(b.id));
        return fallbackCandidates[0];
      }

      return null;
    };

    // 1. ESWL + KONSÜLTAN (1 hekim)
    const chosenKons = pickForDuty(
      'konsultan',
      d => !!d.canDoConsultant,
      id => doctorStats.get(id)?.consultantDays || 0
    );
    if (chosenKons) {
      dayData.konsultanIds.push(chosenKons.id);
      assignedToday.add(chosenKons.id);
      const st = doctorStats.get(chosenKons.id);
      if (st) st.consultantDays += 1;
    }

    // 2. ÜRODİNAMİ (1 hekim)
    const chosenUro = pickForDuty(
      'urodinami',
      d => !!d.canDoUrodinami || d.name === 'YAŞLIBAŞ',
      id => doctorStats.get(id)?.urodinamiDays || 0
    );
    if (chosenUro) {
      dayData.urodinamiIds = [chosenUro.id];
      assignedToday.add(chosenUro.id);
      const st = doctorStats.get(chosenUro.id);
      if (st) st.urodinamiDays += 1;
    }

    // 3. SERVİS (1 hekim)
    const chosenServis = pickForDuty(
      'servis',
      d => !!d.canDoService,
      id => doctorStats.get(id)?.serviceDays || 0
    );
    if (chosenServis) {
      dayData.servisIds.push(chosenServis.id);
      assignedToday.add(chosenServis.id);
      const st = doctorStats.get(chosenServis.id);
      if (st) st.serviceDays += 1;
    }

    // 4. POLİKLİNİK (Tam 2 hekim)
    for (let p = 0; p < poliklinikCount; p++) {
      const chosenPol = pickForDuty(
        'poliklinik',
        d => !!d.canDoClinic,
        id => doctorStats.get(id)?.clinicDays || 0
      );
      if (chosenPol) {
        dayData.poliklinikIds.push(chosenPol.id);
        assignedToday.add(chosenPol.id);
        const st = doctorStats.get(chosenPol.id);
        if (st) st.clinicDays += 1;
      }
    }

    // 5. AMELİYATHANE HAVUZU
    // Kural: "Döngüde olmayan herkes zaten ameliyathanededir, bazıları da zaten sadece ameliyathanededir"
    // O gün dinlenmede veya izinli olmayan, ve klinikte görevi bulunmayan tüm hekimler ameliyathanededir.
    const allOrCandidates = doctors.filter(doc => {
      if (dayData.dinlenmeIds.includes(doc.id)) return false;
      if (dayData.izinliIds.includes(doc.id)) return false;
      if (assignedToday.has(doc.id)) return false;
      return true; // Döngüde olmayan herkes ameliyathanededir
    });
    dayData.ameliyathaneIds = allOrCandidates.map(d => d.id);
    allOrCandidates.forEach(doc => {
      const st = doctorStats.get(doc.id);
      if (st) st.ameliyathaneDays += 1;
    });
  }

  // Fairness report
  const fairnessReport = activeDoctors.map(doc => {
    const stats = doctorStats.get(doc.id)!;
    const diffTotal = stats.total - doc.targetTotalShifts;
    const diffWeekend = stats.weekend - doc.targetWeekendShifts;

    let status: 'perfect' | 'warning' | 'deficit' = 'perfect';
    if (diffTotal !== 0 || diffWeekend !== 0) {
      status = Math.abs(diffTotal) > 1 || Math.abs(diffWeekend) > 1 ? 'warning' : 'deficit';
    }

    return {
      doctorId: doc.id,
      doctorName: doc.name,
      seniority: doc.seniority,
      assignedTotal: stats.total,
      targetTotal: doc.targetTotalShifts,
      assignedWeekend: stats.weekend,
      targetWeekend: doc.targetWeekendShifts,
      assignedHoliday: stats.holiday,
      historicalHolidays: doc.historicalHolidays || 0,
      status,
    };
  });

  return {
    days,
    warnings,
    success: true,
    fairnessReport,
  };
}
