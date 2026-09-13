import React, { useState } from 'react';
import { 
  X, 
  Moon, 
  Sun, 
  Stethoscope, 
  Bed, 
  Check, 
  Save, 
  AlertTriangle,
  Activity,
  Scissors,
  ShieldCheck
} from 'lucide-react';
import { DayAssignment, Doctor } from '../types';
import { deriveSurname } from '../utils/auth';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayData: DayAssignment | null;
  doctors: Doctor[];
  previousDayDutyDoctorIds?: string[];
  isAdmin?: boolean;
  onSaveDay: (updatedDay: DayAssignment) => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  isOpen,
  onClose,
  dayData,
  doctors,
  previousDayDutyDoctorIds = [],
  isAdmin = true,
  onSaveDay,
}) => {
  const [currentDay, setCurrentDay] = useState<DayAssignment | null>(null);

  React.useEffect(() => {
    if (dayData) {
      setCurrentDay(JSON.parse(JSON.stringify(dayData)));
    }
  }, [dayData]);

  if (!isOpen || !currentDay) return null;

  const docMap = new Map<string, Doctor>(doctors.map(d => [d.id, d]));
  const kidemliDocs = doctors.filter(d => d.seniority === 'kidemli');
  const kidemsizDocs = doctors.filter(d => d.seniority === 'kidemsiz');

  const getDocSurname = (doc?: Doctor | null): string => {
    if (!doc) return '';
    if (doc.shortName && !doc.shortName.toLowerCase().startsWith('asistan') && !/^\d+$/.test(doc.shortName.trim())) {
      return doc.shortName.toUpperCase();
    }
    if (doc.name) {
      const derived = deriveSurname(doc.name);
      if (derived && !derived.toLowerCase().startsWith('asistan') && !/^\d+$/.test(derived.trim())) {
        return derived;
      }
      if (!/^\d+$/.test(doc.name.trim()) && !doc.name.toLowerCase().startsWith('asistan')) {
        return doc.name.toUpperCase();
      }
    }
    return '';
  };

  const setKidemli = (docId: string) => {
    setCurrentDay(prev => {
      if (!prev) return null;
      const newKidemli = prev.kidemliNobetciId === docId ? undefined : docId;
      const newNobetciler = [newKidemli, prev.kidemsizNobetciId].filter(Boolean) as string[];
      return {
        ...prev,
        kidemliNobetciId: newKidemli,
        nobetciIds: newNobetciler,
      };
    });
  };

  const setKidemsiz = (docId: string) => {
    setCurrentDay(prev => {
      if (!prev) return null;
      const newKidemsiz = prev.kidemsizNobetciId === docId ? undefined : docId;
      const newNobetciler = [prev.kidemliNobetciId, newKidemsiz].filter(Boolean) as string[];
      return {
        ...prev,
        kidemsizNobetciId: newKidemsiz,
        nobetciIds: newNobetciler,
      };
    });
  };

  const togglePoliklinik = (docId: string) => {
    setCurrentDay(prev => {
      if (!prev) return null;
      const exists = prev.poliklinikIds.includes(docId);
      return {
        ...prev,
        poliklinikIds: exists
          ? prev.poliklinikIds.filter(id => id !== docId)
          : [...prev.poliklinikIds, docId],
      };
    });
  };

  const setServis = (docId: string) => {
    setCurrentDay(prev => {
      if (!prev) return null;
      const exists = prev.servisIds.includes(docId);
      return {
        ...prev,
        servisIds: exists ? [] : [docId],
      };
    });
  };

  const setKonsultan = (docId: string) => {
    setCurrentDay(prev => {
      if (!prev) return null;
      const exists = prev.konsultanIds.includes(docId);
      return {
        ...prev,
        konsultanIds: exists ? [] : [docId],
      };
    });
  };

  const setUrodinami = (docId: string) => {
    setCurrentDay(prev => {
      if (!prev) return null;
      const exists = (prev.urodinamiIds || []).includes(docId);
      return {
        ...prev,
        urodinamiIds: exists ? [] : [docId],
      };
    });
  };

  const setAmeliyathane = (docId: string) => {
    setCurrentDay(prev => {
      if (!prev) return null;
      const exists = (prev.ameliyathaneIds || []).includes(docId);
      return {
        ...prev,
        ameliyathaneIds: exists ? [] : [docId],
      };
    });
  };

  const handleSave = () => {
    if (currentDay) {
      onSaveDay(currentDay);
      onClose();
    }
  };

  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs ${
              currentDay.isHoliday ? 'bg-rose-600' : currentDay.isWeekend ? 'bg-slate-700' : 'bg-blue-600'
            }`}>
              {parseInt(currentDay.date.split('-')[2], 10)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {currentDay.date} — {dayNames[currentDay.dayOfWeek]}
                </h3>
                {currentDay.isHoliday && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    {currentDay.holidayName || 'Resmi Tatil'}
                  </span>
                )}
                {currentDay.isWeekend && !currentDay.isHoliday && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                    Hafta Sonu
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Kıdemli, Kıdemsiz nöbetçileri ve klinik çalışma dağılımını belirleyin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          
          {/* 1. NÖBETÇİLER (Kıdemli & Kıdemsiz) */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-4">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
              <Moon className="w-4 h-4 text-blue-600" />
              <span>Nöbetçi Hekimler (Gece / 24 Saat)</span>
            </div>

            {/* KIDEMLİ SEÇİMİ */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>1. KIDEMLİ NÖBETÇİ:</span>
                <span className="text-[11px] font-bold text-blue-700 uppercase">
                  {currentDay.kidemliNobetciId ? (getDocSurname(docMap.get(currentDay.kidemliNobetciId)) || docMap.get(currentDay.kidemliNobetciId)?.name) : 'Seçilmedi'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {kidemliDocs.map(doc => {
                  const isSelected = currentDay.kidemliNobetciId === doc.id;
                  const wasOnDutyYesterday = previousDayDutyDoctorIds.includes(doc.id);
                  const isUnavailable = doc.unavailableDates?.includes(currentDay.date);

                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setKidemli(doc.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{getDocSurname(doc) || doc.name}</span>
                      {wasOnDutyYesterday && (
                        <span className="text-[9px] px-1 rounded bg-amber-100 text-amber-900" title="Dün nöbetçiydi!">
                          Dün
                        </span>
                      )}
                      {isUnavailable && (
                        <span className="text-[9px] px-1 rounded bg-rose-100 text-rose-800" title="İzinli!">
                          İzinli
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* KIDEMSİZ SEÇİMİ */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>2. KIDEMSİZ NÖBETÇİ:</span>
                <span className="text-[11px] font-bold text-amber-700 uppercase">
                  {currentDay.kidemsizNobetciId ? (getDocSurname(docMap.get(currentDay.kidemsizNobetciId)) || docMap.get(currentDay.kidemsizNobetciId)?.name) : 'Seçilmedi'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {kidemsizDocs.map(doc => {
                  const isSelected = currentDay.kidemsizNobetciId === doc.id;
                  const wasOnDutyYesterday = previousDayDutyDoctorIds.includes(doc.id);
                  const isUnavailable = doc.unavailableDates?.includes(currentDay.date);

                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setKidemsiz(doc.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{getDocSurname(doc) || doc.name}</span>
                      {wasOnDutyYesterday && (
                        <span className="text-[9px] px-1 rounded bg-amber-100 text-amber-900" title="Dün nöbetçiydi!">
                          Dün
                        </span>
                      )}
                      {isUnavailable && (
                        <span className="text-[9px] px-1 rounded bg-rose-100 text-rose-800" title="İzinli!">
                          İzinli
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. GÜNDÜZ KLİNİK GÖREVLERİ */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Sun className="w-4 h-4 text-amber-600" />
              <span>Gündüz Klinik Dağılımı</span>
            </div>

            {/* POLİKLİNİK (2 Hekim) */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>POLİKLİNİK:</span>
                <span className="text-[11px] text-cyan-800 font-mono font-bold uppercase">
                  {currentDay.poliklinikIds.map(id => getDocSurname(docMap.get(id))).filter(Boolean).join('/') || 'Seçilmedi'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {doctors.map(doc => {
                  const isSelected = currentDay.poliklinikIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => togglePoliklinik(doc.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-cyan-700 text-white border-cyan-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-cyan-50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{getDocSurname(doc) || doc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SERVİS */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>SERVİS:</span>
                <span className="text-[11px] text-emerald-800 font-bold uppercase">
                  {currentDay.servisIds.map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ') || 'Seçilmedi'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {doctors.map(doc => {
                  const isSelected = currentDay.servisIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setServis(doc.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{getDocSurname(doc) || doc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ESWL+KONS */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>ESWL+KONS:</span>
                <span className="text-[11px] text-purple-800 font-bold uppercase">
                  {currentDay.konsultanIds.map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ') || 'Seçilmedi'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {doctors.map(doc => {
                  const isSelected = currentDay.konsultanIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setKonsultan(doc.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-purple-700 text-white border-purple-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{getDocSurname(doc) || doc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ÜRODİNAMİ */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>ÜRODİNAMİ:</span>
                <span className="text-[11px] text-pink-800 font-bold uppercase">
                  {(currentDay.urodinamiIds || []).map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ') || 'Seçilmedi'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {doctors.map(doc => {
                  const isSelected = (currentDay.urodinamiIds || []).includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setUrodinami(doc.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-pink-700 text-white border-pink-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-pink-50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{getDocSurname(doc) || doc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AMELİYATHANE */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>AMELİYATHANE:</span>
                <span className="text-[11px] text-slate-800 font-bold">
                  {(currentDay.ameliyathaneIds || []).map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ') || 'Seçilmedi'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {doctors.map(doc => {
                  const isSelected = (currentDay.ameliyathaneIds || []).includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setAmeliyathane(doc.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{getDocSurname(doc) || doc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
          <div>
            {!isAdmin && (
              <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-medium">
                Salt okunur görüntüleme modu (Yönetici girişi ile düzenlenebilir)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              {isAdmin ? 'İptal' : 'Kapat'}
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Değişiklikleri Kaydet</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
