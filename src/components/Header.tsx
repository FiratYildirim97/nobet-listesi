import React from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Wand2, 
  Users, 
  Scale, 
  Save, 
  Download, 
  Upload, 
  Printer, 
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  User,
  Share2,
  Bot,
  GraduationCap,
  Cloud,
  Shield,
  Lock,
  LogOut
} from 'lucide-react';
import { MonthlyRoster, Doctor, UserSession } from '../types';

interface HeaderProps {
  currentYear: number;
  currentMonth: number; // 1-12
  onMonthChange: (year: number, month: number) => void;
  roster: MonthlyRoster | null;
  doctors: Doctor[];
  onOpenDoctors: () => void;
  onOpenAssistantRoster?: () => void;
  onOpenGeneralStaff?: () => void;
  onOpenMonthlyDuties?: () => void;
  onOpenFairness: () => void;
  onGenerateSchedule: () => void;
  onResetOnlySchedule?: () => void;
  onCommitMonth: () => void;
  onResetSample: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onImportJson: (json: string) => void;
  onPrint: () => void;
  viewMode: 'grid' | 'table' | 'team' | 'my_shifts';
  onToggleViewMode: (mode: 'grid' | 'table' | 'team' | 'my_shifts') => void;
  conflictCount?: number;
  onOpenConflicts?: () => void;
  onOpenSwap?: () => void;
  onOpenAiModal?: () => void;
  onOpenShareModal?: () => void;
  isAdmin?: boolean;
  onOpenAdminLogin?: () => void;
  onLogoutAdmin?: () => void;
  session?: UserSession | null;
  onLogout?: () => void;
  onOpenCloudModal?: () => void;
  isCloudConnected?: boolean;
  onOpenHolidayBridge?: () => void;
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const Header: React.FC<HeaderProps> = ({
  currentYear,
  currentMonth,
  onMonthChange,
  roster,
  doctors,
  onOpenDoctors,
  onOpenAssistantRoster,
  onOpenGeneralStaff,
  onOpenMonthlyDuties,
  onOpenFairness,
  onGenerateSchedule,
  onResetOnlySchedule,
  onCommitMonth,
  onResetSample,
  onExportCsv,
  onExportJson,
  onImportJson,
  onPrint,
  viewMode,
  onToggleViewMode,
  conflictCount = 0,
  onOpenConflicts,
  onOpenSwap,
  onOpenAiModal,
  onOpenShareModal,
  isAdmin = true,
  onOpenAdminLogin,
  onLogoutAdmin,
  session,
  onLogout,
  onOpenCloudModal,
  isCloudConnected = false,
  onOpenHolidayBridge,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      onMonthChange(currentYear - 1, 12);
    } else {
      onMonthChange(currentYear, currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      onMonthChange(currentYear + 1, 1);
    } else {
      onMonthChange(currentYear, currentMonth + 1);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportJson(content);
      }
    };
    reader.readAsText(file);
  };

  // Month stats calculation
  const totalDays = roster?.days.length || 0;
  const weekendDays = roster?.days.filter(d => d.isWeekend).length || 0;
  const holidayDays = roster?.days.filter(d => d.isHoliday).length || 0;
  const assignedDays = roster?.days.filter(d => d.nobetciIds.length > 0).length || 0;
  const isFull = totalDays > 0 && assignedDays === totalDays;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Top bar: Title & Quick Stats */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Nöbet & Görev Çizelgesi</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Adil Hafıza Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                EÜTF Üroloji Anabilim Dalı Aylık Asistan Çalışma ve Nöbet Programı
              </p>
            </div>
          </div>

          {/* Quick status counters */}
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              <span className="text-slate-400">Toplam:</span>
              <span className="font-bold text-slate-900">{totalDays} Gün</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 font-medium">
              <span className="text-amber-600 font-medium">Hafta Sonu:</span>
              <span className="font-bold">{weekendDays}</span>
            </div>
            {holidayDays > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium">
                <span className="text-rose-600">Bayram:</span>
                <span className="font-bold">{holidayDays}</span>
              </div>
            )}
            <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-medium ${
              isFull ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              {isFull ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span className="font-bold">{assignedDays} / {totalDays}</span>
              <span>Nöbetçi</span>
            </div>

            {/* Active User / Profile Display & Logout */}
            {session ? (
              <div className="flex items-center gap-1.5">
                {session.role === 'admin' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold shadow-2xs">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Yönetici</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold shadow-2xs">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Dr. {session.doctorName || session.username}</span>
                  </span>
                )}
                {onLogout && (
                  <button
                    onClick={onLogout}
                    title="Oturumu Kapat"
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Çıkış</span>
                  </button>
                )}
              </div>
            ) : isAdmin ? (
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Yönetici</span>
                </span>
                {onLogoutAdmin && (
                  <button
                    onClick={onLogoutAdmin}
                    title="Yönetici Modundan Çık"
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors shadow-2xs cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAdminLogin}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                title="Yönetici Girişi Yap"
              >
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Giriş Yap</span>
              </button>
            )}
          </div>
        </div>

        {/* Secondary controls: Month Picker & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2.5">
          {/* Month Selector & View Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                onClick={handlePrevMonth}
                id="btn-prev-month"
                className="p-1 rounded-md hover:bg-white text-slate-700 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                title="Önceki Ay"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 py-1 font-bold text-slate-800 min-w-[120px] text-center text-xs sm:text-sm">
                {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </div>
              <button
                onClick={handleNextMonth}
                id="btn-next-month"
                className="p-1 rounded-md hover:bg-white text-slate-700 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                title="Sonraki Ay"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => onToggleViewMode('table')}
                id="btn-view-table"
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                Tablo / Liste
              </button>
              <button
                onClick={() => onToggleViewMode('grid')}
                id="btn-view-grid"
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                Takvim
              </button>
              <button
                onClick={() => onToggleViewMode('my_shifts')}
                id="btn-view-my-shifts"
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'my_shifts'
                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                <User className="w-3 h-3" />
                <span>Benim Nöbetlerim</span>
              </button>
            </div>
          </div>

          {/* Action buttons - 4 Core Workflow Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 1. Açılır Sekme: Genel Kadro (Kıdem, Nöbet Sayısı, Sadece OR) */}
            {isAdmin && (onOpenGeneralStaff || onOpenAssistantRoster) && (
              <button
                onClick={onOpenGeneralStaff || onOpenAssistantRoster}
                id="btn-open-general-staff"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 hover:bg-indigo-100 hover:text-indigo-950 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                title="1. Sekme: Kıdem sıralaması, nöbet sayıları ve sadece ameliyathane görevlileri"
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>1. Genel Kadro</span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-200 text-indigo-900 text-[10px] font-extrabold">
                  {doctors.length}
                </span>
              </button>
            )}

            {/* 2. Açılır Sekme: Aylık Görevler ve Tercihler (Ay Bazında Döngü, Kompanse, İzin, Çömez Seçimi) */}
            {isAdmin && (onOpenMonthlyDuties || onOpenAssistantRoster) && (
              <button
                onClick={onOpenMonthlyDuties || onOpenAssistantRoster}
                id="btn-open-monthly-duties"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 hover:text-blue-950 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                title="2. Sekme: Ay ay ayrı döngü, kompanse edilecek kısımlar, izinler ve çömez tercihleri"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>2. Aylık Tercihler</span>
              </button>
            )}

            {/* 3. Tuş: Listeyi Hazırla (Otomatik Akıllı Dağıtım) */}
            {isAdmin && (
              <button
                onClick={onGenerateSchedule}
                id="btn-auto-schedule"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs transition-all active:scale-98 cursor-pointer"
                title="3. Tuş: Genel kotalar ve aylık tercihlere göre listeyi otomatik hazırla"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>3. Listeyi Hazırla</span>
              </button>
            )}

            {/* 4. Tuş: Listeyi Sıfırla (SADECE oluşturulan listeyi sıfırlar, kadro ve tercihlere dokunmaz) */}
            {isAdmin && onResetOnlySchedule && (
              <button
                onClick={onResetOnlySchedule}
                id="btn-reset-only-schedule"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 hover:text-rose-900 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                title="4. Tuş: Kadro ve aylık tercihlere dokunmadan sadece oluşturulan takvim atamalarını sıfırlar"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>4. Listeyi Sıfırla</span>
              </button>
            )}

            {/* Ayı Hafızaya Kaydet (Admin Only) */}
            {isAdmin && (
              <button
                onClick={onCommitMonth}
                id="btn-commit-memory"
                title="Ayı tamamla ve geçmiş adalet hafızasına işle"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hafızaya Kaydet</span>
              </button>
            )}

            {/* Çakışma / Kural Uyarı Butonu (Both Admin & Viewer) */}
            {onOpenConflicts && (
              <button
                onClick={onOpenConflicts}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  conflictCount > 0
                    ? 'bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100'
                    : 'bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                }`}
                title="Kural ve çakışma durumunu inceleyin"
              >
                {conflictCount > 0 ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                    <span>{conflictCount} Uyarı</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Uyumlu</span>
                  </>
                )}
              </button>
            )}

            {/* Takas Butonu (Admin Only) */}
            {isAdmin && onOpenSwap && (
              <button
                onClick={onOpenSwap}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                title="İki nöbet gününü kuralları bozmadan takas edin"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
                <span>Takas</span>
              </button>
            )}

            {/* AI Mazeret Girişi (Admin Only) */}
            {isAdmin && onOpenAiModal && (
              <button
                onClick={onOpenAiModal}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                title="WhatsApp mazeret mesajlarını yapıştırıp ayrıştırın"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>AI Mazeret</span>
              </button>
            )}

            {/* Paylaş & Takvim (Both Admin & Viewer) */}
            {onOpenShareModal && (
              <button
                onClick={onOpenShareModal}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                title="WhatsApp metni veya telefon takvimi (.ics) olarak paylaşın"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Paylaş</span>
              </button>
            )}

            {/* Bayram Birleştirme / Tatil Düzenleme Butonu (Admin Only) */}
            {isAdmin && onOpenHolidayBridge && (
              <button
                onClick={onOpenHolidayBridge}
                id="btn-holiday-bridge"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                title="Bayramların birleştirilmesi, idari tatiller ve köprü günlerini düzenleyin"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Bayram Birleştir</span>
              </button>
            )}

            {/* Bayram Hafızası (Both Admin & Viewer) */}
            <button
              onClick={onOpenFairness}
              id="btn-open-fairness"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Geçmiş bayram nöbetleri ve kümülatif dengeler"
            >
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              <span>Bayramlar</span>
            </button>

            {/* Utility Dışa Aktarma / Yedek Araçları */}
            <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
              <button
                onClick={onPrint}
                title="Panoya asmak için A4 Yazdır / PDF"
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onExportCsv}
                title="Excel / CSV Olarak İndir"
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              {isAdmin && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Yedek JSON Yükle"
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    onClick={onResetSample}
                    id="btn-reset-demo"
                    title="EÜTF Eylül 2026 Listesini ve Demoyu Sıfırla"
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors shadow-2xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
