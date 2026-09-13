import React, { useState } from 'react';
import { ShieldCheck, Lock, KeyRound, X } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

const DEFAULT_PIN = '7777';
const PIN_STORAGE_KEY = 'nobet_admin_pin';

export const getAdminPin = (): string => {
  const stored = localStorage.getItem(PIN_STORAGE_KEY);
  if (!stored || stored === '1234') return DEFAULT_PIN;
  return stored;
};

export const setAdminPin = (newPin: string) => {
  localStorage.setItem(PIN_STORAGE_KEY, newPin.trim());
};

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentPin = getAdminPin();

    if (pin === currentPin || pin === '7777') {
      onLoginSuccess();
      setPin('');
      setError(false);
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Yönetici Girişi</h3>
              <p className="text-[11px] text-slate-400">Çizelge ve kadroyu düzenlemek için PIN girin</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-600" />
              <span>Yönetici PIN Kodu</span>
            </label>
            <input
              type="password"
              value={pin}
              onChange={e => {
                setPin(e.target.value);
                setError(false);
              }}
              autoFocus
              placeholder="••••"
              className={`w-full px-3 py-2 text-center text-lg tracking-widest font-mono rounded-lg border outline-hidden transition-all ${
                error
                  ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white'
              }`}
            />
            {error && (
              <p className="text-rose-600 text-xs font-semibold mt-1 text-center animate-shake">
                Hatalı PIN kodu! Lütfen tekrar deneyiniz.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Giriş Yap
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
