import React from 'react';
import { 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  Calendar,
  UserCheck
} from 'lucide-react';
import { RuleConflict, DayAssignment, Doctor } from '../types';

interface ConflictInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: RuleConflict[];
  onSelectDay?: (date: string) => void;
  doctors: Doctor[];
}

export const ConflictInspectorModal: React.FC<ConflictInspectorModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  onSelectDay,
  doctors,
}) => {
  if (!isOpen) return null;

  const errorList = conflicts.filter(c => c.severity === 'error');
  const warningList = conflicts.filter(c => c.severity === 'warning');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              errorList.length > 0 
                ? 'bg-rose-100 text-rose-600' 
                : warningList.length > 0 
                ? 'bg-amber-100 text-amber-600' 
                : 'bg-emerald-100 text-emerald-600'
            }`}>
              {errorList.length > 0 ? (
                <AlertOctagon className="w-5 h-5" />
              ) : warningList.length > 0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Kural & Çakışma Denetleyicisi</h2>
              <p className="text-xs text-slate-500">
                Arka arkaya nöbet, dinlenme günü ve mazeret kontrolleri
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {conflicts.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Mükemmel! Çakışma veya Kural İhlali Yok</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Tüm hekimlerin kotaları, dinlenme günleri ve mazeretleri kurallara tam uyumludur.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Badges */}
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                  {errorList.length} Kritik Hata
                </span>
                <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  {warningList.length} Uyarı / Kota Sapması
                </span>
              </div>

              {/* Error list */}
              {errorList.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider">Kritik İhlaller (Düzeltilmeli)</h4>
                  {errorList.map(err => (
                    <div
                      key={err.id}
                      className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs flex flex-col gap-1.5 hover:bg-rose-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-rose-900">
                          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{err.message}</span>
                        </div>
                        {err.date && onSelectDay && (
                          <button
                            onClick={() => {
                              onSelectDay(err.date!);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-md bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 font-semibold shrink-0 text-[11px] flex items-center gap-1 shadow-2xs"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Güne Git</span>
                          </button>
                        )}
                      </div>
                      {err.suggestedFix && (
                        <p className="text-[11px] text-rose-700 ml-6 flex items-center gap-1 font-medium">
                          💡 <span>Öneri: {err.suggestedFix}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Warning list */}
              {warningList.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Uyarılar & Kota Dengeleri</h4>
                  {warningList.map(warn => (
                    <div
                      key={warn.id}
                      className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs flex flex-col gap-1 hover:bg-amber-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 font-semibold text-amber-950">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{warn.message}</span>
                        </div>
                        {warn.date && onSelectDay && (
                          <button
                            onClick={() => {
                              onSelectDay(warn.date!);
                              onClose();
                            }}
                            className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-medium shrink-0 text-[11px] flex items-center gap-1 shadow-2xs"
                          >
                            <span>İncele</span>
                          </button>
                        )}
                      </div>
                      {warn.suggestedFix && (
                        <p className="text-[11px] text-amber-800 ml-6">
                          💡 {warn.suggestedFix}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Nöbet çizelgesini otomatik düzeltmek için sihirbazı tekrar çalıştırabilirsiniz.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold transition-colors"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
};
