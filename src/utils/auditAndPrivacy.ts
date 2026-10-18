export type AuditCategory =
  | 'ACCESS'
  | 'DELETE'
  | 'VIEW_SENSITIVE'
  | 'MODIFY'
  | 'SYNC_RESTORE';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  timeFormatted: string; // e.g. "26 ก.ย. 15:10 น."
  category: AuditCategory;
  severity: AuditSeverity;
  actionTitle: string; // e.g. "ลบรายชื่อสมาชิก: คุณสมชาย (M003)"
  details?: string;
  operatorName: string; // e.g. "ทีมต้อนรับ" or "แอดมิน (ครูสราทิพย์)"
  deviceId: string; // e.g. "#8F2A"
  deviceLabel: string; // e.g. "iPad (Safari) #8F2A" or custom label
}

const LOCAL_STORAGE_KEY_DEVICE_ID = 'bright_sky_device_id_v1';
const LOCAL_STORAGE_KEY_DEVICE_CUSTOM_NAME = 'bright_sky_device_custom_name_v1';
const LOCAL_STORAGE_KEY_OPERATOR_NAME = 'bright_sky_operator_name_v1';
const LOCAL_STORAGE_KEY_AUDIT_LOGS = 'bright_sky_audit_logs_v1';
const LOCAL_STORAGE_KEY_ADMIN_PIN = 'bright_sky_admin_pin_v1';
const LOCAL_STORAGE_KEY_PRIVACY_ENABLED = 'bright_sky_privacy_shield_enabled_v1';

const MAX_AUDIT_LOGS = 100;

export function detectHardwareAndBrowser(): string {
  if (typeof navigator === 'undefined') return 'อุปกรณ์ทั่วไป';
  const ua = navigator.userAgent || '';

  let os = 'อุปกรณ์ทั่วไป';
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
    os = 'iPad / Tablet';
  } else if (/iPhone/i.test(ua)) {
    os = 'iPhone (iOS)';
  } else if (/Android/i.test(ua)) {
    os = /Mobile/i.test(ua) ? 'มือถือ Android' : 'แท็บเล็ต Android';
  } else if (/Windows/i.test(ua)) {
    os = 'คอมพิวเตอร์ Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'คอมพิวเตอร์ Mac';
  }

  let browser = '';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  return browser ? `${os} · ${browser}` : os;
}

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(LOCAL_STORAGE_KEY_DEVICE_ID);
    if (!id) {
      const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
      id = `#${randomHex}`;
      localStorage.setItem(LOCAL_STORAGE_KEY_DEVICE_ID, id);
    }
    return id;
  } catch {
    return '#DEV1';
  }
}

export function getCustomDeviceName(): string {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY_DEVICE_CUSTOM_NAME) || '';
  } catch {
    return '';
  }
}

export function setCustomDeviceName(name: string) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_DEVICE_CUSTOM_NAME, name.trim());
  } catch {
    // ignore
  }
}

export function getDeviceDisplayLabel(): string {
  const deviceId = getOrCreateDeviceId();
  const custom = getCustomDeviceName();
  const hw = detectHardwareAndBrowser();
  if (custom) {
    return `${custom} (${hw} ${deviceId})`;
  }
  return `${hw} ${deviceId}`;
}

export function getOperatorName(): string {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY_OPERATOR_NAME) || 'จุดเช็คอินทั่วไป';
  } catch {
    return 'จุดเช็คอินทั่วไป';
  }
}

export function setOperatorName(name: string) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_OPERATOR_NAME, name.trim() || 'จุดเช็คอินทั่วไป');
  } catch {
    // ignore
  }
}

export function getAdminPin(): string {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY_ADMIN_PIN) || '1234';
  } catch {
    return '1234';
  }
}

export function setAdminPin(newPin: string) {
  try {
    if (newPin.trim().length >= 4) {
      localStorage.setItem(LOCAL_STORAGE_KEY_ADMIN_PIN, newPin.trim());
    }
  } catch {
    // ignore
  }
}

export function isPrivacyShieldEnabled(): boolean {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PRIVACY_ENABLED);
    if (saved === null) return true; // Default ON to protect sensitive church member data
    return saved === 'true';
  } catch {
    return true;
  }
}

export function setPrivacyShieldEnabled(enabled: boolean) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PRIVACY_ENABLED, String(enabled));
  } catch {
    // ignore
  }
}

// Sensitive Data Masking Functions (PDPA Protection)
export function maskPhone(phone?: string, isUnlocked = false): string {
  if (!phone) return '';
  if (isUnlocked) return phone;
  const digits = phone.replace(/\s+/g, '');
  if (digits.length <= 4) return '•••-••••';
  const prefix = digits.slice(0, 3);
  const suffix = digits.slice(-2);
  return `${prefix}-•••-••${suffix}`;
}

export function maskAddress(address?: string, isUnlocked = false): string {
  if (!address) return '';
  if (isUnlocked) return address;
  return '🔒 ซ่อนข้อมูลที่อยู่ (ปลดล็อกแอดมินเพื่อดู)';
}

export function maskBirthday(birthday?: string, isUnlocked = false): string {
  if (!birthday) return '';
  if (isUnlocked) return birthday;
  try {
    const parts = birthday.split('-');
    if (parts.length === 3) {
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
      ];
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${d} ${thaiMonths[m - 1]} (ซ่อนปีเกิด 🔒)`;
      }
    }
  } catch {
    // ignore
  }
  return '••/••/•••• 🔒';
}

export function maskNotes(notes?: string, isUnlocked = false): string {
  if (!notes) return '';
  if (isUnlocked) return notes;
  return '🔒 ข้อมูลบันทึกส่วนตัว (ต้องปลดล็อกผู้ดูแล)';
}

// Audit Log Storage & Retrieval
export function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_AUDIT_LOGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function createAuditLogEntry(params: {
  category: AuditCategory;
  severity?: AuditSeverity;
  actionTitle: string;
  details?: string;
  operatorOverride?: string;
}): { entry: AuditLogEntry; allLogs: AuditLogEntry[] } {
  const now = new Date();
  const timeFormatted = now.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const entry: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    timeFormatted,
    category: params.category,
    severity: params.severity || 'INFO',
    actionTitle: params.actionTitle,
    details: params.details,
    operatorName: params.operatorOverride || getOperatorName(),
    deviceId: getOrCreateDeviceId(),
    deviceLabel: getDeviceDisplayLabel(),
  };

  try {
    const existing = getAuditLogs();
    const updated = [entry, ...existing].slice(0, MAX_AUDIT_LOGS);
    localStorage.setItem(LOCAL_STORAGE_KEY_AUDIT_LOGS, JSON.stringify(updated));
    return { entry, allLogs: updated };
  } catch {
    return { entry, allLogs: [entry] };
  }
}

export function mergeCloudAuditLogs(cloudLogs: AuditLogEntry[]): AuditLogEntry[] {
  try {
    const localLogs = getAuditLogs();
    const map = new Map<string, AuditLogEntry>();
    for (const item of [...cloudLogs, ...localLogs]) {
      if (item && item.id) {
        map.set(item.id, item);
      }
    }
    const merged = Array.from(map.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_AUDIT_LOGS);
    localStorage.setItem(LOCAL_STORAGE_KEY_AUDIT_LOGS, JSON.stringify(merged));
    return merged;
  } catch {
    return getAuditLogs();
  }
}
