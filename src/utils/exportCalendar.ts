import { Doctor, MonthlyRoster, DayAssignment } from '../types';

const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/**
 * RFC 5545 formatına uygun UTC/Local timestamp üretir.
 * Örnek: 20260901T080000
 */
function formatIcsDateTime(dateStr: string, hour: number, minute: number): string {
  const parts = dateStr.split('-');
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  const hh = hour < 10 ? `0${hour}` : `${hour}`;
  const mm = minute < 10 ? `0${minute}` : `${minute}`;
  return `${y}${m}${d}T${hh}${mm}00`;
}

/**
 * Belirli bir hekimin nöbet ve gündüz görevlerini standart iCal (.ics) formatına dönüştürür.
 * iPhone (Apple Takvim), Google Calendar, Outlook ile %100 uyumludur.
 */
export function exportDoctorToIcs(doctor: Doctor, roster: MonthlyRoster): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NobetListesi//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${doctor.name} - Nöbet ve Görev Takvimi`,
    'X-WR-TIMEZONE:Europe/Istanbul',
  ];

  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dept = roster.departmentTitle || 'EÜTF Üroloji Anabilim Dalı';

  roster.days.forEach(day => {
    // 1. Gece Nöbeti (17:00 - Ertesi gün 08:00)
    if (day.nobetciIds.includes(doctor.id)) {
      const isKidemli = day.kidemliNobetciId === doctor.id;
      const roleLabel = isKidemli ? 'Kıdemli Gece Nöbeti' : 'Kıdemsiz Gece Nöbeti';
      const startDt = formatIcsDateTime(day.date, 17, 0);
      
      // End date next day
      const nextDate = new Date(day.date);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateStr = nextDate.toISOString().split('T')[0];
      const endDt = formatIcsDateTime(nextDateStr, 8, 0);

      lines.push(
        'BEGIN:VEVENT',
        `UID:duty-${day.date}-${doctor.id}@nobetcizelgesi.com`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${startDt}`,
        `DTEND:${endDt}`,
        `SUMMARY:🌙 ${roleLabel} (${dept})`,
        `DESCRIPTION:${day.date} ${roleLabel}. Nöbet sonrası ertesi gün dinlenmedesiniz.`,
        `LOCATION:${dept}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT12H',
        'ACTION:DISPLAY',
        `DESCRIPTION:Yarın nöbetiniz var: ${roleLabel}`,
        'END:VALARM',
        'END:VEVENT'
      );
    }

    // 2. Poliklinik Görevi (08:00 - 17:00)
    if (day.poliklinikIds.includes(doctor.id)) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:clinic-${day.date}-${doctor.id}@nobetcizelgesi.com`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${formatIcsDateTime(day.date, 8, 0)}`,
        `DTEND:${formatIcsDateTime(day.date, 17, 0)}`,
        `SUMMARY:🩺 Poliklinik Görevi (${dept})`,
        `DESCRIPTION:${day.date} Poliklinik polikliniğinde görevlisiniz.`,
        `LOCATION:${dept}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    }

    // 3. Servis Görevi (08:00 - 17:00)
    if (day.servisIds.includes(doctor.id)) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:service-${day.date}-${doctor.id}@nobetcizelgesi.com`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${formatIcsDateTime(day.date, 8, 0)}`,
        `DTEND:${formatIcsDateTime(day.date, 17, 0)}`,
        `SUMMARY:🏥 Servis Sorumlusu (${dept})`,
        `DESCRIPTION:${day.date} Servis sorumlusu olarak görevlisiniz.`,
        `LOCATION:${dept}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    }

    // 4. ESWL / Konsültan (08:00 - 17:00)
    if (day.konsultanIds.includes(doctor.id)) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:kons-${day.date}-${doctor.id}@nobetcizelgesi.com`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${formatIcsDateTime(day.date, 8, 0)}`,
        `DTEND:${formatIcsDateTime(day.date, 17, 0)}`,
        `SUMMARY:⚡ ESWL & Konsültan Görevi (${dept})`,
        `DESCRIPTION:${day.date} ESWL ve acil konsültasyon görevlisiniz.`,
        `LOCATION:${dept}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    }
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Tüm kliniğin nöbetlerini içeren ortak .ics dosyasını üretir.
 */
export function exportAllRosterToIcs(roster: MonthlyRoster, doctors: Doctor[]): string {
  const docMap = new Map<string, Doctor>(doctors.map(d => [d.id, d]));
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NobetListesi//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${roster.departmentTitle || 'Klinik'} ${roster.monthName} ${roster.year} Nöbet Listesi`,
    'X-WR-TIMEZONE:Europe/Istanbul',
  ];

  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  roster.days.forEach(day => {
    if (day.nobetciIds.length === 0) return;

    const kidemliName = day.kidemliNobetciId ? (docMap.get(day.kidemliNobetciId)?.name || 'Kıdemli') : '-';
    const kidemsizName = day.kidemsizNobetciId ? (docMap.get(day.kidemsizNobetciId)?.name || 'Kıdemsiz') : '-';

    const startDt = formatIcsDateTime(day.date, 17, 0);
    const nextDate = new Date(day.date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];
    const endDt = formatIcsDateTime(nextDateStr, 8, 0);

    lines.push(
      'BEGIN:VEVENT',
      `UID:all-duty-${day.date}@nobetcizelgesi.com`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${startDt}`,
      `DTEND:${endDt}`,
      `SUMMARY:🌙 Nöbetçiler: ${kidemliName} / ${kidemsizName}`,
      `DESCRIPTION:Kıdemli: ${kidemliName}\\nKıdemsiz: ${kidemsizName}\\nPoliklinik: ${day.poliklinikIds.map(id => docMap.get(id)?.name || id).join(', ')}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * WhatsApp gruplarında paylaşmak için temiz, emojili ve formatlı metin çıktısı üretir.
 */
export function generateWhatsAppScheduleText(
  roster: MonthlyRoster,
  doctors: Doctor[],
  filterDoctorId?: string
): string {
  const docMap = new Map<string, Doctor>(doctors.map(d => [d.id, d]));
  const title = roster.departmentTitle || 'EÜTF ÜROLOJİ ANABİLİM DALI';

  if (filterDoctorId) {
    const doc = docMap.get(filterDoctorId);
    if (!doc) return '';

    let text = `🏥 *${title}*\n`;
    text += `👤 *${doc.name} - ${roster.monthName} ${roster.year} Görev Çizelgesi*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let dutyCount = 0;
    let weekendDutyCount = 0;

    roster.days.forEach(day => {
      const parts = day.date.split('-');
      const dayNum = parseInt(parts[2], 10);
      const dayName = WEEKDAYS[day.dayOfWeek];
      const isDuty = day.nobetciIds.includes(doc.id);
      const isRest = day.dinlenmeIds.includes(doc.id);
      const isClinic = day.poliklinikIds.includes(doc.id);
      const isService = day.servisIds.includes(doc.id);
      const isKons = day.konsultanIds.includes(doc.id);

      if (isDuty) {
        dutyCount++;
        if (day.isWeekend) weekendDutyCount++;
        const role = day.kidemliNobetciId === doc.id ? 'Kıdemli Gece Nöbeti' : 'Kıdemsiz Gece Nöbeti';
        text += `🌙 *${dayNum} ${roster.monthName} ${dayName}:* ${role}\n`;
      } else if (isRest) {
        text += `💤 ${dayNum} ${roster.monthName} ${dayName}: Nöbet Ertesi Dinlenme\n`;
      } else if (isClinic) {
        text += `🩺 ${dayNum} ${roster.monthName} ${dayName}: Poliklinik\n`;
      } else if (isService) {
        text += `🏥 ${dayNum} ${roster.monthName} ${dayName}: Servis\n`;
      } else if (isKons) {
        text += `⚡ ${dayNum} ${roster.monthName} ${dayName}: ESWL + Konsültan\n`;
      }
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *Toplam Nöbet:* ${dutyCount} (Hafta Sonu: ${weekendDutyCount})\n`;
    return text;
  }

  // Entire roster full WhatsApp message
  let text = `🏥 *${title}*\n`;
  text += `📅 *${roster.monthName} ${roster.year} ASİSTAN NÖBET LİSTESİ*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  roster.days.forEach(day => {
    const parts = day.date.split('-');
    const dayNum = parseInt(parts[2], 10);
    const dayName = WEEKDAYS[day.dayOfWeek];

    const kidemli = day.kidemliNobetciId ? (docMap.get(day.kidemliNobetciId)?.shortName || docMap.get(day.kidemliNobetciId)?.name || '-') : '-';
    const kidemsiz = day.kidemsizNobetciId ? (docMap.get(day.kidemsizNobetciId)?.shortName || docMap.get(day.kidemsizNobetciId)?.name || '-') : '-';

    const flag = day.isHoliday ? '🔴 [BAYRAM]' : day.isWeekend ? '🟡' : '⚪';
    text += `${flag} *${dayNum} ${roster.monthName} ${dayName}:*\n`;
    text += `   • Kıdemli: *${kidemli}*\n`;
    text += `   • Kıdemsiz: *${kidemsiz}*\n`;

    if (day.poliklinikIds.length > 0) {
      const polNames = day.poliklinikIds.map(id => docMap.get(id)?.shortName || docMap.get(id)?.name || id).join('/');
      text += `   • Poliklinik: ${polNames}\n`;
    }
    text += `\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `İyi çalışmalar dileriz. ✨`;
  return text;
}

/**
 * Dosya indirme yardımcısı
 */
export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
