export type RoleType = 'kidemli' | 'kidemsiz' | 'nobetci' | 'poliklinik' | 'servis' | 'konsultan' | 'urodinami' | 'ameliyathane' | 'dinlenme' | 'diger';

// Ameliyathane kompanse edilmez; kompanse edilebilen 4 klinik döngü görevi:
export type ClinicDutyType = 'poliklinik' | 'servis' | 'konsultan' | 'urodinami';

export interface Doctor {
  id: string;
  name: string;
  shortName?: string;
  title: string; // e.g., 'Kıdemli Asistan', 'Kıdemsiz Asistan', 'Uzman Dr.'
  seniority: 'kidemli' | 'kidemsiz'; // Kıdemli vs Kıdemsiz nöbetçi havuzu
  color: string; // Color badge
  targetTotalShifts: number; // e.g. 5
  targetWeekendShifts: number; // e.g. 2
  targetWeekdayShifts?: number; // e.g. 3 (Hafta içi nöbet sayısı)

  // Ana Döngü ve Kompanse Edeceği Kısımlar
  primaryDuty?: ClinicDutyType | 'ameliyathane'; // Ana klinik döngüsü
  compensationDuties?: ClinicDutyType[]; // Nöbet ertesi / izin durumunda kompanse edeceği klinik birimleri (Ameliyathane hariç)
  isOnlyAmeliyathane?: boolean; // Sadece ameliyathanede olan hekimler (klinik döngüsüne girmez)

  canDoConsultant: boolean; // ESWL+Konsültanlık yetkisi
  canDoService: boolean; // Servis sorumluluğu
  canDoClinic: boolean; // Poliklinik
  canDoUrodinami?: boolean; // Ürodinami
  canDoAmeliyathane?: boolean; // Ameliyathane
  unavailableDates: string[]; // YYYY-MM-DD (Nöbet tutamaz/İzinli)
  preferredDates: string[]; // YYYY-MM-DD (Nöbet istediği günler)

  // Kıdemli - Kıdemsiz Tercihi & Kıdem Sıralaması
  preferredJuniorIds?: string[]; // Kıdemlinin birlikte nöbet tutmak istediği kıdemsizler
  seniorityRank?: number; // Kıdem sırası (1, 2, 3...)
  inClinicRotation?: boolean; // Pol-Kons-Servis-Ürodinami döngüsünde olanlar
  compensationGroup?: 'pol_kons' | 'servis_uro' | 'none'; // Geriye dönük uyumluluk
  
  // Historical fairness data (Önceki aylardan gelen hafıza)
  historicalShifts: number;
  historicalWeekends: number;
  historicalHolidays: number;
  lastHolidayWorkedDate?: string;
  lastHolidayWorkedName?: string;
  shiftBalance: number;
  weekendBalance: number;
  username?: string; // Soyadından otomatik türetilen kullanıcı adı
  password?: string; // Asistanın ilk girişte belirlediği şifre
}

export interface UserSession {
  role: 'admin' | 'assistant';
  doctorId?: string;
  doctorName?: string;
  username?: string;
  rememberMe?: boolean;
}

export interface HolidayInfo {
  date: string; // YYYY-MM-DD
  name: string; // e.g., 'Kurban Bayramı 1. Gün'
  isHalfDay?: boolean; // Arife günleri için
  isBridgeHoliday?: boolean; // Bayram birleştirme / İdari izin köprüsü
  isWeekendLike?: boolean; // Hafta sonu gibi değerlendir
}

export interface DayAssignment {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0=Pazar, 1=Pazartesi ... 6=Cumartesi
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isHalfDayHoliday?: boolean;
  isBridgeHoliday?: boolean; // Birleştirilmiş bayram / İdari tatil
  isWeekendLike?: boolean; // Hafta sonu veya özel tatil günü

  // EÜTF Formatı: Kıdemli & Kıdemsiz Nöbetçiler
  kidemliNobetciId?: string; // KIDEMLİ nöbetçi
  kidemsizNobetciId?: string; // KIDEMSİZ nöbetçi
  nobetciIds: string[]; // [kidemli, kidemsiz] ortak liste (istatistik ve kontroller için)

  // Gündüz Klinik Görev Dağılımı
  poliklinikIds: string[]; // POLİKLİNİK (Genelde 2 hekim, örn: YILDIRIM/AKTAŞ)
  servisIds: string[]; // SERVİS (Genelde 1 hekim, örn: DİKER, OK)
  konsultanIds: string[]; // ESWL+KONS (Genelde 1 hekim, örn: AYDIN, KOYUNCU, SEVİNÇOĞLU)
  urodinamiIds?: string[]; // ÜRODİNAMİ (Genelde 1 hekim, örn: YAŞLIBAŞ)
  ameliyathaneIds?: string[]; // AMELİYATHANE (Genelde 1 hekim, örn: ÇÖT, GÖDE, vb.)

  dinlenmeIds: string[]; // Nöbet ertesi dinlenmede olanlar
  izinliIds: string[]; // İzinli/mazeretli olanlar
  
  notes?: string;
  customRoleAssignments?: Record<string, string[]>; // roleId -> doctorIds[]
}

export interface CustomDutyRole {
  id: string;
  name: string; // e.g., 'İcapçı Nöbetçi', 'Yoğun Bakım', 'Acil Nöbet'
  shortName: string; // e.g., 'İCAP', 'YB', 'ACİL'
  count: number;
  category: 'day' | 'night' | 'oncall';
  color?: string;
}

export interface RuleConflict {
  id: string;
  type: 'consecutive_night' | 'post_duty_day_role' | 'unavailable_assigned' | 'quota_overflow' | 'quota_deficit' | 'missing_duty' | 'seniority_mismatch';
  severity: 'error' | 'warning';
  date?: string;
  doctorId?: string;
  doctorName?: string;
  message: string;
  suggestedFix?: string;
}

export interface MonthlyDoctorConfig {
  doctorId: string;
  primaryDuty?: ClinicDutyType | 'ameliyathane';
  compensationDuties?: ClinicDutyType[];
  unavailableDates?: string[]; // YYYY-MM-DD
  preferredDates?: string[];   // YYYY-MM-DD
  preferredJuniorIds?: string[];
}

export interface MonthlyRoster {
  id: string; // e.g., '2026-09'
  year: number;
  month: number; // 1-12
  monthName: string;
  departmentTitle?: string; // Örn: 'EÜTF ÜROLOJİ ANABİLİM DALI ASİSTAN ÇALIŞMA PROGRAMI'
  days: DayAssignment[];
  customHolidays: HolidayInfo[];
  poliklinikCount: number; // Default 2
  servisCount: number; // Default 1
  konsultanCount: number; // Default 1 (ESWL+Kons)
  nobetciCount: number; // 2 (1 Kıdemli + 1 Kıdemsiz)
  weekendHasDayRoles: boolean; // Hafta sonu gündüz rolleri (Cumartesi/Pazar ameliyathane hariç boş)
  customRoles?: CustomDutyRole[];
  previousMonthLastDutyDoctorIds?: string[]; // Önceki ayın son günü nöbet tutan hekimler (ay devri için)
  doctorConfigs?: Record<string, MonthlyDoctorConfig>; // doctorId -> MonthlyDoctorConfig (o aya özel görev ve izinler)
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface HistoricalMonthSummary {
  monthKey: string; // '2026-08'
  monthTitle: string;
  savedAt: string;
  doctorStats: {
    doctorId: string;
    totalShifts: number;
    weekendShifts: number;
    holidayShifts: number;
    holidaysWorked: string[]; // Tarih ve bayram adı
  }[];
}

export interface FairnessReport {
  doctorId: string;
  doctorName: string;
  thisMonthTotal: number;
  thisMonthWeekend: number;
  thisMonthHoliday: number;
  targetTotal: number;
  targetWeekend: number;
  cumulativeTotal: number;
  cumulativeWeekend: number;
  cumulativeHoliday: number;
  lastHolidayWorked?: string;
  holidayPriorityScore: number; // Higher means they MUST be given holiday duty next
  fairnessDelta: number;
}

