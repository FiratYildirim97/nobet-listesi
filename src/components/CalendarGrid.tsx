import React from 'react';
import { 
  Moon, 
  Stethoscope, 
  Building2, 
  UserCheck, 
  Plus,
  Activity,
  Scissors
} from 'lucide-react';
import { DayAssignment, Doctor, RuleConflict } from '../types';
import { AlertTriangle, AlertOctagon } from 'lucide-react';
import { deriveSurname } from '../utils/auth';

interface CalendarGridProps {
  days: DayAssignment[];
  doctors: Doctor[];
  currentYear: number;
  currentMonth: number;
  conflicts?: RuleConflict[];
  onSelectDay: (day: DayAssignment) => void;
}

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  doctors,
  currentYear,
  currentMonth,
  conflicts = [],
  onSelectDay,
}) => {
  const docMap = React.useMemo(() => new Map<string, Doctor>(doctors.map(d => [d.id, d])), [doctors]);

  const getDocSurname = (doc?: Doctor | null): string => {
    if (!doc) return '';
    if (doc.shortName && !doc.shortName.toLowerCase().startsWith('asistan') && !/^\d+$/.test(doc.shortName.trim())) {
      return doc.shortName.toUpperCase();
    }
    if (doc.name) {
      const derived = deriveSurname(doc.name);
      if (derived && !derived.toLowerCase().startsWith('asistan') && !/^\d+$/.test(derived.trim())) {
        return derived;
      }
      if (!/^\d+$/.test(doc.name.trim()) && !doc.name.toLowerCase().startsWith('asistan')) {
        return doc.name.toUpperCase();
      }
    }
    return '';
  };
  const conflictsByDate = React.useMemo(() => {
    const map = new Map<string, RuleConflict[]>();
    conflicts.forEach(c => {
      if (c.date) {
        const list = map.get(c.date) || [];
        list.push(c);
        map.set(c.date, list);
      }
    });
    return map;
  }, [conflicts]);

  if (days.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
        Henüz bu ay için bir çizelge oluşturulmadı.
      </div>
    );
  }

  // Calculate leading blanks for the first day of month (Monday-based)
  // DayOfWeek in JavaScript: 0=Pazar, 1=Pazartesi ... 6=Cumartesi
  const firstDay = days[0];
  const firstDayOfWeek = firstDay.dayOfWeek === 0 ? 6 : firstDay.dayOfWeek - 1; // 0 for Pazartesi, 6 for Pazar

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/75 text-center text-xs font-bold text-slate-600">
        {WEEKDAYS.map((wd, index) => {
          const isWknd = index >= 5;
          return (
            <div
              key={wd}
              className={`py-2.5 ${isWknd ? 'text-amber-700 bg-amber-50/40' : ''}`}
            >
              {wd}
            </div>
          );
        })}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
        {/* Leading empty cells */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`blank-${i}`} className="min-h-[110px] bg-slate-50/40 p-2" />
        ))}

        {/* Days of the month */}
        {days.map(day => {
          const dayNumber = parseInt(day.date.split('-')[2], 10);
          const isWeekend = day.isWeekend;
          const isHoliday = day.isHoliday;

          // Resolve Kıdemli & Kıdemsiz
          const kidemliDoc = day.kidemliNobetciId
            ? docMap.get(day.kidemliNobetciId)
            : (day.nobetciIds[0] ? docMap.get(day.nobetciIds[0]) : null);

          const kidemsizDoc = day.kidemsizNobetciId
            ? docMap.get(day.kidemsizNobetciId)
            : (day.nobetciIds[1] ? docMap.get(day.nobetciIds[1]) : null);

          const poliklinikText = day.poliklinikIds.map(id => getDocSurname(docMap.get(id))).filter(Boolean).join('/');
          const servisText = day.servisIds.map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ');
          const konsText = day.konsultanIds.map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ');
          const urodinamiText = (day.urodinamiIds || []).map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ');
          const orText = (day.ameliyathaneIds || []).map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ');

          return (
            <div
              key={day.date}
              onClick={() => onSelectDay(day)}
              className={`min-h-[115px] p-2 transition-all hover:bg-blue-50/40 cursor-pointer flex flex-col justify-between group ${
                isHoliday
                  ? 'bg-rose-50/30'
                  : isWeekend
                  ? 'bg-slate-100/70'
                  : ''
              }`}
            >
              {/* Day Header */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                        isHoliday
                          ? 'bg-rose-600 text-white'
                          : isWeekend
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-800 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-colors'
                      }`}
                    >
                      {dayNumber}
                    </span>
                    {conflictsByDate.get(day.date)?.some(c => c.severity === 'error') ? (
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" title={conflictsByDate.get(day.date)?.[0]?.message} />
                    ) : conflictsByDate.get(day.date)?.length ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" title={conflictsByDate.get(day.date)?.[0]?.message} />
                    ) : null}
                  </div>

                  {isHoliday && (
                    <span
                      className="px-1 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 truncate max-w-[80px]"
                      title={day.holidayName}
                    >
                      {day.holidayName || 'Bayram'}
                    </span>
                  )}
                </div>

                {/* Duty badges container */}
                <div className="space-y-1">
                  
                  {/* KIDEMLİ NÖBETÇİ */}
                  {kidemliDoc && getDocSurname(kidemliDoc) && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-bold border border-blue-200">
                      <span className="text-[9px] font-black text-blue-600">KID:</span>
                      <span className="truncate">{getDocSurname(kidemliDoc)}</span>
                    </div>
                  )}

                  {/* KIDEMSİZ NÖBETÇİ */}
                  {kidemsizDoc && getDocSurname(kidemsizDoc) && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-200">
                      <span className="text-[9px] font-black text-amber-600">KDS:</span>
                      <span className="truncate">{getDocSurname(kidemsizDoc)}</span>
                    </div>
                  )}

                  {/* POLİKLİNİK */}
                  {poliklinikText && (
                    <div className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] text-slate-800 font-semibold truncate">
                      <span className="text-slate-500 font-normal">Pol: </span>
                      {poliklinikText}
                    </div>
                  )}

                  {/* SERVİS & ESWL+KONS */}
                  {(servisText || konsText) && (
                    <div className="flex items-center gap-1 text-[9px] text-slate-600 truncate">
                      {servisText && <span className="truncate"><b className="text-emerald-700">S:</b> {servisText}</span>}
                      {konsText && <span className="truncate"><b className="text-purple-700">E:</b> {konsText}</span>}
                    </div>
                  )}

                  {/* ÜRODİNAMİ & AMELİYATHANE */}
                  {(urodinamiText || orText) && (
                    <div className="flex items-center gap-1 text-[8px] text-slate-500 truncate">
                      {urodinamiText && <span className="truncate">Üro: {urodinamiText}</span>}
                      {orText && <span className="truncate">Amel: {orText}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom indicators (Resting / Off) */}
              <div className="pt-1 flex items-center justify-between text-[9px] text-slate-400">
                {day.dinlenmeIds.length > 0 && (
                  <span className="text-slate-400 text-[8px]">
                    N.E. Dinlenme: {day.dinlenmeIds.length}
                  </span>
                )}
                {day.izinliIds.length > 0 && (
                  <span className="text-rose-500 font-semibold text-[8px]">
                    İzinli: {day.izinliIds.length}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
