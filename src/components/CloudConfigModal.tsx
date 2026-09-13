import React, { useState } from 'react';
import { Cloud, CheckCircle2, AlertTriangle, Key, Globe, Database, X, RefreshCw, UploadCloud, DownloadCloud } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, getSupabaseClient, isSupabaseConfigured, fetchCloudDoctors, saveCloudDoctors, fetchCloudRoster, saveCloudRoster } from '../utils/supabase';
import { Doctor, MonthlyRoster } from '../types';

interface CloudConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  roster: MonthlyRoster | null;
  onDataLoadedFromCloud?: (doctors: Doctor[], roster: MonthlyRoster | null) => void;
  onNotification?: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const CloudConfigModal: React.FC<CloudConfigModalProps> = ({
  isOpen,
  onClose,
  doctors,
  roster,
  onDataLoadedFromCloud,
  onNotification,
}) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [key, setKey] = useState(currentConfig.key);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const handleSaveAndTest = async () => {
    if (!url || !key) {
      setTestResult('error');
      setStatusMessage('Lütfen hem Project URL hem de Anon Key girin.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setStatusMessage('');

    saveSupabaseConfig(url, key);
    const client = getSupabaseClient();

    if (!client) {
      setTestResult('error');
      setStatusMessage('Geçersiz URL veya API Key formatı.');
      setIsTesting(false);
      return;
    }

    try {
      // Test query
      const { error } = await client.from('doctors').select('id').limit(1);
      if (error) {
        setTestResult('error');
        setStatusMessage(`Bağlantı başarısız: ${error.message}. (SQL şemasını çalıştırdığınızdan emin olun)`);
      } else {
        setTestResult('success');
        setStatusMessage('Supabase veritabanına başarıyla bağlanıldı!');
        if (onNotification) onNotification('Supabase bulut veritabanı bağlandı!', 'success');
      }
    } catch (e: any) {
      setTestResult('error');
      setStatusMessage(`Hata oluştu: ${e.message || 'Bilinmeyen hata'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncToCloud = async () => {
    setIsTesting(true);
    try {
      const docOk = await saveCloudDoctors(doctors);
      let rosterOk = true;
      if (roster) {
        rosterOk = await saveCloudRoster(roster);
      }

      if (docOk && rosterOk) {
        if (onNotification) onNotification('Tüm asistan kadrosu ve çizelge Supabase bulutuna yüklendi!', 'success');
        setTestResult('success');
        setStatusMessage('Tüm veriler buluta yüklendi!');
      } else {
        setTestResult('error');
        setStatusMessage('Buluta yüklenirken hata oluştu.');
      }
    } catch (err: any) {
      setTestResult('error');
      setStatusMessage(`Hata: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handlePullFromCloud = async () => {
    setIsTesting(true);
    try {
      const cloudDocs = await fetchCloudDoctors();
      let cloudRoster: MonthlyRoster | null = null;
      if (roster) {
        cloudRoster = await fetchCloudRoster(roster.year, roster.month);
      }

      if (cloudDocs && cloudDocs.length > 0 && onDataLoadedFromCloud) {
        onDataLoadedFromCloud(cloudDocs, cloudRoster);
        if (onNotification) onNotification('Buluttaki güncel liste başarıyla yüklendi!', 'success');
        setTestResult('success');
        setStatusMessage('Buluttan veriler çekildi!');
        onClose();
      } else {
        setTestResult('error');
        setStatusMessage('Bulutta henüz kayıtlı veri bulunamadı.');
      }
    } catch (err: any) {
      setTestResult('error');
      setStatusMessage(`Hata: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = () => {
    clearSupabaseConfig();
    setUrl('');
    setKey('');
    setTestResult(null);
    setStatusMessage('Supabase bağlantısı kaldırıldı. Sistem yerel tarayıcı hafızasını kullanıyor.');
    if (onNotification) onNotification('Supabase bağlantısı kaldırıldı (Yerel mod).', 'info');
  };

  const isConnected = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Supabase Bulut Bağlantısı</h3>
              <p className="text-[11px] text-slate-400">Çizelgeyi farklı cihazlardan yönetmek için bağlayın</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Status Badge */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-2 font-semibold">
              <Database className={`w-4 h-4 ${isConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{isConnected ? 'Bulut Bağlantısı Aktif (Supabase)' : 'Yerel Hafıza Modu (Tarayıcı)'}</span>
            </div>
            {isConnected && (
              <button
                onClick={handleDisconnect}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
              >
                Bağlantıyı Kes
              </button>
            )}
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>Supabase Project URL</span>
              </label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-600" />
                <span>Supabase Anon Public Key</span>
              </label>
              <input
                type="password"
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="eyJh..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          {/* Result Feedback */}
          {statusMessage && (
            <div className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
              testResult === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {testResult === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSaveAndTest}
              disabled={isTesting}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Test Et & Kaydet</span>
            </button>

            {isConnected && (
              <>
                <button
                  onClick={handleSyncToCloud}
                  disabled={isTesting}
                  className="py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Mevcut kadro ve çizelgeyi buluta gönder"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Buluta Yükle</span>
                </button>
                <button
                  onClick={handlePullFromCloud}
                  disabled={isTesting}
                  className="py-2.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Buluttaki güncel listeyi bu cihaza çek"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>Buluttan Çek</span>
                </button>
              </>
            )}
          </div>

          {/* Quick Setup Hint */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <span className="font-bold text-slate-700 block">💡 3 Adımda Kolay Kurulum:</span>
            <p>1. <strong>supabase.com</strong> adresinde yeni ücretsiz projenizi açın.</p>
            <p>2. Proje kök dizinindeki <strong>supabase_schema.sql</strong> dosyasını Supabase SQL Editor'de çalıştırın.</p>
            <p>3. <strong>Project Settings → API</strong> kısmından URL ve anon key'i buraya yapıştırıp kaydedin.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
