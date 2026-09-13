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
  RotateCcw
} from 'lucide-react';
import { Doctor } from '../types';
import { parseDoctorRequestsWithAi, ParsedDoctorRequest } from '../utils/aiParser';

interface AiRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  currentYear: number;
  currentMonth: number;
  onApplyRequests: (updatedDoctors: Doctor[]) => void;
}

const SAMPLE_TEXT_1 = `Dr. Berk 12-16 Eylül tarihleri arasında kongrede olacağından izinli, nöbet tutamaz.
Dr. Selim sadece 5 ve 19 Eylül tarihlerinde nöbet istiyor.
Dr. Can 8 Eylül günü mazeretli, nöbet yazılamaz.`;

export const AiRequestModal: React.FC<AiRequestModalProps> = ({
  isOpen,
  onClose,
  doctors,
  currentYear,
  currentMonth,
  onApplyRequests,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [isApiKeyOpen, setIsApiKeyOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [parsedResults, setParsedResults] = useState<ParsedDoctorRequest[] | null>(null);

  if (!isOpen) return null;

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
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

  const handleApplyToTeam = () => {
    if (!parsedResults) return;

    // Apply parsed dates to doctors
    const updated = doctors.map(doc => {
      const matchingParses = parsedResults.filter(
        p => p.matchedDoctorId === doc.id || p.doctorName.toLowerCase() === doc.name.toLowerCase()
      );

      if (matchingParses.length === 0) return doc;

      const newUnavailable = new Set(doc.unavailableDates || []);
      const newPreferred = new Set(doc.preferredDates || []);

      matchingParses.forEach(p => {
        p.unavailableDates.forEach(d => newUnavailable.add(d));
        p.preferredDates.forEach(d => newPreferred.add(d));
      });

      return {
        ...doc,
        unavailableDates: Array.from(newUnavailable),
        preferredDates: Array.from(newPreferred),
      };
    });

    onApplyRequests(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">AI Nöbet & Mazeret Asistanı</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  Gemini + Akıllı Ayrıştırıcı
                </span>
              </div>
              <p className="text-xs text-slate-500">
                WhatsApp veya e-postadan gelen hekim mazeretlerini serbest metin olarak yapıştırın
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* API Key Toggle Banner */}
          <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-700">
              <Key className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {apiKey ? 'Kişisel Gemini API Anahtarı Tanımlı' : 'Yerel Akıllı Motor Aktif (API Anahtarı İsteğe Bağlı)'}
              </span>
            </div>
            <button
              onClick={() => setIsApiKeyOpen(!isApiKeyOpen)}
              className="text-purple-600 hover:underline font-semibold"
            >
              {isApiKeyOpen ? 'Gizle' : 'API Anahtarı Gir'}
            </button>
          </div>

          {isApiKeyOpen && (
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2 text-xs">
              <label className="font-semibold text-purple-950 block">Google Gemini API Anahtarı:</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => handleSaveApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full p-2 rounded-lg border border-purple-300 bg-white font-mono text-xs"
              />
              <p className="text-[10px] text-purple-700">
                Anahtarınız sadece yerel tarayıcınızda (localStorage) saklanır, hiçbir sunucuya gönderilmez.
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
                onClick={() => setInputText(SAMPLE_TEXT_1)}
                className="text-[11px] text-purple-600 hover:underline font-semibold"
              >
                Örnek Mesajı Doldur
              </button>
            </div>

            <textarea
              rows={4}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Örn: Dr. Berk 12-16 Eylül kongrede izinli, Dr. Selim 5 Eylül'de nöbet istiyor..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 leading-relaxed"
            />
          </div>

          {/* Action Parse Button */}
          <div className="flex justify-end">
            <button
              onClick={handleParse}
              disabled={loading || !inputText.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
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
                            🚫 İzinli: {d.split('-')[2]} {currentMonth}. Ay
                          </span>
                        ))}
                        {p.preferredDates.map(d => (
                          <span key={d} className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">
                            ⭐ İstek: {d.split('-')[2]} {currentMonth}. Ay
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

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/70 transition-colors"
          >
            Kapat
          </button>
          
          {parsedResults && parsedResults.length > 0 && (
            <button
              onClick={handleApplyToTeam}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-98 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Değişiklikleri Ekibe Uygula</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
