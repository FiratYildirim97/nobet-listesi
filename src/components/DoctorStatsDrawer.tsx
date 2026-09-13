import React, { useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Moon, 
  Scale,
  Award,
  ChevronDown
} from 'lucide-react';
import { Doctor, DayAssignment } from '../types';

interface DoctorStatsDrawerProps {
  doctors: Doctor[];
  days: DayAssignment[];
  onSelectDoctorFilter?: (doctorId: string | null) => void;
}

export const DoctorStatsDrawer: React.FC<DoctorStatsDrawerProps> = ({
  doctors,
  days,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  // Compute this month's stats per doctor
  const stats = doctors.map(doc => {
    let totalAssigned = 0;
    let weekendAssigned = 0;
    let weekdayAssigned = 0;
    let holidayAssigned = 0;
    let consecutiveDutyErrors = 0;

    days.forEach((d, idx) => {
      const isNobetci = 
        d.kidemliNobetciId === doc.id ||
        d.kidemsizNobetciId === doc.id ||
        d.nobetciIds.includes(doc.id);

      if (isNobetci) {
        totalAssigned++;
        const isSpecialOrWeekend = d.isWeekend || d.isHoliday;
        if (isSpecialOrWeekend) {
          weekendAssigned++;
        } else {
          weekdayAssigned++;
        }
        if (d.isHoliday) holidayAssigned++;

        // Check consecutive shift
        if (idx > 0) {
          const prevDay = days[idx - 1];
          if (
            prevDay.kidemliNobetciId === doc.id ||
            prevDay.kidemsizNobetciId === doc.id ||
            prevDay.nobetciIds.includes(doc.id)
          ) {
            consecutiveDutyErrors++;
          }
        }
      }
    });

    const targetWeekday = Math.max(0, doc.targetTotalShifts - doc.targetWeekendShifts);
    const totalDiff = totalAssigned - doc.targetTotalShifts;
    const weekendDiff = weekendAssigned - doc.targetWeekendShifts;
    const weekdayDiff = weekdayAssigned - targetWeekday;

    return {
      doc,
      totalAssigned,
      weekendAssigned,
      weekdayAssigned,
      targetWeekday,
      holidayAssigned,
      totalDiff,
      weekendDiff,
      weekdayDiff,
      consecutiveDutyErrors,
    };
  });

  const kidemliStats = stats.filter(s => s.doc.seniority === 'kidemli');
  const kidemsizStats = stats.filter(s => s.doc.seniority === 'kidemsiz');

  const renderCard = ({ 
    doc, 
    totalAssigned, 
    weekendAssigned, 
    weekdayAssigned, 
    targetWeekday, 
    holidayAssigned, 
    totalDiff, 
    weekendDiff, 
    weekdayDiff, 
    consecutiveDutyErrors 
  }: typeof stats[0]) => {
    const isTotalMet = totalDiff === 0;
    const isWeekendMet = weekendDiff === 0;

    return (
      <div
        key={doc.id}
        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all text-xs"
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-extrabold text-slate-900 truncate">
              {doc.name}
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500">
            {doc.targetTotalShifts > 0 ? `${totalAssigned}/${doc.targetTotalShifts} Nöbet` : 'Nöbetsiz'}
          </span>
        </div>

        {doc.targetTotalShifts > 0 ? (
          <div className="space-y-1 text-[11px]">
            {/* Hafta İçi */}
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>Hafta İçi:</span>
              <span className={`font-mono font-semibold ${weekdayDiff === 0 ? 'text-slate-800' : 'text-amber-700'}`}>
                {weekdayAssigned} / {targetWeekday}
              </span>
            </div>

            {/* Weekend & Special Days */}
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span title="Cumartesi, Pazar ve Resmi Tatiller / Özel Günler">H.Sonu & Tatil:</span>
              <span className={`font-mono font-semibold ${isWeekendMet ? 'text-emerald-700' : 'text-amber-700'}`}>
                {weekendAssigned} / {doc.targetWeekendShifts}
                {holidayAssigned > 0 && (
                  <span className="ml-1 text-[9px] text-rose-600 font-bold" title="Bu nöbetlerin içinde resmi tatil var">
                    ({holidayAssigned} bayram)
                  </span>
                )}
              </span>
            </div>

            {/* Total progress */}
            <div className="flex items-center justify-between pt-0.5 border-t border-slate-200/80 font-bold">
              <span className="text-slate-800 flex items-center gap-1">
                <Moon className="w-2.5 h-2.5 text-blue-600" />
                <span>Toplam:</span>
              </span>
              <span className="font-mono">
                {totalAssigned} / {doc.targetTotalShifts}
                {totalDiff !== 0 && (
                  <span className={`ml-1 text-[10px] ${totalDiff > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                    ({totalDiff > 0 ? `+${totalDiff}` : totalDiff})
                  </span>
                )}
              </span>
            </div>

            {/* Warning if consecutive shift occurred */}
            {consecutiveDutyErrors > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-rose-600 font-bold bg-rose-50 p-1 rounded">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Üst üste gün nöbeti var!</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 italic py-1">
            Nöbet kotası yok (Ameliyathane/Klinik)
          </div>
        )}
      </div>
    );
  };

  const totalMismatches = stats.filter(s => s.doc.targetTotalShifts > 0 && (s.totalDiff !== 0 || s.weekendDiff !== 0)).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden mb-4 transition-all">
      {/* Sleek single-line summary bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 transition-colors text-xs cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-slate-800">
            Hekim Nöbet Kotaları & Dağılım Dengesi
          </span>
          {totalMismatches === 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              <span>Tüm Kotalar %100 Uyumlu</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="w-3 h-3" />
              <span>{totalMismatches} Hekimde Kota Farkı</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 font-medium text-[11px]">
          <span>{isExpanded ? 'Gizle' : 'Detayları Göster'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Collapsible Card Details */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/40 space-y-4 animate-in fade-in duration-150">
          {/* KIDEMLİ ASİSTANLAR */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-blue-900 uppercase tracking-tight">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              <span>Kıdemli Asistanlar ({kidemliStats.length} Hekim)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {kidemliStats.map(renderCard)}
            </div>
          </div>

          {/* KIDEMSİZ ASİSTANLAR */}
          <div className="pt-2 border-t border-slate-200/70">
            <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-amber-900 uppercase tracking-tight">
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              <span>Kıdemsiz Asistanlar ({kidemsizStats.length} Hekim)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {kidemsizStats.map(renderCard)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
