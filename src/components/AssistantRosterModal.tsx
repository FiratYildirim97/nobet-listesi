import React, { useState, useEffect } from 'react';
import { 
  X, 
  GraduationCap, 
  Search, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Activity, 
  Scissors, 
  Stethoscope, 
  Building2, 
  FileText, 
  Info,
  Calendar,
  Users,
  Wand2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Doctor, ClinicDutyType, MonthlyRoster, MonthlyDoctorConfig } from '../types';
import { deriveUsername, deriveSurname } from '../utils/auth';
import { getDaysInMonth, formatDateStr } from '../utils/scheduler';

interface AssistantRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'general' | 'monthly';
  doctors: Doctor[];
  onSaveDoctors: (doctors: Doctor[]) => void;
  currentYear: number;
  currentMonth: number;
  roster: MonthlyRoster | null;
  onSaveMonthlyConfigs: (year: number, month: number, configs: Record<string, MonthlyDoctorConfig>) => void;
  onGenerateSchedule?: () => void;
  onMonthChange?: (year: number, month: number) => void;
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const COMPENSABLE_CLINIC_DUTIES: { 
  id: ClinicDutyType; 
  label: string; 
  short: string; 
  icon: React.ComponentType<{ className?: string }>; 
  buttonActive: string;
}[] = [
  { 
    id: 'poliklinik', 
    label: 'Poliklinik', 
    short: 'Poliklinik', 
    icon: Stethoscope, 
    buttonActive: 'bg-blue-600 text-white border-blue-700 shadow-2xs'
  },
  { 
    id: 'servis', 
    label: 'Servis', 
    short: 'Servis', 
    icon: Building2, 
    buttonActive: 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
  },
  { 
    id: 'konsultan', 
    label: 'Konsültan (ESWL)', 
    short: 'Konsültan', 
    icon: FileText, 
    buttonActive: 'bg-amber-600 text-white border-amber-700 shadow-2xs'
  },
  { 
    id: 'urodinami', 
    label: 'Ürodinami', 
    short: 'Ürodinami', 
    icon: Activity, 
    buttonActive: 'bg-teal-600 text-white border-teal-700 shadow-2xs'
  },
];

export type PrimaryDutyOption = ClinicDutyType | 'ameliyathane';

const ALL_PRIMARY_DUTIES: { 
  id: PrimaryDutyOption; 
  label: string; 
}[] = [
  { id: 'poliklinik', label: '🩺 Poliklinik' },
  { id: 'servis', label: '🏥 Servis' },
  { id: 'konsultan', label: '📋 Konsültan (ESWL)' },
  { id: 'urodinami', label: '🔬 Ürodinami' },
  { id: 'ameliyathane', label: '✂️ Ameliyathane' },
];

export const AssistantRosterModal: React.FC<AssistantRosterModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'general',
  doctors,
  onSaveDoctors,
  currentYear,
  currentMonth,
  roster,
  onSaveMonthlyConfigs,
  onGenerateSchedule,
  onMonthChange,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'monthly'>(initialTab);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  // Tab 1 state: General Staff List
  const [editingDoctors, setEditingDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeniority, setFilterSeniority] = useState<'all' | 'kidemli' | 'kidemsiz' | 'ameliyathane'>('all');

  // Tab 2 state: Monthly Configs for selectedYear & selectedMonth
  const [editingConfigs, setEditingConfigs] = useState<Record<string, MonthlyDoctorConfig>>({});
  const [expandedDatePickerDocId, setExpandedDatePickerDocId] = useState<string | null>(null);

  // Synchronize when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedYear(currentYear);
      setSelectedMonth(currentMonth);

      const sorted = [...doctors].sort((a, b) => {
        const rankA = a.seniorityRank ?? 999;
        const rankB = b.seniorityRank ?? 999;
        return rankA - rankB;
      });

      const normalized = sorted.map(d => ({
        ...d,
        username: d.username || deriveUsername(d.name),
        shortName: deriveSurname(d.name) || d.shortName || '',
        targetWeekdayShifts: d.targetWeekdayShifts ?? Math.max(0, (d.targetTotalShifts || 0) - (d.targetWeekendShifts || 0)),
      }));
      setEditingDoctors(JSON.parse(JSON.stringify(normalized)));

      // Monthly configs
      const existingConfigs = roster?.doctorConfigs || {};
      const initialConfigs: Record<string, MonthlyDoctorConfig> = {};

      normalized.forEach(doc => {
        const existing = existingConfigs[doc.id];
        if (existing) {
          initialConfigs[doc.id] = { ...existing };
        } else {
          initialConfigs[doc.id] = {
            doctorId: doc.id,
            primaryDuty: doc.isOnlyAmeliyathane ? 'ameliyathane' : (doc.primaryDuty || 'poliklinik'),
            compensationDuties: doc.isOnlyAmeliyathane ? [] : (doc.compensationDuties || []),
            unavailableDates: doc.unavailableDates || [],
            preferredDates: doc.preferredDates || [],
            preferredJuniorIds: doc.preferredJuniorIds || [],
          };
        }
      });

      setEditingConfigs(initialConfigs);
    }
  }, [isOpen, initialTab, doctors, roster, currentYear, currentMonth]);

  if (!isOpen) return null;

  // --- TAB 1 HANDLERS ---
  const handleUpdateDoctor = (id: string, updates: Partial<Doctor>) => {
    setEditingDoctors(prev =>
      prev.map(doc => {
        if (doc.id !== id) return doc;
        const next = { ...doc, ...updates };
        if (updates.name !== undefined && updates.name !== doc.name) {
          next.username = deriveUsername(updates.name);
          next.shortName = deriveSurname(updates.name);
        }
        return next;
      })
    );
  };

  const handleToggleOnlyAmeliyathane = (docId: string, isOnly: boolean) => {
    handleUpdateDoctor(docId, {
      isOnlyAmeliyathane: isOnly,
      primaryDuty: isOnly ? 'ameliyathane' : 'poliklinik',
      compensationDuties: isOnly ? [] : ['servis'],
      canDoAmeliyathane: true,
      canDoClinic: !isOnly,
      canDoService: !isOnly,
    });

    setEditingConfigs(prev => {
      const current = prev[docId] || { doctorId: docId };
      return {
        ...prev,
        [docId]: {
          ...current,
          primaryDuty: isOnly ? 'ameliyathane' : 'poliklinik',
          compensationDuties: isOnly ? [] : ['servis'],
        }
      };
    });
  };

  const handleMoveRank = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= editingDoctors.length) return;

    const newList = [...editingDoctors];
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    const reRanked = newList.map((doc, idx) => ({
      ...doc,
      seniorityRank: idx + 1,
    }));

    setEditingDoctors(reRanked);
  };

  const handleAddDoctor = () => {
    const newId = 'doc_' + Date.now();
    const newRank = editingDoctors.length + 1;
    const newDoc: Doctor = {
      id: newId,
      name: '',
      username: '',
      shortName: '',
      title: 'Asistan Dr.',
      seniority: 'kidemsiz',
      seniorityRank: newRank,
      color: '#0891B2',
      targetTotalShifts: 4,
      targetWeekendShifts: 1,
      targetWeekdayShifts: 3,
      primaryDuty: 'poliklinik',
      compensationDuties: ['servis'],
      canDoClinic: true,
      canDoService: true,
      canDoConsultant: false,
      canDoUrodinami: true,
      canDoAmeliyathane: true,
      isOnlyAmeliyathane: false,
      unavailableDates: [],
      preferredDates: [],
      historicalShifts: 0,
      historicalWeekends: 0,
      historicalHolidays: 0,
      shiftBalance: 0,
      weekendBalance: 0,
    };
    setEditingDoctors([...editingDoctors, newDoc]);
    setEditingConfigs(prev => ({
      ...prev,
      [newId]: {
        doctorId: newId,
        primaryDuty: 'poliklinik',
        compensationDuties: ['servis'],
        unavailableDates: [],
        preferredDates: [],
        preferredJuniorIds: [],
      }
    }));
  };

  const handleDeleteDoctor = (id: string) => {
    const filtered = editingDoctors
      .filter(d => d.id !== id)
      .map((d, idx) => ({ ...d, seniorityRank: idx + 1 }));
    setEditingDoctors(filtered);
  };

  const handleSaveGeneralStaff = () => {
    onSaveDoctors(editingDoctors);
    onClose();
  };

  // --- TAB 2 HANDLERS ---
  const handleUpdateMonthlyConfig = (docId: string, updates: Partial<MonthlyDoctorConfig>) => {
    setEditingConfigs(prev => ({
      ...prev,
      [docId]: {
        ...(prev[docId] || { doctorId: docId }),
        ...updates,
      }
    }));
  };

  const handleToggleMonthlyCompDuty = (docId: string, duty: ClinicDutyType) => {
    const current = editingConfigs[docId]?.compensationDuties || [];
    const updated = current.includes(duty)
      ? current.filter(d => d !== duty)
      : [...current, duty];
    handleUpdateMonthlyConfig(docId, { compensationDuties: updated });
  };

  const handleToggleMonthlyJuniorPref = (seniorId: string, juniorId: string) => {
    const current = editingConfigs[seniorId]?.preferredJuniorIds || [];
    const updated = current.includes(juniorId)
      ? current.filter(id => id !== juniorId)
      : [...current, juniorId];
    handleUpdateMonthlyConfig(seniorId, { preferredJuniorIds: updated });
  };

  const handleCycleDateStatus = (docId: string, dateStr: string) => {
    const config = editingConfigs[docId] || { doctorId: docId };
    const unavails = config.unavailableDates || [];
    const prefs = config.preferredDates || [];

    if (unavails.includes(dateStr)) {
      handleUpdateMonthlyConfig(docId, {
        unavailableDates: unavails.filter(d => d !== dateStr),
        preferredDates: [...prefs, dateStr],
      });
    } else if (prefs.includes(dateStr)) {
      handleUpdateMonthlyConfig(docId, {
        preferredDates: prefs.filter(d => d !== dateStr),
      });
    } else {
      handleUpdateMonthlyConfig(docId, {
        unavailableDates: [...unavails, dateStr],
      });
    }
  };

  const handleClearDoctorDates = (docId: string) => {
    handleUpdateMonthlyConfig(docId, {
      unavailableDates: [],
      preferredDates: [],
    });
  };

  const handleSaveMonthlyTab = () => {
    onSaveMonthlyConfigs(selectedYear, selectedMonth, editingConfigs);
    onClose();
  };

  const handleMonthPrev = () => {
    let nextY = selectedYear;
    let nextM = selectedMonth - 1;
    if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    }
    setSelectedYear(nextY);
    setSelectedMonth(nextM);
    if (onMonthChange) onMonthChange(nextY, nextM);
  };

  const handleMonthNext = () => {
    let nextY = selectedYear;
    let nextM = selectedMonth + 1;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    setSelectedYear(nextY);
    setSelectedMonth(nextM);
    if (onMonthChange) onMonthChange(nextY, nextM);
  };

  // Stats calculation
  const totalKidemli = editingDoctors.filter(d => d.seniority === 'kidemli').length;
  const totalKidemsiz = editingDoctors.filter(d => d.seniority === 'kidemsiz').length;
  const totalOnlyAmeliyathane = editingDoctors.filter(d => d.isOnlyAmeliyathane).length;
  const totalAssignedTarget = editingDoctors.reduce((acc, d) => acc + (d.targetTotalShifts || 0), 0);
  const totalWeekendTarget = editingDoctors.reduce((acc, d) => acc + (d.targetWeekendShifts || 0), 0);
  const totalWeekdayTarget = editingDoctors.reduce((acc, d) => acc + Math.max(0, (d.targetTotalShifts || 0) - (d.targetWeekendShifts || 0)), 0);

  const juniorDoctors = editingDoctors.filter(d => d.seniority === 'kidemsiz');
  const daysInSelectedMonth = getDaysInMonth(selectedYear, selectedMonth);

  const filteredDoctors = editingDoctors.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.shortName && doc.shortName.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (filterSeniority === 'kidemli') return doc.seniority === 'kidemli';
    if (filterSeniority === 'kidemsiz') return doc.seniority === 'kidemsiz';
    if (filterSeniority === 'ameliyathane') return !!doc.isOnlyAmeliyathane;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* Top Header & 2 Tabs Navigation */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-300 border border-white/20 shadow-inner">
              <GraduationCap className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Asistan & Nöbet Yönetim Merkezi</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/15 text-blue-200 border border-white/20">
                  {editingDoctors.length} Hekim
                </span>
              </h2>
              <p className="text-[11px] text-blue-200/80">
                1. sekmede genel kadro ve nöbet kotalarını, 2. sekmede aya özel klinik görev ve izinleri düzenleyin.
              </p>
            </div>
          </div>

          {/* 2 Tabs Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-white/10 rounded-xl border border-white/20">
            <button
              onClick={() => setActiveTab('general')}
              className={'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ' + (
                activeTab === 'general' 
                  ? 'bg-white text-slate-900 shadow-md' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              )}
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Genel Kadro & Kotalar</span>
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ' + (
                activeTab === 'monthly' 
                  ? 'bg-white text-slate-900 shadow-md' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              )}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>2. Aylık Görevler & Tercihler</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: GENEL KADRO (Kıdem, Nöbet Sayısı, Sadece Ameliyathane) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'general' && (
          <>
            {/* Toolbar & Live Quotas */}
            <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Asistan veya soyadı ara..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setFilterSeniority('all')}
                    className={'px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ' + (
                      filterSeniority === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    Tümü ({editingDoctors.length})
                  </button>
                  <button
                    onClick={() => setFilterSeniority('kidemli')}
                    className={'px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ' + (
                      filterSeniority === 'kidemli' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    Kıdemli ({totalKidemli})
                  </button>
                  <button
                    onClick={() => setFilterSeniority('kidemsiz')}
                    className={'px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ' + (
                      filterSeniority === 'kidemsiz' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    Kıdemsiz ({totalKidemsiz})
                  </button>
                  <button
                    onClick={() => setFilterSeniority('ameliyathane')}
                    className={'px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ' + (
                      filterSeniority === 'ameliyathane' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    Sadece OR ({totalOnlyAmeliyathane})
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddDoctor}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni Asistan Ekle</span>
              </button>
            </div>

            {/* Quota Live Counter Bar */}
            <div className="px-6 py-2 bg-emerald-50/70 border-b border-emerald-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-emerald-950">Kadro Nöbet Kotaları:</span>
                <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 font-bold text-emerald-800 shadow-2xs">
                  Hafta İçi: {totalWeekdayTarget} Nöbet
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 font-bold text-amber-900 shadow-2xs">
                  H.Sonu & Tatil: {totalWeekendTarget} Nöbet
                </span>
                <span className={'px-2.5 py-0.5 rounded-md border font-black shadow-2xs ' + (
                  totalAssignedTarget === 60 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-blue-900 border-blue-300'
                )}>
                  Toplam: {totalAssignedTarget} / 60 Nöbetçi
                </span>
              </div>
              <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Hekimleri kıdemliden çömeze sıralayın; nöbet ve sadece ameliyathane görevlerini belirleyin.</span>
              </div>
            </div>

            {/* General Staff Table */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3 w-16 text-center">Kıdem</th>
                      <th className="py-3 px-3 min-w-[200px]">Asistan Hekim</th>
                      <th className="py-3 px-3 w-32 text-center">Statü</th>
                      <th className="py-3 px-3 min-w-[240px] text-center bg-emerald-50/80 text-emerald-950 font-black">
                        🌙 Nöbet Kotaları (H.İçi / H.Sonu / Toplam)
                      </th>
                      <th className="py-3 px-3 w-48 text-center bg-purple-50/80 text-purple-950 font-black">
                        ✂️ Sadece Ameliyathane Yapanlar
                      </th>
                      <th className="py-3 px-3 w-16 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDoctors.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <GraduationCap className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="font-semibold text-sm text-slate-600">Asistan hekim bulunamadı</p>
                        </td>
                      </tr>
                    ) : (
                      filteredDoctors.map((doc) => {
                        const isSenior = doc.seniority === 'kidemli';
                        const realIndex = editingDoctors.findIndex(d => d.id === doc.id);
                        const isOnlyOR = !!doc.isOnlyAmeliyathane;

                        return (
                          <tr 
                            key={doc.id} 
                            className={'hover:bg-slate-50 transition-colors ' + (isOnlyOR ? 'bg-purple-50/30' : '')}
                          >
                            {/* 1. Kıdem Sırası & Taşıma */}
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-mono font-bold flex items-center justify-center text-[11px]">
                                  {realIndex + 1}
                                </span>
                                <div className="flex flex-col">
                                  <button
                                    onClick={() => handleMoveRank(realIndex, 'up')}
                                    disabled={realIndex === 0}
                                    className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 cursor-pointer"
                                    title="Kıdemini Yükselt"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveRank(realIndex, 'down')}
                                    disabled={realIndex === editingDoctors.length - 1}
                                    className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 cursor-pointer"
                                    title="Kıdemini İndir"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* 2. Asistan Adı / Soyadı & Giriş Bilgileri */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full shrink-0 ring-1 ring-slate-300"
                                  style={{ backgroundColor: doc.color }}
                                />
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={doc.name}
                                    placeholder="Dr. Soyadı veya Ad Soyad giriniz..."
                                    onChange={e => handleUpdateDoctor(doc.id, { name: e.target.value })}
                                    className="font-bold text-slate-900 bg-transparent border-b border-slate-300 hover:border-slate-400 focus:border-blue-500 outline-hidden px-1 py-0.5 w-full text-xs"
                                  />
                                  <div className="flex items-center gap-2 px-1 mt-0.5">
                                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                      @{doc.username || deriveUsername(doc.name)}
                                    </span>
                                    {doc.password ? (
                                      <span className="text-[10px] text-emerald-600 flex items-center gap-0.5" title="Şifresi tanımlı">
                                        🔒 Şifreli
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5">
                                        ⏳ İlk Giriş
                                      </span>
                                    )}
                                    {doc.password && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (confirm(doc.name + ' hekiminin şifresini sıfırlamak istiyor musunuz?')) {
                                            handleUpdateDoctor(doc.id, { password: undefined });
                                          }
                                        }}
                                        className="text-[10px] text-slate-400 hover:text-rose-600 underline cursor-pointer"
                                      >
                                        Sıfırla
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 3. Statü */}
                            <td className="py-2.5 px-3 text-center">
                              <select
                                value={doc.seniority}
                                onChange={e => {
                                  const newSeniority = e.target.value as 'kidemli' | 'kidemsiz';
                                  handleUpdateDoctor(doc.id, { 
                                    seniority: newSeniority,
                                    title: newSeniority === 'kidemli' ? 'Kıdemli Asistan' : 'Asistan Dr.'
                                  });
                                }}
                                className={'text-[11px] font-bold py-1 px-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer ' + (
                                  isSenior
                                    ? 'bg-blue-50 border-blue-300 text-blue-800'
                                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                )}
                              >
                                <option value="kidemli">⭐ Kıdemli</option>
                                <option value="kidemsiz">🌱 Kıdemsiz</option>
                              </select>
                            </td>

                            {/* 4. Nöbet Kotaları */}
                            <td className="py-2.5 px-3 bg-emerald-50/15 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase">H.İçi</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={15}
                                    value={Math.max(0, doc.targetTotalShifts - doc.targetWeekendShifts)}
                                    onChange={e => {
                                      const newWeekday = Math.max(0, parseInt(e.target.value, 10) || 0);
                                      const newTotal = newWeekday + (doc.targetWeekendShifts || 0);
                                      handleUpdateDoctor(doc.id, { 
                                        targetTotalShifts: newTotal, 
                                        targetWeekdayShifts: newWeekday 
                                      });
                                    }}
                                    className="w-12 text-center text-xs font-bold py-1 px-1 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                  />
                                </div>

                                <span className="text-slate-400 font-bold text-xs mt-3">+</span>

                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] font-bold text-amber-700 uppercase">H.Sonu</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={10}
                                    value={doc.targetWeekendShifts || 0}
                                    onChange={e => {
                                      const newWeekend = Math.max(0, parseInt(e.target.value, 10) || 0);
                                      const weekday = Math.max(0, doc.targetTotalShifts - (doc.targetWeekendShifts || 0));
                                      const newTotal = weekday + newWeekend;
                                      handleUpdateDoctor(doc.id, { 
                                        targetWeekendShifts: newWeekend, 
                                        targetTotalShifts: newTotal 
                                      });
                                    }}
                                    className="w-12 text-center text-xs font-bold py-1 px-1 rounded-lg border border-amber-300 bg-amber-50/70 text-amber-950 focus:ring-2 focus:ring-amber-500 outline-hidden"
                                  />
                                </div>

                                <span className="text-slate-400 font-bold text-xs mt-3">=</span>

                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] font-bold text-blue-700 uppercase">Toplam</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={20}
                                    value={doc.targetTotalShifts || 0}
                                    onChange={e => {
                                      const newTotal = Math.max(0, parseInt(e.target.value, 10) || 0);
                                      const newWeekend = Math.min(doc.targetWeekendShifts || 0, newTotal);
                                      handleUpdateDoctor(doc.id, { 
                                        targetTotalShifts: newTotal, 
                                        targetWeekendShifts: newWeekend 
                                      });
                                    }}
                                    className="w-12 text-center text-xs font-black py-1 px-1 rounded-lg border border-blue-300 bg-blue-50 text-blue-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                                  />
                                </div>
                              </div>
                            </td>

                            {/* 5. Sadece Ameliyathane Onay Kutusu */}
                            <td className="py-2.5 px-3 text-center bg-purple-50/20">
                              <label className="inline-flex items-center gap-2 cursor-pointer select-none px-2 py-1 rounded-lg hover:bg-purple-100/50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isOnlyOR}
                                  onChange={e => handleToggleOnlyAmeliyathane(doc.id, e.target.checked)}
                                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                                />
                                <span className={'text-xs font-bold ' + (
                                  isOnlyOR ? 'text-purple-900 font-black' : 'text-slate-500 font-medium'
                                )}>
                                  {isOnlyOR ? '✂️ Sadece Ameliyathane' : 'Klinik + Nöbet'}
                                </span>
                              </label>
                            </td>

                            {/* 6. Sil */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleDeleteDoctor(doc.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                title="Hekimi Çıkar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tab 1 Footer */}
            <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-600 flex items-center gap-3">
                <span>Toplam: <strong className="text-slate-900">{editingDoctors.length}</strong> asistan</span>
                <span className="text-slate-300">|</span>
                <span className="text-blue-700 font-bold">{totalKidemli} Kıdemli</span>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-700 font-bold">{totalKidemsiz} Kıdemsiz</span>
                <span className="text-slate-300">|</span>
                <span className="text-purple-700 font-bold">{totalOnlyAmeliyathane} Sadece OR</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleSaveGeneralStaff}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all active:scale-98 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Genel Kadroyu Kaydet</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: AYLIK GÖREVLER VE TERCİHLER (Döngü, Kompanse, İzinler, Çömez Tercihi) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'monthly' && (
          <>
            {/* Month Switcher Header */}
            <div className="px-6 py-2.5 bg-indigo-50/70 border-b border-indigo-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white rounded-lg p-0.5 border border-indigo-300 shadow-2xs">
                  <button
                    onClick={handleMonthPrev}
                    className="p-1 rounded-md hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 transition-colors cursor-pointer"
                    title="Önceki Ay"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="px-3 py-1 font-black text-indigo-950 min-w-[130px] text-center text-xs sm:text-sm">
                    {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </div>
                  <button
                    onClick={handleMonthNext}
                    className="p-1 rounded-md hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 transition-colors cursor-pointer"
                    title="Sonraki Ay"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <span className="text-[11px] text-indigo-900 font-semibold">
                  Seçili ay için asistan görev döngülerini ve nöbet isteklerini ayarlayın.
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onGenerateSchedule && (
                  <button
                    onClick={() => {
                      onSaveMonthlyConfigs(selectedYear, selectedMonth, editingConfigs);
                      onClose();
                      setTimeout(() => onGenerateSchedule(), 100);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-all active:scale-98 cursor-pointer"
                    title="Tercihleri kaydet ve hemen listeyi hazırla"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Kaydet & Listeyi Hazırla</span>
                  </button>
                )}
              </div>
            </div>

            {/* Monthly Configs List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
              {editingDoctors.map((doc) => {
                const isSenior = doc.seniority === 'kidemli';
                const isOnlyOR = !!doc.isOnlyAmeliyathane;
                const config = editingConfigs[doc.id] || { doctorId: doc.id };
                const currentPrimary = isOnlyOR ? 'ameliyathane' : (config.primaryDuty || doc.primaryDuty || 'poliklinik');
                const compDuties = isOnlyOR ? [] : (config.compensationDuties || []);
                const unavails = config.unavailableDates || [];
                const prefs = config.preferredDates || [];
                const isDatePickerOpen = expandedDatePickerDocId === doc.id;

                return (
                  <div 
                    key={doc.id}
                    className={'bg-white rounded-xl border p-4 shadow-xs transition-all ' + (
                      isOnlyOR ? 'border-purple-200 bg-purple-50/15' : 'border-slate-200'
                    )}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Doctor Seniority & Name */}
                      <div className="flex items-center gap-2.5 min-w-[200px]">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-mono font-bold flex items-center justify-center text-xs shrink-0">
                          {doc.seniorityRank || '-'}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900 text-sm">
                              {doc.name || 'İsimsiz Asistan'}
                            </span>
                            <span className={'text-[10px] font-bold px-1.5 py-0.5 rounded-md ' + (
                              isSenior ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                            )}>
                              {isSenior ? '⭐ Kıdemli' : '🌱 Kıdemsiz'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            Kota: {doc.targetTotalShifts || 0} Nöbet ({Math.max(0, (doc.targetTotalShifts || 0) - (doc.targetWeekendShifts || 0))} H.İçi + {doc.targetWeekendShifts || 0} H.Sonu)
                          </div>
                        </div>
                      </div>

                      {/* Main Duty Selector (Primary Duty) */}
                      <div className="flex flex-col gap-1 min-w-[170px]">
                        <span className="text-[10px] font-extrabold uppercase text-blue-900">
                          🎯 {MONTH_NAMES[selectedMonth - 1]} Ana Döngüsü
                        </span>
                        {isOnlyOR ? (
                          <div className="px-2.5 py-1.5 rounded-lg bg-purple-100 text-purple-900 border border-purple-300 font-bold text-xs flex items-center gap-1.5">
                            <Scissors className="w-3.5 h-3.5 text-purple-700" />
                            <span>✂️ Sadece Ameliyathane</span>
                          </div>
                        ) : (
                          <select
                            value={currentPrimary}
                            onChange={e => {
                              const newPrimary = e.target.value as PrimaryDutyOption;
                              handleUpdateMonthlyConfig(doc.id, {
                                primaryDuty: newPrimary,
                                compensationDuties: compDuties.filter(d => d !== newPrimary)
                              });
                            }}
                            className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white shadow-2xs focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
                          >
                            {ALL_PRIMARY_DUTIES.map(d => (
                              <option key={d.id} value={d.id}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Compensation Duties Selection */}
                      <div className="flex flex-col gap-1 min-w-[240px]">
                        <span className="text-[10px] font-extrabold uppercase text-amber-900">
                          🔄 Kompanse Edeceği Kısımlar
                        </span>
                        {isOnlyOR ? (
                          <div className="text-[11px] text-slate-400 italic py-1">
                            Ameliyathane hekimi klinik telafisine girmez
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            {COMPENSABLE_CLINIC_DUTIES.map(cfg => {
                              const isPrimary = currentPrimary === cfg.id;
                              const isComp = compDuties.includes(cfg.id);
                              const Icon = cfg.icon;

                              if (isPrimary) {
                                return (
                                  <span
                                    key={cfg.id}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none"
                                    title="Ana döngüsü bu birimdir."
                                  >
                                    <Icon className="w-3 h-3 opacity-60" />
                                    <span>{cfg.short}</span>
                                    <span className="text-[9px]">(Ana)</span>
                                  </span>
                                );
                              }

                              return (
                                <button
                                  key={cfg.id}
                                  type="button"
                                  onClick={() => handleToggleMonthlyCompDuty(doc.id, cfg.id)}
                                  className={'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ' + (
                                    isComp
                                      ? cfg.buttonActive
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                  )}
                                >
                                  <Icon className="w-3 h-3" />
                                  <span>{cfg.short}</span>
                                  {isComp && <Check className="w-2.5 h-2.5" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Junior preference for Seniors */}
                      <div className="flex flex-col gap-1 min-w-[190px]">
                        <span className="text-[10px] font-extrabold uppercase text-indigo-900">
                          🤝 Beraber Nöbet Tercihi
                        </span>
                        {isSenior ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {juniorDoctors.map(j => {
                              const isSel = config.preferredJuniorIds?.includes(j.id);
                              return (
                                <button
                                  key={j.id}
                                  type="button"
                                  onClick={() => handleToggleMonthlyJuniorPref(doc.id, j.id)}
                                  className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ' + (
                                    isSel 
                                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs' 
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                  )}
                                >
                                  {isSel && <Check className="w-2.5 h-2.5" />}
                                  <span>{j.shortName || j.name.split(' ')[0]}</span>
                                </button>
                              );
                            })}
                            {(!config.preferredJuniorIds || config.preferredJuniorIds.length === 0) && (
                              <span className="text-[10px] text-slate-400 italic py-0.5">
                                Çömez seçilmedi
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic py-1">
                            Kıdemsiz hekim
                          </div>
                        )}
                      </div>

                      {/* Dates / Leaves Popover Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setExpandedDatePickerDocId(isDatePickerOpen ? null : doc.id)}
                          className={'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ' + (
                            unavails.length > 0 || prefs.length > 0
                              ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          )}
                        >
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            {unavails.length > 0 || prefs.length > 0
                              ? unavails.length + ' İzin / ' + prefs.length + ' İstek'
                              : 'İzin & İstek Gir'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Expandable Mini Calendar Picker */}
                    {isDatePickerOpen && (
                      <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-xl">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                            <span>{MONTH_NAMES[selectedMonth - 1]} {selectedYear} Nöbet Günleri:</span>
                            <span className="text-[11px] font-normal text-slate-500">
                              (1. Tık: 🔴 İzinli / Nöbet Tutamaz | 2. Tık: 🟢 Nöbet İsteği | 3. Tık: Normal)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleClearDoctorDates(doc.id)}
                            className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold cursor-pointer underline"
                          >
                            Tümünü Temizle
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(day => {
                            const dateStr = formatDateStr(selectedYear, selectedMonth, day);
                            const isUnavail = unavails.includes(dateStr);
                            const isPref = prefs.includes(dateStr);
                            const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                            const dayOfWeek = dateObj.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => handleCycleDateStatus(doc.id, dateStr)}
                                className={'w-8 h-8 rounded-lg text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer border ' + (
                                  isUnavail
                                    ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                                    : isPref
                                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                                    : isWeekend
                                    ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                )}
                                title={day + ' ' + MONTH_NAMES[selectedMonth - 1] + ': ' + (
                                  isUnavail ? 'Nöbet Tutamaz (İzinli)' : isPref ? 'Nöbet İstediği Gün' : 'Müsait'
                                )}
                              >
                                <span>{day}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tab 2 Footer */}
            <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear} ayına ait döngü ve tercihler saklanacaktır.
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleSaveMonthlyTab}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-98 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Aylık Tercihleri Kaydet</span>
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
