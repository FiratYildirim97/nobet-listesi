import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Calendar, 
  Check, 
  AlertCircle, 
  UserPlus, 
  Award, 
  Sun,
  Moon,
  Info
} from 'lucide-react';
import { Doctor } from '../types';

interface DoctorsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  onSaveDoctors: (doctors: Doctor[]) => void;
  currentYear: number;
  currentMonth: number;
}

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EC4899', 
  '#8B5CF6', '#06B6D4', '#14B8A6', '#F97316', 
  '#6366F1', '#84CC16', '#E11D48', '#0284C7'
];

export const DoctorsManagerModal: React.FC<DoctorsManagerModalProps> = ({
  isOpen,
  onClose,
  doctors,
  onSaveDoctors,
  currentYear,
  currentMonth,
}) => {
  const [editingDoctors, setEditingDoctors] = useState<Doctor[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [newOffDate, setNewOffDate] = useState<string>('');
  const [newPrefDate, setNewPrefDate] = useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      setEditingDoctors(JSON.parse(JSON.stringify(doctors)));
      if (doctors.length > 0) {
        setSelectedDocId(doctors[0].id);
      }
    }
  }, [isOpen, doctors]);

  if (!isOpen) return null;

  const selectedDoc = editingDoctors.find(d => d.id === selectedDocId) || editingDoctors[0];

  const handleUpdateDoctor = (id: string, updates: Partial<Doctor>) => {
    setEditingDoctors(prev =>
      prev.map(doc => (doc.id === id ? { ...doc, ...updates } : doc))
    );
  };

  const handleAddDoctor = () => {
    const newId = `doc-${Date.now()}`;
    const randomColor = PRESET_COLORS[editingDoctors.length % PRESET_COLORS.length];
    const newDoc: Doctor = {
      id: newId,
      name: `Yeni Hekim ${editingDoctors.length + 1}`,
      title: 'Asistan Dr.',
      seniority: 'kidemsiz',
      color: randomColor,
      targetTotalShifts: 5,
      targetWeekendShifts: 2,
      canDoConsultant: false,
      canDoService: true,
      canDoClinic: true,
      unavailableDates: [],
      preferredDates: [],
      historicalShifts: 0,
      historicalWeekends: 0,
      historicalHolidays: 0,
      shiftBalance: 0,
      weekendBalance: 0,
    };
    setEditingDoctors(prev => [...prev, newDoc]);
    setSelectedDocId(newId);
  };

  const handleDeleteDoctor = (id: string) => {
    if (editingDoctors.length <= 1) {
      alert('En az bir hekim listede bulunmalıdır.');
      return;
    }
    const filtered = editingDoctors.filter(d => d.id !== id);
    setEditingDoctors(filtered);
    if (selectedDocId === id) {
      setSelectedDocId(filtered[0]?.id || null);
    }
  };

  const handleAddOffDate = () => {
    if (!newOffDate || !selectedDoc) return;
    if (!selectedDoc.unavailableDates.includes(newOffDate)) {
      handleUpdateDoctor(selectedDoc.id, {
        unavailableDates: [...selectedDoc.unavailableDates, newOffDate].sort()
      });
    }
    setNewOffDate('');
  };

  const handleRemoveOffDate = (dateToRemove: string) => {
    if (!selectedDoc) return;
    handleUpdateDoctor(selectedDoc.id, {
      unavailableDates: selectedDoc.unavailableDates.filter(d => d !== dateToRemove)
    });
  };

  const handleAddPrefDate = () => {
    if (!newPrefDate || !selectedDoc) return;
    if (!selectedDoc.preferredDates.includes(newPrefDate)) {
      handleUpdateDoctor(selectedDoc.id, {
        preferredDates: [...selectedDoc.preferredDates, newPrefDate].sort()
      });
    }
    setNewPrefDate('');
  };

  const handleRemovePrefDate = (dateToRemove: string) => {
    if (!selectedDoc) return;
    handleUpdateDoctor(selectedDoc.id, {
      preferredDates: selectedDoc.preferredDates.filter(d => d !== dateToRemove)
    });
  };

  const handleSaveAndClose = () => {
    onSaveDoctors(editingDoctors);
    onClose();
  };

  // Quota totals calculation
  const totalTargetShifts = editingDoctors.reduce((sum, d) => sum + (d.targetTotalShifts || 0), 0);
  const totalTargetWeekends = editingDoctors.reduce((sum, d) => sum + (d.targetWeekendShifts || 0), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Hekim Kadrosu ve Nöbet İstekleri</h2>
            <p className="text-xs text-slate-500">
              Kimin kaç nöbet tutacağı, hafta sonu kotası, izinli/istenen günler ve klinik yetkileri
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddDoctor}
              id="btn-add-doctor"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Yeni Hekim Ekle</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Total quota indicator strip */}
        <div className="px-6 py-2 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Toplam Tanımlı Nöbet Kotası: <strong>{totalTargetShifts} nöbet</strong> ({totalTargetWeekends} hafta sonu)
            </span>
          </div>
          <span className="text-blue-700">
            {editingDoctors.length} hekim kayıtlı
          </span>
        </div>

        {/* Content split view */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left: Doctor list */}
          <div className="w-1/3 border-r border-slate-200 overflow-y-auto p-3 space-y-1.5 bg-slate-50/50">
            {editingDoctors.map(doc => {
              const isSelected = doc.id === selectedDoc?.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border text-left ${
                    isSelected
                      ? 'bg-white border-blue-500 shadow-xs ring-2 ring-blue-500/10'
                      : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: doc.color }}
                      />
                      <span className="font-semibold text-slate-900 text-sm truncate">
                        {doc.name}
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{doc.title}</span>
                    <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                      {doc.targetTotalShifts} Nöbet ({doc.targetWeekendShifts} HS)
                    </span>
                  </div>

                  {/* Badges preview */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[10px]">
                    {doc.canDoConsultant && (
                      <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded font-medium">
                        Konsültan
                      </span>
                    )}
                    {doc.unavailableDates.length > 0 && (
                      <span className="px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded font-medium">
                        {doc.unavailableDates.length} İzin
                      </span>
                    )}
                    {doc.preferredDates.length > 0 && (
                      <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-medium">
                        {doc.preferredDates.length} İstek
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Selected doctor edit form */}
          {selectedDoc && (
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Name, Title, Color */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hekim Adı Soyadı
                  </label>
                  <input
                    type="text"
                    value={selectedDoc.name}
                    onChange={e => handleUpdateDoctor(selectedDoc.id, { name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Klinik Kademesi (Nöbet Havuzu)
                  </label>
                  <select
                    value={selectedDoc.seniority || 'kidemli'}
                    onChange={e => handleUpdateDoctor(selectedDoc.id, { seniority: e.target.value as 'kidemli' | 'kidemsiz' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  >
                    <option value="kidemli">Kıdemli Asistan (Kıdemli Nöbetçi)</option>
                    <option value="kidemsiz">Kıdemsiz Asistan (Kıdemsiz Nöbetçi)</option>
                  </select>
                </div>
              </div>

              {/* Targets: Total Shifts & Weekend Shifts */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Aylık Nöbet Hedefleri (Kullanıcı Talebi)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Toplam Nöbet Sayısı
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={selectedDoc.targetTotalShifts}
                        onChange={e => handleUpdateDoctor(selectedDoc.id, { targetTotalShifts: parseInt(e.target.value) || 0 })}
                        className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 bg-white"
                      />
                      <span className="text-xs text-slate-500">nöbet / ay</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Hafta Sonu Nöbet Sayısı
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={selectedDoc.targetTotalShifts}
                        value={selectedDoc.targetWeekendShifts}
                        onChange={e => handleUpdateDoctor(selectedDoc.id, { targetWeekendShifts: parseInt(e.target.value) || 0 })}
                        className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-amber-900 bg-white"
                      />
                      <span className="text-xs text-slate-500">hafta sonu / ay</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roles eligibility: Poliklinik, Servis, Konsültan */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-600" />
                  <span>Gündüz Görev Yetkileri</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedDoc.canDoClinic}
                      onChange={e => handleUpdateDoctor(selectedDoc.id, { canDoClinic: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-800">Poliklinik</div>
                      <div className="text-slate-500 text-[10px]">2 kişilik ekip</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedDoc.canDoService}
                      onChange={e => handleUpdateDoctor(selectedDoc.id, { canDoService: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-800">Servis Sorumlusu</div>
                      <div className="text-slate-500 text-[10px]">1 kişi</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedDoc.canDoConsultant}
                      onChange={e => handleUpdateDoctor(selectedDoc.id, { canDoConsultant: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-800">ESWL+Konsültan</div>
                      <div className="text-slate-500 text-[10px]">Kıdemli / Uzman</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={!!selectedDoc.canDoUrodinami}
                      onChange={e => handleUpdateDoctor(selectedDoc.id, { canDoUrodinami: e.target.checked })}
                      className="rounded text-pink-600 focus:ring-pink-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-800">Ürodinami</div>
                      <div className="text-slate-500 text-[10px]">Özel görevli</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedDoc.canDoAmeliyathane !== false}
                      onChange={e => handleUpdateDoctor(selectedDoc.id, { canDoAmeliyathane: e.target.checked })}
                      className="rounded text-slate-800 focus:ring-slate-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-800">Ameliyathane</div>
                      <div className="text-slate-500 text-[10px]">Cerrahi asistan</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Nöbet İstekleri & İzinler (Unavailable vs Preferred Dates) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Nöbet Tutamaz / İzinli Günler */}
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-rose-900 flex items-center gap-1">
                      <span>Nöbet Tutamaz (İzinli Günler)</span>
                    </label>
                    <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      {selectedDoc.unavailableDates.length} gün
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-2">
                    <input
                      type="date"
                      value={newOffDate}
                      onChange={e => setNewOffDate(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 border border-rose-200 rounded-lg text-xs bg-white text-slate-800"
                    />
                    <button
                      onClick={handleAddOffDate}
                      className="px-2.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
                    >
                      Ekle
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {selectedDoc.unavailableDates.map(date => (
                      <span
                        key={date}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-rose-200 text-rose-800 text-xs font-medium"
                      >
                        <span>{date}</span>
                        <button
                          onClick={() => handleRemoveOffDate(date)}
                          className="text-rose-400 hover:text-rose-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {selectedDoc.unavailableDates.length === 0 && (
                      <p className="text-[11px] text-rose-400 italic">İzinli gün belirtilmedi.</p>
                    )}
                  </div>
                </div>

                {/* Tercih Ettiği / İstediği Nöbet Günleri */}
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                      <span>Nöbet Tercihi (İstediği Günler)</span>
                    </label>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      {selectedDoc.preferredDates.length} gün
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-2">
                    <input
                      type="date"
                      value={newPrefDate}
                      onChange={e => setNewPrefDate(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 border border-emerald-200 rounded-lg text-xs bg-white text-slate-800"
                    />
                    <button
                      onClick={handleAddPrefDate}
                      className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                    >
                      Ekle
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {selectedDoc.preferredDates.map(date => (
                      <span
                        key={date}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 text-xs font-medium"
                      >
                        <span>{date}</span>
                        <button
                          onClick={() => handleRemovePrefDate(date)}
                          className="text-emerald-400 hover:text-emerald-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {selectedDoc.preferredDates.length === 0 && (
                      <p className="text-[11px] text-emerald-500 italic">Özel gün isteği yok.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Historical justice memory preview for this doctor */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-700" />
                    <span>Geçmiş Ayların Hafızası & Bayram Durumu</span>
                  </span>
                  <span className="text-[11px] text-amber-700 font-medium">Sistem Hafızasından Okunuyor</span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center pt-1">
                  <div className="bg-white p-2 rounded-lg border border-amber-200">
                    <div className="text-[10px] text-slate-500">Geçmiş Nöbet</div>
                    <div className="font-bold text-slate-900 text-sm">{selectedDoc.historicalShifts || 0}</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-amber-200">
                    <div className="text-[10px] text-slate-500">Geçmiş Hafta Sonu</div>
                    <div className="font-bold text-slate-900 text-sm">{selectedDoc.historicalWeekends || 0}</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-amber-200">
                    <div className="text-[10px] text-slate-500">Geçmiş Bayram</div>
                    <div className="font-bold text-amber-700 text-sm">{selectedDoc.historicalHolidays || 0}</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-amber-200">
                    <div className="text-[10px] text-slate-500">Nöbet Alacak/Borç</div>
                    <div className={`font-bold text-sm ${
                      (selectedDoc.shiftBalance || 0) > 0 ? 'text-emerald-600' : (selectedDoc.shiftBalance || 0) < 0 ? 'text-rose-600' : 'text-slate-700'
                    }`}>
                      {(selectedDoc.shiftBalance || 0) > 0 ? `+${selectedDoc.shiftBalance}` : selectedDoc.shiftBalance || 0}
                    </div>
                  </div>
                </div>

                {selectedDoc.lastHolidayWorkedName && (
                  <div className="mt-2.5 pt-2 border-t border-amber-200 text-[11px] text-amber-800 flex items-center gap-1">
                    <span>En son tuttuğu bayram:</span>
                    <strong className="text-amber-950">{selectedDoc.lastHolidayWorkedName}</strong>
                    {selectedDoc.lastHolidayWorkedDate && <span>({selectedDoc.lastHolidayWorkedDate})</span>}
                  </div>
                )}
              </div>

              {/* Color Picker & Delete Button */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Etiket Rengi:</span>
                  <div className="flex items-center gap-1.5">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => handleUpdateDoctor(selectedDoc.id, { color: c })}
                        className={`w-5 h-5 rounded-full border transition-transform ${
                          selectedDoc.color === c ? 'scale-125 border-slate-900 shadow-xs' : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteDoctor(selectedDoc.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hekimi Sil</span>
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Değişiklikleri uygulamak için Kaydet butonuna basınız.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
            >
              Vazgeç
            </button>
            <button
              onClick={handleSaveAndClose}
              id="btn-save-doctors"
              className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-xs transition-colors"
            >
              Kaydet ve Güncelle
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
