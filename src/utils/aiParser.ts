import { GoogleGenAI } from '@google/genai';
import { Doctor } from '../types';

export interface ParsedDoctorRequest {
  doctorName: string;
  matchedDoctorId?: string;
  unavailableDates: string[]; // YYYY-MM-DD
  preferredDates: string[]; // YYYY-MM-DD
  targetShiftChange?: number;
  notes: string;
}

/**
 * Hekim isim eşleme yardımcısı (büyük-küçük harf ve Türkçe karakter toleranslı)
 */
export function matchDoctorByName(nameQuery: string, doctors: Doctor[]): Doctor | undefined {
  const normalize = (s: string) =>
    s.toLocaleLowerCase('tr-TR').replace(/^(dr\.?|uzm\.?|op\.?|asst\.?)\s*/i, '').trim();
  const q = normalize(nameQuery);

  return doctors.find(d => {
    const dn = normalize(d.name);
    const sn = d.shortName ? normalize(d.shortName) : '';
    return dn === q || sn === q || dn.includes(q) || q.includes(dn);
  });
}

/**
 * Yerel Regex / Kural Motoru (API Anahtarı Olmadan Doğrudan Çalışır)
 */
export function parseRequestsLocally(
  inputText: string,
  doctors: Doctor[],
  year: number,
  month: number
): ParsedDoctorRequest[] {
  const results: ParsedDoctorRequest[] = [];
  const lines = inputText.split(/\n|\. (?=[A-ZÇĞİÖŞÜ])/g);

  // Month string padded
  const monthStr = month < 10 ? `0${month}` : `${month}`;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Find any doctor mentioned in the line
    let matchedDoc: Doctor | undefined;
    for (const doc of doctors) {
      const docNameNorm = doc.name.toLocaleLowerCase('tr-TR');
      const shortNameNorm = doc.shortName ? doc.shortName.toLocaleLowerCase('tr-TR') : '';
      const lineNorm = trimmed.toLocaleLowerCase('tr-TR');

      if (lineNorm.includes(docNameNorm) || (shortNameNorm && lineNorm.includes(shortNameNorm))) {
        matchedDoc = doc;
        break;
      }
    }

    if (!matchedDoc) continue;

    const unavailableDates: string[] = [];
    const preferredDates: string[] = [];

    // Date range pattern: "12-16 Eylül", "5-8", "12 - 15"
    const rangeMatch = trimmed.match(/(\d{1,2})\s*[-–—]\s*(\d{1,2})/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      const isLeave = /izin|kongre|yok|mazeret|nöbet tutamaz|ameliyat|tatil|çıkış/i.test(trimmed);

      for (let day = Math.min(start, end); day <= Math.max(start, end); day++) {
        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const dateStr = `${year}-${monthStr}-${dayStr}`;
        if (isLeave) {
          unavailableDates.push(dateStr);
        } else {
          preferredDates.push(dateStr);
        }
      }
    }

    // Single dates pattern: "5 Eylül", "12'sinde", "15 inde"
    const singleMatches = trimmed.matchAll(/(?:^|\s)(\d{1,2})(?:\s*(?:eylül|ekim|kasım|aralık|ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|'sinde|'inde|'nde|'da|'de|günü))?/gi);
    for (const match of singleMatches) {
      const day = parseInt(match[1], 10);
      if (day >= 1 && day <= 31) {
        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const dateStr = `${year}-${monthStr}-${dayStr}`;
        const isLeave = /izin|kongre|yok|mazeret|tutamaz/i.test(trimmed);
        if (isLeave) {
          if (!unavailableDates.includes(dateStr)) unavailableDates.push(dateStr);
        } else if (/istiyor|yazılsın|tercih|olsun/i.test(trimmed)) {
          if (!preferredDates.includes(dateStr)) preferredDates.push(dateStr);
        }
      }
    }

    results.push({
      doctorName: matchedDoc.name,
      matchedDoctorId: matchedDoc.id,
      unavailableDates,
      preferredDates,
      notes: trimmed,
    });
  }

  return results;
}

/**
 * Gemini AI ile Doğal Dil Mazeret ve Talep Ayrıştırıcı
 */
export async function parseDoctorRequestsWithAi(
  inputText: string,
  doctors: Doctor[],
  year: number,
  month: number,
  apiKey?: string
): Promise<ParsedDoctorRequest[]> {
  const activeKey = apiKey || (import.meta as any).env?.VITE_GEMINI_API_KEY;

  if (!activeKey) {
    // Fallback to local rule engine
    return parseRequestsLocally(inputText, doctors, year, month);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: activeKey });
    const doctorNamesList = doctors.map(d => `${d.name} (${d.seniority})`).join(', ');

    const prompt = `
Aşağıdaki metin, bir hastane kliniğindeki asistan ve uzman hekimlerin ${month}. ay (${year} yılı) için nöbet mazeretleri, kongre izinleri ve nöbet isteklerini içermektedir.

Klinikteki hekim listesi:
${doctorNamesList}

Görev:
Metindeki hekim mazeretlerini ve isteklerini inceleyerek JSON dizisi olarak döndür.
Tarihler YYYY-MM-DD formatında olmalıdır (Yıl: ${year}, Ay: ${month < 10 ? '0' + month : month}).

JSON Şeması:
[
  {
    "doctorName": "Eşleşen hekimin tam adı",
    "unavailableDates": ["YYYY-MM-DD"],
    "preferredDates": ["YYYY-MM-DD"],
    "targetShiftChange": 0,
    "notes": "Mazeret veya istek açıklaması"
  }
]

ÖNEMLİ: Sadece geçerli JSON çıktısı ver. Markdown kod bloğu vb. ekleme yapma.

Metin:
"""
${inputText}
"""
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = response.text || '';
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (Array.isArray(parsed)) {
      return parsed.map(item => {
        const matched = matchDoctorByName(item.doctorName, doctors);
        return {
          doctorName: matched ? matched.name : item.doctorName,
          matchedDoctorId: matched?.id,
          unavailableDates: item.unavailableDates || [],
          preferredDates: item.preferredDates || [],
          targetShiftChange: item.targetShiftChange || 0,
          notes: item.notes || '',
        };
      });
    }

    return parseRequestsLocally(inputText, doctors, year, month);
  } catch (error) {
    console.warn('Gemini AI parsing failed, falling back to local parser:', error);
    return parseRequestsLocally(inputText, doctors, year, month);
  }
}
