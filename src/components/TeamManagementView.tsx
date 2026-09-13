import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Scale, 
  RotateCcw, 
  Plus, 
  Minus, 
  Calendar, 
  Award, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  Info,
  X,
  Sliders,
  GraduationCap
} from 'lucide-react';
import { Doctor, DayAssignment } from '../types';
import { getDaysInMonth } from '../utils/scheduler';
import { CalendarMultiDatePicker } from './CalendarMultiDatePicker';

interface TeamManagementViewProps {
  doctors: Doctor[];
  onSaveDoctors: (doctors: Doctor[]) => void;
  onApplyAndGenerate: (updatedDoctors: Doctor[]) => void;
  currentYear: number;
  currentMonth: number;
  monthName: string;
  onNavigateToSchedule: () => void;
  onResetToClean?: () => void;
  onLoadSample?: () => void;
  onOpenAssistantRoster?: () => void;
}

const PRESET_COLORS = [
  '#2563EB', '#059669', '#D97706', '#DB2777', 
  '#7C3AED', '#0891B2', '#0D9488', '#EA580C', 
  '#4F46E5', '#65A30D', '#E11D48', '#0284C7'
];

export const TeamManagementView: React.FC<TeamManagementViewProps> = ({
  doctors,
  onSaveDoctors,
  onApplyAndGenerate,
  currentYear,
  currentMonth,
  monthName,
  onNavigateToSchedule,
  onResetToClean,
  onLoadSample,
  onOpenAssistantRoster,
}) => {
  // Working local state
  const [teamList, setTeamList] = useState<Doctor[]>(() => JSON.parse(JSON.stringify(doctors)));
  const [activeDateModalDocId, setActiveDateModalDocId] = useState<string | null>(null);
  const [calendarPickerDocId, setCalendarPickerDocId] = useState<string | null>(null);
  const [newOffDate, setNewOffDate] = useState<string>('');
  const [newPrefDate, setNewPrefDate] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Sync state when doctors prop changes (e.g. after reset)
  React.useEffect(() => {
    setTeamList(JSON.parse(JSON.stringify(doctors)));
    setHasUnsavedChanges(false);
  }, [doctors]);

  // Month days & weekend calculation
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  let weekendDaysCount = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(currentYear, currentMonth - 1, day).getDay();
    if (dow === 0 || dow === 6) weekendDaysCount++;
  }

  // Quota totals
  const kidemliList = teamList.filter(d => d.seniority === 'kidemli');
  const kidemsizList = teamList.filter(d => d.seniority === 'kidemsiz');

  const kidemliTotalShifts = kidemliList.reduce((sum, d) => sum + (d.targetTotalShifts || 0), 0);
  const kidemliWeekendShifts = kidemliList.reduce((sum, d) => sum + (d.targetWeekendShifts || 0), 0);

  const kidemsizTotalShifts = kidemsizList.reduce((sum, d) => sum + (d.targetTotalShifts || 0), 0);
  const kidemsizWeekendShifts = kidemsizList.reduce((sum, d) => sum + (d.targetWeekendShifts || 0), 0);

  // Targets needed for this month:
  // Each day has 1 Kıdemli and 1 Kıdemsiz night shift
  const requiredTotalPerPool = daysInMonth; // e.g. 30
  const requiredWeekendPerPool = weekendDaysCount; // e.g. 8

  const kidemliDiff = kidemliTotalShifts - requiredTotalPerPool;
  const kidemsizDiff = kidemsizTotalShifts - requiredTotalPerPool;
  const kidemliWeekendDiff = kidemliWeekendShifts - requiredWeekendPerPool;
  const kidemsizWeekendDiff = kidemsizWeekendShifts - requiredWeekendPerPool;

  const isKidemliBalanced = kidemliDiff === 0;
  const isKidemsizBalanced = kidemsizDiff === 0;

  // Handlers
  const handleUpdateDoctor = (id: string, updates: Partial<Doctor>) => {
    setTeamList(prev => prev.map(d => (d.id === id ? { ...d, ...updates } : d)));
    setHasUnsavedChanges(true);
  };

  const handleAdjustShift = (id: string, field: 'targetTotalShifts' | 'targetWeekendShifts', delta: number) => {
    setTeamList(prev => prev.map(d => {
      if (d.id !== id) return d;
      const current = d[field] || 0;
      const updated = Math.max(0, current + delta);
      return { ...d, [field]: updated };
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddDoctor = (seniority: 'kidemli' | 'kidemsiz') => {
    const newId = `doc_${Date.now()}`;
    const randomColor = PRESET_COLORS[teamList.length % PRESET_COLORS.length];
    const newDoc: Doctor = {
      id: newId,
      name: seniority === 'kidemli' ? `Yeni Kıdemli ${kidemliList.length + 1}` : `Yeni Kıdemsiz ${kidemsizList.length + 1}`,
      title: seniority === 'kidemli' ? 'Kıdemli Asistan' : 'Asistan Dr.',
      seniority,
      color: randomColor,
      targetTotalShifts: seniority === 'kidemli' ? 5 : 6,
      targetWeekendShifts: 2,
      canDoConsultant: seniority === 'kidemli',
      canDoService: true,
      canDoClinic: true,
      canDoUrodinami: false,
      canDoAmeliyathane: true,
      unavailableDates: [],
      preferredDates: [],
      historicalShifts: 0,
      historicalWeekends: 0,
      historicalHolidays: 0,
      shiftBalance: 0,
      weekendBalance: 0,
    };
    setTeamList(prev => [...prev, newDoc]);
    setHasUnsavedChanges(true);
  };

  const handleDeleteDoctor = (id: string) => {
    if (teamList.length <= 2) {
      alert('Klinikte en az 2 hekim bulunmalıdır.');
      return;
    }
    const docToDelete = teamList.find(d => d.id === id);
    if (confirm(`"${docToDelete?.name}" hekimini ekipten silmek istediğinize emin misiniz?`)) {
      setTeamList(prev => prev.filter(d => d.id !== id));
      setHasUnsavedChanges(true);
    }
  };

  // Smart Auto-Distribute shifts equally
  const handleAutoLevelPool = (seniority: 'kidemli' | 'kidemsiz') => {
    const pool = teamList.filter(d => d.seniority === seniority);
    if (pool.length === 0) return;

    const basePerDoc = Math.floor(requiredTotalPerPool / pool.length);
    let remainder = requiredTotalPerPool % pool.length;

    const baseWeekend = Math.floor(requiredWeekendPerPool / pool.length);
    let weekendRemainder = requiredWeekendPerPool % pool.length;

    setTeamList(prev => prev.map(d => {
      if (d.seniority !== seniority) return d;
      const addExtra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder--;

      const addExtraW = weekendRemainder > 0 ? 1 : 0;
      if (weekendRemainder > 0) weekendRemainder--;

      return {
        ...d,
        targetTotalShifts: basePerDoc + addExtra,
        targetWeekendShifts: baseWeekend + addExtraW,
      };
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveOnly = () => {
    onSaveDoctors(teamList);
    setHasUnsavedChanges(false);
  };

  const handleSaveAndGenerate = () => {
    onSaveDoctors(teamList);
    setHasUnsavedChanges(false);
    onApplyAndGenerate(teamList);
  };

  const selectedDocForDates = teamList.find(d => d.id === activeDateModalDocId);

  return (
    <div className="space-y-6">
      
      {/* Dynamic Explanation & Persistence Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Ana Klinik Kadrosu & Aylık Şablon Yönetimi</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Ekip Listesi ve Nöbet Kotaları
            </h2>
            <p className="text-xs text-blue-100/80 leading-relaxed">
              Bu ekrandan ekibin tüm hekimlerini, nöbet sayılarını, hafta sonu kotalarını ve klinik görev yetkilerini dilediğiniz gibi manuel belirleyebilirsiniz. 
              Girdiğiniz bu kadro <strong>kalıcı ana şablon</strong> olarak saklanır; aylık değişiklik olmadıkça her ay otomatik olarak bu kota ve adalet kurallarına göre planlanır. Değişiklik olduğunda buradan güncelleyip tek tıkla yeni listeyi oluşturabilirsiniz.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
            {onOpenAssistantRoster && (
              <button
                onClick={onOpenAssistantRoster}
                id="btn-open-assistant-modal-from-team"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs shadow-lg transition-all active:scale-98 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 text-yellow-300" />
                <span>Asistan Kadrosu & Kıdem Ayarları</span>
              </button>
            )}

            <button
              onClick={handleSaveAndGenerate}
              id="btn-save-and-generate"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg transition-all active:scale-98 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Kaydet & Çizelgeyi Oluştur</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={handleSaveOnly}
              id="btn-save-team-only"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sadece Kadroyu Kaydet</span>
            </button>

            {onResetToClean && (
              <button
                onClick={onResetToClean}
                id="btn-reset-clean-team"
                title="Tüm tablo ve kadroyu temiz başlangıç haline getir"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold border border-rose-400/30 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Başlangıç Haline Sıfırla</span>
              </button>
            )}

            {onLoadSample && (
              <button
                onClick={onLoadSample}
                id="btn-load-sample-team"
                title="EÜTF örnek klinik kadrosunu yükle"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 text-xs font-semibold border border-blue-400/30 transition-all"
              >
                <span>Örnek EÜTF Kadrosunu Getir</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quota Balancer Strip for current month */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                {monthName} {currentYear} Nöbet Kotası Uyumu
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ayda <strong>{daysInMonth} gün</strong> ve <strong>{weekendDaysCount} hafta sonu</strong> günü bulunmaktadır. Her gece 1 Kıdemli ve 1 Kıdemsiz nöbetçi atanır.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToSchedule()}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
            >
              Çizelgeye Geri Dön →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* KIDEMLİ POOL STATUS */}
          <div className={`p-4 rounded-xl border ${
            isKidemliBalanced 
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-sm">Kıdemli Asistan Havuzu</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                isKidemliBalanced 
                  ? 'bg-emerald-200/80 text-emerald-800' 
                  : 'bg-amber-200/80 text-amber-900'
              }`}>
                {isKidemliBalanced ? '✓ Tam Dengelendi' : `${kidemliDiff > 0 ? `+${kidemliDiff} Fazla` : `${kidemliDiff} Eksik`}`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 p-2 rounded-lg border border-slate-200/70">
                <span className="text-slate-500 block text-[11px]">Toplam Nöbet</span>
                <span className="font-mono font-bold text-base">
                  {kidemliTotalShifts} <span className="text-xs font-normal text-slate-500">/ {requiredTotalPerPool}</span>
                </span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-slate-200/70">
                <span className="text-slate-500 block text-[11px]">Hafta Sonu</span>
                <span className="font-mono font-bold text-base">
                  {kidemliWeekendShifts} <span className="text-xs font-normal text-slate-500">/ {requiredWeekendPerPool}</span>
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-600">{kidemliList.length} Kıdemli Hekim</span>
              <button
                onClick={() => handleAutoLevelPool('kidemli')}
                className="text-blue-700 hover:text-blue-900 font-semibold underline text-[11px]"
              >
                Kotaları Kıdemliler Arasında Eşit Böl
              </button>
            </div>
          </div>

          {/* KIDEMSİZ POOL STATUS */}
          <div className={`p-4 rounded-xl border ${
            isKidemsizBalanced 
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-sm">Kıdemsiz Asistan Havuzu</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                isKidemsizBalanced 
                  ? 'bg-emerald-200/80 text-emerald-800' 
                  : 'bg-amber-200/80 text-amber-900'
              }`}>
                {isKidemsizBalanced ? '✓ Tam Dengelendi' : `${kidemsizDiff > 0 ? `+${kidemsizDiff} Fazla` : `${kidemsizDiff} Eksik`}`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 p-2 rounded-lg border border-slate-200/70">
                <span className="text-slate-500 block text-[11px]">Toplam Nöbet</span>
                <span className="font-mono font-bold text-base">
                  {kidemsizTotalShifts} <span className="text-xs font-normal text-slate-500">/ {requiredTotalPerPool}</span>
                </span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-slate-200/70">
                <span className="text-slate-500 block text-[11px]">Hafta Sonu</span>
                <span className="font-mono font-bold text-base">
                  {kidemsizWeekendShifts} <span className="text-xs font-normal text-slate-500">/ {requiredWeekendPerPool}</span>
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-600">{kidemsizList.length} Kıdemsiz Hekim</span>
              <button
                onClick={() => handleAutoLevelPool('kidemsiz')}
                className="text-amber-800 hover:text-amber-950 font-semibold underline text-[11px]"
              >
                Kotaları Kıdemsizler Arasında Eşit Böl
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KIDEMLİ ASİSTANLAR TABLOSU */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Kıdemli Asistanlar ({kidemliList.length} Hekim)
            </h3>
            <span className="text-xs text-slate-500">Gece Kıdemli Nöbetçi Havuzu</span>
          </div>

          <button
            onClick={() => handleAddDoctor('kidemli')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Kıdemli Hekim Ekle</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3 min-w-[140px]">Hekim Adı</th>
                <th className="py-2.5 px-3 min-w-[150px] bg-indigo-50/70 text-indigo-950 text-center font-black">
                  Birlikte Nöbet İstediği Kıdemsiz
                </th>
                <th className="py-2.5 px-3 text-center text-indigo-950 bg-indigo-50/50">Ana Döngü & Kompansasyon</th>
                <th className="py-2.5 px-3 w-28 text-center">Toplam Nöbet</th>
                <th className="py-2.5 px-3 w-28 text-center">Hafta Sonu</th>
                <th className="py-2.5 px-3 text-center">Poliklinik</th>
                <th className="py-2.5 px-3 text-center">Servis</th>
                <th className="py-2.5 px-3 text-center">ESWL+Kons</th>
                <th className="py-2.5 px-3 text-center">Ürodinami</th>
                <th className="py-2.5 px-3 text-center">Toplu İzin / İstek</th>
                <th className="py-2.5 px-3 w-12 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kidemliList.map((doc, idx) => (
                <tr key={doc.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: doc.color }}
                      />
                      <input
                        type="text"
                        value={doc.name}
                        onChange={e => handleUpdateDoctor(doc.id, { name: e.target.value })}
                        className="font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-hidden px-1 py-0.5 w-full text-xs"
                      />
                    </div>
                  </td>

                  {/* 1. Birlikte Nöbet İstediği Kıdemsiz Seçimi */}
                  <td className="py-2.5 px-3 text-center bg-indigo-50/30">
                    <select
                      value={doc.preferredJuniorIds?.[0] || ''}
                      onChange={e => {
                        const val = e.target.value;
                        handleUpdateDoctor(doc.id, {
                          preferredJuniorIds: val ? [val] : []
                        });
                      }}
                      className="w-full text-[11px] font-semibold p-1.5 rounded-lg border border-indigo-200 bg-white text-indigo-950 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">(Tercih Yok / Fark Etmez)</option>
                      {kidemsizList.map(j => (
                        <option key={j.id} value={j.id}>
                          ⭐ {j.shortName || j.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Ana Döngü & Kompansasyon Badge */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={onOpenAssistantRoster}
                      className="inline-flex flex-col items-center gap-0.5 p-1 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors cursor-pointer"
                      title="Asistan Kadrosu penceresinde ana döngü ve kompanse birimlerini düzenle"
                    >
                      <span className="text-[11px] font-bold text-slate-800 capitalize">
                        🎯 {doc.primaryDuty || (doc.isOnlyAmeliyathane ? 'Ameliyathane' : doc.canDoConsultant ? 'Konsültan' : doc.canDoService ? 'Servis' : 'Poliklinik')}
                      </span>
                      {doc.compensationDuties && doc.compensationDuties.length > 0 && (
                        <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                          +{doc.compensationDuties.length} Kompanse
                        </span>
                      )}
                    </button>
                  </td>
                  
                  {/* Total Shift Stepper */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleAdjustShift(doc.id, 'targetTotalShifts', -1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                        title="1 Azalt"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={doc.targetTotalShifts}
                        onChange={e => handleUpdateDoctor(doc.id, { targetTotalShifts: parseInt(e.target.value, 10) || 0 })}
                        className="w-10 text-center font-mono font-bold text-blue-900 border border-slate-200 rounded py-1 text-xs bg-white"
                      />
                      <button
                        onClick={() => handleAdjustShift(doc.id, 'targetTotalShifts', 1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                        title="1 Artır"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  {/* Weekend Shift Stepper */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleAdjustShift(doc.id, 'targetWeekendShifts', -1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        max={doc.targetTotalShifts}
                        value={doc.targetWeekendShifts}
                        onChange={e => handleUpdateDoctor(doc.id, { targetWeekendShifts: parseInt(e.target.value, 10) || 0 })}
                        className="w-10 text-center font-mono font-bold text-amber-900 border border-slate-200 rounded py-1 text-xs bg-white"
                      />
                      <button
                        onClick={() => handleAdjustShift(doc.id, 'targetWeekendShifts', 1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  {/* Role Checkboxes */}
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={doc.canDoClinic && !doc.isOnlyAmeliyathane}
                      disabled={!!doc.isOnlyAmeliyathane}
                      onChange={e => handleUpdateDoctor(doc.id, { canDoClinic: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={doc.canDoService && !doc.isOnlyAmeliyathane}
                      disabled={!!doc.isOnlyAmeliyathane}
                      onChange={e => handleUpdateDoctor(doc.id, { canDoService: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={doc.canDoConsultant && !doc.isOnlyAmeliyathane}
                      disabled={!!doc.isOnlyAmeliyathane}
                      onChange={e => handleUpdateDoctor(doc.id, { canDoConsultant: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!doc.canDoUrodinami && !doc.isOnlyAmeliyathane}
                      disabled={!!doc.isOnlyAmeliyathane}
                      onChange={e => handleUpdateDoctor(doc.id, { canDoUrodinami: e.target.checked })}
                      className="rounded text-pink-600 focus:ring-pink-500"
                    />
                  </td>

                  {/* 2. Takvimden Toplu İzin & İstek Seçimi */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => setCalendarPickerDocId(doc.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 transition-colors font-semibold text-[11px] shadow-2xs"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {doc.unavailableDates.length > 0 ? `${doc.unavailableDates.length} İzin` : 'Takvimden Seç'}
                      </span>
                    </button>
                  </td>

                  {/* Delete */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => handleDeleteDoctor(doc.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                      title="Hekimi Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KIDEMSİZ ASİSTANLAR TABLOSU */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-amber-50/50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Kıdemsiz Asistanlar ({kidemsizList.length} Hekim)
            </h3>
            <span className="text-xs text-slate-500">Gece Kıdemsiz Nöbetçi Havuzu</span>
          </div>

          <button
            onClick={() => handleAddDoctor('kidemsiz')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Kıdemsiz Hekim Ekle</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3 min-w-[140px]">Hekim Adı</th>
                <th className="py-2.5 px-3 text-center text-amber-950 bg-amber-50/50">Ana Döngü & Kompansasyon</th>
                <th className="py-2.5 px-3 w-28 text-center">Toplam Nöbet</th>
                <th className="py-2.5 px-3 w-28 text-center">Hafta Sonu</th>
                <th className="py-2.5 px-3 text-center">Poliklinik</th>
                <th className="py-2.5 px-3 text-center">Servis</th>
                <th className="py-2.5 px-3 text-center">ESWL+Kons</th>
                <th className="py-2.5 px-3 text-center">Ürodinami</th>
                <th className="py-2.5 px-3 text-center">Toplu İzin / İstek</th>
                <th className="py-2.5 px-3 w-12 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kidemsizList.map((doc, idx) => (
                <tr key={doc.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: doc.color }}
                      />
                      <input
                        type="text"
                        value={doc.name}
                        onChange={e => handleUpdateDoctor(doc.id, { name: e.target.value })}
                        className="font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 outline-hidden px-1 py-0.5 w-full text-xs"
                      />
                    </div>
                  </td>

                  {/* Ana Döngü & Kompansasyon Badge */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={onOpenAssistantRoster}
                      className="inline-flex flex-col items-center gap-0.5 p-1 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition-colors cursor-pointer"
                      title="Asistan Kadrosu penceresinde ana döngü ve kompanse birimlerini düzenle"
                    >
                      <span className="text-[11px] font-bold text-slate-800 capitalize">
                        🎯 {doc.primaryDuty || (doc.isOnlyAmeliyathane ? 'Ameliyathane' : doc.canDoUrodinami ? 'Ürodinami' : doc.canDoService ? 'Servis' : 'Poliklinik')}
                      </span>
                      {doc.compensationDuties && doc.compensationDuties.length > 0 && (
                        <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                          +{doc.compensationDuties.length} Kompanse
                        </span>
                      )}
                    </button>
                  </td>
                  
                  {/* Total Shift Stepper */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleAdjustShift(doc.id, 'targetTotalShifts', -1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                        title="1 Azalt"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={doc.targetTotalShifts}
                        onChange={e => handleUpdateDoctor(doc.id, { targetTotalShifts: parseInt(e.target.value, 10) || 0 })}
                        className="w-10 text-center font-mono font-bold text-amber-900 border border-slate-200 rounded py-1 text-xs bg-white"
                      />
                      <button
                        onClick={() => handleAdjustShift(doc.id, 'targetTotalShifts', 1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                        title="1 Artır"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  {/* Weekend Shift Stepper */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleAdjustShift(doc.id, 'targetWeekendShifts', -1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        max={doc.targetTotalShifts}
                        value={doc.targetWeekendShifts}
                        onChange={e => handleUpdateDoctor(doc.id, { targetWeekendShifts: parseInt(e.target.value, 10) || 0 })}
                        className="w-10 text-center font-mono font-bold text-amber-900 border border-slate-200 rounded py-1 text-xs bg-white"
                      />
                      <button
                        onClick={() => handleAdjustShift(doc.id, 'targetWeekendShifts', 1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  {/* Role Checkboxes */}
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={doc.canDoClinic && !doc.isOnlyAmeliyathane}
                      disabled={!!doc.isOnlyAmeliyathane}
                      onChange={e => handleUpdateDoctor(doc.id, { canDoClinic: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={doc.canDoService && !doc.isOnlyAmeliyathane}
                      disabled={!!doc.isOnlyAmeliyathane}
                      onChange={e => handleUpdateDoctor(doc.id, { canDoService: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={doc.canDoConsultant && !doc.isOnlyAmeliyathane}
                      disabled={!!doc.isOnlyAmeliyathane}
                      onChange={e => handleUpdateDoctor(doc.id, { canDoConsultant: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!doc.canDoUrodinami && !doc.isOnlyAmeliyathane}
                      disabled={!!doc.isOnlyAmeliyathane}
                      onChange={e => handleUpdateDoctor(doc.id, { canDoUrodinami: e.target.checked })}
                      className="rounded text-pink-600 focus:ring-pink-500"
                    />
                  </td>

                  {/* Takvimden Toplu İzin & İstek Seçimi */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => setCalendarPickerDocId(doc.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 transition-colors font-semibold text-[11px] shadow-2xs"
                    >
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {doc.unavailableDates.length > 0 ? `${doc.unavailableDates.length} İzin` : 'Takvimden Seç'}
                      </span>
                    </button>
                  </td>

                  {/* Delete */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => handleDeleteDoctor(doc.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                      title="Hekimi Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Save Action Footer */}
      <div className="sticky bottom-4 z-20 bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {hasUnsavedChanges ? (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>Kaydedilmemiş değişiklikleriniz var!</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Klinik kadro bilgileri güncel.</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveOnly}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold border border-slate-700 transition-colors"
          >
            Sadece Kadroyu Kaydet
          </button>
          <button
            onClick={handleSaveAndGenerate}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all active:scale-98"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Değişiklikleri Kaydet & Çizelgeyi Oluştur</span>
          </button>
        </div>
      </div>

      {/* MODAL: Hekimin İzinli ve Tercih Ettiği Günleri Düzenleme */}
      {selectedDocForDates && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {selectedDocForDates.name} - Nöbet İstek & İzin Günleri
                </h3>
                <span className="text-xs text-slate-500">
                  {monthName} {currentYear} tarihleri için izin ve istekleri belirleyin
                </span>
              </div>
              <button
                onClick={() => setActiveDateModalDocId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* İzinli Günler */}
              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
                <label className="block text-xs font-bold text-rose-900 mb-2">
                  Nöbet Tutamaz (İzinli / Raporlu Günler)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="date"
                    value={newOffDate}
                    onChange={e => setNewOffDate(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-rose-200 rounded-lg text-xs bg-white text-slate-800"
                  />
                  <button
                    onClick={() => {
                      if (!newOffDate) return;
                      if (!selectedDocForDates.unavailableDates.includes(newOffDate)) {
                        handleUpdateDoctor(selectedDocForDates.id, {
                          unavailableDates: [...selectedDocForDates.unavailableDates, newOffDate].sort()
                        });
                      }
                      setNewOffDate('');
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Ekle
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {selectedDocForDates.unavailableDates.map(date => (
                    <span
                      key={date}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-rose-200 text-rose-800 text-xs font-medium"
                    >
                      <span>{date}</span>
                      <button
                        onClick={() => {
                          handleUpdateDoctor(selectedDocForDates.id, {
                            unavailableDates: selectedDocForDates.unavailableDates.filter(d => d !== date)
                          });
                        }}
                        className="text-rose-400 hover:text-rose-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {selectedDocForDates.unavailableDates.length === 0 && (
                    <span className="text-[11px] text-rose-400 italic">İzinli gün girilmedi.</span>
                  )}
                </div>
              </div>

              {/* İstenen Nöbet Günleri */}
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <label className="block text-xs font-bold text-emerald-900 mb-2">
                  Nöbet Tercihi (İstediği / Tercih Ettiği Günler)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="date"
                    value={newPrefDate}
                    onChange={e => setNewPrefDate(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-emerald-200 rounded-lg text-xs bg-white text-slate-800"
                  />
                  <button
                    onClick={() => {
                      if (!newPrefDate) return;
                      if (!selectedDocForDates.preferredDates.includes(newPrefDate)) {
                        handleUpdateDoctor(selectedDocForDates.id, {
                          preferredDates: [...selectedDocForDates.preferredDates, newPrefDate].sort()
                        });
                      }
                      setNewPrefDate('');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Ekle
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {selectedDocForDates.preferredDates.map(date => (
                    <span
                      key={date}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 text-xs font-medium"
                    >
                      <span>{date}</span>
                      <button
                        onClick={() => {
                          handleUpdateDoctor(selectedDocForDates.id, {
                            preferredDates: selectedDocForDates.preferredDates.filter(d => d !== date)
                          });
                        }}
                        className="text-emerald-400 hover:text-emerald-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {selectedDocForDates.preferredDates.length === 0 && (
                    <span className="text-[11px] text-emerald-500 italic">Özel istek belirtilmedi.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setActiveDateModalDocId(null)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CalendarMultiDatePicker (Toplu Takvimden İzin & İstek Seçimi) */}
      {calendarPickerDocId && teamList.find(d => d.id === calendarPickerDocId) && (
        <CalendarMultiDatePicker
          isOpen={!!calendarPickerDocId}
          onClose={() => setCalendarPickerDocId(null)}
          currentYear={currentYear}
          currentMonth={currentMonth}
          doctor={teamList.find(d => d.id === calendarPickerDocId)!}
          onSave={(unav, pref) => {
            handleUpdateDoctor(calendarPickerDocId, {
              unavailableDates: unav,
              preferredDates: pref,
            });
            setHasUnsavedChanges(true);
          }}
        />
      )}

    </div>
  );
};
