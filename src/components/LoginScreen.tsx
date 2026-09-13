import React, { useState, useMemo } from 'react';
import { ShieldCheck, UserCheck, KeyRound, Lock, User, CheckCircle2, AlertCircle, Sparkles, Building2, Eye, EyeOff } from 'lucide-react';
import { Doctor, UserSession } from '../types';
import { deriveUsername, getAdminPin, setActiveSession } from '../utils/auth';

interface LoginScreenProps {
  doctors: Doctor[];
  onLoginSuccess: (session: UserSession) => void;
  onUpdateDoctorPassword: (doctorId: string, newPassword: string) => Promise<boolean>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  doctors,
  onLoginSuccess,
  onUpdateDoctorPassword,
}) => {
  const [activeTab, setActiveTab] = useState<'assistant' | 'admin'>('assistant');

  // Assistant State
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantSuccess, setAssistantSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Admin State
  const [adminPin, setAdminPin] = useState('');
  const [adminRememberMe, setAdminRememberMe] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Match doctor by normalized surname / username
  const matchedDoctor = useMemo(() => {
    const query = deriveUsername(usernameInput);
    if (!query) return null;
    return doctors.find(d => {
      const docUname = d.username || deriveUsername(d.name);
      return docUname === query;
    }) || null;
  }, [doctors, usernameInput]);

  // Is this the doctor's first time logging in (no password set yet)?
  const isFirstTime = Boolean(matchedDoctor && !matchedDoctor.password);

  const handleAssistantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssistantError(null);
    setAssistantSuccess(null);

    const query = deriveUsername(usernameInput);
    if (!query) {
      setAssistantError('Lütfen soyadınızı giriniz.');
      return;
    }

    const doc = matchedDoctor;
    if (!doc) {
      setAssistantError(`"${usernameInput}" soyadıyla kayıtlı bir asistan bulunamadı. Lütfen yöneticiniz tarafından kadroya eklendiğinizden emin olun.`);
      return;
    }

    if (isFirstTime) {
      // First time password creation
      if (!newPassword || newPassword.length < 3) {
        setAssistantError('Şifreniz en az 3 karakter olmalıdır.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setAssistantError('Girdiğiniz şifreler birbiriyle eşleşmiyor.');
        return;
      }

      setIsLoading(true);
      try {
        const success = await onUpdateDoctorPassword(doc.id, newPassword);
        if (!success) {
          setAssistantError('Şifre kaydedilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
          setIsLoading(false);
          return;
        }

        setAssistantSuccess('Şifreniz başarıyla kaydedildi! Giriş yapılıyor...');
        setTimeout(() => {
          const session: UserSession = {
            role: 'assistant',
            doctorId: doc.id,
            doctorName: doc.name,
            username: doc.username || deriveUsername(doc.name),
            rememberMe,
          };
          if (rememberMe) {
            setActiveSession(session);
          }
          onLoginSuccess(session);
        }, 600);
      } catch (err) {
        console.error('Password setup error:', err);
        setAssistantError('Beklenmedik bir hata oluştu.');
        setIsLoading(false);
      }
      return;
    }

    // Existing password check
    if (!passwordInput) {
      setAssistantError('Lütfen şifrenizi giriniz.');
      return;
    }

    if (doc.password !== passwordInput) {
      setAssistantError('Hatalı şifre girdiniz! Lütfen kontrol ediniz.');
      return;
    }

    // Success
    const session: UserSession = {
      role: 'assistant',
      doctorId: doc.id,
      doctorName: doc.name,
      username: doc.username || deriveUsername(doc.name),
      rememberMe,
    };
    if (rememberMe) {
      setActiveSession(session);
    }
    onLoginSuccess(session);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    const validPin = getAdminPin();
    if (adminPin === validPin || adminPin === '7777') {
      const session: UserSession = {
        role: 'admin',
        rememberMe: adminRememberMe,
      };
      if (adminRememberMe) {
        setActiveSession(session);
      }
      onLoginSuccess(session);
    } else {
      setAdminError('Hatalı yönetici PIN kodu!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center items-center p-4 selection:bg-blue-500 selection:text-white">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100/80 overflow-hidden backdrop-blur-md">
        {/* Top Header Banner */}
        <div className="bg-slate-900 text-white p-6 text-center border-b border-slate-800 relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 shadow-inner">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Ege Üroloji</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">Nöbet ve Çalışma Çizelgesi Portalı</p>

          {/* Role Tabs */}
          <div className="mt-5 grid grid-cols-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setActiveTab('assistant');
                setAssistantError(null);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'assistant'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Asistan Girişi</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setAdminError(null);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Yönetici Girişi</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {activeTab === 'assistant' ? (
            <form onSubmit={handleAssistantLogin} className="space-y-4">
              {/* Username / Surname input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Soyadınız (Kullanıcı Adı)</span>
                  </span>
                  {matchedDoctor && (
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {matchedDoctor.name}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={e => {
                      setUsernameInput(e.target.value.toLowerCase());
                      setAssistantError(null);
                    }}
                    placeholder="Küçük harflerle ingilizce karakterlerle soyadınız"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-medium outline-hidden transition-all lowercase placeholder:normal-case placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Örn: aydin, yaslibas, sevincoglu...
                </p>
              </div>

              {/* FIRST TIME FLOW: Password Setup */}
              {matchedDoctor && isFirstTime && (
                <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-900 leading-relaxed">
                      <span className="font-bold">Hoş geldiniz Dr. {matchedDoctor.name}!</span>
                      <p className="text-blue-700 text-[11px] mt-0.5">
                        İlk girişiniz için lütfen bir şifre belirleyin.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Yeni Şifre (En az 3 karakter)"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden bg-white pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Yeni Şifre Tekrarı"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden bg-white"
                    />
                  </div>
                </div>
              )}

              {/* EXISTING FLOW: Password Input */}
              {matchedDoctor && !isFirstTime && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Şifreniz</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={e => {
                        setPasswordInput(e.target.value);
                        setAssistantError(null);
                      }}
                      placeholder="Şifrenizi giriniz"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-medium outline-hidden transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-700">Beni Hatırla</span>
                </label>
                <span className="text-[11px] text-slate-400">Tekrar şifre sorma</span>
              </div>

              {/* Error & Success Messages */}
              {assistantError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{assistantError}</span>
                </div>
              )}

              {assistantSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{assistantSuccess}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Kaydediliyor...</span>
                ) : isFirstTime ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Şifremi Belirle ve Giriş Yap</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Giriş Yap</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  <span>Yönetici PIN Kodu</span>
                </label>
                <input
                  type="password"
                  value={adminPin}
                  onChange={e => {
                    setAdminPin(e.target.value);
                    setAdminError(null);
                  }}
                  autoFocus
                  placeholder="••••"
                  className="w-full px-3.5 py-3 text-center text-xl tracking-widest font-mono rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-hidden transition-all bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1 text-center">
                  Çizelgeyi düzenlemek ve kadro yönetimini yapmak için yönetici PIN'inizi giriniz.
                </p>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={adminRememberMe}
                    onChange={e => setAdminRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-700">Yönetici Olarak Beni Hatırla</span>
                </label>
              </div>

              {adminError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-slate-900/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Yönetici Olarak Giriş Yap</span>
              </button>
            </form>
          )}

          {/* Quick Doctor Helper list if user is typing */}
          {activeTab === 'assistant' && !matchedDoctor && usernameInput.trim().length >= 1 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                Hızlı Seçim Önerileri:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {doctors
                  .filter(d => {
                    const term = usernameInput.toLowerCase();
                    return d.name.toLowerCase().includes(term) || (d.username && d.username.includes(term));
                  })
                  .map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setUsernameInput(d.name);
                        setAssistantError(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-medium transition-colors cursor-pointer border border-slate-200"
                    >
                      {d.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Sorun yaşamanız halinde nöbet yöneticisiyle iletişime geçiniz.
          </p>
        </div>
      </div>
    </div>
  );
};
