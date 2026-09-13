import { Doctor, MonthlyRoster, HistoricalMonthSummary } from '../types';
import { SAMPLE_DOCTORS, SAMPLE_HISTORY, EUTF_SEPTEMBER_2026_DAYS, CLINIC_DEPARTMENT_NAME } from '../data/sampleClinicData';
import { deriveUsername, deriveSurname } from './auth';

const DOCTORS_STORAGE_KEY = 'nobet_cizelgesi_doctors_v6';
const ROSTER_STORAGE_KEY_PREFIX = 'nobet_cizelgesi_roster_v6_';
const HISTORY_STORAGE_KEY = 'nobet_cizelgesi_history_v6';
const DEPARTMENT_STORAGE_KEY = 'nobet_cizelgesi_dept_name_v6';
export const STORAGE_VERSION = 'v7_clean_october_2026';
const STORAGE_VERSION_KEY = 'nobet_storage_version_v7';

// Clean initial doctors template for manual input - Completely empty
export const CLEAN_INITIAL_DOCTORS: Doctor[] = [];

export function createCleanEmptyRoster(year: number = 2026, month: number = 10): MonthlyRoster {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];
  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  for (let day = 1; day <= daysInMonth; day++) {
    const m = month < 10 ? `0${month}` : `${month}`;
    const d = day < 10 ? `0${day}` : `${day}`;
    const dateStr = `${year}-${m}-${d}`;
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    days.push({
      date: dateStr,
      dayOfWeek,
      isWeekend,
      isHoliday: false,
      nobetciIds: [],
      poliklinikIds: [],
      servisIds: [],
      konsultanIds: [],
      urodinamiIds: [],
      ameliyathaneIds: [],
      dinlenmeIds: [],
      izinliIds: [],
    });
  }

  return {
    id: `${year}-${month < 10 ? '0' : ''}${month}`,
    year,
    month,
    monthName: monthNames[month - 1],
    departmentTitle: CLINIC_DEPARTMENT_NAME,
    days,
    customHolidays: [],
    poliklinikCount: 2,
    servisCount: 1,
    konsultanCount: 1,
    nobetciCount: 2,
    weekendHasDayRoles: false,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getStoredDepartmentTitle(): string {
  try {
    return localStorage.getItem(DEPARTMENT_STORAGE_KEY) || CLINIC_DEPARTMENT_NAME;
  } catch {
    return CLINIC_DEPARTMENT_NAME;
  }
}

export function saveStoredDepartmentTitle(title: string): void {
  try {
    localStorage.setItem(DEPARTMENT_STORAGE_KEY, title);
  } catch (err) {
    console.error('Failed to save department title:', err);
  }
}

export function createDefaultSeptember2026Roster(): MonthlyRoster {
  return {
    id: '2026-09',
    year: 2026,
    month: 9,
    monthName: 'Eylül',
    departmentTitle: CLINIC_DEPARTMENT_NAME,
    days: EUTF_SEPTEMBER_2026_DAYS,
    customHolidays: [],
    poliklinikCount: 2,
    servisCount: 1,
    konsultanCount: 1,
    nobetciCount: 2,
    weekendHasDayRoles: false,
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getStoredDoctors(): Doctor[] {
  try {
    const isNewVersion = localStorage.getItem(STORAGE_VERSION_KEY) !== STORAGE_VERSION;
    if (isNewVersion) {
      localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([]));
      // Remove any old rosters so October starts clean
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(ROSTER_STORAGE_KEY_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch {}
    }
    const raw = localStorage.getItem(DOCTORS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].seniority) {
        return parsed.map((d: Doctor) => {
          const surname = deriveSurname(d.name);
          const needsFix = !d.shortName || d.shortName.toLowerCase().startsWith('asistan') || /^\d+$/.test(d.shortName.trim());
          return {
            ...d,
            shortName: needsFix ? (surname || d.name) : d.shortName,
            username: d.username || deriveUsername(d.name),
            historicalShifts: isNewVersion ? 0 : (d.historicalShifts || 0),
            historicalWeekends: isNewVersion ? 0 : (d.historicalWeekends || 0),
            historicalHolidays: isNewVersion ? 0 : (d.historicalHolidays || 0),
            lastHolidayWorkedDate: isNewVersion ? undefined : d.lastHolidayWorkedDate,
            lastHolidayWorkedName: isNewVersion ? undefined : d.lastHolidayWorkedName,
            shiftBalance: isNewVersion ? 0 : (d.shiftBalance || 0),
            weekendBalance: isNewVersion ? 0 : (d.weekendBalance || 0),
          };
        });
      }
    }
  } catch (err) {
    console.error('Failed to load doctors from localStorage:', err);
  }
  return CLEAN_INITIAL_DOCTORS.map(d => ({
    ...d,
    username: d.username || deriveUsername(d.name),
  }));
}

export function saveStoredDoctors(doctors: Doctor[]): void {
  try {
    localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(doctors));
  } catch (err) {
    console.error('Failed to save doctors to localStorage:', err);
  }
}

export function getStoredRoster(year: number, month: number): MonthlyRoster | null {
  try {
    if (localStorage.getItem(STORAGE_VERSION_KEY) !== STORAGE_VERSION) {
      localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
    }
    const key = `${ROSTER_STORAGE_KEY_PREFIX}${year}_${month}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load roster:', err);
  }

  // If loading a month for the first time, return a clean unassigned roster
  const cleanRoster = createCleanEmptyRoster(year, month);
  saveStoredRoster(cleanRoster);
  return cleanRoster;
}

export function saveStoredRoster(roster: MonthlyRoster): void {
  try {
    const key = `${ROSTER_STORAGE_KEY_PREFIX}${roster.year}_${roster.month}`;
    localStorage.setItem(key, JSON.stringify(roster));
  } catch (err) {
    console.error('Failed to save roster:', err);
  }
}

export function getStoredHistory(): HistoricalMonthSummary[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load history from localStorage:', err);
  }
  return [];
}

export function saveStoredHistory(history: HistoricalMonthSummary[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to save history to localStorage:', err);
  }
}

export function archiveAndCommitMonth(
  roster: MonthlyRoster,
  doctors: Doctor[]
): { updatedDoctors: Doctor[]; history: HistoricalMonthSummary[] } {
  const monthKey = `${roster.year}-${roster.month < 10 ? '0' + roster.month : roster.month}`;
  
  const monthDoctorStats = doctors.map(doc => {
    let totalShifts = 0;
    let weekendShifts = 0;
    let holidayShifts = 0;
    const holidaysWorked: string[] = [];

    roster.days.forEach(day => {
      const isNobetci = 
        day.kidemliNobetciId === doc.id ||
        day.kidemsizNobetciId === doc.id ||
        day.nobetciIds.includes(doc.id);

      if (isNobetci) {
        totalShifts++;
        if (day.isWeekend) weekendShifts++;
        if (day.isHoliday) {
          holidayShifts++;
          holidaysWorked.push(`${day.date} (${day.holidayName || 'Bayram'})`);
        }
      }
    });

    return {
      doctorId: doc.id,
      totalShifts,
      weekendShifts,
      holidayShifts,
      holidaysWorked,
    };
  });

  const newHistoricalEntry: HistoricalMonthSummary = {
    monthKey,
    monthTitle: `${roster.monthName} ${roster.year}`,
    savedAt: new Date().toISOString(),
    doctorStats: monthDoctorStats,
  };

  const currentHistory = getStoredHistory().filter(h => h.monthKey !== monthKey);
  currentHistory.unshift(newHistoricalEntry);
  saveStoredHistory(currentHistory);

  const updatedDoctors = doctors.map(doc => {
    const thisMonth = monthDoctorStats.find(s => s.doctorId === doc.id);
    if (!thisMonth) return doc;

    const diffTotal = thisMonth.totalShifts - doc.targetTotalShifts;
    const diffWeekend = thisMonth.weekendShifts - doc.targetWeekendShifts;

    let lastHolidayDate = doc.lastHolidayWorkedDate;
    let lastHolidayName = doc.lastHolidayWorkedName;
    if (thisMonth.holidaysWorked.length > 0) {
      lastHolidayDate = thisMonth.holidaysWorked[thisMonth.holidaysWorked.length - 1].split(' ')[0];
      lastHolidayName = thisMonth.holidaysWorked[thisMonth.holidaysWorked.length - 1];
    }

    return {
      ...doc,
      historicalShifts: (doc.historicalShifts || 0) + thisMonth.totalShifts,
      historicalWeekends: (doc.historicalWeekends || 0) + thisMonth.weekendShifts,
      historicalHolidays: (doc.historicalHolidays || 0) + thisMonth.holidayShifts,
      lastHolidayWorkedDate: lastHolidayDate,
      lastHolidayWorkedName: lastHolidayName,
      shiftBalance: (doc.shiftBalance || 0) + diffTotal,
      weekendBalance: (doc.weekendBalance || 0) + diffWeekend,
    };
  });

  saveStoredDoctors(updatedDoctors);

  const updatedRoster = { ...roster, status: 'archived' as const, updatedAt: new Date().toISOString() };
  saveStoredRoster(updatedRoster);

  return { updatedDoctors, history: currentHistory };
}

export function resetToCleanInitialState(): { doctors: Doctor[]; history: HistoricalMonthSummary[]; roster: MonthlyRoster } {
  try {
    localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
    localStorage.setItem(DEPARTMENT_STORAGE_KEY, CLINIC_DEPARTMENT_NAME);
    localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(CLEAN_INITIAL_DOCTORS));
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([]));
  } catch (err) {
    console.error('Failed to reset storage to clean initial state:', err);
  }

  const cleanRoster = createCleanEmptyRoster(2026, 10);
  saveStoredRoster(cleanRoster);

  return { doctors: CLEAN_INITIAL_DOCTORS, history: [], roster: cleanRoster };
}

export function resetToSampleData(): { doctors: Doctor[]; history: HistoricalMonthSummary[]; roster: MonthlyRoster } {
  try {
    localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
    localStorage.setItem(DEPARTMENT_STORAGE_KEY, CLINIC_DEPARTMENT_NAME);
    localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(SAMPLE_DOCTORS));
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(SAMPLE_HISTORY));
  } catch (err) {
    console.error('Failed to reset storage:', err);
  }

  const defaultRoster = createCleanEmptyRoster(2026, 10);
  saveStoredRoster(defaultRoster);

  return { doctors: SAMPLE_DOCTORS, history: SAMPLE_HISTORY, roster: defaultRoster };
}

// Export CSV in exact EÜTF Excel format
export function exportRosterToCsv(roster: MonthlyRoster, doctors: Doctor[]): string {
  const docMap = new Map<string, Doctor>(doctors.map(d => [d.id, d]));
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

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

  const rows: string[] = [
    roster.departmentTitle || CLINIC_DEPARTMENT_NAME,
    `${roster.monthName.toUpperCase()} ${roster.year} ASİSTAN ÇALIŞMA PROGRAMI`,
    '',
    ['TARİH', 'KIDEMLİ', 'KIDEMSİZ', 'POLİKLİNİK', 'SERVİS', 'ESWL+KONS', 'ÜRODİNAMİ', 'AMELİYATHANE'].join(';')
  ];

  roster.days.forEach(d => {
    const [year, month, day] = d.date.split('-');
    const dateFormatted = `${parseInt(day, 10)} ${roster.monthName} ${year} ${dayNames[d.dayOfWeek]}`;

    // Kidemli
    const kidemli = d.kidemliNobetciId 
      ? getDocSurname(docMap.get(d.kidemliNobetciId))
      : (d.nobetciIds[0] ? getDocSurname(docMap.get(d.nobetciIds[0])) : '');

    // Kidemsiz
    const kidemsiz = d.kidemsizNobetciId
      ? getDocSurname(docMap.get(d.kidemsizNobetciId))
      : (d.nobetciIds[1] ? getDocSurname(docMap.get(d.nobetciIds[1])) : '');

    // Poliklinik (joined by / like YILDIRIM/AKTAŞ)
    const poliklinik = d.poliklinikIds.map(id => getDocSurname(docMap.get(id))).filter(Boolean).join('/');

    // Servis
    const servis = d.servisIds.map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ');

    // ESWL+Kons
    const konsultan = d.konsultanIds.map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ');

    // Ürodinami
    const urodinami = (d.urodinamiIds || []).map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ');

    // Ameliyathane
    const ameliyathane = (d.ameliyathaneIds || []).map(id => getDocSurname(docMap.get(id))).filter(Boolean).join(', ');

    rows.push([
      `"${dateFormatted}"`,
      `"${kidemli}"`,
      `"${kidemsiz}"`,
      `"${poliklinik}"`,
      `"${servis}"`,
      `"${konsultan}"`,
      `"${urodinami}"`,
      `"${ameliyathane}"`
    ].join(';'));
  });

  return '\uFEFF' + rows.join('\n');
}
