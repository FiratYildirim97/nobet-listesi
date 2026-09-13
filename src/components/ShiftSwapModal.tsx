import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Calendar, 
  UserCheck, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { MonthlyRoster, Doctor, DayAssignment } from '../types';
import { detectRosterConflicts } from '../utils/conflictChecker';

interface ShiftSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  roster: MonthlyRoster;
  doctors: Doctor[];
  onApplySwap: (updatedRoster: MonthlyRoster) => void;
}

const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export const ShiftSwapModal: React.FC<ShiftSwapModalProps> = ({
  isOpen,
  onClose,
  roster,
  doctors,
  onApplySwap,
}) => {
  const [date1, setDate1] = useState<string>('');
  const [date2, setDate2] = useState<string>('');
  const [doc1Id, setDoc1Id] = useState<string>('');
  const [doc2Id, setDoc2Id] = useState<string>('');

  const docMap = useMemo(() => new Map<string, Doctor>(doctors.map(d => [d.id, d])), [doctors]);

  // Reset or initialize on open
  React.useEffect(() => {
    if (isOpen && roster.days.length > 0) {
      // Find first two days with shifts
      const dutyDays = roster.days.filter(d => d.nobetciIds.length > 0);
      if (dutyDays.length >= 2) {
        setDate1(dutyDays[0].date);
        setDate2(dutyDays[1].date);
        setDoc1Id(dutyDays[0].nobetciIds[0] || '');
        setDoc2Id(dutyDays[1].nobetciIds[0] || '');
      }
    }
  }, [isOpen, roster]);

  if (!isOpen) return null;

  const day1 = roster.days.find(d => d.date === date1);
  const day2 = roster.days.find(d => d.date === date2);

  // Available duty doctors on date1
  const day1DutyDoctors = (day1?.nobetciIds || [])
    .map(id => docMap.get(id))
    .filter((d): d is Doctor => !!d);

  // Available duty doctors on date2
  const day2DutyDoctors = (day2?.nobetciIds || [])
    .map(id => docMap.get(id))
    .filter((d): d is Doctor => !!d);

  // Simulation: perform swap in memory and test for conflicts
  const simulatedRoster = useMemo(() => {
    if (!day1 || !day2 || !doc1Id || !doc2Id || doc1Id === doc2Id || date1 === date2) {
      return null;
    }

    const clonedDays: DayAssignment[] = JSON.parse(JSON.stringify(roster.days));
    const idx1 = clonedDays.findIndex(d => d.date === date1);
    const idx2 = clonedDays.findIndex(d => d.date === date2);

    if (idx1 === -1 || idx2 === -1) return null;

    // Swap in day 1
    const d1 = clonedDays[idx1];
    d1.nobetciIds = d1.nobetciIds.map(id => (id === doc1Id ? doc2Id : id));
    if (d1.kidemliNobetciId === doc1Id) d1.kidemliNobetciId = doc2Id;
    if (d1.kidemsizNobetciId === doc1Id) d1.kidemsizNobetciId = doc2Id;

    // Swap in day 2
    const d2 = clonedDays[idx2];
    d2.nobetciIds = d2.nobetciIds.map(id => (id === doc2Id ? doc1Id : id));
    if (d2.kidemliNobetciId === doc2Id) d2.kidemliNobetciId = doc1Id;
    if (d2.kidemsizNobetciId === doc2Id) d2.kidemsizNobetciId = doc1Id;

    // Re-sync dinlenme for day after idx1
    if (idx1 < clonedDays.length - 1) {
      clonedDays[idx1 + 1].dinlenmeIds = [...clonedDays[idx1].nobetciIds];
    }
    // Re-sync dinlenme for day after idx2
    if (idx2 < clonedDays.length - 1) {
      clonedDays[idx2 + 1].dinlenmeIds = [...clonedDays[idx2].nobetciIds];
    }

    return {
      ...roster,
      days: clonedDays,
    };
  }, [roster, date1, date2, doc1Id, doc2Id]);

  // Detect conflicts in simulated roster
  const swapConflicts = useMemo(() => {
    if (!simulatedRoster) return [];
    return detectRosterConflicts(simulatedRoster, doctors).filter(
      c => c.date === date1 || c.date === date2 || c.doctorId === doc1Id || c.doctorId === doc2Id
    );
  }, [simulatedRoster, doctors, date1, date2, doc1Id, doc2Id]);

  const hasErrors = swapConflicts.some(c => c.severity === 'error');

  const handleConfirmSwap = () => {
    if (!simulatedRoster) return;
    onApplySwap(simulatedRoster);
    onClose();
  };

  const doc1 = docMap.get(doc1Id);
  const doc2 = docMap.get(doc2Id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Akıllı Nöbet Takası (Shift Swap)</h2>
              <p className="text-xs text-slate-500">
                İki hekimin nöbet günlerini çakışma ve dinlenme kurallarını denetleyerek değiştirin
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

        {/* Content Body */}
        <div className="p-6 space-y-6">
          
          {/* Two Sides Comparison Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Slot 1 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">1. Nöbet Günü</span>
              
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Tarih Seçin:</label>
                <select
                  value={date1}
                  onChange={e => {
                    setDate1(e.target.value);
                    const selDay = roster.days.find(d => d.date === e.target.value);
                    if (selDay && selDay.nobetciIds.length > 0) {
                      setDoc1Id(selDay.nobetciIds[0]);
                    }
                  }}
                  className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-300 bg-white"
                >
                  {roster.days.map(d => (
                    <option key={d.date} value={d.date}>
                      {d.date} ({WEEKDAYS[d.dayOfWeek]})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Takas Edilecek Hekim:</label>
                <select
                  value={doc1Id}
                  onChange={e => setDoc1Id(e.target.value)}
                  className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-300 bg-white"
                >
                  {day1DutyDoctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.seniority === 'kidemli' ? 'Kıdemli' : 'Kıdemsiz'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Slot 2 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">2. Nöbet Günü</span>
              
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Tarih Seçin:</label>
                <select
                  value={date2}
                  onChange={e => {
                    setDate2(e.target.value);
                    const selDay = roster.days.find(d => d.date === e.target.value);
                    if (selDay && selDay.nobetciIds.length > 0) {
                      setDoc2Id(selDay.nobetciIds[0]);
                    }
                  }}
                  className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-300 bg-white"
                >
                  {roster.days.map(d => (
                    <option key={d.date} value={d.date}>
                      {d.date} ({WEEKDAYS[d.dayOfWeek]})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Takas Edilecek Hekim:</label>
                <select
                  value={doc2Id}
                  onChange={e => setDoc2Id(e.target.value)}
                  className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-300 bg-white"
                >
                  {day2DutyDoctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.seniority === 'kidemli' ? 'Kıdemli' : 'Kıdemsiz'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Real-time Conflict & Safety Validation */}
          <div className="p-4 rounded-xl border transition-colors bg-white">
            {doc1Id === doc2Id || date1 === date2 ? (
              <div className="text-xs text-amber-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Lütfen farklı iki tarih veya iki farklı hekim seçiniz.</span>
              </div>
            ) : hasErrors ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Bu takas kritik bir kural ihlali yaratıyor!</span>
                </div>
                {swapConflicts.map(c => (
                  <p key={c.id} className="text-xs text-rose-600 pl-6">
                    • {c.message}
                  </p>
                ))}
              </div>
            ) : swapConflicts.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Takas uygulanabilir ancak bazı uyarılar var:</span>
                </div>
                {swapConflicts.map(c => (
                  <p key={c.id} className="text-xs text-amber-700 pl-6">
                    • {c.message}
                  </p>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Temiz ve Güvenli Takas! Arka arkaya nöbet veya mazeret çakışması tespit edilmedi.</span>
              </div>
            )}
          </div>

          {/* Swap Summary */}
          {doc1 && doc2 && date1 !== date2 && (
            <div className="text-xs bg-blue-50/60 p-3 rounded-xl border border-blue-200 text-blue-900 flex items-center justify-between">
              <div>
                <span className="font-bold">{doc1.name}</span> ➔ {date2} tarihine geçecek.
              </div>
              <ArrowLeftRight className="w-4 h-4 text-blue-600 shrink-0 mx-2" />
              <div>
                <span className="font-bold">{doc2.name}</span> ➔ {date1} tarihine geçecek.
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/70 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleConfirmSwap}
            disabled={!simulatedRoster || hasErrors || date1 === date2 || doc1Id === doc2Id}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-2 transition-all ${
              !simulatedRoster || hasErrors || date1 === date2 || doc1Id === doc2Id
                ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-98 shadow-blue-500/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Takası Onayla ve Uygula</span>
          </button>
        </div>

      </div>
    </div>
  );
};
