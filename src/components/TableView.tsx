import React, { useState } from 'react';
import { 
  Moon, 
  Edit3,
  Calendar,
  Sparkles,
  Scissors,
  Check,
  Sliders,
  Users,
  AlertTriangle,
  AlertOctagon
} from 'lucide-react';
import { DayAssignment, Doctor, RuleConflict } from '../types';
import { deriveSurname } from '../utils/auth';

interface TableViewProps {
  days: DayAssignment[];
  doctors: Doctor[];
  departmentTitle?: string;
  monthName?: string;
  year?: number;
  conflicts?: RuleConflict[];
  isAdmin?: boolean;
  onSelectDay: (day: DayAssignment) => void;
  onUpdateDay?: (day: DayAssignment) => void;
  onGenerateSchedule?: () => void;
  onResetOnlySchedule?: () => void;
}

const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export const TableView: React.FC<TableViewProps> = ({
  days,
  doctors,
  departmentTitle = 'EÜTF ÜROLOJİ ANABİLİM DALI',
  monthName = 'EKİM',
  year = 2026,
  conflicts = [],
  isAdmin = true,
  onSelectDay,
  onUpdateDay,
  onGenerateSchedule,
  onResetOnlySchedule,
}) => {
  const [isInlineEdit, setIsInlineEdit] = useState<boolean>(false);

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
  
  const kidemliPool = React.useMemo(() => doctors.filter(d => d.seniority === 'kidemli'), [doctors]);
  const kidemsizPool = React.useMemo(() => doctors.filter(d => d.seniority === 'kidemsiz'), [doctors]);
  const clinicPool = React.useMemo(() => doctors.filter(d => !d.isOnlyAmeliyathane), [doctors]);
  const onlyOrDoctors = React.useMemo(() => doctors.filter(d => d.isOnlyAmeliyathane), [doctors]);

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

  const handleCellChange = (day: DayAssignment, field: string, newId: string) => {
    if (!onUpdateDay) return;

    const updated = { ...day };
    if (field === 'kidemli') {
      updated.kidemliNobetciId = newId || undefined;
      const otherId = updated.kidemsizNobetciId;
      updated.nobetciIds = [newId, otherId].filter((id): id is string => !!id);
    } else if (field === 'kidemsiz') {
      updated.kidemsizNobetciId = newId || undefined;
      const otherId = updated.kidemliNobetciId;
      updated.nobetciIds = [otherId, newId].filter((id): id is string => !!id);
    } else if (field === 'servis') {
      updated.servisIds = newId ? [newId] : [];
    } else if (field === 'konsultan') {
      updated.konsultanIds = newId ? [newId] : [];
    } else if (field === 'urodinami') {
      updated.urodinamiIds = newId ? [newId] : [];
    }

    onUpdateDay(updated);
  };

  return (
    <div className="flex flex-col xl:flex-row items-start gap-4 font-sans">
      
      {/* LEFT / MAIN TABLE (AMELİYATHANE HARİÇ ANA KLİNİK TABLOSU) */}
      <div className="flex-1 w-full bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        
        {/* Official Department Header Bar */}
        <div className="bg-slate-100/90 border-b border-slate-300 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide text-slate-900 uppercase">
              {departmentTitle} {monthName} {year} ASİSTAN ÇALIŞMA PROGRAMI
            </h2>
            <p className="text-[11px] text-slate-500">
              {isAdmin 
                ? (isInlineEdit ? 'Hücrelerden doğrudan hekim seçimi yapabilirsiniz.' : 'Detayları görmek veya düzenlemek için satıra tıklayabilirsiniz.')
                : 'Asistan görüntüleme modu. Gün detaylarını incelemek için satıra tıklayabilirsiniz.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Listeyi Hazırla Button (Admin Only) */}
            {isAdmin && onGenerateSchedule && (
              <button
                onClick={onGenerateSchedule}
                id="btn-table-generate-schedule"
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer"
                title="Kotalara ve aylık tercihlere göre listeyi otomatik oluştur"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Listeyi Hazırla</span>
              </button>
            )}

            {/* Listeyi Sıfırla Button (Admin Only) */}
            {isAdmin && onResetOnlySchedule && (
              <button
                onClick={onResetOnlySchedule}
                id="btn-table-reset-schedule"
                className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 hover:text-rose-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-98 cursor-pointer"
                title="Kadro ve tercihlere dokunmadan sadece oluşturulan listeyi sıfırla"
              >
                <span>Listeyi Sıfırla</span>
              </button>
            )}

            {/* Inline Edit Toggle Switch (Admin Only) */}
            {isAdmin && onUpdateDay && (
              <button
                onClick={() => setIsInlineEdit(!isInlineEdit)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                  isInlineEdit
                    ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isInlineEdit ? 'Düzenlemeyi Bitir' : 'Hızlı Düzenle'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-200/90 text-slate-900 font-bold border-b border-slate-400 text-xs uppercase tracking-tight">
                <th className="border-r border-slate-300 py-2 px-3 text-left min-w-[130px]">TARİH</th>
                <th className="border-r border-slate-300 py-2 px-2 min-w-[110px] bg-blue-50/70 text-blue-950 font-black">
                  KIDEMLİ
                </th>
                <th className="border-r border-slate-300 py-2 px-2 min-w-[110px] bg-amber-50/70 text-amber-950 font-black">
                  KIDEMSİZ
                </th>
                <th className="border-r border-slate-300 py-2 px-2 min-w-[140px]">POLİKLİNİK</th>
                <th className="border-r border-slate-300 py-2 px-2 min-w-[100px]">SERVİS</th>
                <th className="border-r border-slate-300 py-2 px-2 min-w-[110px]">ESWL+KONS</th>
                <th className="py-2 px-2 min-w-[110px]">ÜRODİNAMİ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {days.map(day => {
                const isWeekend = day.isWeekend;
                const isHoliday = day.isHoliday;

                // Format date: "1 Eylül 2026 Salı"
                const dateParts = day.date.split('-');
                const dayNum = parseInt(dateParts[2], 10);
                const formattedDate = `${dayNum} ${monthName} ${year} ${WEEKDAYS[day.dayOfWeek]}`;

                // Resolve Kıdemli
                const kidemliDoc = day.kidemliNobetciId 
                  ? docMap.get(day.kidemliNobetciId) 
                  : (day.nobetciIds[0] ? docMap.get(day.nobetciIds[0]) : null);

                // Resolve Kıdemsiz
                const kidemsizDoc = day.kidemsizNobetciId 
                  ? docMap.get(day.kidemsizNobetciId) 
                  : (day.nobetciIds[1] ? docMap.get(day.nobetciIds[1]) : null);

                // Resolve Poliklinik (Joined with /)
                const poliklinikText = day.poliklinikIds
                  .map(id => getDocSurname(docMap.get(id)))
                  .filter(Boolean)
                  .join('/');

                // Resolve Servis
                const servisDoc = day.servisIds[0] ? docMap.get(day.servisIds[0]) : null;
                const servisText = day.servisIds
                  .map(id => getDocSurname(docMap.get(id)))
                  .filter(Boolean)
                  .join(', ');

                // Resolve ESWL+Kons
                const konsultanDoc = day.konsultanIds[0] ? docMap.get(day.konsultanIds[0]) : null;
                const konsultanText = day.konsultanIds
                  .map(id => getDocSurname(docMap.get(id)))
                  .filter(Boolean)
                  .join(', ');

                // Resolve Ürodinami
                const urodinamiDoc = day.urodinamiIds?.[0] ? docMap.get(day.urodinamiIds[0]) : null;
                const urodinamiText = (day.urodinamiIds && day.urodinamiIds.length > 0)
                  ? day.urodinamiIds.map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ')
                  : '';

                return (
                  <tr
                    key={day.date}
                    onClick={() => {
                      if (!isInlineEdit) onSelectDay(day);
                    }}
                    className={`transition-colors border-b border-slate-300 font-medium ${
                      isHoliday
                        ? 'bg-rose-100/80 hover:bg-rose-100 font-semibold'
                        : isWeekend
                        ? 'bg-slate-200/85 hover:bg-slate-300/80 text-slate-900'
                        : 'bg-white hover:bg-blue-50/50'
                    } ${isInlineEdit ? '' : 'cursor-pointer'}`}
                  >
                    {/* TARİH */}
                    <td className="border-r border-slate-300 py-1.5 px-3 text-left font-mono text-[12px] sm:text-[13px] text-slate-900 whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {conflictsByDate.get(day.date)?.some(c => c.severity === 'error') ? (
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" title={conflictsByDate.get(day.date)?.[0]?.message} />
                          ) : conflictsByDate.get(day.date)?.length ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" title={conflictsByDate.get(day.date)?.[0]?.message} />
                          ) : null}
                          <span className={isWeekend ? 'font-bold' : ''}>{formattedDate}</span>
                        </div>
                        {isHoliday && (
                          <span className="ml-1 text-[10px] text-rose-700 font-bold px-1.5 py-0.2 rounded bg-rose-200">
                            {day.holidayName || 'Bayram'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* KIDEMLİ (Inline Selectable) */}
                    <td className="border-r border-slate-300 py-1.5 px-1.5 font-bold text-slate-900 uppercase">
                      {isInlineEdit ? (
                        <select
                          value={kidemliDoc?.id || ''}
                          onChange={e => handleCellChange(day, 'kidemli', e.target.value)}
                          className="w-full text-xs font-bold p-1 rounded border border-blue-300 bg-blue-50/90 text-blue-950 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">— Boş —</option>
                          {kidemliPool.map(d => (
                            <option key={d.id} value={d.id}>
                              {getDocSurname(d) || d.name}
                            </option>
                          ))}
                        </select>
                      ) : kidemliDoc && getDocSurname(kidemliDoc) ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100/50 text-blue-950 font-black">
                          {getDocSurname(kidemliDoc)}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">—</span>
                      )}
                    </td>

                    {/* KIDEMSİZ (Inline Selectable) */}
                    <td className="border-r border-slate-300 py-1.5 px-1.5 font-bold text-slate-900 uppercase">
                      {isInlineEdit ? (
                        <select
                          value={kidemsizDoc?.id || ''}
                          onChange={e => handleCellChange(day, 'kidemsiz', e.target.value)}
                          className="w-full text-xs font-bold p-1 rounded border border-amber-300 bg-amber-50/90 text-amber-950 focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="">— Boş —</option>
                          {kidemsizPool.map(d => (
                            <option key={d.id} value={d.id}>
                              {getDocSurname(d) || d.name}
                            </option>
                          ))}
                        </select>
                      ) : kidemsizDoc && getDocSurname(kidemsizDoc) ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100/50 text-amber-950 font-black">
                          {getDocSurname(kidemsizDoc)}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">—</span>
                      )}
                    </td>

                    {/* POLİKLİNİK */}
                    <td className="border-r border-slate-300 py-1.5 px-2 font-semibold text-slate-900 uppercase whitespace-nowrap">
                      {poliklinikText ? (
                        <span className="font-mono tracking-tight font-bold">{poliklinikText}</span>
                      ) : isWeekend ? (
                        <span className="text-transparent select-none">—</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* SERVİS (Inline Selectable) */}
                    <td className="border-r border-slate-300 py-1.5 px-1.5 font-semibold text-slate-900 uppercase">
                      {isInlineEdit && !isWeekend ? (
                        <select
                          value={servisDoc?.id || ''}
                          onChange={e => handleCellChange(day, 'servis', e.target.value)}
                          className="w-full text-xs p-1 rounded border border-slate-300 bg-white"
                        >
                          <option value="">—</option>
                          {clinicPool.map(d => (
                            <option key={d.id} value={d.id}>
                              {getDocSurname(d) || d.name}
                            </option>
                          ))}
                        </select>
                      ) : servisText ? (
                        <span className="font-bold">{servisText}</span>
                      ) : isWeekend ? (
                        <span className="text-transparent select-none">—</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* ESWL+KONS (Inline Selectable) */}
                    <td className="border-r border-slate-300 py-1.5 px-1.5 font-semibold text-slate-900 uppercase">
                      {isInlineEdit && !isWeekend ? (
                        <select
                          value={konsultanDoc?.id || ''}
                          onChange={e => handleCellChange(day, 'konsultan', e.target.value)}
                          className="w-full text-xs p-1 rounded border border-slate-300 bg-white"
                        >
                          <option value="">—</option>
                          {clinicPool.map(d => (
                            <option key={d.id} value={d.id}>
                              {getDocSurname(d) || d.name}
                            </option>
                          ))}
                        </select>
                      ) : konsultanText ? (
                        <span className="font-bold">{konsultanText}</span>
                      ) : isWeekend ? (
                        <span className="text-transparent select-none">—</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* ÜRODİNAMİ (Inline Selectable) */}
                    <td className="py-1.5 px-1.5 font-semibold text-slate-900 uppercase">
                      {isInlineEdit && !isWeekend ? (
                        <select
                          value={urodinamiDoc?.id || ''}
                          onChange={e => handleCellChange(day, 'urodinami', e.target.value)}
                          className="w-full text-xs p-1 rounded border border-slate-300 bg-white"
                        >
                          <option value="">—</option>
                          {clinicPool.map(d => (
                            <option key={d.id} value={d.id}>
                              {getDocSurname(d) || d.name}
                            </option>
                          ))}
                        </select>
                      ) : urodinamiText ? (
                        <span className="font-bold">{urodinamiText}</span>
                      ) : isWeekend ? (
                        <span className="text-transparent select-none">—</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* 6. SAĞ YAN PANEL: AMELİYATHANE EKİBİ & PROGRAMI */}
      <div className="w-full xl:w-72 shrink-0 bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-100/90 border-b border-slate-300 px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-xs uppercase tracking-wide text-slate-900">
              Ameliyathane Ekibi
            </h3>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">
            {onlyOrDoctors.length} Sabit
          </span>
        </div>

        {/* Section 1: Sadece Ameliyathane Yapan Kıdemliler */}
        <div className="p-3 border-b border-slate-200 bg-slate-50/50">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Sadece Ameliyathane Yapanlar
          </span>
          {onlyOrDoctors.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">
              Tüm hekimler klinik döngüsündedir.
            </p>
          ) : (
            <div className="space-y-1.5">
              {onlyOrDoctors.map(doc => (
                <div 
                  key={doc.id}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900 flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: doc.color }}
                    />
                    <span>{getDocSurname(doc) || doc.name}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                    OR
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Gün Bazlı Ameliyathane Sorumluları */}
        <div className="p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Günlük Ameliyathane Dağılımı
          </span>
          
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1 divide-y divide-slate-100 text-xs">
            {days.map(day => {
              const dayNum = parseInt(day.date.split('-')[2], 10);
              const dow = WEEKDAYS[day.dayOfWeek];
              const orNames = (day.ameliyathaneIds || [])
                .map(id => getDocSurname(docMap.get(id)))
                .filter(Boolean)
                .join(', ');

              return (
                <div 
                  key={day.date} 
                  className={`pt-1.5 pb-1 flex items-start justify-between gap-1.5 ${
                    day.isWeekend ? 'text-slate-400' : 'text-slate-800'
                  }`}
                >
                  <span className="font-mono text-[11px] font-semibold text-slate-600 shrink-0">
                    {dayNum} {dow.slice(0, 3)}:
                  </span>
                  <span className="text-[11px] text-right font-medium truncate" title={orNames}>
                    {orNames || (day.isWeekend ? 'İcap/Nöbetçi' : '—')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
