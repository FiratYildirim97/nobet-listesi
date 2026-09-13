import React, { useState, useMemo } from 'react';
import { 
  X, 
  Scale, 
  Sparkles, 
  Calendar, 
  Users, 
  Award, 
  History, 
  Flame, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Info,
  Wand2
} from 'lucide-react';
import { Doctor, HistoricalMonthSummary, HolidayInfo } from '../types';
import { getDaysInMonth, formatDateStr } from '../utils/scheduler';
import { getHolidayForDate } from '../data/holidays';
import { deriveSurname } from '../utils/auth';

export interface HolidayDutySelection {
  kidemliId: string;
  kidemsizId: string;
}

interface SurplusAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  monthName: string;
  doctors: Doctor[];
  history: HistoricalMonthSummary[];
  customHolidays?: HolidayInfo[];
  onConfirmSchedule: (
    adjustedDoctors: Doctor[],
    fixedHolidayDuties?: Record<string, { kidemliId?: string; kidemsizId?: string }>
  ) => void;
}

export const SurplusAssignmentModal: React.FC<SurplusAssignmentModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  monthName,
  doctors,
  history,
  customHolidays = [],
  onConfirmSchedule,
}) => {
  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);

  // Check holidays in this month
  const holidaysInMonth = useMemo(() => {
    const list: { date: string; name: string; isHalfDay?: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDateStr(year, month, d);
      const h = getHolidayForDate(dateStr, customHolidays);
      if (h) {
        list.push({ date: dateStr, name: h.name || 'Resmi Tatil', isHalfDay: h.isHalfDay });
      }
    }
    return list;
  }, [year, month, daysInMonth, customHolidays]);

  // Weekend days count
  const weekendDaysCount = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dayOfWeek = dateObj.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) count++;
    }
    return count;
  }, [year, month, daysInMonth]);

  const kidemliDoctors = useMemo(() => 
    doctors.filter(d => d.seniority === 'kidemli').sort((a, b) => (a.seniorityRank || 99) - (b.seniorityRank || 99)),
    [doctors]
  );

  const kidemsizDoctors = useMemo(() => 
    doctors.filter(d => d.seniority === 'kidemsiz').sort((a, b) => (a.seniorityRank || 99) - (b.seniorityRank || 99)),
    [doctors]
  );

  // Calculate targets & surpluses
  const kidemliTargetSum = useMemo(() => 
    kidemliDoctors.reduce((acc, d) => acc + (d.targetTotalShifts || 0), 0),
    [kidemliDoctors]
  );

  const kidemsizTargetSum = useMemo(() => 
    kidemsizDoctors.reduce((acc, d) => acc + (d.targetTotalShifts || 0), 0),
    [kidemsizDoctors]
  );

  const totalWeekendTarget = useMemo(() => 
    doctors.reduce((acc, d) => acc + (d.targetWeekendShifts || 0), 0),
    [doctors]
  );

  const has31Days = daysInMonth === 31;
  const kidemliSurplusNeeded = Math.max(0, daysInMonth - kidemliTargetSum);
  const kidemsizSurplusNeeded = Math.max(0, daysInMonth - kidemsizTargetSum);
  const totalHolidayWeekendSlots = (weekendDaysCount + holidaysInMonth.length) * 2;
  const weekendSurplusNeeded = Math.max(0, totalHolidayWeekendSlots - totalWeekendTarget);

  // Recommendations for 31st day total shifts based on historical fairness:
  const recommendedSenior = useMemo(() => {
    if (kidemliDoctors.length === 0) return null;
    const sorted = [...kidemliDoctors].sort((a, b) => {
      const balDiff = (a.shiftBalance || 0) - (b.shiftBalance || 0);
      if (balDiff !== 0) return balDiff;
      const holDiff = (a.historicalHolidays || 0) - (b.historicalHolidays || 0);
      if (holDiff !== 0) return holDiff;
      return (a.historicalShifts || 0) - (b.historicalShifts || 0);
    });
    return sorted[0];
  }, [kidemliDoctors]);

  const recommendedJunior = useMemo(() => {
    if (kidemsizDoctors.length === 0) return null;
    const sorted = [...kidemsizDoctors].sort((a, b) => {
      const balDiff = (a.shiftBalance || 0) - (b.shiftBalance || 0);
      if (balDiff !== 0) return balDiff;
      const holDiff = (a.historicalHolidays || 0) - (b.historicalHolidays || 0);
      if (holDiff !== 0) return holDiff;
      return (a.historicalShifts || 0) - (b.historicalShifts || 0);
    });
    return sorted[0];
  }, [kidemsizDoctors]);

  // Fair ranking for holiday distribution (least holidays worked first, then balance, then seniority)
  const sortedSeniorsForHolidays = useMemo(() => {
    return [...kidemliDoctors].sort((a, b) => {
      const holDiff = (a.historicalHolidays || 0) - (b.historicalHolidays || 0);
      if (holDiff !== 0) return holDiff;
      const wDiff = (a.weekendBalance || 0) - (b.weekendBalance || 0);
      if (wDiff !== 0) return wDiff;
      const sDiff = (a.shiftBalance || 0) - (b.shiftBalance || 0);
      if (sDiff !== 0) return sDiff;
      return (a.seniorityRank || 99) - (b.seniorityRank || 99);
    });
  }, [kidemliDoctors]);

  const sortedJuniorsForHolidays = useMemo(() => {
    return [...kidemsizDoctors].sort((a, b) => {
      const holDiff = (a.historicalHolidays || 0) - (b.historicalHolidays || 0);
      if (holDiff !== 0) return holDiff;
      const wDiff = (a.weekendBalance || 0) - (b.weekendBalance || 0);
      if (wDiff !== 0) return wDiff;
      const sDiff = (a.shiftBalance || 0) - (b.shiftBalance || 0);
      if (sDiff !== 0) return sDiff;
      return (a.seniorityRank || 99) - (b.seniorityRank || 99);
    });
  }, [kidemsizDoctors]);

  // User selections state
  const [selectedSeniorId, setSelectedSeniorId] = useState<string>('');
  const [selectedJuniorId, setSelectedJuniorId] = useState<string>('');
  const [holidayAssignments, setHolidayAssignments] = useState<Record<string, HolidayDutySelection>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Pre-fill selections with fair recommendations on modal open
  React.useEffect(() => {
    if (isOpen) {
      setValidationError(null);
      if (recommendedSenior) setSelectedSeniorId(recommendedSenior.id);
      if (recommendedJunior) setSelectedJuniorId(recommendedJunior.id);

      // Pre-fill each holiday with fair recommendations (distinct seniors & juniors)
      const initialHolidays: Record<string, HolidayDutySelection> = {};
      const usedSeniorIds = new Set<string>();
      const usedJuniorIds = new Set<string>();

      holidaysInMonth.forEach((h, idx) => {
        const availSenior = sortedSeniorsForHolidays.find(d => !usedSeniorIds.has(d.id)) || sortedSeniorsForHolidays[idx % sortedSeniorsForHolidays.length];
        const availJunior = sortedJuniorsForHolidays.find(d => !usedJuniorIds.has(d.id)) || sortedJuniorsForHolidays[idx % sortedJuniorsForHolidays.length];

        if (availSenior) usedSeniorIds.add(availSenior.id);
        if (availJunior) usedJuniorIds.add(availJunior.id);

        initialHolidays[h.date] = {
          kidemliId: availSenior?.id || '',
          kidemsizId: availJunior?.id || '',
        };
      });

      setHolidayAssignments(initialHolidays);
    }
  }, [isOpen, recommendedSenior, recommendedJunior, sortedSeniorsForHolidays, sortedJuniorsForHolidays, holidaysInMonth]);

  if (!isOpen) return null;

  const handleHolidayDutyChange = (dateStr: string, role: 'kidemliId' | 'kidemsizId', docId: string) => {
    setValidationError(null);
    setHolidayAssignments(prev => ({
      ...prev,
      [dateStr]: {
        kidemliId: role === 'kidemliId' ? docId : (prev[dateStr]?.kidemliId || ''),
        kidemsizId: role === 'kidemsizId' ? docId : (prev[dateStr]?.kidemsizId || ''),
      }
    }));
  };

  const formatHolidayDateLabel = (dateStr: string, holidayName: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    return `${d} ${monthName} ${y} ${dayNames[dayOfWeek]} - ${holidayName}`;
  };

  const validateConsecutiveDuties = (): boolean => {
    const sortedDates = Object.keys(holidayAssignments).sort();
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const d1 = sortedDates[i];
      const d2 = sortedDates[i + 1];
      const diffDays = (new Date(d2).getTime() - new Date(d1).getTime()) / (1000 * 3600 * 24);
      if (diffDays === 1) {
        const duty1 = holidayAssignments[d1];
        const duty2 = holidayAssignments[d2];
        if (duty1?.kidemliId && duty1.kidemliId === duty2?.kidemliId) {
          const doc = doctors.find(d => d.id === duty1.kidemliId);
          setValidationError(`Dr. ${doc ? deriveSurname(doc.name) : ''} ardışık günlerde (${d1} ve ${d2}) nöbetçi olamaz. Lütfen farklı bir kıdemli seçin.`);
          return false;
        }
        if (duty1?.kidemsizId && duty1.kidemsizId === duty2?.kidemsizId) {
          const doc = doctors.find(d => d.id === duty1.kidemsizId);
          setValidationError(`Dr. ${doc ? deriveSurname(doc.name) : ''} ardışık günlerde (${d1} ve ${d2}) nöbetçi olamaz. Lütfen farklı bir kıdemsiz seçin.`);
          return false;
        }
      }
    }
    return true;
  };

  const handleApplySelections = () => {
    if (!validateConsecutiveDuties()) return;

    const fixedHolidayDuties: Record<string, { kidemliId?: string; kidemsizId?: string }> = {};
    const extraWeekendCounts: Record<string, number> = {};
    const extraTotalCounts: Record<string, number> = {};

    if (selectedSeniorId && (has31Days || kidemliSurplusNeeded > 0)) {
      extraTotalCounts[selectedSeniorId] = (extraTotalCounts[selectedSeniorId] || 0) + 1;
    }
    if (selectedJuniorId && (has31Days || kidemsizSurplusNeeded > 0)) {
      extraTotalCounts[selectedJuniorId] = (extraTotalCounts[selectedJuniorId] || 0) + 1;
    }

    holidaysInMonth.forEach(h => {
      const duty = holidayAssignments[h.date];
      if (duty && (duty.kidemliId || duty.kidemsizId)) {
        fixedHolidayDuties[h.date] = {
          kidemliId: duty.kidemliId || undefined,
          kidemsizId: duty.kidemsizId || undefined,
        };
        if (duty.kidemliId) {
          extraWeekendCounts[duty.kidemliId] = (extraWeekendCounts[duty.kidemliId] || 0) + 1;
        }
        if (duty.kidemsizId) {
          extraWeekendCounts[duty.kidemsizId] = (extraWeekendCounts[duty.kidemsizId] || 0) + 1;
        }
      }
    });

    const adjustedDoctors = doctors.map(doc => {
      const extraTot = extraTotalCounts[doc.id] || 0;
      const extraWk = extraWeekendCounts[doc.id] || 0;

      let finalTargetTotal = (doc.targetTotalShifts || 0) + extraTot;
      let finalTargetWeekend = (doc.targetWeekendShifts || 0) + extraWk;
      if (finalTargetWeekend > finalTargetTotal) {
        finalTargetTotal = finalTargetWeekend;
      }

      if (finalTargetTotal !== doc.targetTotalShifts || finalTargetWeekend !== doc.targetWeekendShifts) {
        return {
          ...doc,
          targetTotalShifts: finalTargetTotal,
          targetWeekendShifts: finalTargetWeekend,
        };
      }
      return doc;
    });

    onConfirmSchedule(adjustedDoctors, fixedHolidayDuties);
    onClose();
  };

  const handleApplyFairAuto = () => {
    const fixedHolidayDuties: Record<string, { kidemliId?: string; kidemsizId?: string }> = {};
    const extraWeekendCounts: Record<string, number> = {};
    const extraTotalCounts: Record<string, number> = {};

    if (recommendedSenior && (has31Days || kidemliSurplusNeeded > 0)) {
      extraTotalCounts[recommendedSenior.id] = (extraTotalCounts[recommendedSenior.id] || 0) + 1;
    }
    if (recommendedJunior && (has31Days || kidemsizSurplusNeeded > 0)) {
      extraTotalCounts[recommendedJunior.id] = (extraTotalCounts[recommendedJunior.id] || 0) + 1;
    }

    const usedSeniorIds = new Set<string>();
    const usedJuniorIds = new Set<string>();

    holidaysInMonth.forEach((h, idx) => {
      const availSenior = sortedSeniorsForHolidays.find(d => !usedSeniorIds.has(d.id)) || sortedSeniorsForHolidays[idx % sortedSeniorsForHolidays.length];
      const availJunior = sortedJuniorsForHolidays.find(d => !usedJuniorIds.has(d.id)) || sortedJuniorsForHolidays[idx % sortedJuniorsForHolidays.length];

      if (availSenior) usedSeniorIds.add(availSenior.id);
      if (availJunior) usedJuniorIds.add(availJunior.id);

      if (availSenior || availJunior) {
        fixedHolidayDuties[h.date] = {
          kidemliId: availSenior?.id,
          kidemsizId: availJunior?.id,
        };
        if (availSenior) {
          extraWeekendCounts[availSenior.id] = (extraWeekendCounts[availSenior.id] || 0) + 1;
        }
        if (availJunior) {
          extraWeekendCounts[availJunior.id] = (extraWeekendCounts[availJunior.id] || 0) + 1;
        }
      }
    });

    const adjustedDoctors = doctors.map(doc => {
      const extraTot = extraTotalCounts[doc.id] || 0;
      const extraWk = extraWeekendCounts[doc.id] || 0;

      let finalTargetTotal = (doc.targetTotalShifts || 0) + extraTot;
      let finalTargetWeekend = (doc.targetWeekendShifts || 0) + extraWk;
      if (finalTargetWeekend > finalTargetTotal) {
        finalTargetTotal = finalTargetWeekend;
      }

      if (finalTargetTotal !== doc.targetTotalShifts || finalTargetWeekend !== doc.targetWeekendShifts) {
        return {
          ...doc,
          targetTotalShifts: finalTargetTotal,
          targetWeekendShifts: finalTargetWeekend,
        };
      }
      return doc;
    });

    onConfirmSchedule(adjustedDoctors, fixedHolidayDuties);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-700 via-indigo-900 to-slate-900 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 border border-white/20 shadow-inner">
              <Scale className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Fazla Nöbet Dağıtımı & Adalet Hatırlatıcısı
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-400 text-slate-950">
                  {monthName} {year}
                </span>
              </div>
              <p className="text-[11px] text-amber-200/85">
                31 gün ve bayram/hafta sonu fazlalık nöbetlerini kimin tutacağını geçmişe bakarak belirleyin.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month Status & Surplus Summary Cards */}
        <div className="px-6 py-3 bg-amber-50/70 border-b border-amber-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-amber-950">Ayın Durumu:</span>
            
            <span className={'px-2.5 py-1 rounded-lg font-bold border shadow-2xs ' + (
              has31Days ? 'bg-indigo-100 text-indigo-950 border-indigo-300' : 'bg-white text-slate-800 border-slate-200'
            )}>
              📅 {daysInMonth} Gün ({daysInMonth * 2} Nöbetçi Slotu)
            </span>

            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 font-bold shadow-2xs">
              🏖️ {weekendDaysCount} Hafta Sonu Günü
            </span>

            {holidaysInMonth.length > 0 ? (
              <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-950 border border-rose-300 font-bold shadow-2xs flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                <span>{holidaysInMonth.map(h => h.name).join(', ')}</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 font-medium">
                Bu ay resmi tatil yok.
              </span>
            )}
          </div>

          <div className="text-[11px] text-amber-900 font-bold flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200">
            <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              {has31Days 
                ? '31. gün için 1 Kıdemli ve 1 Kıdemsiz fazla nöbeti gerekiyor.' 
                : 'Ay 30 gün; mevcut kotalar dengeleniyor.'}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
          
          {/* SECTION 1: Önceki Aylarda Kimler Fazlalık / Bayram Tuttu? (Geçmiş Hafıza) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Önceki Aylarda Fazlalıkları & Bayramları Kimler Tuttu? (Geçmiş Hafıza)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Kıdem sırasına göre hekim geçmişi
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="py-2.5 px-3 w-14 text-center">Kıdem</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Hekim</th>
                    <th className="py-2.5 px-3 w-28 text-center">Statü</th>
                    <th className="py-2.5 px-3 text-center min-w-[120px] bg-blue-50/70 text-blue-950">
                      Geçmiş Nöbet Dengesi
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[130px] bg-amber-50/70 text-amber-950">
                      H.Sonu Dengesi
                    </th>
                    <th className="py-2.5 px-3 min-w-[160px] bg-rose-50/70 text-rose-950">
                      Geçmiş Bayram Nöbetleri
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[130px]">Sistem Durumu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors.map(doc => {
                    const isSenior = doc.seniority === 'kidemli';
                    const shiftBal = doc.shiftBalance || 0;
                    const wBal = doc.weekendBalance || 0;
                    const holCount = doc.historicalHolidays || 0;
                    const isRecSenior = recommendedSenior?.id === doc.id;
                    const isRecJunior = recommendedJunior?.id === doc.id;

                    return (
                      <tr 
                        key={doc.id}
                        className={'hover:bg-slate-50 transition-colors ' + (
                          isRecSenior || isRecJunior ? 'bg-emerald-50/30' : ''
                        )}
                      >
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-600">
                          #{doc.seniorityRank || '-'}
                        </td>

                        <td className="py-2 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="w-2.5 h-2.5 rounded-full ring-1 ring-slate-300"
                              style={{ backgroundColor: doc.color }}
                            />
                            <span>{deriveSurname(doc.name) || doc.name}</span>
                          </div>
                        </td>

                        <td className="py-2 px-3 text-center">
                          <span className={'text-[10px] font-bold px-2 py-0.5 rounded-md ' + (
                            isSenior ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          )}>
                            {isSenior ? '⭐ Kıdemli' : '🌱 Kıdemsiz'}
                          </span>
                        </td>

                        {/* Shift Balance */}
                        <td className="py-2 px-3 text-center font-semibold bg-blue-50/20">
                          {shiftBal > 0 ? (
                            <span className="text-blue-700 font-bold">+{shiftBal} Fazla</span>
                          ) : shiftBal < 0 ? (
                            <span className="text-amber-700 font-bold">{shiftBal} Eksik</span>
                          ) : (
                            <span className="text-slate-400">Dengede (0)</span>
                          )}
                        </td>

                        {/* Weekend Balance */}
                        <td className="py-2 px-3 text-center font-semibold bg-amber-50/20">
                          {wBal > 0 ? (
                            <span className="text-amber-700 font-bold">+{wBal} Fazla</span>
                          ) : wBal < 0 ? (
                            <span className="text-rose-600 font-bold">{wBal} Eksik</span>
                          ) : (
                            <span className="text-slate-400">Dengede (0)</span>
                          )}
                        </td>

                        {/* Holidays Worked */}
                        <td className="py-2 px-3 bg-rose-50/20 text-[11px]">
                          {holCount > 0 ? (
                            <div>
                              <span className="font-bold text-rose-900">{holCount} Bayram</span>
                              {doc.lastHolidayWorkedName && (
                                <span className="text-slate-500 text-[10px] block">
                                  ({doc.lastHolidayWorkedName})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                              <span>Hiç bayram tutmadı</span>
                              <span>⭐</span>
                            </span>
                          )}
                        </td>

                        {/* Recommendation badge */}
                        <td className="py-2 px-3 text-center">
                          {isRecSenior ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-600 text-white shadow-2xs animate-pulse">
                              <Award className="w-3 h-3" />
                              <span>Önerilen Kıdemli</span>
                            </span>
                          ) : isRecJunior ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-600 text-white shadow-2xs animate-pulse">
                              <Award className="w-3 h-3" />
                              <span>Önerilen Kıdemsiz</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-medium">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Validation Error Banner if any */}
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* SECTION 2: Bu Ayki Fazlalıkları ve Bayram Nöbetlerini Kime Atamak İstiyorsunuz? */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-white rounded-xl border border-indigo-200 p-4 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                Bu Ayki Fazlalık ve Bayram Nöbet Atamaları ({monthName} {year})
              </h3>
            </div>

            {/* PART A: 31. Gün Fazlalık Dağıtımı */}
            {has31Days && (
              <div className="p-3 bg-white/90 rounded-xl border border-indigo-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-black text-indigo-950">
                    31. Gün Fazlalık Dağıtımı (+1 Toplam Nöbet)
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  
                  {/* Kıdemli 31. Gün */}
                  <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-extrabold text-indigo-950 text-xs">
                        ⭐ 31. Gün Kıdemli Fazlalığı (+1 Nöbet)
                      </label>
                      {recommendedSenior && (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Öneri: {deriveSurname(recommendedSenior.name)}
                        </span>
                      )}
                    </div>
                    <select
                      value={selectedSeniorId}
                      onChange={e => setSelectedSeniorId(e.target.value)}
                      className="w-full text-xs font-bold py-2 px-3 rounded-lg border border-indigo-300 bg-white text-indigo-950 focus:ring-2 focus:ring-indigo-500 outline-hidden cursor-pointer"
                    >
                      <option value="">Kıdemli Seçiniz...</option>
                      {kidemliDoctors.map(doc => {
                        const isRec = recommendedSenior?.id === doc.id;
                        const bal = doc.shiftBalance || 0;
                        return (
                          <option key={doc.id} value={doc.id}>
                            {isRec ? '⭐ [ÖNERİLEN] ' : ''}#{doc.seniorityRank} {deriveSurname(doc.name) || doc.name} (Denge: {bal > 0 ? '+' + bal : bal}, Bayram: {doc.historicalHolidays || 0})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Kıdemsiz 31. Gün */}
                  <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-extrabold text-emerald-950 text-xs">
                        🌱 31. Gün Kıdemsiz Fazlalığı (+1 Nöbet)
                      </label>
                      {recommendedJunior && (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Öneri: {deriveSurname(recommendedJunior.name)}
                        </span>
                      )}
                    </div>
                    <select
                      value={selectedJuniorId}
                      onChange={e => setSelectedJuniorId(e.target.value)}
                      className="w-full text-xs font-bold py-2 px-3 rounded-lg border border-emerald-300 bg-white text-emerald-950 focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
                    >
                      <option value="">Kıdemsiz Seçiniz...</option>
                      {kidemsizDoctors.map(doc => {
                        const isRec = recommendedJunior?.id === doc.id;
                        const bal = doc.shiftBalance || 0;
                        return (
                          <option key={doc.id} value={doc.id}>
                            {isRec ? '⭐ [ÖNERİLEN] ' : ''}#{doc.seniorityRank} {deriveSurname(doc.name) || doc.name} (Denge: {bal > 0 ? '+' + bal : bal}, Bayram: {doc.historicalHolidays || 0})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                </div>
              </div>
            )}

            {/* PART B: RESMİ TATİL VE BAYRAM NÖBETLERİ (HER BAYRAM İÇİN 1 KIDEMLİ + 1 KIDEMSİZ) */}
            {holidaysInMonth.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-black text-rose-950">
                      Resmi Tatil & Bayram Nöbetçileri Dağıtımı
                    </h4>
                  </div>
                  <span className="text-[11px] text-rose-700 font-semibold">
                    Her bayram günü için 1 Kıdemli ve 1 Kıdemsiz seçilir
                  </span>
                </div>

                <div className="space-y-3">
                  {holidaysInMonth.map((h, hIdx) => {
                    const recSenior = sortedSeniorsForHolidays[hIdx % sortedSeniorsForHolidays.length];
                    const recJunior = sortedJuniorsForHolidays[hIdx % sortedJuniorsForHolidays.length];
                    const currentSelection = holidayAssignments[h.date] || { kidemliId: '', kidemsizId: '' };

                    return (
                      <div key={h.date} className="p-3.5 bg-rose-50/80 rounded-xl border border-rose-200 shadow-2xs space-y-2.5">
                        
                        {/* Holiday Title Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-rose-200/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🇹🇷</span>
                            <span className="font-black text-rose-950 text-xs sm:text-sm">
                              {formatHolidayDateLabel(h.date, h.name)}
                            </span>
                            {h.isHalfDay && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                                Arife (Yarım Gün)
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-extrabold text-rose-800 bg-white px-2 py-0.5 rounded border border-rose-300">
                            Nöbet: 1 Kıdemli + 1 Kıdemsiz
                          </span>
                        </div>

                        {/* Dropdowns Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          
                          {/* Kıdemli Dropdown */}
                          <div className="p-2.5 bg-white rounded-lg border border-indigo-200 space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-extrabold text-indigo-950 flex items-center gap-1">
                                <span>⭐ Kıdemli Nöbetçi:</span>
                              </label>
                              {recSenior && (
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  En Adil: {deriveSurname(recSenior.name)}
                                </span>
                              )}
                            </div>
                            <select
                              value={currentSelection.kidemliId}
                              onChange={e => handleHolidayDutyChange(h.date, 'kidemliId', e.target.value)}
                              className="w-full text-xs font-bold py-2 px-2.5 rounded-lg border border-indigo-300 bg-indigo-50/30 text-indigo-950 focus:ring-2 focus:ring-indigo-500 outline-hidden cursor-pointer"
                            >
                              <option value="">Kıdemli Seçiniz...</option>
                              {kidemliDoctors.map(doc => {
                                const isRec = recSenior?.id === doc.id;
                                const hol = doc.historicalHolidays || 0;
                                return (
                                  <option key={doc.id} value={doc.id}>
                                    {isRec ? '⭐ [ÖNERİLEN] ' : ''}#{doc.seniorityRank} {deriveSurname(doc.name) || doc.name} (Bayram: {hol}, Denge: {doc.shiftBalance || 0})
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {/* Kıdemsiz Dropdown */}
                          <div className="p-2.5 bg-white rounded-lg border border-emerald-200 space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-extrabold text-emerald-950 flex items-center gap-1">
                                <span>🌱 Kıdemsiz Nöbetçi:</span>
                              </label>
                              {recJunior && (
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  En Adil: {deriveSurname(recJunior.name)}
                                </span>
                              )}
                            </div>
                            <select
                              value={currentSelection.kidemsizId}
                              onChange={e => handleHolidayDutyChange(h.date, 'kidemsizId', e.target.value)}
                              className="w-full text-xs font-bold py-2 px-2.5 rounded-lg border border-emerald-300 bg-emerald-50/30 text-emerald-950 focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
                            >
                              <option value="">Kıdemsiz Seçiniz...</option>
                              {kidemsizDoctors.map(doc => {
                                const isRec = recJunior?.id === doc.id;
                                const hol = doc.historicalHolidays || 0;
                                return (
                                  <option key={doc.id} value={doc.id}>
                                    {isRec ? '⭐ [ÖNERİLEN] ' : ''}#{doc.seniorityRank} {deriveSurname(doc.name) || doc.name} (Bayram: {hol}, Denge: {doc.shiftBalance || 0})
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Footer Controls */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Seçtiğiniz hekimlerin kotaları bu aya özel güncellenip liste hazırlanacaktır.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
            >
              Vazgeç
            </button>

            <button
              onClick={handleApplyFairAuto}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer"
              title="Geçmişte en az nöbet ve bayram tutanlara otomatik vererek listeyi hazırla"
            >
              <Award className="w-3.5 h-3.5 text-yellow-300" />
              <span>Adil Öneriyle Hazırla</span>
            </button>

            <button
              onClick={handleApplySelections}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/20 transition-all active:scale-98 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Seçimlerle Listeyi Hazırla</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
