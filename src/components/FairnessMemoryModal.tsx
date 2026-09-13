import React from 'react';
import { 
  X, 
  Scale, 
  Award, 
  History, 
  CalendarCheck, 
  Flame, 
  HelpCircle,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Doctor, HistoricalMonthSummary } from '../types';

interface FairnessMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  history: HistoricalMonthSummary[];
  onUpdateDoctorBalance: (doctorId: string, shiftDelta: number, weekendDelta: number) => void;
}

export const FairnessMemoryModal: React.FC<FairnessMemoryModalProps> = ({
  isOpen,
  onClose,
  doctors,
  history,
  onUpdateDoctorBalance,
}) => {
  const [activeTab, setActiveTab] = React.useState<'holidays' | 'cumulative' | 'history'>('holidays');

  if (!isOpen) return null;

  // Compute Holiday Priority List:
  // "bayramlarda fazla gün olan aylarda bir ay biri tuttuysa öteki ay diğeri tutcak şekilde ayarlanacak"
  const holidayRankedDoctors = [...doctors].sort((a, b) => {
    // 1. Least total holidays first
    const holDiff = (a.historicalHolidays || 0) - (b.historicalHolidays || 0);
    if (holDiff !== 0) return holDiff;

    // 2. If equal, doctor who worked earlier or never worked gets priority
    if (!a.lastHolidayWorkedDate && b.lastHolidayWorkedDate) return -1;
    if (a.lastHolidayWorkedDate && !b.lastHolidayWorkedDate) return 1;
    if (a.lastHolidayWorkedDate && b.lastHolidayWorkedDate) {
      return a.lastHolidayWorkedDate.localeCompare(b.lastHolidayWorkedDate);
    }
    return 0;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Geçmiş Hafıza & Bayram Adalet Takibi</h2>
              <p className="text-xs text-slate-500">
                Aylar arası kümülatif adalet, hafta sonu dengesi ve bayram nöbet sırası rotasyonu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('holidays')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'holidays'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-600" />
            <span>Bayram Rotasyon Sırası</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">
              Öncelikli
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cumulative')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'cumulative'
                ? 'border-blue-600 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Kümülatif Hafta Sonu & Nöbet Dengesi</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'history'
                ? 'border-purple-600 text-purple-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-purple-600" />
            <span>Hafızadaki Geçmiş Aylar ({history.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: BAYRAM ROTASYONU */}
          {activeTab === 'holidays' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <CalendarCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950">Bayram ve Resmi Tatil Adaleti Kuralı</h4>
                  <p className="mt-0.5 text-amber-800">
                    Sistem önceki bayramlarda kimin tuttuğunu hafızasında saklar. Bir ayki bayramda nöbet tutan hekim bir sonraki bayramda dinlendirilir; hiç bayram tutmamış veya en son tutmuş hekimler en üst sıraya yerleşerek otomatik dağıtımda öncelik alır.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Öncelik Sırası</th>
                      <th className="py-2.5 px-3">Hekim</th>
                      <th className="py-2.5 px-3">Unvan</th>
                      <th className="py-2.5 px-3 text-center">Toplam Bayram Nöbeti</th>
                      <th className="py-2.5 px-3">En Son Tuttuğu Bayram</th>
                      <th className="py-2.5 px-3 text-right">Gelecek Bayram Durumu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {holidayRankedDoctors.map((doc, index) => {
                      const neverWorked = (doc.historicalHolidays || 0) === 0;
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-500">
                            #{index + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: doc.color }}
                            />
                            <span>{doc.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{doc.title}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full font-bold ${
                              neverWorked ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {doc.historicalHolidays || 0}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {doc.lastHolidayWorkedName ? (
                              <div>
                                <span className="font-medium text-slate-900">{doc.lastHolidayWorkedName}</span>
                                {doc.lastHolidayWorkedDate && (
                                  <span className="text-[10px] text-slate-400 block">{doc.lastHolidayWorkedDate}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-rose-600 font-semibold italic">Henüz hiç bayram tutmadı</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {neverWorked ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                ⭐ Sıradaki 1. Aday
                              </span>
                            ) : index < 3 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                Yakın Aday
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                Dinlenmede
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: KÜMÜLATİF DENGELER */}
          {activeTab === 'cumulative' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                <Scale className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-950">Aylar Arası Adalet & Hakkaniyet Sayacı</h4>
                  <p className="mt-0.5 text-blue-800">
                    Önceki aylarda hekimlerin kota üzerinde (+ alacaklı) veya kota altında (- borçlu) tuttukları nöbetler kaydedilir. Otomatik algoritma bu dengeleri göz önünde bulundurarak dağıtım yapar.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Hekim</th>
                      <th className="py-2.5 px-3 text-center">Toplam Geçmiş Nöbet</th>
                      <th className="py-2.5 px-3 text-center">Hafta Sonu Nöbeti</th>
                      <th className="py-2.5 px-3 text-center">Bayram Nöbeti</th>
                      <th className="py-2.5 px-3 text-center">Nöbet Alacak / Borç</th>
                      <th className="py-2.5 px-3 text-center">HS Alacak / Borç</th>
                      <th className="py-2.5 px-3 text-right">Manuel Düzeltme</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {doctors.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: doc.color }}
                          />
                          <span>{doc.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {doc.historicalShifts || 0}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-800">
                          {doc.historicalWeekends || 0}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-rose-800">
                          {doc.historicalHolidays || 0}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-md font-bold text-xs ${
                            (doc.shiftBalance || 0) > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : (doc.shiftBalance || 0) < 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {(doc.shiftBalance || 0) > 0 ? `+${doc.shiftBalance}` : doc.shiftBalance || 0}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-md font-bold text-xs ${
                            (doc.weekendBalance || 0) > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : (doc.weekendBalance || 0) < 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {(doc.weekendBalance || 0) > 0 ? `+${doc.weekendBalance}` : doc.weekendBalance || 0}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onUpdateDoctorBalance(doc.id, 1, 0)}
                              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold"
                              title="+1 Nöbet Alacağı Ekle"
                            >
                              +1 N
                            </button>
                            <button
                              onClick={() => onUpdateDoctorBalance(doc.id, -1, 0)}
                              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold"
                              title="-1 Nöbet Düşür"
                            >
                              -1 N
                            </button>
                            <button
                              onClick={() => onUpdateDoctorBalance(doc.id, 0, 1)}
                              className="px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold"
                              title="+1 Hafta Sonu Alacağı Ekle"
                            >
                              +1 HS
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: GEÇMİŞ AY KAYITLARI */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Henüz hafızaya kaydedilmiş geçmiş ay bulunmuyor.
                </div>
              ) : (
                history.map((histMonth, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-purple-600" />
                        <h4 className="font-bold text-slate-900 text-sm">{histMonth.monthTitle}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(histMonth.savedAt).toLocaleDateString('tr-TR')} tarihinde kaydedildi
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                      {histMonth.doctorStats.map(st => {
                        const doc = doctors.find(d => d.id === st.doctorId);
                        return (
                          <div key={st.doctorId} className="p-2 rounded-lg bg-white border border-slate-200">
                            <div className="font-semibold text-slate-800 truncate">{doc?.name || 'Hekim'}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {st.totalShifts} nöbet • {st.weekendShifts} HS
                              {st.holidayShifts > 0 && (
                                <span className="text-rose-600 font-bold block">
                                  {st.holidayShifts} bayram ({st.holidaysWorked.join(', ')})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Hafıza otomatik olarak her çizelge tamamlanıp "Hafızaya Kaydet" denildiğinde güncellenir.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition-colors"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
};
