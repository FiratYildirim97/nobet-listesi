import { MonthlyRoster, Doctor, DayAssignment, RuleConflict } from '../types';

/**
 * Nöbet listesindeki tüm kural ihlallerini, çakışmaları ve kota sapmalarını tespit eder.
 */
export function detectRosterConflicts(
  roster: MonthlyRoster,
  doctors: Doctor[],
  previousMonthLastDutyDoctorIds?: string[]
): RuleConflict[] {
  const conflicts: RuleConflict[] = [];
  const docMap = new Map<string, Doctor>(doctors.map(d => [d.id, d]));
  const days = roster.days || [];

  // Previous month boundary check list
  const prevDutyIds = previousMonthLastDutyDoctorIds || roster.previousMonthLastDutyDoctorIds || [];

  // 1. GÜN BAZLI VE ARDIŞIK GÜN ÇAKIŞMALARI
  days.forEach((day, index) => {
    const isFirstDay = index === 0;
    const prevDay = !isFirstDay ? days[index - 1] : null;

    // Day duty doctors
    const todayDutyIds = day.nobetciIds || [];

    // Check Day 1 against Previous Month boundary
    if (isFirstDay && prevDutyIds.length > 0) {
      prevDutyIds.forEach(docId => {
        const doc = docMap.get(docId);
        const docName = doc?.name || 'Hekim';

        // 1.1 Önceki ayın son günü nöbetçi olan hekim, yeni ayın 1. günü tekrar nöbetçi olamaz!
        if (todayDutyIds.includes(docId)) {
          conflicts.push({
            id: `boundary-consecutive-${day.date}-${docId}`,
            type: 'consecutive_night',
            severity: 'error',
            date: day.date,
            doctorId: docId,
            doctorName: docName,
            message: `${docName}, önceki ayın son günü nöbetçi olduğu için ${day.date} tarihinde arka arkaya nöbet tutamaz!`,
            suggestedFix: '1. gün nöbetçisini başka bir hekimle değiştirin.',
          });
        }

        // 1.2 Önceki ayın son günü nöbetçi olan hekim, yeni ayın 1. günü gündüz görevine yazılamaz (nöbet ertesi)!
        const dayAssignments = [
          ...day.poliklinikIds,
          ...day.servisIds,
          ...day.konsultanIds,
          ...(day.urodinamiIds || []),
          ...(day.ameliyathaneIds || []),
        ];
        if (dayAssignments.includes(docId)) {
          conflicts.push({
            id: `boundary-post-duty-${day.date}-${docId}`,
            type: 'post_duty_day_role',
            severity: 'error',
            date: day.date,
            doctorId: docId,
            doctorName: docName,
            message: `${docName}, önceki ayın son günü nöbetçi olduğu için ${day.date} tarihinde nöbet ertesidir; gündüz görevine yazılamaz!`,
            suggestedFix: '1. gün gündüz görevini başka bir hekime atayın.',
          });
        }
      });
    }

    // 1.3 ARDIŞIK GÜNLERDE ARKA ARKAYA NÖBET KONTROLÜ
    if (prevDay) {
      const prevDutyDoctorIds = prevDay.nobetciIds || [];
      todayDutyIds.forEach(docId => {
        if (prevDutyDoctorIds.includes(docId)) {
          const doc = docMap.get(docId);
          const docName = doc?.name || 'Hekim';
          conflicts.push({
            id: `consecutive-duty-${day.date}-${docId}`,
            type: 'consecutive_night',
            severity: 'error',
            date: day.date,
            doctorId: docId,
            doctorName: docName,
            message: `${docName}, ${prevDay.date} ve ${day.date} tarihlerinde arka arkaya 2 gün gece nöbetçisi yazılmış!`,
            suggestedFix: `${day.date} veya ${prevDay.date} tarihindeki nöbetçiyi değiştirin.`,
          });
        }
      });

      // 1.4 NÖBET ERTESİ GÜNDÜZ GÖREVİ KONTROLÜ
      const todayDayRoleIds = [
        ...day.poliklinikIds,
        ...day.servisIds,
        ...day.konsultanIds,
        ...(day.urodinamiIds || []),
        ...(day.ameliyathaneIds || []),
      ];

      prevDutyDoctorIds.forEach(docId => {
        if (todayDayRoleIds.includes(docId)) {
          const doc = docMap.get(docId);
          const docName = doc?.name || 'Hekim';
          conflicts.push({
            id: `post-duty-role-${day.date}-${docId}`,
            type: 'post_duty_day_role',
            severity: 'error',
            date: day.date,
            doctorId: docId,
            doctorName: docName,
            message: `${docName}, ${prevDay.date} gecesi nöbetçi olduğu için ${day.date} günü nöbet ertesidir; gündüz görevine yazılamaz!`,
            suggestedFix: `${day.date} günündeki gündüz görevini dinlenmede olmayan başka bir hekime verin.`,
          });
        }
      });
    }

    // 1.5 İZİNLİ / MAZERETLİ GÜNDE GÖREV KONTROLÜ
    todayDutyIds.forEach(docId => {
      const doc = docMap.get(docId);
      if (doc && doc.unavailableDates?.includes(day.date)) {
        conflicts.push({
          id: `unavailable-duty-${day.date}-${docId}`,
          type: 'unavailable_assigned',
          severity: 'error',
          date: day.date,
          doctorId: docId,
          doctorName: doc.name,
          message: `${doc.name}, ${day.date} tarihinde izinli/mazeretli olarak işaretli ancak gece nöbetine atanmış!`,
          suggestedFix: 'Nöbeti müsait olan başka bir hekime aktarın.',
        });
      }
    });

    const dayRoleDocIds = [
      ...day.poliklinikIds,
      ...day.servisIds,
      ...day.konsultanIds,
      ...(day.urodinamiIds || []),
      ...(day.ameliyathaneIds || []),
    ];
    dayRoleDocIds.forEach(docId => {
      const doc = docMap.get(docId);
      if (doc && doc.unavailableDates?.includes(day.date)) {
        conflicts.push({
          id: `unavailable-dayrole-${day.date}-${docId}`,
          type: 'unavailable_assigned',
          severity: 'warning',
          date: day.date,
          doctorId: docId,
          doctorName: doc.name,
          message: `${doc.name}, ${day.date} tarihinde izinli/mazeretli ancak gündüz görevine atanmış!`,
          suggestedFix: 'Gündüz görevini izinli olmayan bir hekime aktarın.',
        });
      }
    });

    // 1.6 EKSİK NÖBETÇİ KONTROLÜ
    const expectedDutyCount = roster.nobetciCount || 2;
    if (todayDutyIds.length < expectedDutyCount) {
      conflicts.push({
        id: `missing-duty-${day.date}`,
        type: 'missing_duty',
        severity: 'warning',
        date: day.date,
        message: `${day.date} tarihinde ${todayDutyIds.length} nöbetçi atanmış (Beklenen: ${expectedDutyCount}).`,
        suggestedFix: 'Bu güne eksik olan nöbetçiyi atayın.',
      });
    }

    // 1.7 KIDEMLİ / KIDEMSİZ UYUMSUZLUĞU (varsa)
    if (day.kidemliNobetciId) {
      const doc = docMap.get(day.kidemliNobetciId);
      if (doc && doc.seniority !== 'kidemli') {
        conflicts.push({
          id: `seniority-mismatch-kidemli-${day.date}-${doc.id}`,
          type: 'seniority_mismatch',
          severity: 'warning',
          date: day.date,
          doctorId: doc.id,
          doctorName: doc.name,
          message: `${day.date} tarihinde Kıdemli nöbetçi slotuna kıdemsiz hekim (${doc.name}) atanmış.`,
          suggestedFix: 'Kıdemli hekimlerden birini atayın.',
        });
      }
    }
  });

  // 2. HEKİM KOTA VE DENGELERİNİ DENETLE
  const assignedTotals = new Map<string, { total: number; weekend: number }>();
  doctors.forEach(d => assignedTotals.set(d.id, { total: 0, weekend: 0 }));

  days.forEach(day => {
    day.nobetciIds.forEach(id => {
      const current = assignedTotals.get(id) || { total: 0, weekend: 0 };
      current.total += 1;
      if (day.isWeekend || day.isHoliday) {
        current.weekend += 1;
      }
      assignedTotals.set(id, current);
    });
  });

  doctors.forEach(doc => {
    const stats = assignedTotals.get(doc.id) || { total: 0, weekend: 0 };
    const diffTotal = stats.total - (doc.targetTotalShifts || 0);
    const diffWeekend = stats.weekend - (doc.targetWeekendShifts || 0);

    if (diffTotal > 0) {
      conflicts.push({
        id: `quota-overflow-total-${doc.id}`,
        type: 'quota_overflow',
        severity: 'warning',
        doctorId: doc.id,
        doctorName: doc.name,
        message: `${doc.name} için hedef toplam nöbet ${doc.targetTotalShifts} iken ${stats.total} nöbet atanmış (+${diffTotal} fazla).`,
        suggestedFix: 'Fazla nöbetleri eksik kalan hekimlere devredin.',
      });
    } else if (diffTotal < 0 && (doc.targetTotalShifts || 0) > 0) {
      conflicts.push({
        id: `quota-deficit-total-${doc.id}`,
        type: 'quota_deficit',
        severity: 'warning',
        doctorId: doc.id,
        doctorName: doc.name,
        message: `${doc.name} için hedef toplam nöbet ${doc.targetTotalShifts} iken ${stats.total} nöbet atanmış (${Math.abs(diffTotal)} eksik).`,
        suggestedFix: 'Eksik nöbetleri boş günlere atayın.',
      });
    }

    if (diffWeekend > 0) {
      conflicts.push({
        id: `quota-overflow-weekend-${doc.id}`,
        type: 'quota_overflow',
        severity: 'warning',
        doctorId: doc.id,
        doctorName: doc.name,
        message: `${doc.name} için hedef hafta sonu ${doc.targetWeekendShifts} iken ${stats.weekend} hafta sonu nöbeti atanmış (+${diffWeekend} fazla).`,
      });
    } else if (diffWeekend < 0 && (doc.targetWeekendShifts || 0) > 0) {
      conflicts.push({
        id: `quota-deficit-weekend-${doc.id}`,
        type: 'quota_deficit',
        severity: 'warning',
        doctorId: doc.id,
        doctorName: doc.name,
        message: `${doc.name} için hedef hafta sonu ${doc.targetWeekendShifts} iken ${stats.weekend} hafta sonu nöbeti atanmış (${Math.abs(diffWeekend)} eksik).`,
      });
    }
  });

  return conflicts;
}

/**
 * Belirli bir gün için çakışmaları filtreler.
 */
export function getConflictsForDate(conflicts: RuleConflict[], dateStr: string): RuleConflict[] {
  return conflicts.filter(c => c.date === dateStr);
}

/**
 * Belirli bir hekim için çakışmaları filtreler.
 */
export function getConflictsForDoctor(conflicts: RuleConflict[], doctorId: string): RuleConflict[] {
  return conflicts.filter(c => c.doctorId === doctorId);
}
