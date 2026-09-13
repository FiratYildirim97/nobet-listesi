import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Doctor, MonthlyRoster, HistoricalMonthSummary } from '../types';
import { deriveUsername } from './auth';

const STORAGE_URL_KEY = 'nobet_supabase_url';
const STORAGE_ANON_KEY = 'nobet_supabase_anon_key';

export const getSupabaseConfig = (): { url: string; key: string } => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  const localUrl = localStorage.getItem(STORAGE_URL_KEY) || '';
  const localKey = localStorage.getItem(STORAGE_ANON_KEY) || '';

  return {
    url: localUrl || envUrl,
    key: localKey || envKey,
  };
};

export const saveSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem(STORAGE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_ANON_KEY, key.trim());
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_ANON_KEY);
};

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;

  if (cachedClient && lastUrl === url && lastKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key);
    lastUrl = url;
    lastKey = key;
    return cachedClient;
  } catch (err) {
    console.warn('Supabase client creation error:', err);
    return null;
  }
};

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key);
};

// --- DATA SYNC OPERATIONS ---

export const fetchCloudDoctors = async (): Promise<Doctor[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('doctors')
      .select('*')
      .order('seniority_rank', { ascending: true });

    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      shortName: row.short_name,
      title: row.title,
      seniority: row.seniority,
      color: row.color,
      username: row.username || deriveUsername(row.name),
      password: row.password || undefined,
      targetTotalShifts: row.target_total_shifts || 0,
      targetWeekendShifts: row.target_weekend_shifts || 0,
      primaryDuty: row.primary_duty,
      compensationDuties: row.compensation_duties || [],
      isOnlyAmeliyathane: row.is_only_ameliyathane || false,
      canDoConsultant: row.can_do_consultant ?? true,
      canDoService: row.can_do_service ?? true,
      canDoClinic: row.can_do_clinic ?? true,
      canDoUrodinami: row.can_do_urodinami ?? false,
      canDoAmeliyathane: row.can_do_ameliyathane ?? true,
      unavailableDates: row.unavailable_dates || [],
      preferredDates: row.preferred_dates || [],
      preferredJuniorIds: row.preferred_junior_ids || [],
      seniorityRank: row.seniority_rank || 0,
      historicalShifts: row.historical_shifts || 0,
      historicalWeekends: row.historical_weekends || 0,
      historicalHolidays: row.historical_holidays || 0,
      lastHolidayWorkedDate: row.last_holiday_worked_date,
      lastHolidayWorkedName: row.last_holiday_worked_name,
      shiftBalance: row.shift_balance || 0,
      weekendBalance: row.weekend_balance || 0,
    }));
  } catch (e) {
    console.error('fetchCloudDoctors failed:', e);
    return null;
  }
};

export const saveCloudDoctors = async (doctors: Doctor[]): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const rows = doctors.map(doc => ({
      id: doc.id,
      name: doc.name,
      short_name: doc.shortName,
      title: doc.title,
      seniority: doc.seniority,
      color: doc.color,
      username: doc.username || (doc.name ? deriveUsername(doc.name) : undefined),
      password: doc.password || null,
      target_total_shifts: doc.targetTotalShifts,
      target_weekend_shifts: doc.targetWeekendShifts,
      primary_duty: doc.primaryDuty || 'poliklinik',
      compensation_duties: doc.compensationDuties || [],
      is_only_ameliyathane: !!doc.isOnlyAmeliyathane,
      can_do_consultant: !!doc.canDoConsultant,
      can_do_service: !!doc.canDoService,
      can_do_clinic: !!doc.canDoClinic,
      can_do_urodinami: !!doc.canDoUrodinami,
      can_do_ameliyathane: doc.canDoAmeliyathane ?? true,
      unavailable_dates: doc.unavailableDates || [],
      preferred_dates: doc.preferredDates || [],
      preferred_junior_ids: doc.preferredJuniorIds || [],
      seniority_rank: doc.seniorityRank || 0,
      historical_shifts: doc.historicalShifts || 0,
      historical_weekends: doc.historicalWeekends || 0,
      historical_holidays: doc.historicalHolidays || 0,
      last_holiday_worked_date: doc.lastHolidayWorkedDate,
      last_holiday_worked_name: doc.lastHolidayWorkedName,
      shift_balance: doc.shiftBalance || 0,
      weekend_balance: doc.weekendBalance || 0,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length === 0) {
      await client.from('doctors').delete().neq('id', '___none___');
      return true;
    }

    const { error } = await client.from('doctors').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Supabase upsert doctors error:', error);
      return false;
    }

    // Also delete any doctors from Supabase that were removed locally
    const currentDocIds = rows.map(r => r.id);
    const { data: existing } = await client.from('doctors').select('id');
    if (existing && existing.length > 0) {
      const toDelete = existing.map(e => e.id).filter(id => !currentDocIds.includes(id));
      if (toDelete.length > 0) {
        await client.from('doctors').delete().in('id', toDelete);
      }
    }

    return true;
  } catch (e) {
    console.error('saveCloudDoctors error:', e);
    return false;
  }
};

export const updateDoctorPasswordInCloud = async (doctorId: string, newPassword: string): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('doctors')
      .update({ password: newPassword, updated_at: new Date().toISOString() })
      .eq('id', doctorId);

    return !error;
  } catch (e) {
    console.error('updateDoctorPasswordInCloud error:', e);
    return false;
  }
};

export const fetchCloudRoster = async (year: number, month: number): Promise<MonthlyRoster | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  const id = `${year}-${month < 10 ? '0' + month : month}`;
  try {
    const { data, error } = await client
      .from('monthly_rosters')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    // Extract doctorConfigs if embedded in custom_holidays
    let doctorConfigs: Record<string, import('../types').MonthlyDoctorConfig> | undefined = undefined;
    const rawHolidays = data.custom_holidays || [];
    const configItem = rawHolidays.find((h: any) => h.date === '__DOCTOR_CONFIGS__');
    if (configItem && configItem.name) {
      try {
        doctorConfigs = JSON.parse(configItem.name);
      } catch (err) {
        console.warn('Error parsing doctorConfigs from cloud:', err);
      }
    }
    const cleanHolidays = rawHolidays.filter((h: any) => h.date !== '__DOCTOR_CONFIGS__');

    return {
      id: data.id,
      year: data.year,
      month: data.month,
      monthName: data.month_name,
      departmentTitle: data.department_title,
      days: data.days || [],
      customHolidays: cleanHolidays,
      poliklinikCount: data.poliklinik_count || 2,
      servisCount: data.servis_count || 1,
      konsultanCount: data.konsultan_count || 1,
      nobetciCount: data.nobetci_count || 2,
      weekendHasDayRoles: data.weekend_has_day_roles || false,
      previousMonthLastDutyDoctorIds: data.previous_month_last_duty_doctor_ids || [],
      doctorConfigs,
      status: data.status || 'draft',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (e) {
    console.error('fetchCloudRoster error:', e);
    return null;
  }
};

export const saveCloudRoster = async (roster: MonthlyRoster): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const cleanHolidays = (roster.customHolidays || []).filter(h => h.date !== '__DOCTOR_CONFIGS__');
    if (roster.doctorConfigs && Object.keys(roster.doctorConfigs).length > 0) {
      cleanHolidays.push({
        date: '__DOCTOR_CONFIGS__',
        name: JSON.stringify(roster.doctorConfigs),
      });
    }

    const row = {
      id: roster.id,
      year: roster.year,
      month: roster.month,
      month_name: roster.monthName,
      department_title: roster.departmentTitle,
      days: roster.days,
      custom_holidays: cleanHolidays,
      poliklinik_count: roster.poliklinikCount || 2,
      servis_count: roster.servisCount || 1,
      konsultan_count: roster.konsultanCount || 1,
      nobetci_count: roster.nobetciCount || 2,
      weekend_has_day_roles: roster.weekendHasDayRoles || false,
      previous_month_last_duty_doctor_ids: roster.previousMonthLastDutyDoctorIds || [],
      status: roster.status || 'draft',
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('monthly_rosters').upsert(row, { onConflict: 'id' });
    return !error;
  } catch (e) {
    console.error('saveCloudRoster error:', e);
    return false;
  }
};
