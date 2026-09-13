import React from 'react';
import { X, Printer } from 'lucide-react';
import { MonthlyRoster, Doctor } from '../types';
import { deriveSurname } from '../utils/auth';

interface PrintRosterViewProps {
  isOpen: boolean;
  onClose: () => void;
  roster: MonthlyRoster | null;
  doctors: Doctor[];
}

const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export const PrintRosterView: React.FC<PrintRosterViewProps> = ({
  isOpen,
  onClose,
  roster,
  doctors,
}) => {
  if (!isOpen || !roster) return null;

  const docMap = new Map<string, Doctor>(doctors.map(d => [d.id, d]));

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

  const handleBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:static print:bg-transparent">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full">
        
        {/* Screen Top Bar (Hidden when printing) */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">Resmi Asistan Çalışma Programı Baskı Önizleme</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBrowserPrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır / PDF Olarak Kaydet</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible font-sans">
          <div className="text-center pb-3 border-b-2 border-slate-900 mb-3">
            <h1 className="text-sm font-extrabold uppercase text-slate-900 tracking-tight">
              {roster.departmentTitle || 'EÜTF ÜROLOJİ ANABİLİM DALI'} {roster.monthName.toUpperCase()} {roster.year} ASİSTAN ÇALIŞMA PROGRAMI
            </h1>
          </div>

          <table className="w-full border-collapse border border-slate-900 text-[11px] text-center">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-900 text-center">
                <th className="border border-slate-900 py-1 px-2 text-left min-w-[130px]">TARİH</th>
                <th className="border border-slate-900 py-1 px-2 font-black">KIDEMLİ</th>
                <th className="border border-slate-900 py-1 px-2 font-black">KIDEMSİZ</th>
                <th className="border border-slate-900 py-1 px-2">POLİKLİNİK</th>
                <th className="border border-slate-900 py-1 px-2">SERVİS</th>
                <th className="border border-slate-900 py-1 px-2">ESWL+KONS</th>
                <th className="border border-slate-900 py-1 px-2">ÜRODİNAMİ</th>
                <th className="border border-slate-900 py-1 px-2">AMELİYATHANE</th>
              </tr>
            </thead>
            <tbody>
              {roster.days.map(day => {
                const isHoliday = day.isHoliday;
                const isWeekend = day.isWeekend;

                const dateParts = day.date.split('-');
                const dayNum = parseInt(dateParts[2], 10);
                const formattedDate = `${dayNum} ${roster.monthName} ${roster.year} ${WEEKDAYS[day.dayOfWeek]}`;

                // Kidemli
                const kidemli = day.kidemliNobetciId 
                  ? getDocSurname(docMap.get(day.kidemliNobetciId))
                  : (day.nobetciIds[0] ? getDocSurname(docMap.get(day.nobetciIds[0])) : '');

                // Kidemsiz
                const kidemsiz = day.kidemsizNobetciId
                  ? getDocSurname(docMap.get(day.kidemsizNobetciId))
                  : (day.nobetciIds[1] ? getDocSurname(docMap.get(day.nobetciIds[1])) : '');

                // Poliklinik
                const poliklinik = day.poliklinikIds.map(id => getDocSurname(docMap.get(id))).filter(Boolean).join('/');

                // Servis
                const servis = day.servisIds.map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ');

                // ESWL+Kons
                const konsultan = day.konsultanIds.map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ');

                // Urodinami
                const urodinami = (day.urodinamiIds || []).map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ');

                // Ameliyathane
                const ameliyathane = (day.ameliyathaneIds || []).map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ');

                return (
                  <tr
                    key={day.date}
                    className={`border-b border-slate-900 ${
                      isHoliday
                        ? 'bg-rose-100 font-semibold'
                        : isWeekend
                        ? 'bg-slate-300' // Matches exact grey in image
                        : ''
                    }`}
                  >
                    <td className="border border-slate-900 py-1 px-2 text-left font-mono font-bold whitespace-nowrap">
                      {formattedDate}
                    </td>
                    <td className="border border-slate-900 py-1 px-2 font-bold text-slate-900">
                      {kidemli}
                    </td>
                    <td className="border border-slate-900 py-1 px-2 font-bold text-slate-900">
                      {kidemsiz}
                    </td>
                    <td className="border border-slate-900 py-1 px-2 font-semibold">
                      {poliklinik}
                    </td>
                    <td className="border border-slate-900 py-1 px-2">
                      {servis}
                    </td>
                    <td className="border border-slate-900 py-1 px-2">
                      {konsultan}
                    </td>
                    <td className="border border-slate-900 py-1 px-2">
                      {urodinami}
                    </td>
                    <td className="border border-slate-900 py-1 px-2">
                      {ameliyathane}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 mt-8 pt-4 text-center text-xs print:mt-12">
            <div>
              <div className="font-bold text-slate-900">Hazırlayan</div>
              <div className="text-slate-600 text-[11px] mt-0.5">Nöbet Sorumlusu / Başasistan</div>
              <div className="mt-8 border-b border-dashed border-slate-400 w-48 mx-auto" />
              <div className="text-[10px] text-slate-400 mt-1">İmza / Kaşe</div>
            </div>
            <div>
              <div className="font-bold text-slate-900">Onaylayan</div>
              <div className="text-slate-600 text-[11px] mt-0.5">Anabilim Dalı Başkanı</div>
              <div className="mt-8 border-b border-dashed border-slate-400 w-48 mx-auto" />
              <div className="text-[10px] text-slate-400 mt-1">İmza / Kaşe</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
