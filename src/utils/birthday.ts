import { Member } from '../types';

export const THAI_MONTH_NAMES = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

/**
 * Parses a birthday string (YYYY-MM-DD or MM-DD) into { year, month, day }.
 */
export function parseBirthdayParts(birthday?: string): {
  year: number | null;
  month: number;
  day: number;
} | null {
  if (!birthday) return null;
  const parts = birthday.trim().split('-');
  let year: number | null = null;
  let month: number;
  let day: number;

  if (parts.length >= 3) {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else if (parts.length === 2) {
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
  } else {
    return null;
  }

  if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return {
    year: year && !isNaN(year) ? year : null,
    month,
    day,
  };
}

/**
 * Checks if the given birthday string (YYYY-MM-DD or MM-DD) matches today's month and day.
 */
export function isBirthdayToday(birthday?: string): boolean {
  const parsed = parseBirthdayParts(birthday);
  if (!parsed) return false;
  const now = new Date();
  return now.getMonth() + 1 === parsed.month && now.getDate() === parsed.day;
}

/**
 * Checks if the given birthday string falls in the current month.
 */
export function isBirthdayThisMonth(birthday?: string): boolean {
  const parsed = parseBirthdayParts(birthday);
  if (!parsed) return false;
  const now = new Date();
  return now.getMonth() + 1 === parsed.month;
}

/**
 * Filters and returns all members who have a birthday today.
 */
export function getTodayBirthdayMembers(members: Member[]): Member[] {
  return members.filter((m) => isBirthdayToday(m.birthday));
}

/**
 * Filters and returns all members who have a birthday in the current month, sorted by day.
 */
export function getThisMonthBirthdayMembers(members: Member[]): Member[] {
  return members
    .filter((m) => isBirthdayThisMonth(m.birthday))
    .sort((a, b) => {
      const pa = parseBirthdayParts(a.birthday);
      const pb = parseBirthdayParts(b.birthday);
      return (pa?.day || 0) - (pb?.day || 0);
    });
}

/**
 * Returns the current Thai month name (e.g. 'กันยายน').
 */
export function getCurrentThaiMonthName(): string {
  const now = new Date();
  return THAI_MONTH_NAMES[now.getMonth()] || '';
}

/**
 * Formats a birthday string (e.g. '1998-09-22') into Thai representation like '22 กันยายน (อายุ 28 ปี)'.
 */
export function formatThaiBirthday(birthday?: string): string {
  const parsed = parseBirthdayParts(birthday);
  if (!parsed) return 'ยังไม่ระบุวันเกิด';

  const monthName = THAI_MONTH_NAMES[parsed.month - 1] || `${parsed.month}`;
  const now = new Date();
  const currentYear = now.getFullYear();
  const age = parsed.year ? currentYear - parsed.year : 0;

  return `${parsed.day} ${monthName}${age > 0 && age < 120 ? ` (อายุ ${age} ปี)` : ''}`;
}

export const BIRTHDAY_BLESSING_VERSES = [
  {
    passage:
      'ขอพระยาห์เวห์ทรงอวยพรท่าน และพิทักษ์รักษาท่าน ขอพระยาห์เวห์ทรงให้พระพักตร์ของพระองค์ทอแสงแก่ท่าน และทรงพระกรุณาท่าน',
    reference: 'กันดารวิถี 6:24-25',
  },
  {
    passage:
      'ขอพระองค์ประทานตามความปรารถนาในใจของท่าน และทรงให้แผนงานทั้งสิ้นของท่านสำเร็จ',
    reference: 'สดุดี 20:4',
  },
  {
    passage:
      'เพราะเรารู้แผนงานที่เรามีไว้สำหรับเจ้า เป็นแผนงานเพื่อสวัสดิภาพ ไม่ใช่เพื่อความหายนะ เพื่อจะให้อนาคตและความหวังแก่เจ้า',
    reference: 'เยเรมีย์ 29:11',
  },
  {
    passage:
      'ขอพระคุณ ความรัก และสันติสุขของพระเยซูคริสต์เจ้า สถิตอยู่กับจิตวิญญาณของท่านตลอดไปเป็นนิตย์',
    reference: 'ฟิเลโมน 1:25',
  },
];
