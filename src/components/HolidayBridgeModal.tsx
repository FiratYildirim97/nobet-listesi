import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Calendar, 
  Check, 
  RotateCcw, 
  Info, 
  Sun, 
  AlertCircle,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import { MonthlyRoster, DayAssignment, HolidayInfo } from '../types';
import { TURKISH_OFFICIAL_HOLIDAYS, getHolidayForDate } from '../data/holidays';

interface HolidayBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roster: MonthlyRoster | null;
  onSaveRosterDays: (updatedDays: DayAssignment[], customHolidays: HolidayInfo[]) => void;
  onReScheduleNeeded?: () => void;
}

const WEEKDAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export const HolidayBridgeModal: React.FC<HolidayBridgeModalProps> = ({
  isOpen,
  onClose,
  roster,
  onSaveRosterDays,
  onReScheduleNeeded,
}) => {
  if (!isOpen || !roster) return null;

  // Local state copy of days
  const [editingDays, setEditingDays] = useState<DayAssignment[]>(() => 
    JSON.parse(JSON.stringify(roster.days || []))
  );

  // Keep track of custom/bridged holidays
  const [customHolidays, setCustomHolidays] = useState<HolidayInfo[]>(() => 
    JSON.parse(JSON.stringify(roster.customHolidays || []))
  );

  const [hasChanged, setHasChanged] = useState(false);

  // Toggle a day as bridged holiday / normal day
  const handleToggleDayHoliday = (dateStr: string, defaultName: string = 'İdari İzin / Bayram Köprüsü') => {
    setEditingDays(prevDays => {
      return prevDays.map(day => {
        if (day.date !== dateStr) return day;

        // Check if it's already an official holiday
        const official = TURKISH_OFFICIAL_HOLIDAYS.find(h => h.date === dateStr);
        if (official) {
          // It's an official holiday, user is toggling if it was somehow overridden
          return day;
        }

        const currentlyHoliday = !!day.isHoliday;
        const newIsHoliday = !currentlyHoliday;

        return {
          ...day,
          isHoliday: newIsHoliday,
          isBridgeHoliday: newIsHoliday,
          isWeekendLike: day.isWeekend || newIsHoliday,
          holidayName: newIsHoliday ? defaultName : undefined,
        };
      });
    });

    setCustomHolidays(prevCustom => {
      const exists = prevCustom.find(h => h.date === dateStr);
      if (exists) {
        return prevCustom.filter(h => h.date !== dateStr);
      } else {
        return [
          ...prevCustom,
          {
            date: dateStr,
            name: defaultName,
            isBridgeHoliday: true,
            isWeekendLike: true,
          }
        ];
      }
    });

    setHasChanged(true);
  };

  // 1-Click Bridge Wizard: Detect single working days sandwiched between weekend/holidays
  const handleAutoBridgeSandwichedDays = () => {
    let bridgedCount = 0;
    const newDays = [...editingDays];
    const newCustom = [...customHolidays];

    for (let i = 0; i < newDays.length; i++) {
      const day = newDays[i];
      if (day.isWeekend || day.isHoliday) continue;

      // Check previous and next days
      const isPrevOff = i === 0 ? false : (newDays[i - 1].isWeekend || newDays[i - 1].isHoliday);
      const isNextOff = i === newDays.length - 1 ? false : (newDays[i + 1].isWeekend || newDays[i + 1].isHoliday);

      // If sandwiched between off days (e.g. Friday after Thursday holiday or Monday before Tuesday holiday)
      if (isPrevOff && isNextOff) {
        day.isHoliday = true;
        day.isBridgeHoliday = true;
        day.isWeekendLike = true;
        day.holidayName = 'İdari İzin (Birleştirilen Köprü Günü)';
        bridgedCount++;

        if (!newCustom.some(h => h.date === day.date)) {
          newCustom.push({
            date: day.date,
            name: 'İdari İzin (Birleştirilen Köprü Günü)',
            isBridgeHoliday: true,
            isWeekendLike: true,
          });
        }
      }
    }

    if (bridgedCount > 0) {
      setEditingDays(newDays);
      setCustomHolidays(newCustom);
      setHasChanged(true);
    } else {
      alert('Bu ayda tatil günleri arasında kalan tekil bir çalışma günü (köprü günü) bulunamadı.');
    }
  };

  // Reset to original official calendar
  const handleResetToOfficialHolidays = () => {
    const cleanDays = editingDays.map(day => {
      const official = TURKISH_OFFICIAL_HOLIDAYS.find(h => h.date === day.date);
      const isHoliday = !!official;
      return {
        ...day,
        isHoliday,
        isBridgeHoliday: false,
        isWeekendLike: day.isWeekend || isHoliday,
        holidayName: official?.name,
        isHalfDayHoliday: official?.isHalfDay,
      };
    });

    setEditingDays(cleanDays);
    setCustomHolidays([]);
    setHasChanged(true);
  };

  const handleSave = () => {
    onSaveRosterDays(editingDays, customHolidays);
    if (onReScheduleNeeded) {
      onReScheduleNeeded();
    }
    onClose();
  };

  // Stats calculation
  const totalDays = editingDays.length;
  const weekendDays = editingDays.filter(d => d.isWeekend).length;
  const officialHolidaysCount = editingDays.filter(d => {
    const isOff = TURKISH_OFFICIAL_HOLIDAYS.some(h => h.date === d.date);
    return isOff && !d.isWeekend;
  }).length;
  const bridgedHolidaysCount = editingDays.filter(d => d.isBridgeHoliday).length;
  const totalWeekendLikeDays = editingDays.filter(d => d.isWeekend || d.isHoliday).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-700 via-orange-700 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-200 border border-white/20 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Bayram ve Tatil Birleştirme Sihirbazı
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/30 text-amber-100 border border-amber-400/30">
                  {roster.monthName} {roster.year}
                </span>
              </div>
              <p className="text-xs text-amber-100/80">
                Köprü günlerini ve idari izinleri hafta sonu / tatil nöbeti statüsüne bağlayın.
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

        {/* Stats & Quick Actions Toolbar */}
        <div className="px-6 py-3 bg-amber-50/60 border-b border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium text-slate-700">
              Toplam Gün: <strong>{totalDays}</strong>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 font-medium text-amber-900">
              Hafta Sonu: <strong>{weekendDays}</strong>
            </div>
            {officialHolidaysCount > 0 && (
              <div className="px-2.5 py-1 rounded-lg bg-rose-100 border border-rose-300 font-medium text-rose-900">
                Resmi Bayram: <strong>{officialHolidaysCount}</strong>
              </div>
            )}
            {bridgedHolidaysCount > 0 && (
              <div className="px-2.5 py-1 rounded-lg bg-purple-100 border border-purple-300 font-bold text-purple-900">
                Birleştirilen: <strong>{bridgedHolidaysCount}</strong>
              </div>
            )}
            <div className="px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-300 font-extrabold text-emerald-900">
              Toplam Tatil/H.Sonu: <strong>{totalWeekendLikeDays} Gün</strong>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAutoBridgeSandwichedDays}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Hafta sonları veya bayramlar arasında kalan tekil günleri otomatik birleştirir"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Köprü Günlerini Birleştir</span>
            </button>
            <button
              onClick={handleResetToOfficialHolidays}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Sadece resmi takvimdeki tatillere dön"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Sıfırla</span>
            </button>
          </div>
        </div>

        {/* Guidance Alert */}
        <div className="px-6 py-2 bg-blue-50/70 border-b border-blue-200 text-xs text-blue-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Nasıl Çalışır?</strong> Aşağıdaki listede bir çalışma gününü tatil olarak işaretlediğinizde, o gün otomatik olarak 
            <strong> Hafta Sonu / Tatil Nöbeti</strong> statüsüne geçer. Asistanların hafta sonu kotasından sayılır ve gündüz poliklinik kapalı kabul edilir.
          </span>
        </div>

        {/* Month Days List */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {editingDays.map(day => {
              const dateParts = day.date.split('-');
              const dayNum = parseInt(dateParts[2], 10);
              const weekdayName = WEEKDAY_NAMES[day.dayOfWeek];
              const isOfficial = TURKISH_OFFICIAL_HOLIDAYS.some(h => h.date === day.date);
              const isBridge = !!day.isBridgeHoliday;
              const isOff = day.isWeekend || day.isHoliday;

              return (
                <div
                  key={day.date}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isBridge 
                      ? 'bg-purple-50/80 border-purple-300 shadow-xs' 
                      : isOfficial 
                      ? 'bg-rose-50/80 border-rose-300 shadow-xs'
                      : day.isWeekend 
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Left: Date info */}
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                      isBridge
                        ? 'bg-purple-600 text-white shadow-xs'
                        : isOfficial
                        ? 'bg-rose-600 text-white shadow-xs'
                        : day.isWeekend
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {dayNum}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {dayNum} {roster.monthName} {roster.year}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          ({weekdayName})
                        </span>
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {isBridge ? (
                          <span className="font-extrabold text-purple-700 flex items-center gap-1">
                            <span>🟣</span>
                            <span>{day.holidayName || 'Birleştirilen Bayram / İdari Tatil'}</span>
                          </span>
                        ) : isOfficial ? (
                          <span className="font-extrabold text-rose-700 flex items-center gap-1">
                            <span>🔴</span>
                            <span>{day.holidayName || 'Resmi Tatil / Bayram'}</span>
                          </span>
                        ) : day.isWeekend ? (
                          <span className="font-bold text-amber-700">Hafta Sonu</span>
                        ) : (
                          <span className="text-slate-400">Normal Çalışma Günü</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Toggle Button */}
                  <div>
                    {isOfficial ? (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-[11px] font-bold select-none">
                        Resmi Bayram
                      </span>
                    ) : day.isWeekend ? (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-bold select-none">
                        Hafta Sonu
                      </span>
                    ) : isBridge ? (
                      <button
                        type="button"
                        onClick={() => handleToggleDayHoliday(day.date)}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                        title="Bu günü normal çalışma gününe çevir"
                      >
                        Normale Çevir
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleDayHoliday(day.date)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-purple-300 hover:bg-purple-50 text-purple-700 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                        title="Bu günü idari tatil / bayram köprüsü olarak birleştir"
                      >
                        + Tatil Birleştir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
          <div className="text-xs text-slate-500 font-medium">
            {hasChanged && (
              <span className="text-amber-700 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Değişiklikler yapıldı. Kaydettikten sonra çizelgeyi otomatik dağıtabilirsiniz.</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Tatil Düzenini Kaydet</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
