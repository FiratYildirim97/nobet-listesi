import React, { useState } from 'react';
import { 
  Sparkles, 
  Bot, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Key, 
  Send, 
  Loader2,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  FileEdit
} from 'lucide-react';
import { Doctor, MonthlyDoctorConfig } from '../types';
import { parseDoctorRequestsWithAi, ParsedDoctorRequest } from '../utils/aiParser';
import { getDaysInMonth, formatDateStr } from '../utils/scheduler';

export interface AiRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  currentYear: number;
  currentMonth: number;
  doctorConfigs?: Record<string, MonthlyDoctorConfig>;
  onApplyRequests: (updatedDoctors: Doctor[], updatedConfigs?: Record<string, MonthlyDoctorConfig>) => void;
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const SAMPLE_TEXT_1 = `Dr. Berk 12-16 Ekim tarihleri arasında kongrede olacağından izinli, nöbet tutamaz.
Dr. Selim sadece 5 ve 19 Ekim tarihlerinde nöbet istiyor.
Dr. Can 8 Ekim günü mazeretli, nöbet yazılamaz.`;

interface ManualRequestItem {
  id: string;
  doctorId: string;
  doctorName: string;
  type: 'unavail' | 'pref';
  dateStrings: string[];
  displayLabel: string;
}

export const AiRequestModal: React.FC<AiRequestModalProps> = ({
  isOpen,
  onClose,
  doctors,
  currentYear,
  currentMonth,
  doctorConfigs,
  onApplyRequests,
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [selectedDocId, setSelectedDocId] = useState<string>(doctors[0]?.id || '');
  const [manualType, setManualType] = useState<'unavail' | 'pref'>('unavail');
  const [isRangeMode, setIsRangeMode] = useState<boolean>(false);
  const [singleDay, setSingleDay] = useState<number>(1);
  const [startDay, setStartDay] = useState<number>(1);
  const [endDay, setEndDay] = useState<number>(1);
  const [manualQueue, setManualQueue] = useState<ManualRequestItem[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [inputText, setInputText] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [isApiKeyOpen, setIsApiKeyOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [parsedResults, setParsedResults] = useState<ParsedDoctorRequest[] | null>(null);

  if (!isOpen) return null;

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const handleAddManualItem = () => {
    const targetDoc = doctors.find(d => d.id === (selectedDocId || doctors[0]?.id));
    if (!targetDoc) return;

    let daysToAdd: number[] = [];
    if (isRangeMode) {
      const minD = Math.max(1, Math.min(startDay, endDay));
      const maxD = Math.min(daysInMonth, Math.max(startDay, endDay));
      for (let d = minD; d <= maxD; d++) daysToAdd.push(d);
    } else {
      daysToAdd.push(Math.min(daysInMonth, Math.max(1, singleDay)));
    }

    const dateStrings = daysToAdd.map(d => formatDateStr(currentYear, currentMonth, d));
    const label = isRangeMode && startDay !== endDay
      ? `${Math.min(startDay, endDay)}-${Math.max(startDay, endDay)} ${MONTH_NAMES[currentMonth - 1]}`
      : `${singleDay} ${MONTH_NAMES[currentMonth - 1]}`;

    const newItem: ManualRequestItem = {
      id: 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      doctorId: targetDoc.id,
      doctorName: targetDoc.name,
      type: manualType,
      dateStrings,
      displayLabel: label,
    };

    setManualQueue(prev => [...prev, newItem]);
    setFeedbackMsg(`✓ ${targetDoc.name} için ${label} eklendi!`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleRemoveManualItem = (id: string) => {
    setManualQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const results = await parseDoctorRequestsWithAi(
        inputText,
        doctors,
        currentYear,
        currentMonth,
        apiKey || undefined
      );
      setParsedResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAllToMonthlyTab = () => {
    const newConfigs: Record<string, MonthlyDoctorConfig> = { ...(doctorConfigs || {}) };

    doctors.forEach(doc => {
      if (!newConfigs[doc.id]) {
        newConfigs[doc.id] = {
          doctorId: doc.id,
          primaryDuty: doc.isOnlyAmeliyathane ? 'ameliyathane' : (doc.primaryDuty || 'poliklinik'),
          compensationDuties: doc.isOnlyAmeliyathane ? [] : (doc.compensationDuties || []),
          unavailableDates: [...(doc.unavailableDates || [])],
          preferredDates: [...(doc.preferredDates || [])],
          preferredJuniorIds: [...(doc.preferredJuniorIds || [])],
        };
      }
    });

    manualQueue.forEach(item => {
      const cfg = newConfigs[item.doctorId];
      if (!cfg) return;
      const unavails = new Set(cfg.unavailableDates || []);
      const prefs = new Set(cfg.preferredDates || []);

      if (item.type === 'unavail') {
        item.dateStrings.forEach(d => {
          unavails.add(d);
          prefs.delete(d);
        });
      } else {
        item.dateStrings.forEach(d => {
          prefs.add(d);
          unavails.delete(d);
        });
      }

      cfg.unavailableDates = Array.from(unavails).sort();
      cfg.preferredDates = Array.from(prefs).sort();
    });

    if (parsedResults && parsedResults.length > 0) {
      parsedResults.forEach(p => {
        const doc = doctors.find(d => d.id === p.matchedDoctorId || d.name.toLowerCase() === p.doctorName.toLowerCase());
        if (!doc) return;
        const cfg = newConfigs[doc.id];
        if (!cfg) return;
        const unavails = new Set(cfg.unavailableDates || []);
        const prefs = new Set(cfg.preferredDates || []);

        p.unavailableDates.forEach(d => {
          unavails.add(d);
          prefs.delete(d);
        });
        p.preferredDates.forEach(d => {
          prefs.add(d);
          unavails.delete(d);
        });

        cfg.unavailableDates = Array.from(unavails).sort();
        cfg.preferredDates = Array.from(prefs).sort();
      });
    }

    const updatedDoctors = doctors.map(doc => {
      const cfg = newConfigs[doc.id];
      if (!cfg) return doc;
      return {
        ...doc,
        unavailableDates: cfg.unavailableDates || [],
        preferredDates: cfg.preferredDates || [],
      };
    });

    onApplyRequests(updatedDoctors, newConfigs);
    onClose();
  };

  const totalAddedCount = manualQueue.length + (parsedResults?.length || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Mazeret & Nöbet İstek Girişi
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {MONTH_NAMES[currentMonth - 1]} {currentYear}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                İster AI olmadan tek tek ekleyin, ister WhatsApp mesajından otomatik ayrıştırın.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Manuel vs AI) */}
        <div className="px-6 pt-3 pb-0 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={'flex items-center gap-1.5 px-4 py-2 border-b-2 font-black text-xs transition-all cursor-pointer ' + (
              activeTab === 'manual'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <FileEdit className="w-3.5 h-3.5 text-indigo-600" />
            <span>1. Manuel İzin/İstek Ekle (AI Gerekmez)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={'flex items-center gap-1.5 px-4 py-2 border-b-2 font-black text-xs transition-all cursor-pointer ' + (
              activeTab === 'ai'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <Bot className="w-3.5 h-3.5 text-purple-600" />
            <span>2. Serbest Metin / WhatsApp (Opsiyonel)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: MANUEL GİRİŞ (YAPAY ZEKA OLMADAN, TEK TEK BİRDEN FAZLA) */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <span>⚡ Tek Tek İzin ve İstek Ekle</span>
                  </span>
                  {feedbackMsg && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 animate-in fade-in">
                      {feedbackMsg}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* Asistan Seç */}
                  <div className="sm:col-span-5">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Asistan Hekim:
                    </label>
                    <select
                      value={selectedDocId || (doctors[0]?.id || '')}
                      onChange={e => setSelectedDocId(e.target.value)}
                      className="w-full text-xs font-bold py-2 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden cursor-pointer"
                    >
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.seniorityRank}. {d.name} ({d.seniority === 'kidemli' ? 'Kıdemli' : 'Kıdemsiz'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tür Seç */}
                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Kayıt Türü:
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-lg border border-slate-300">
                      <button
                        type="button"
                        onClick={() => setManualType('unavail')}
                        className={'py-1.5 px-1 rounded-md text-[10px] font-black transition-all cursor-pointer flex items-center justify-center ' + (
                          manualType === 'unavail'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-rose-700 hover:bg-rose-50'
                        )}
                      >
                        🔴 İzinli
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualType('pref')}
                        className={'py-1.5 px-1 rounded-md text-[10px] font-black transition-all cursor-pointer flex items-center justify-center ' + (
                          manualType === 'pref'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        )}
                      >
                        🟢 İstek
                      </button>
                    </div>
                  </div>

                  {/* Gün Seç */}
                  <div className="sm:col-span-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-600">
                        {isRangeMode ? 'Gün Aralığı:' : 'Nöbet Günü:'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsRangeMode(!isRangeMode)}
                        className="text-[10px] text-indigo-600 hover:underline font-bold cursor-pointer"
                      >
                        {isRangeMode ? 'Tek Gün' : 'Aralık Seç (Örn: 12-16)'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isRangeMode ? (
                        <>
                          <input
                            type="number"
                            min={1}
                            max={daysInMonth}
                            value={startDay}
                            onChange={e => setStartDay(Math.max(1, Math.min(daysInMonth, parseInt(e.target.value, 10) || 1)))}
                            className="w-full text-center text-xs font-black py-2 px-1 rounded-lg border border-slate-300 bg-white"
                            placeholder="Başlangıç"
                          />
                          <span className="text-slate-400 font-bold text-xs">-</span>
                          <input
                            type="number"
                            min={1}
                            max={daysInMonth}
                            value={endDay}
                            onChange={e => setEndDay(Math.max(1, Math.min(daysInMonth, parseInt(e.target.value, 10) || 1)))}
                            className="w-full text-center text-xs font-black py-2 px-1 rounded-lg border border-slate-300 bg-white"
                            placeholder="Bitiş"
                          />
                        </>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          max={daysInMonth}
                          value={singleDay}
                          onChange={e => setSingleDay(Math.max(1, Math.min(daysInMonth, parseInt(e.target.value, 10) || 1)))}
                          className="w-full text-center text-xs font-black py-2 px-2 rounded-lg border border-slate-300 bg-white"
                        />
                      )}
                      
                      <button
                        type="button"
                        onClick={handleAddManualItem}
                        className="py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xs transition-all active:scale-95 shrink-0 flex items-center gap-1 cursor-pointer"
                        title="Listeye Ekle"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Ekle</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Eklenen Mazeretler Listesi */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>Eklenen Kayıtlar ({manualQueue.length})</span>
                  </h4>
                  {manualQueue.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setManualQueue([])}
                      className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold underline cursor-pointer"
                    >
                      Tümünü Temizle
                    </button>
                  )}
                </div>

                {manualQueue.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-center text-xs text-slate-400">
                    Henüz bir izin veya nöbet isteği eklenmedi. Yukarıdan asistan ve tarih seçip <strong>+ Ekle</strong> butonuna basın.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                    {manualQueue.map(item => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between gap-2 shadow-2xs hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900">{item.doctorName}</span>
                          <span className={'px-2 py-0.5 rounded text-[10px] font-bold border ' + (
                            item.type === 'unavail'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          )}>
                            {item.type === 'unavail' ? '🚫 İzinli (Nöbet Tutamaz)' : '⭐ Nöbet İsteği'}
                          </span>
                          <span className="font-semibold text-slate-600 text-[11px]">
                            📅 {item.displayLabel}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveManualItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Bu kaydı kaldır"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SERBEST METİN / WHATSAPP (OPSİYONEL) */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              {/* API Key Toggle Banner */}
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-slate-700">
                  <Key className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {apiKey ? 'Kişisel Gemini API Anahtarı Tanımlı' : 'Yerel Türkçe Ayrıştırıcı Aktif (API Gerekmez)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsApiKeyOpen(!isApiKeyOpen)}
                  className="text-purple-600 hover:underline font-semibold cursor-pointer"
                >
                  {isApiKeyOpen ? 'Gizle' : 'API Anahtarı Gir'}
                </button>
              </div>

              {isApiKeyOpen && (
                <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2 text-xs">
                  <label className="font-semibold text-purple-950 block">Google Gemini API Anahtarı (Opsiyonel):</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => handleSaveApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full p-2 rounded-lg border border-purple-300 bg-white font-mono text-xs"
                  />
                  <p className="text-[10px] text-purple-700">
                    Boş bıraksanız dahi projemizdeki yerel kural motoru Türkçe tarih ve izinleri otomatik çözer.
                  </p>
                </div>
              )}

              {/* Text Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Gelen Mesajları veya Mazeret Notlarını Yapıştırın:
                  </label>
                  <button
                    type="button"
                    onClick={() => setInputText(SAMPLE_TEXT_1)}
                    className="text-[11px] text-purple-600 hover:underline font-semibold cursor-pointer"
                  >
                    Örnek Mesajı Doldur
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Örn: Dr. Berk 12-16 Ekim kongrede izinli, Dr. Selim 5 Ekim'de nöbet istiyor..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 leading-relaxed"
                />
              </div>

              {/* Action Parse Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParse}
                  disabled={loading || !inputText.trim()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                  <span>{loading ? 'Ayrıştırılıyor...' : 'Mazeretleri Ayrıştır'}</span>
                </button>
              </div>

              {/* Parsed Preview Results */}
              {parsedResults && (
                <div className="space-y-3 pt-3 border-t border-slate-200 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Ayrıştırılan Hekim Mazeretleri ({parsedResults.length})</span>
                    </h4>
                  </div>

                  {parsedResults.length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      Metinde hekim ismi ve tarih tespit edilemedi. Lütfen hekim isimlerinin kadro ile örtüştüğünden emin olun.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {parsedResults.map((p, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{p.doctorName}</span>
                            {p.matchedDoctorId ? (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                                Eşleşti
                              </span>
                            ) : (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                İsim Eşleşmedi
                              </span>
                            )}
                            <p className="text-[11px] text-slate-500 italic mt-0.5">"{p.notes}"</p>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {p.unavailableDates.map(d => (
                              <span key={d} className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                                🚫 İzinli: {d.split('-')[2]} {MONTH_NAMES[currentMonth - 1]}
                              </span>
                            ))}
                            {p.preferredDates.map(d => (
                              <span key={d} className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">
                                ⭐ İstek: {d.split('-')[2]} {MONTH_NAMES[currentMonth - 1]}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            Kapat
          </button>
          
          <button
            type="button"
            onClick={handleApplyAllToMonthlyTab}
            disabled={totalAddedCount === 0}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black text-xs flex items-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>2. Sayfaya (Aylık Tercihler) Aktar ve Kaydet ({totalAddedCount})</span>
          </button>
        </div>

      </div>
    </div>
  );
};
