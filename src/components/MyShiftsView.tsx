import React, { useState, useMemo } from 'react';
import { 
  User, 
  Calendar, 
  Moon, 
  Sun, 
  Coffee, 
  Umbrella, 
  Download, 
  Share2, 
  Check, 
  Flame, 
  Award, 
  Clock, 
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';
import { MonthlyRoster, Doctor, DayAssignment } from '../types';
import { exportDoctorToIcs, generateWhatsAppScheduleText, downloadFile } from '../utils/exportCalendar';

interface MyShiftsViewProps {
  roster: MonthlyRoster | null;
  doctors: Doctor[];
  onSelectDay: (day: DayAssignment) => void;
  onOpenSwap?: () => void;
}

const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export const MyShiftsView: React.FC<MyShiftsViewProps> = ({
  roster,
  doctors,
  onSelectDay,
  onOpenSwap,
}) => {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => {
    return localStorage.getItem('nobet_my_doctor_id') || (doctors[0]?.id || '');
  });
  const [filterMode, setFilterMode] = useState<'all' | 'assigned_only'>('assigned_only');
  const [copied, setCopied] = useState<boolean>(false);

  const selectedDoctor = useMemo(() => {
    return doctors.find(d => d.id === selectedDoctorId) || doctors[0];
  }, [doctors, selectedDoctorId]);

  // Handle doctor selection change & save to localStorage
  const handleDoctorChange = (id: string) => {
    setSelectedDoctorId(id);
    localStorage.setItem('nobet_my_doctor_id', id);
  };

  // Download personal ICS file
  const handleDownloadIcs = () => {
    if (!selectedDoctor || !roster) return;
    const icsContent = exportDoctorToIcs(selectedDoctor, roster);
    downloadFile(
      `${selectedDoctor.name.replace(/\s+/g, '_')}_Nobet_Takvimi_${roster.year}_${roster.month}.ics`,
      icsContent,
      'text/calendar'
    );
  };

  // Copy WhatsApp summary to clipboard
  const handleCopyWhatsApp = () => {
    if (!selectedDoctor || !roster) return;
    const text = generateWhatsAppScheduleText(roster, doctors, selectedDoctor.id);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!roster || !selectedDoctor) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
        Henüz aktif bir hekim veya nöbet listesi bulunamadı.
      </div>
    );
  }

  // Doctor's monthly statistics
  const days = roster.days;
  const dutyDays = days.filter(d => d.nobetciIds.includes(selectedDoctor.id));
  const weekendDutyDays = dutyDays.filter(d => d.isWeekend);
  const holidayDutyDays = dutyDays.filter(d => d.isHoliday);

  const clinicDays = days.filter(d => d.poliklinikIds.includes(selectedDoctor.id));
  const serviceDays = days.filter(d => d.servisIds.includes(selectedDoctor.id));
  const consultantDays = days.filter(d => d.konsultanIds.includes(selectedDoctor.id));
  const urodinamiDays = days.filter(d => d.urodinamiIds?.includes(selectedDoctor.id));
  const ameliyathaneDays = days.filter(d => d.ameliyathaneIds?.includes(selectedDoctor.id));
  const restDays = days.filter(d => d.dinlenmeIds.includes(selectedDoctor.id));
  const offDays = days.filter(d => selectedDoctor.unavailableDates?.includes(d.date));

  // Filter days according to mode
  const displayedDays = useMemo(() => {
    if (filterMode === 'all') return days;
    return days.filter(d => {
      const hasDuty = d.nobetciIds.includes(selectedDoctor.id);
      const hasClinic = d.poliklinikIds.includes(selectedDoctor.id);
      const hasService = d.servisIds.includes(selectedDoctor.id);
      const hasKons = d.konsultanIds.includes(selectedDoctor.id);
      const hasUrodinami = d.urodinamiIds?.includes(selectedDoctor.id);
      const hasAmeliyathane = d.ameliyathaneIds?.includes(selectedDoctor.id);
      const hasRest = d.dinlenmeIds.includes(selectedDoctor.id);
      const isOff = selectedDoctor.unavailableDates?.includes(d.date);
      return hasDuty || hasClinic || hasService || hasKons || hasUrodinami || hasAmeliyathane || hasRest || isOff;
    });
  }, [days, selectedDoctor, filterMode]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top Banner: Doctor Picker & Quick Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Doctor selector */}
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0"
            style={{ backgroundColor: selectedDoctor.color || '#2563EB' }}
          >
            {selectedDoctor.name.charAt(0)}
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Kişisel Nöbet ve Görev Görünümü
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <select
                value={selectedDoctorId}
                onChange={e => handleDoctorChange(e.target.value)}
                className="text-base sm:text-lg font-bold text-slate-900 bg-transparent border-0 border-b border-dashed border-slate-300 focus:ring-0 focus:border-blue-600 pb-0.5 cursor-pointer"
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.seniority === 'kidemli' ? 'Kıdemli' : 'Kıdemsiz'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadIcs}
            className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Nöbetleri iPhone veya Android telefon takviminize ekleyin"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Takvimime Ekle (.ics)</span>
          </button>

          <button
            onClick={handleCopyWhatsApp}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{copied ? 'Kopyalandı!' : 'WhatsApp Metni'}</span>
          </button>

          {onOpenSwap && (
            <button
              onClick={onOpenSwap}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Nöbet Takası Yap</span>
            </button>
          )}
        </div>

      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        
        {/* Gece Nöbeti */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Toplam Gece</span>
            <Moon className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{dutyDays.length}</span>
            <span className="text-xs text-slate-400">/ {selectedDoctor.targetTotalShifts} hedef</span>
          </div>
        </div>

        {/* Hafta Sonu Nöbeti */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Hafta Sonu</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{weekendDutyDays.length}</span>
            <span className="text-xs text-slate-400">/ {selectedDoctor.targetWeekendShifts} hedef</span>
          </div>
        </div>

        {/* Resmi Tatil / Bayram */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Resmi Tatil</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{holidayDutyDays.length}</span>
            <span className="text-xs text-slate-400">gün</span>
          </div>
        </div>

        {/* Poliklinik */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Poliklinik</span>
            <span className="text-xs font-bold text-teal-600">POL</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{clinicDays.length}</span>
            <span className="text-xs text-slate-400">gün</span>
          </div>
        </div>

        {/* Servis & Konsültan */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Servis / Kons</span>
            <span className="text-xs font-bold text-indigo-600">KLN</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{serviceDays.length + consultantDays.length}</span>
            <span className="text-xs text-slate-400">gün</span>
          </div>
        </div>

        {/* Dinlenme & İzin */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Dinlenme/İzin</span>
            <Coffee className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{restDays.length + offDays.length}</span>
            <span className="text-xs text-slate-400">gün</span>
          </div>
        </div>

      </div>

      {/* Filter Mode Switcher */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>{roster.monthName} {roster.year} Günlük Akış</span>
        </h3>

        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setFilterMode('assigned_only')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterMode === 'assigned_only'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sadece Görevli Günlerim ({displayedDays.length})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tüm Ay ({days.length})
          </button>
        </div>
      </div>

      {/* Cards Timeline List */}
      <div className="space-y-2.5">
        {displayedDays.map(day => {
          const isDuty = day.nobetciIds.includes(selectedDoctor.id);
          const isKidemli = day.kidemliNobetciId === selectedDoctor.id;
          const isRest = day.dinlenmeIds.includes(selectedDoctor.id);
          const isClinic = day.poliklinikIds.includes(selectedDoctor.id);
          const isService = day.servisIds.includes(selectedDoctor.id);
          const isKons = day.konsultanIds.includes(selectedDoctor.id);
          const isUrodinami = day.urodinamiIds?.includes(selectedDoctor.id);
          const isAmeliyathane = day.ameliyathaneIds?.includes(selectedDoctor.id);
          const isOff = selectedDoctor.unavailableDates?.includes(day.date);

          const dateParts = day.date.split('-');
          const dayNum = parseInt(dateParts[2], 10);
          const dayName = WEEKDAYS[day.dayOfWeek];

          return (
            <div
              key={day.date}
              onClick={() => onSelectDay(day)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDuty
                  ? 'bg-blue-50/70 border-blue-300 hover:bg-blue-100/70 shadow-xs'
                  : isRest
                  ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                  : isOff
                  ? 'bg-rose-50/60 border-rose-200 hover:bg-rose-50'
                  : day.isWeekend
                  ? 'bg-slate-100/80 border-slate-200 hover:bg-slate-200/60'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Left: Date info */}
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 ${
                  isDuty
                    ? 'bg-blue-600 text-white'
                    : isRest
                    ? 'bg-emerald-600 text-white'
                    : day.isWeekend
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  <span className="text-xs uppercase leading-none font-medium text-slate-200">
                    {dayName.slice(0, 3)}
                  </span>
                  <span className="text-base leading-tight font-black">
                    {dayNum}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {dayNum} {roster.monthName} {dayName}
                    </span>
                    {day.isHoliday && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200">
                        {day.holidayName || 'Resmi Tatil'}
                      </span>
                    )}
                    {day.isWeekend && !day.isHoliday && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold text-[10px]">
                        Hafta Sonu
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isDuty ? 'Gece Nöbeti (17:00 - Ertesi 08:00)' : 'Mesai / Dinlenme Durumu'}
                  </p>
                </div>
              </div>

              {/* Right: Badges for role */}
              <div className="flex items-center gap-2 flex-wrap">
                {isDuty && (
                  <div className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <Moon className="w-3.5 h-3.5" />
                    <span>{isKidemli ? 'Kıdemli Gece Nöbeti' : 'Kıdemsiz Gece Nöbeti'}</span>
                  </div>
                )}

                {isRest && (
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300 flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Nöbet Ertesi Dinlenme</span>
                  </div>
                )}

                {isClinic && (
                  <div className="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900 text-xs font-semibold border border-teal-200">
                    🩺 Poliklinik
                  </div>
                )}

                {isService && (
                  <div className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900 text-xs font-semibold border border-indigo-200">
                    🏥 Servis Sorumlusu
                  </div>
                )}

                {isKons && (
                  <div className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 text-xs font-semibold border border-purple-200">
                    ⚡ ESWL + Konsültan
                  </div>
                )}

                {isUrodinami && (
                  <div className="px-2.5 py-1 rounded-lg bg-cyan-100 text-cyan-900 text-xs font-semibold border border-cyan-200">
                    Ürodinami
                  </div>
                )}

                {isAmeliyathane && (
                  <div className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 text-xs font-semibold border border-rose-200">
                    Ameliyathane
                  </div>
                )}

                {isOff && (
                  <div className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 text-xs font-bold border border-rose-300 flex items-center gap-1">
                    <Umbrella className="w-3 h-3 text-rose-600" />
                    <span>İzinli / Kongre</span>
                  </div>
                )}

                {!isDuty && !isRest && !isClinic && !isService && !isKons && !isUrodinami && !isAmeliyathane && !isOff && (
                  <span className="text-xs text-slate-400 font-medium px-2 py-1">
                    {day.isWeekend ? 'Hafta Sonu Tatili' : 'Rutin Klinik Mesaisi'}
                  </span>
                )}

                <ChevronRight className="w-4 h-4 text-slate-300 hidden sm:block ml-1" />
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
