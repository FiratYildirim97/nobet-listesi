import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  X, 
  Check, 
  Trash2, 
  Sun, 
  Sparkles,
  Ban,
  Star
} from 'lucide-react';
import { Doctor } from '../types';
import { getDaysInMonth, formatDateStr } from '../utils/scheduler';
import { getHolidayForDate } from '../data/holidays';

interface CalendarMultiDatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentYear: number;
  currentMonth: number;
  doctor: Doctor;
  onSave: (unavailableDates: string[], preferredDates: string[]) => void;
}

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const CalendarMultiDatePicker: React.FC<CalendarMultiDatePickerProps> = ({
  isOpen,
  onClose,
  currentYear,
  currentMonth,
  doctor,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'unavailable' | 'preferred'>('unavailable');
  const [unavailable, setUnavailable] = useState<string[]>(() => [...(doctor.unavailableDates || [])]);
  const [preferred, setPreferred] = useState<string[]>(() => [...(doctor.preferredDates || [])]);

  // Sync state when opened
  React.useEffect(() => {
    if (isOpen) {
      setUnavailable([...(doctor.unavailableDates || [])]);
      setPreferred([...(doctor.preferredDates || [])]);
    }
  }, [isOpen, doctor]);

  if (!isOpen) return null;

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  // Calculate leading blanks (Monday-based)
  const firstDateObj = new Date(currentYear, currentMonth - 1, 1);
  const firstDayOfWeek = firstDateObj.getDay() === 0 ? 6 : firstDateObj.getDay() - 1;

  // Toggle date
  const handleToggleDate = (dateStr: string) => {
    if (activeTab === 'unavailable') {
      if (unavailable.includes(dateStr)) {
        setUnavailable(prev => prev.filter(d => d !== dateStr));
      } else {
        setUnavailable(prev => [...prev, dateStr].sort());
        // Remove from preferred if present
        setPreferred(prev => prev.filter(d => d !== dateStr));
      }
    } else {
      if (preferred.includes(dateStr)) {
        setPreferred(prev => prev.filter(d => d !== dateStr));
      } else {
        setPreferred(prev => [...prev, dateStr].sort());
        // Remove from unavailable if present
        setUnavailable(prev => prev.filter(d => d !== dateStr));
      }
    }
  };

  // Quick select all weekends for leave
  const handleSelectWeekends = () => {
    const weekendDates: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentYear, currentMonth - 1, day);
      if (d.getDay() === 0 || d.getDay() === 6) {
        weekendDates.push(formatDateStr(currentYear, currentMonth, day));
      }
    }
    if (activeTab === 'unavailable') {
      const merged = Array.from(new Set([...unavailable, ...weekendDates])).sort();
      setUnavailable(merged);
    } else {
      const merged = Array.from(new Set([...preferred, ...weekendDates])).sort();
      setPreferred(merged);
    }
  };

  const handleSaveAndClose = () => {
    onSave(unavailable, preferred);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
              style={{ backgroundColor: doctor.color || '#2563EB' }}
            >
              {doctor.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {doctor.name} - Takvimden Toplu Tarih Seçimi
              </h3>
              <p className="text-[11px] text-slate-500">
                {MONTH_NAMES[currentMonth - 1]} {currentYear} ayı için günlere tıklayarak işaretleyin
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Mode */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl text-xs w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('unavailable')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'unavailable'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>İzinli / Mazeret ({unavailable.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('preferred')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'preferred'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Nöbet İstek ({preferred.length})</span>
            </button>
          </div>

          {/* Quick actions */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={handleSelectWeekends}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold flex items-center gap-1"
              title="Bu aydaki tüm hafta sonlarını seçer"
            >
              <Sun className="w-3 h-3 text-amber-500" />
              <span>Hafta Sonları</span>
            </button>
          </div>
        </div>

        {/* Calendar Month Grid */}
        <div className="p-5">
          {/* Weekdays header */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-500 mb-2">
            {WEEKDAYS.map((wd, i) => (
              <span key={wd} className={i >= 5 ? 'text-amber-700' : ''}>
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Blank leading days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-11 rounded-lg bg-slate-50/50" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDateStr(currentYear, currentMonth, day);
              const isUnav = unavailable.includes(dateStr);
              const isPref = preferred.includes(dateStr);
              const holiday = getHolidayForDate(dateStr);
              const dow = new Date(currentYear, currentMonth - 1, day).getDay();
              const isWeekend = dow === 0 || dow === 6;

              return (
                <button
                  key={dateStr}
                  onClick={() => handleToggleDate(dateStr)}
                  className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition-all border font-semibold text-xs ${
                    isUnav
                      ? 'bg-rose-500 border-rose-600 text-white font-bold shadow-xs scale-98'
                      : isPref
                      ? 'bg-emerald-500 border-emerald-600 text-white font-bold shadow-xs scale-98'
                      : isWeekend
                      ? 'bg-slate-100/90 border-slate-200 text-slate-800 hover:border-slate-400'
                      : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                >
                  <span className="leading-none">{day}</span>
                  
                  {isUnav ? (
                    <span className="text-[9px] uppercase tracking-tight text-rose-100 leading-tight">İzin</span>
                  ) : isPref ? (
                    <span className="text-[9px] uppercase tracking-tight text-emerald-100 leading-tight">İstek</span>
                  ) : holiday ? (
                    <span className="text-[8px] text-rose-600 font-bold truncate max-w-[40px]" title={holiday.name}>
                      Bayram
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Help & Legend */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                İzinli (Nöbet Tutamaz)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Nöbet İsteği
              </span>
            </div>

            <button
              onClick={() => {
                if (activeTab === 'unavailable') setUnavailable([]);
                else setPreferred([]);
              }}
              className="text-slate-400 hover:text-rose-600 font-medium"
            >
              Seçimleri Temizle
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            İptal
          </button>

          <button
            onClick={handleSaveAndClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-98 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Kaydet ve Kapat</span>
          </button>
        </div>

      </div>
    </div>
  );
};
