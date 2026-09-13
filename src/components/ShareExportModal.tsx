import React, { useState } from 'react';
import { 
  Share2, 
  Download, 
  Copy, 
  Check, 
  Calendar, 
  FileSpreadsheet, 
  X, 
  FileJson,
  Smartphone,
  Sparkles,
  Users
} from 'lucide-react';
import { MonthlyRoster, Doctor } from '../types';
import { 
  exportDoctorToIcs, 
  exportAllRosterToIcs, 
  generateWhatsAppScheduleText, 
  downloadFile 
} from '../utils/exportCalendar';

interface ShareExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  roster: MonthlyRoster;
  doctors: Doctor[];
  onExportCsv: () => void;
  onExportJson: () => void;
}

export const ShareExportModal: React.FC<ShareExportModalProps> = ({
  isOpen,
  onClose,
  roster,
  doctors,
  onExportCsv,
  onExportJson,
}) => {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [copiedWhatsApp, setCopiedWhatsApp] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppScheduleText(
      roster,
      doctors,
      selectedDoctorId === 'all' ? undefined : selectedDoctorId
    );
    navigator.clipboard.writeText(text);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  const handleDownloadAllIcs = () => {
    const ics = exportAllRosterToIcs(roster, doctors);
    downloadFile(
      `Tum_Nobetler_${roster.year}_${roster.month}.ics`,
      ics,
      'text/calendar'
    );
  };

  const handleDownloadDoctorIcs = (doctorId: string) => {
    const doc = doctors.find(d => d.id === doctorId);
    if (!doc) return;
    const ics = exportDoctorToIcs(doc, roster);
    downloadFile(
      `${doc.name.replace(/\s+/g, '_')}_Nobet_${roster.year}_${roster.month}.ics`,
      ics,
      'text/calendar'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Paylaş ve Dışa Aktar</h2>
              <p className="text-xs text-slate-500">
                WhatsApp, iPhone/Android Takvim (.ics), Excel ve Sistem Yedeği
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

        {/* Body Options */}
        <div className="p-6 space-y-5">
          
          {/* OPTION 1: WhatsApp Paylaşımı */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💬</span>
                <div>
                  <h3 className="text-xs font-bold text-emerald-950">WhatsApp İçin Formatlı Metin</h3>
                  <p className="text-[11px] text-emerald-700">Grup sohbetine doğrudan yapıştırılmaya hazır emojili liste</p>
                </div>
              </div>

              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value)}
                className="text-xs font-semibold p-1.5 rounded-lg border border-emerald-300 bg-white"
              >
                <option value="all">Tüm Klinik Nöbetleri</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    Sadece {d.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCopyWhatsApp}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
            >
              {copiedWhatsApp ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedWhatsApp ? 'Panoya Kopyalandı! (WhatsApp\'a Yapıştırabilirsiniz)' : 'WhatsApp Formatında Panoya Kopyala'}</span>
            </button>
          </div>

          {/* OPTION 2: Telefon Takvimi (.ics) */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-blue-950">Apple Takvim & Google Calendar (.ics)</h3>
                <p className="text-[11px] text-blue-700">Telefon takvimine tıkla ve 12 saat öncesinden alarmla kaydet</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleDownloadAllIcs}
                className="py-2 px-3 rounded-lg bg-white border border-blue-300 text-blue-800 hover:bg-blue-100/70 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Tüm Kliniği İndir (.ics)</span>
              </button>

              <select
                onChange={e => {
                  if (e.target.value) handleDownloadDoctorIcs(e.target.value);
                }}
                defaultValue=""
                className="py-2 px-3 rounded-lg bg-white border border-blue-300 text-blue-900 font-semibold text-xs cursor-pointer shadow-2xs"
              >
                <option value="" disabled>
                  Kişiye Özel .ics İndir...
                </option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} (.ics)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* OPTION 3: Excel & CSV */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={onExportCsv}
              className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left flex items-center gap-3 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Excel / CSV Tablosu</h4>
                <p className="text-[10px] text-slate-500">Hastane formatında çizelge</p>
              </div>
            </button>

            <button
              onClick={onExportJson}
              className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left flex items-center gap-3 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <FileJson className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Tam Sistem Yedeği</h4>
                <p className="text-[10px] text-slate-500">Hafıza & hekim verileri (JSON)</p>
              </div>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition-colors"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
};
