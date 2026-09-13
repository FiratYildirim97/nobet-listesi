import { UserSession } from '../types';

const SESSION_KEY = 'nobet_active_session';
const ADMIN_PIN_KEY = 'nobet_admin_pin';
const DEFAULT_ADMIN_PIN = '7777';

/**
 * Hekim isminden veya unvanından otomatik kullanıcı adı (soyadı) türetir.
 * Örn: "AYDIN" -> "aydin", "Dr. Ali YAŞLIBAŞ" -> "yaslibas", "SEVİNÇOĞLU" -> "sevincoglu"
 */
export function deriveUsername(name: string): string {
  if (!name) return '';

  // Unvanları temizle
  let cleaned = name
    .replace(/^(asistan\s+dr\.?|uzm\.?\s+dr\.?|dr\.?|uzm\.?|prof\.?|doç\.?)\s+/i, '')
    .trim();

  // Birden fazla kelime varsa son kelimeyi (soyadını) al
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const surname = parts.length > 0 ? parts[parts.length - 1] : cleaned;

  // Türkçe karakterleri normalize et ve küçük harfe dönüştür
  const turkishMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ı': 'i', 'I': 'i', 'İ': 'i', 'i': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u'
  };

  const normalized = surname
    .split('')
    .map(ch => turkishMap[ch] || ch.toLowerCase())
    .join('')
    .replace(/[^a-z0-9]/g, '');

  return normalized;
}

/**
 * Hekim isminden veya unvanından büyük harfli soyadını türetir.
 * Örn: "AYDIN" -> "AYDIN", "Dr. Ali YAŞLIBAŞ" -> "YAŞLIBAŞ", "Mehmet Fırat KOYUNCU" -> "KOYUNCU"
 */
export function deriveSurname(name: string): string {
  if (!name) return '';

  const cleaned = name
    .replace(/^(asistan\s+dr\.?|uzm\.?\s+dr\.?|dr\.?|uzm\.?|prof\.?|doç\.?)\s+/i, '')
    .trim();

  const parts = cleaned.split(/\s+/).filter(Boolean);
  const surname = parts.length > 0 ? parts[parts.length - 1] : cleaned;
  return surname.toUpperCase();
}

/**
 * Aktif oturumu yerel hafızadan getirir
 */
export function getActiveSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

/**
 * Aktif oturumu kaydeder (Beni Hatırla seçildiyse kalıcı, seçilmediyse sessionStorage/localStorage)
 */
export function setActiveSession(session: UserSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (session.role === 'admin') {
      localStorage.setItem('nobet_is_admin', 'true');
    } else {
      localStorage.setItem('nobet_is_admin', 'false');
    }
  } catch (err) {
    console.error('Session save error:', err);
  }
}

/**
 * Oturumu kapatır
 */
export function clearActiveSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('nobet_is_admin');
}

/**
 * Yönetici PIN kodunu getirir
 */
export function getAdminPin(): string {
  const stored = localStorage.getItem(ADMIN_PIN_KEY);
  if (!stored || stored === '1234') {
    return DEFAULT_ADMIN_PIN;
  }
  return stored;
}

/**
 * Yönetici PIN kodunu günceller
 */
export function setAdminPin(newPin: string) {
  localStorage.setItem(ADMIN_PIN_KEY, newPin.trim());
}
