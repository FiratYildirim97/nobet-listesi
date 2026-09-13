import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  Header 
} from './components/Header';
import { 
  CalendarGrid 
} from './components/CalendarGrid';
import { 
  TableView 
} from './components/TableView';
import { 
  DoctorStatsDrawer 
} from './components/DoctorStatsDrawer';
import { 
  DoctorsManagerModal 
} from './components/DoctorsManagerModal';
import { 
  FairnessMemoryModal 
} from './components/FairnessMemoryModal';
import { 
  DayDetailModal 
} from './components/DayDetailModal';
import { 
  PrintRosterView 
} from './components/PrintRosterView';
import {
  TeamManagementView
} from './components/TeamManagementView';
import {
  AssistantRosterModal
} from './components/AssistantRosterModal';
import {
  MyShiftsView
} from './components/MyShiftsView';
import {
  ConflictInspectorModal
} from './components/ConflictInspectorModal';
import {
  ShiftSwapModal
} from './components/ShiftSwapModal';
import {
  ShareExportModal
} from './components/ShareExportModal';
import {
  AiRequestModal
} from './components/AiRequestModal';
import {
  AdminLoginModal
} from './components/AdminLoginModal';
import {
  CloudConfigModal
} from './components/CloudConfigModal';
import {
  HolidayBridgeModal
} from './components/HolidayBridgeModal';
import {
  SurplusAssignmentModal
} from './components/SurplusAssignmentModal';
import {
  LoginScreen
} from './components/LoginScreen';
import { 
  Doctor, 
  MonthlyRoster, 
  DayAssignment, 
  HistoricalMonthSummary,
  RuleConflict,
  HolidayInfo,
  UserSession,
  MonthlyDoctorConfig
} from './types';
import {
  getActiveSession,
  setActiveSession,
  clearActiveSession,
  deriveSurname
} from './utils/auth';
import { 
  getStoredDoctors, 
  saveStoredDoctors, 
  getStoredRoster, 
  saveStoredRoster, 
  getStoredHistory, 
  saveStoredHistory,
  archiveAndCommitMonth, 
  resetToSampleData, 
  resetToCleanInitialState,
  createCleanEmptyRoster,
  exportRosterToCsv 
} from './utils/storage';
import {
  isSupabaseConfigured,
  fetchCloudDoctors,
  fetchCloudRoster,
  saveCloudDoctors,
  saveCloudRoster,
  updateDoctorPasswordInCloud
} from './utils/supabase';
import { 
  generateSchedule, 
  getDaysInMonth, 
  formatDateStr 
} from './utils/scheduler';
import {
  detectRosterConflicts
} from './utils/conflictChecker';
import { 
  getHolidayForDate 
} from './data/holidays';
import { 
  CheckCircle, 
  AlertTriangle, 
  Wand2, 
  Scale, 
  Info,
  CalendarDays,
  Sparkles,
  Flame,
  ArrowLeftRight,
  Bot,
  Share2,
  UserCheck
} from 'lucide-react';

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export default function App() {
  // Current active date view (Default to October 2026)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(10);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'team' | 'my_shifts'>('table');

  // Persistence state
  const [doctors, setDoctors] = useState<Doctor[]>(() => getStoredDoctors());
  const [history, setHistory] = useState<HistoricalMonthSummary[]>(() => getStoredHistory());
  const [roster, setRoster] = useState<MonthlyRoster | null>(null);

  // Modals state
  const [isDoctorsOpen, setIsDoctorsOpen] = useState<boolean>(false);
  const [isAssistantRosterOpen, setIsAssistantRosterOpen] = useState<boolean>(false);
  const [assistantModalTab, setAssistantModalTab] = useState<'general' | 'monthly'>('general');
  const [isFairnessOpen, setIsFairnessOpen] = useState<boolean>(false);
  const [selectedDayForDetail, setSelectedDayForDetail] = useState<DayAssignment | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [isConflictOpen, setIsConflictOpen] = useState<boolean>(false);
  const [isSwapOpen, setIsSwapOpen] = useState<boolean>(false);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isHolidayBridgeOpen, setIsHolidayBridgeOpen] = useState<boolean>(false);
  const [isSurplusModalOpen, setIsSurplusModalOpen] = useState<boolean>(false);

  // Notification / Feedback banner
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);

  // Auth & Session state
  const [session, setSession] = useState<UserSession | null>(() => getActiveSession());
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const active = getActiveSession();
    if (active) return active.role === 'admin';
    return localStorage.getItem('nobet_is_admin') !== 'false';
  });
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(() => isSupabaseConfigured());

  const showNotification = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    if (newSession.role === 'admin') {
      setIsAdmin(true);
      showNotification('Yönetici olarak giriş yapıldı.', 'success');
    } else {
      setIsAdmin(false);
      if (newSession.doctorId) {
        localStorage.setItem('nobet_my_doctor_id', newSession.doctorId);
      }
      showNotification(`Hoş geldiniz Dr. ${newSession.doctorName || newSession.username}!`, 'success');
    }
  };

  const handleLogout = () => {
    clearActiveSession();
    setSession(null);
    setIsAdmin(false);
    showNotification('Oturum kapatıldı.', 'info');
  };

  const handleUpdateDoctorPassword = async (doctorId: string, newPassword: string): Promise<boolean> => {
    try {
      const updated = doctors.map(d => d.id === doctorId ? { ...d, password: newPassword } : d);
      setDoctors(updated);
      saveStoredDoctors(updated);
      if (isSupabaseConfigured()) {
        await updateDoctorPasswordInCloud(doctorId, newPassword);
      }
      return true;
    } catch (err) {
      console.error('Failed to update doctor password:', err);
      return false;
    }
  };

  // Initial cloud sync on startup if Supabase is configured
  useEffect(() => {
    if (isSupabaseConfigured()) {
      setIsCloudConnected(true);
      fetchCloudDoctors().then(cloudDocs => {
        if (cloudDocs !== null && cloudDocs.length > 0) {
          const sanitized = cloudDocs.map(d => {
            const surname = deriveSurname(d.name);
            const needsFix = !d.shortName || d.shortName.toLowerCase().startsWith('asistan') || /^\d+$/.test(d.shortName.trim());
            return {
              ...d,
              shortName: needsFix ? (surname || d.name) : d.shortName,
            };
          });
          setDoctors(sanitized);
          saveStoredDoctors(sanitized);
        } else if (cloudDocs !== null && cloudDocs.length === 0) {
          // Cloud is empty; if local storage already has doctors, sync them to cloud so they are not lost!
          const localDocs = getStoredDoctors();
          if (localDocs && localDocs.length > 0) {
            setDoctors(localDocs);
            saveCloudDoctors(localDocs).catch(err => console.warn('Sync local doctors to cloud:', err));
          }
        }
      }).catch(err => console.warn('Supabase initial doctors sync:', err));

      fetchCloudRoster(currentYear, currentMonth).then(cloudRoster => {
        if (cloudRoster && cloudRoster.days && cloudRoster.days.length > 0) {
          setRoster(cloudRoster);
          saveStoredRoster(cloudRoster);
        } else {
          const localRoster = getStoredRoster(currentYear, currentMonth);
          if (localRoster && localRoster.days && localRoster.days.some(d => (d.nobetciIds && d.nobetciIds.length > 0))) {
            setRoster(localRoster);
            saveCloudRoster(localRoster).catch(err => console.warn('Sync local roster to cloud:', err));
          } else {
            const clean = createCleanEmptyRoster(currentYear, currentMonth);
            setRoster(clean);
            saveStoredRoster(clean);
          }
        }
      }).catch(err => console.warn('Supabase initial roster sync:', err));
    }
  }, []);

  // Helper to fetch previous month's duty doctors for boundary continuity
  const getPreviousMonthLastDuty = (year: number, month: number): string[] => {
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevRoster = getStoredRoster(prevYear, prevMonth);
    if (prevRoster && prevRoster.days && prevRoster.days.length > 0) {
      const lastDay = prevRoster.days[prevRoster.days.length - 1];
      return lastDay.nobetciIds || [];
    }
    return [];
  };

  // Real-time conflict inspection across active roster
  const conflicts = useMemo(() => {
    if (!roster) return [];
    const prevDuty = getPreviousMonthLastDuty(currentYear, currentMonth);
    return detectRosterConflicts(roster, doctors, prevDuty);
  }, [roster, doctors, currentYear, currentMonth]);

  // Helper to initialize or load roster for given month
  const loadOrCreateRoster = (year: number, month: number, currentDocs: Doctor[]) => {
    const existing = getStoredRoster(year, month);
    if (existing) {
      setRoster(existing);
    } else {
      // Create fresh initial schedule using our smart solver
      const daysInMonth = getDaysInMonth(year, month);
      const initialDays: DayAssignment[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDateStr(year, month, day);
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay();
        const holiday = getHolidayForDate(dateStr);

        initialDays.push({
          date: dateStr,
          dayOfWeek,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          isHoliday: !!holiday,
          holidayName: holiday?.name,
          nobetciIds: [],
          poliklinikIds: [],
          servisIds: [],
          konsultanIds: [],
          dinlenmeIds: [],
          izinliIds: [],
        });
      }

      // Auto-schedule directly with previous month boundary continuity
      const prevMonthLastDuty = getPreviousMonthLastDuty(year, month);
      const scheduled = generateSchedule({
        year,
        month,
        doctors: currentDocs,
        previousMonthLastDutyDoctorIds: prevMonthLastDuty,
      });

      const newRoster: MonthlyRoster = {
        id: `${year}-${month < 10 ? '0' + month : month}`,
        year,
        month,
        monthName: MONTH_NAMES[month - 1],
        days: scheduled.days.length > 0 ? scheduled.days : initialDays,
        customHolidays: [],
        poliklinikCount: 2,
        servisCount: 1,
        konsultanCount: 1,
        nobetciCount: 2,
        weekendHasDayRoles: false,
        previousMonthLastDutyDoctorIds: prevMonthLastDuty,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveStoredRoster(newRoster);
      setRoster(newRoster);
    }

    // Background cloud sync
    if (isSupabaseConfigured()) {
      fetchCloudRoster(year, month).then(cloudRoster => {
        if (cloudRoster && cloudRoster.days && cloudRoster.days.length > 0) {
          setRoster(cloudRoster);
          saveStoredRoster(cloudRoster);
        }
      }).catch(err => console.warn('Cloud roster fetch error:', err));
    }
  };

  // Load roster on month or year change
  useEffect(() => {
    loadOrCreateRoster(currentYear, currentMonth, doctors);
  }, [currentYear, currentMonth]);

  // Handle month change from header
  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  // Open Tab 1: General Staff & Quotas
  const handleOpenGeneralStaff = () => {
    setAssistantModalTab('general');
    setIsAssistantRosterOpen(true);
  };

  // Open Tab 2: Monthly Duties & Preferences
  const handleOpenMonthlyDuties = () => {
    setAssistantModalTab('monthly');
    setIsAssistantRosterOpen(true);
  };

  // Save Tab 2 Monthly Configs
  const handleSaveMonthlyConfigs = (year: number, month: number, configs: Record<string, MonthlyDoctorConfig>) => {
    if (!roster) return;
    const updatedRoster: MonthlyRoster = {
      ...roster,
      doctorConfigs: configs,
      updatedAt: new Date().toISOString(),
    };
    setRoster(updatedRoster);
    saveStoredRoster(updatedRoster);
    if (isSupabaseConfigured()) {
      saveCloudRoster(updatedRoster).catch(err => console.warn('Supabase cloud roster configs sync:', err));
    }
    showNotification(`${roster.monthName} ${roster.year} aylık görev ve tercihleri kaydedildi!`, 'success');
  };

  // Button 4: Reset ONLY Generated Schedule (Kadroya ve tercihlere dokunmadan sadece listeyi sıfırlar)
  const handleResetOnlySchedule = () => {
    if (!roster) return;

    const confirmed = window.confirm(
      `${roster.monthName} ${roster.year} için oluşturulan nöbet ve gündüz çalışma listesi sıfırlanacaktır.\n\n` +
      `Genel asistan kadronuz ve bu aya ait görev/tercih ayarlarınız KESİNLİKLE SİLİNMEZ.\n\n` +
      `Onaylıyor musunuz?`
    );
    if (!confirmed) return;

    const cleanDays: DayAssignment[] = roster.days.map(d => ({
      ...d,
      kidemliNobetciId: undefined,
      kidemsizNobetciId: undefined,
      nobetciIds: [],
      poliklinikIds: [],
      servisIds: [],
      konsultanIds: [],
      urodinamiIds: [],
      ameliyathaneIds: [],
      dinlenmeIds: [],
    }));

    const updatedRoster: MonthlyRoster = {
      ...roster,
      days: cleanDays,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };

    setRoster(updatedRoster);
    saveStoredRoster(updatedRoster);
    if (isSupabaseConfigured()) {
      saveCloudRoster(updatedRoster).catch(err => console.warn('Supabase reset roster sync error:', err));
    }

    showNotification(`${roster.monthName} ${roster.year} listesi sıfırlandı. Kadro ve tercihleriniz korundu.`, 'info');
  };

  // Core Execution of Scheduler (Algoritmayı fiilen çalıştırır)
  const handleExecuteAutoScheduler = (
    overrideDoctors?: Doctor[],
    fixedHolidayDuties?: Record<string, { kidemliId?: string; kidemsizId?: string }>
  ) => {
    if (!roster) return;

    const activeDocs = overrideDoctors || doctors;
    const prevMonthLastDuty = getPreviousMonthLastDuty(currentYear, currentMonth);

    const result = generateSchedule({
      year: currentYear,
      month: currentMonth,
      doctors: activeDocs,
      doctorConfigs: roster.doctorConfigs,
      customHolidays: roster.customHolidays,
      poliklinikCount: roster.poliklinikCount || 2,
      servisCount: roster.servisCount || 1,
      konsultanCount: roster.konsultanCount || 1,
      nobetciCount: 2,
      weekendHasDayRoles: roster.weekendHasDayRoles,
      previousMonthLastDutyDoctorIds: prevMonthLastDuty,
      fixedDutyAssignments: fixedHolidayDuties,
    });

    const updatedRoster: MonthlyRoster = {
      ...roster,
      days: result.days,
      previousMonthLastDutyDoctorIds: prevMonthLastDuty,
      updatedAt: new Date().toISOString(),
    };

    setRoster(updatedRoster);
    saveStoredRoster(updatedRoster);
    if (isSupabaseConfigured()) {
      saveCloudRoster(updatedRoster).catch(err => console.warn('Supabase cloud roster sync:', err));
    }

    // Confetti celebration
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.25 },
        colors: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6']
      });
    } catch {
      // ignore
    }

    if (result.warnings.length > 0) {
      showNotification(`Liste hazırlandı (${result.warnings.length} uyarı). Detaylar için inceleyin.`, 'warning');
    } else {
      showNotification('Liste adalet kısıtları ve tercihlere tam uygun olarak hazırlandı!', 'success');
    }
  };

  // Button 3: Run Smart Auto Scheduler (31 gün ve bayram fazlalıklarında kullanıcıya sorar)
  const handleRunAutoScheduler = (overrideDoctors?: Doctor[], skipModal: boolean = false) => {
    if (!roster) return;

    if (overrideDoctors) {
      handleExecuteAutoScheduler(overrideDoctors);
      return;
    }

    const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);
    const holidaysInCurrentMonth = roster.days.filter(d => d.isHoliday) || [];
    const has31Days = daysInCurrentMonth === 31;
    const hasHolidays = holidaysInCurrentMonth.length > 0;

    // 31 gün olan aylarda veya bayram/tatil olan aylarda fazlalık dağıtım ekranını aç
    if (!skipModal && (has31Days || hasHolidays)) {
      setIsSurplusModalOpen(true);
    } else {
      handleExecuteAutoScheduler();
    }
  };

  // Save updated doctors from AssistantRosterModal / DoctorsManagerModal
  const handleSaveDoctors = async (updatedDoctors: Doctor[]) => {
    setDoctors(updatedDoctors);
    saveStoredDoctors(updatedDoctors);
    if (isSupabaseConfigured()) {
      try {
        const ok = await saveCloudDoctors(updatedDoctors);
        if (ok) {
          showNotification('Asistan kadrosu kaydedildi ve buluta senkronize edildi.', 'success');
        } else {
          showNotification('Asistan kadrosu yerel olarak kaydedildi (Bulut senkronizasyonu kontrol edin).', 'warning');
        }
      } catch (err) {
        console.error('Supabase cloud doctors sync error:', err);
        showNotification('Asistan kadrosu yerel olarak kaydedildi.', 'success');
      }
    } else {
      showNotification('Asistan kadrosu kaydedildi. Çizelgeyi oluşturmak için "Çizelgeyi Oluştur" butonunu kullanabilirsiniz.', 'success');
    }
    setViewMode('table');
  };

  // Update a single day from DayDetailModal
  const handleSaveDay = (updatedDay: DayAssignment) => {
    if (!roster) return;

    // Recalculate 'dinlenme' for following day if duty doctor changed
    const days = [...roster.days];
    const dayIndex = days.findIndex(d => d.date === updatedDay.date);
    if (dayIndex !== -1) {
      days[dayIndex] = updatedDay;

      // Update following day's rest if needed
      if (dayIndex < days.length - 1) {
        const nextDay = { ...days[dayIndex + 1] };
        // Sync dinlenme with updated duty doctor
        nextDay.dinlenmeIds = [...updatedDay.nobetciIds];
        days[dayIndex + 1] = nextDay;
      }
    }

    const updatedRoster = {
      ...roster,
      days,
      updatedAt: new Date().toISOString(),
    };

    setRoster(updatedRoster);
    saveStoredRoster(updatedRoster);
    if (isSupabaseConfigured()) {
      saveCloudRoster(updatedRoster).catch(err => console.warn('Supabase cloud roster sync:', err));
    }
    showNotification(`${updatedDay.date} tarihi güncellendi.`);
  };

  // Apply shift swap from ShiftSwapModal
  const handleApplySwap = (updatedRoster: MonthlyRoster) => {
    setRoster(updatedRoster);
    saveStoredRoster(updatedRoster);
    if (isSupabaseConfigured()) {
      saveCloudRoster(updatedRoster).catch(err => console.warn('Supabase cloud roster sync:', err));
    }
    showNotification('Nöbet günleri kurallara uygun olarak takas edildi!', 'success');
  };

  // Apply AI / Manual parsed requests from AiRequestModal
  const handleApplyAiRequests = (
    updatedDoctors: Doctor[],
    updatedConfigs?: Record<string, MonthlyDoctorConfig>
  ) => {
    setDoctors(updatedDoctors);
    saveStoredDoctors(updatedDoctors);

    if (roster && updatedConfigs) {
      const updatedRoster: MonthlyRoster = {
        ...roster,
        doctorConfigs: updatedConfigs,
        updatedAt: new Date().toISOString(),
      };
      setRoster(updatedRoster);
      saveStoredRoster(updatedRoster);
      if (isSupabaseConfigured()) {
        saveCloudRoster(updatedRoster).catch(err => console.warn('Supabase cloud roster sync:', err));
      }
    }

    if (isSupabaseConfigured()) {
      saveCloudDoctors(updatedDoctors).catch(err => console.warn('Supabase cloud doctors sync:', err));
    }
    showNotification('Mazeret ve istekler 2. sayfaya (Aylık Tercihler) başarıyla işlendi!', 'success');
  };

  // Commit Month to Memory (Adalet ve Geçmiş Hafızaya İşle)
  const handleCommitMonth = () => {
    if (!roster) return;

    const { updatedDoctors, history: updatedHistory } = archiveAndCommitMonth(roster, doctors);
    setDoctors(updatedDoctors);
    setHistory(updatedHistory);
    const archivedRoster: MonthlyRoster = { ...roster, status: 'archived', updatedAt: new Date().toISOString() };
    setRoster(archivedRoster);
    saveStoredRoster(archivedRoster);

    if (isSupabaseConfigured()) {
      saveCloudDoctors(updatedDoctors).catch(() => {});
      saveCloudRoster(archivedRoster).catch(() => {});
    }

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.3 }
      });
    } catch {
      // ignore
    }

    showNotification(
      `${roster.monthName} ${roster.year} çizelgesi başarıyla hafızaya kaydedildi! Bayram ve hafta sonu kümülatif dengeleri güncellendi.`,
      'success'
    );
  };

  // Save custom holiday bridging
  const handleSaveHolidayBridge = (updatedDays: DayAssignment[], customHolidays: HolidayInfo[]) => {
    if (!roster) return;
    const updatedRoster: MonthlyRoster = {
      ...roster,
      days: updatedDays,
      customHolidays,
      updatedAt: new Date().toISOString(),
    };
    setRoster(updatedRoster);
    saveStoredRoster(updatedRoster);
    if (isSupabaseConfigured()) {
      saveCloudRoster(updatedRoster).catch(err => console.warn('Cloud roster save:', err));
    }
    showNotification('Tatil ve bayram birleştirme düzeni kaydedildi! "Otomatik Dağıt" ile yeni takvime göre nöbetleri oluşturabilirsiniz.', 'success');
  };

  // Reset to clean initial state (fresh start with empty schedule and clean team ready for manual input)
  const handleResetToClean = () => {
    const { doctors: cleanDocs, history: cleanHist, roster: cleanRoster } = resetToCleanInitialState();
    setDoctors(cleanDocs);
    setHistory(cleanHist);
    setCurrentYear(2026);
    setCurrentMonth(10);
    setRoster(cleanRoster);
    setViewMode('table');
    setIsAssistantRosterOpen(true);
    showNotification('Uygulama sıfırlandı. Asistan Kadrosu penceresinden ekibinizi düzenleyip listenizi hazırlayabilirsiniz.', 'info');
  };

  // Reset to sample data
  const handleResetSample = () => {
    const { doctors: sampleDocs, history: sampleHist, roster: defaultRoster } = resetToSampleData();
    setDoctors(sampleDocs);
    setHistory(sampleHist);
    setCurrentYear(2026);
    setCurrentMonth(10);
    setViewMode('table');
    setRoster(defaultRoster);
    showNotification('EÜTF Ekim 2026 asistan çalışma programı ve klinik kadrosu başarıyla yüklendi.', 'success');
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!roster) return;
    const csvContent = exportRosterToCsv(roster, doctors);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Nobet_Cizelgesi_${roster.year}_${roster.month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Excel/CSV dosyası indirildi.');
  };

  // Export JSON Backup
  const handleExportJson = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      doctors,
      history,
      currentRoster: roster,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Nobet_Sistemi_Yedek_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Tüm sistem verileri ve geçmiş hafıza JSON olarak indirildi.');
  };

  // Import JSON Backup
  const handleImportJson = (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.doctors && Array.isArray(data.doctors)) {
        setDoctors(data.doctors);
        saveStoredDoctors(data.doctors);
      }
      if (data.history && Array.isArray(data.history)) {
        setHistory(data.history);
        saveStoredHistory(data.history);
      }
      if (data.currentRoster) {
        setRoster(data.currentRoster);
        saveStoredRoster(data.currentRoster);
      }
      showNotification('Yedek dosya başarıyla içe aktarıldı!', 'success');
    } catch {
      showNotification('Geçersiz JSON dosyası yüklendi.', 'warning');
    }
  };

  // Manual update of doctor's balance
  const handleUpdateDoctorBalance = (docId: string, shiftDelta: number, weekendDelta: number) => {
    const updated = doctors.map(d => {
      if (d.id === docId) {
        return {
          ...d,
          shiftBalance: (d.shiftBalance || 0) + shiftDelta,
          weekendBalance: (d.weekendBalance || 0) + weekendDelta,
        };
      }
      return d;
    });
    setDoctors(updated);
    saveStoredDoctors(updated);
    showNotification('Hekim alacak/borç dengesi güncellendi.');
  };

  // Check previous day's duty doctor for day detail modal
  const previousDayDutyDoctorIds = useMemo(() => {
    if (!selectedDayForDetail || !roster) return [];
    const idx = roster.days.findIndex(d => d.date === selectedDayForDetail.date);
    if (idx > 0) {
      return roster.days[idx - 1].nobetciIds;
    }
    return [];
  }, [selectedDayForDetail, roster]);

  // Check if current month has official holiday
  const holidayInMonth = roster?.days.filter(d => d.isHoliday) || [];

  if (!session) {
    return (
      <LoginScreen
        doctors={doctors}
        onLoginSuccess={handleLoginSuccess}
        onUpdateDoctorPassword={handleUpdateDoctorPassword}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Top Header */}
      <Header
        currentYear={currentYear}
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
        roster={roster}
        doctors={doctors}
        onOpenDoctors={() => setIsDoctorsOpen(true)}
        onOpenAssistantRoster={() => setIsAssistantRosterOpen(true)}
        onOpenGeneralStaff={handleOpenGeneralStaff}
        onOpenMonthlyDuties={handleOpenMonthlyDuties}
        onOpenFairness={() => setIsFairnessOpen(true)}
        onGenerateSchedule={() => handleRunAutoScheduler()}
        onResetOnlySchedule={handleResetOnlySchedule}
        onCommitMonth={handleCommitMonth}
        onResetSample={handleResetToClean}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onPrint={() => setIsPrintOpen(true)}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        conflictCount={conflicts.length}
        onOpenConflicts={() => setIsConflictOpen(true)}
        onOpenSwap={() => setIsSwapOpen(true)}
        onOpenAiModal={() => setIsAiOpen(true)}
        onOpenShareModal={() => setIsShareOpen(true)}
        isAdmin={isAdmin}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onLogoutAdmin={handleLogout}
        session={session}
        onLogout={handleLogout}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
        isCloudConnected={isCloudConnected}
        onOpenHolidayBridge={() => setIsHolidayBridgeOpen(true)}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Floating Notification */}
        {notification && (
          <div className={`mb-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : notification.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : notification.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-700 ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {/* View Switcher: Team vs MyShifts vs Grid/Table */}
        {viewMode === 'team' ? (
          <TeamManagementView
            doctors={doctors}
            onSaveDoctors={handleSaveDoctors}
            onApplyAndGenerate={(updatedDocs) => {
              handleSaveDoctors(updatedDocs);
              handleRunAutoScheduler(updatedDocs);
              setViewMode('table');
            }}
            currentYear={currentYear}
            currentMonth={currentMonth}
            monthName={MONTH_NAMES[currentMonth - 1]}
            onNavigateToSchedule={() => setViewMode('table')}
            onResetToClean={handleResetToClean}
            onLoadSample={handleResetSample}
            onOpenAssistantRoster={() => setIsAssistantRosterOpen(true)}
          />
        ) : viewMode === 'my_shifts' ? (
          <MyShiftsView
            roster={roster}
            doctors={doctors}
            onSelectDay={day => setSelectedDayForDetail(day)}
            onOpenSwap={() => setIsSwapOpen(true)}
          />
        ) : (
          <>
            {/* Holiday Notice (Only if holidays exist in month) */}
            {holidayInMonth.length > 0 && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2 font-medium">
                  <Flame className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Bu ayda {holidayInMonth.length} resmi tatil / bayram günü var: <strong>{holidayInMonth.map(h => h.holidayName).join(', ')}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Doctor Quotas & Live Status Bar (Collapsible) */}
            <DoctorStatsDrawer
              doctors={doctors}
              days={roster?.days || []}
            />

            {/* Calendar Grid or Table View */}
            {viewMode === 'grid' ? (
              <CalendarGrid
                days={roster?.days || []}
                doctors={doctors}
                currentYear={currentYear}
                currentMonth={currentMonth}
                conflicts={conflicts}
                onSelectDay={day => setSelectedDayForDetail(day)}
              />
            ) : (
              <TableView
                days={roster?.days || []}
                doctors={doctors}
                departmentTitle={roster?.departmentTitle}
                monthName={roster?.monthName}
                year={roster?.year}
                conflicts={conflicts}
                isAdmin={isAdmin}
                onSelectDay={day => setSelectedDayForDetail(day)}
                onUpdateDay={handleSaveDay}
                onGenerateSchedule={() => handleRunAutoScheduler()}
                onResetOnlySchedule={handleResetOnlySchedule}
              />
            )}

            {/* Minimalist hint footer */}
            <div className="mt-4 text-center text-xs text-slate-400">
              Detayları görmek veya manuel düzenlemek için ilgili günün satırına tıklayabilirsiniz.
            </div>
          </>
        )}
      </main>

      {/* MODAL 0: Dedicated Assistant Staff & Seniority Manager (Tab 1: Genel Kadro, Tab 2: Aylık Görev & Tercihler) */}
      <AssistantRosterModal
        isOpen={isAssistantRosterOpen}
        onClose={() => setIsAssistantRosterOpen(false)}
        initialTab={assistantModalTab}
        doctors={doctors}
        onSaveDoctors={handleSaveDoctors}
        currentYear={currentYear}
        currentMonth={currentMonth}
        roster={roster}
        onSaveMonthlyConfigs={handleSaveMonthlyConfigs}
        onGenerateSchedule={() => handleRunAutoScheduler()}
        onMonthChange={handleMonthChange}
      />

      {/* MODAL 1: Doctors & Requests Manager */}
      <DoctorsManagerModal
        isOpen={isDoctorsOpen}
        onClose={() => setIsDoctorsOpen(false)}
        doctors={doctors}
        onSaveDoctors={handleSaveDoctors}
        currentYear={currentYear}
        currentMonth={currentMonth}
      />

      {/* MODAL 2: Fairness & Memory Dashboard */}
      <FairnessMemoryModal
        isOpen={isFairnessOpen}
        onClose={() => setIsFairnessOpen(false)}
        doctors={doctors}
        history={history}
        onUpdateDoctorBalance={handleUpdateDoctorBalance}
      />

      {/* MODAL 3: Day Assignment Detail & Manual Override */}
      <DayDetailModal
        isOpen={!!selectedDayForDetail}
        onClose={() => setSelectedDayForDetail(null)}
        dayData={selectedDayForDetail}
        doctors={doctors}
        previousDayDutyDoctorIds={previousDayDutyDoctorIds}
        isAdmin={isAdmin}
        onSaveDay={handleSaveDay}
      />

      {/* MODAL 4: Printable Official Bulletin View */}
      <PrintRosterView
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        roster={roster}
        doctors={doctors}
      />

      {/* MODAL 5: Conflict Inspector */}
      <ConflictInspectorModal
        isOpen={isConflictOpen}
        onClose={() => setIsConflictOpen(false)}
        conflicts={conflicts}
        doctors={doctors}
        onSelectDay={dateStr => {
          const found = roster?.days.find(d => d.date === dateStr);
          if (found) setSelectedDayForDetail(found);
        }}
      />

      {/* MODAL 6: Shift Swap Wizard */}
      {roster && (
        <ShiftSwapModal
          isOpen={isSwapOpen}
          onClose={() => setIsSwapOpen(false)}
          roster={roster}
          doctors={doctors}
          onApplySwap={handleApplySwap}
        />
      )}

      {/* MODAL 7: AI & Manual Leave and Request Parser */}
      <AiRequestModal
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        doctors={doctors}
        currentYear={currentYear}
        currentMonth={currentMonth}
        doctorConfigs={roster?.doctorConfigs}
        onApplyRequests={handleApplyAiRequests}
      />

      {/* MODAL 8: Share & Calendar Export Hub */}
      {roster && (
        <ShareExportModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          roster={roster}
          doctors={doctors}
          onExportCsv={handleExportCsv}
          onExportJson={handleExportJson}
        />
      )}

      {/* MODAL 9: Admin PIN Authentication */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={() => {
          const adminSession: UserSession = { role: 'admin', rememberMe: true };
          setActiveSession(adminSession);
          setSession(adminSession);
          setIsAdmin(true);
          showNotification('Yönetici yetkileri başarıyla açıldı.', 'success');
        }}
      />

      {/* MODAL 10: Supabase Cloud Sync Manager */}
      <CloudConfigModal
        isOpen={isCloudModalOpen}
        onClose={() => {
          setIsCloudModalOpen(false);
          setIsCloudConnected(isSupabaseConfigured());
        }}
        doctors={doctors}
        roster={roster}
        onDataLoadedFromCloud={(cloudDocs, cloudRoster) => {
          if (cloudDocs && cloudDocs.length > 0) {
            setDoctors(cloudDocs);
            saveStoredDoctors(cloudDocs);
          }
          if (cloudRoster) {
            setRoster(cloudRoster);
            saveStoredRoster(cloudRoster);
          }
          setIsCloudConnected(true);
          showNotification('Buluttaki veriler başarıyla yüklendi!', 'success');
        }}
        onNotification={showNotification}
      />

      {/* MODAL 11: Holiday Bridge & Extension Manager */}
      <HolidayBridgeModal
        isOpen={isHolidayBridgeOpen}
        onClose={() => setIsHolidayBridgeOpen(false)}
        roster={roster}
        onSaveRosterDays={handleSaveHolidayBridge}
        onReScheduleNeeded={() => {
          handleRunAutoScheduler();
        }}
      />

      {/* MODAL 12: Surplus Shift Assignment & Historical Fairness Reminder */}
      <SurplusAssignmentModal
        isOpen={isSurplusModalOpen}
        onClose={() => setIsSurplusModalOpen(false)}
        year={currentYear}
        month={currentMonth}
        monthName={MONTH_NAMES[currentMonth - 1]}
        doctors={doctors}
        history={history}
        customHolidays={roster?.customHolidays}
        onConfirmSchedule={(adjustedDoctors, fixedHolidayDuties) => {
          handleExecuteAutoScheduler(adjustedDoctors, fixedHolidayDuties);
        }}
      />

    </div>
  );
}

