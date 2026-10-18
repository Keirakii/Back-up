import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Member, CheckInRecord, BibleVerse, SessionType } from '../types';
import { AuditLogEntry } from '../utils/auditAndPrivacy';

const AUDIT_LOG_ROW_PREFIX = '__AUDIT_LOG__:';

export const LOCAL_STORAGE_KEY_SUPABASE_URL = 'bright_sky_supabase_url';
export const LOCAL_STORAGE_KEY_SUPABASE_ANON_KEY = 'bright_sky_supabase_anon_key';
export const LOCAL_STORAGE_KEY_DELETED_MEMBERS = 'bright_sky_deleted_member_ids_v1';
export const LOCAL_STORAGE_KEY_DELETED_ATTENDANCE = 'bright_sky_deleted_attendance_ids_v1';

export interface SupabaseConfig {
  url: string;
  key: string;
  isEnvConfigured: boolean;
  isCustomConfigured: boolean;
  isConnected: boolean;
}

export interface SharedCloudSnapshot {
  connected: boolean;
  mode: 'SUPABASE_AND_SERVER' | 'SERVER_CLOUD' | 'SUPABASE_ONLY';
  revision: number;
  updatedAt: number;
  members: Member[] | null;
  attendance: CheckInRecord[] | null;
  careGroups: string[] | null;
  deletedMemberIds: string[];
  deletedAttendanceIds: string[];
  auditLogs: AuditLogEntry[];
  churchProfile?: {
    name?: string;
    slogan?: string;
    logoUrl?: string | null;
    welcomeMessage?: string;
    footerMessage?: string;
  };
}

// Helper for built-in server cloud hub (/api/cloud-state)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function pushToServerCloud(payload: Record<string, any>): Promise<any | null> {
  try {
    const res = await fetch('/api/cloud-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    const data = await res.json();
    return data?.store || null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function pullFromServerCloud(): Promise<any | null> {
  try {
    const res = await fetch('/api/cloud-state', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    const data = await res.json();
    return data?.store || null;
  } catch {
    return null;
  }
}

// Tombstone helpers to ensure locally deleted items never get pulled back from cloud
export function getDeletedMemberTombstones(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_DELETED_MEMBERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addDeletedMemberTombstones(ids: string[]) {
  try {
    const current = new Set(getDeletedMemberTombstones());
    ids.forEach((id) => current.add(id));
    localStorage.setItem(LOCAL_STORAGE_KEY_DELETED_MEMBERS, JSON.stringify(Array.from(current)));
  } catch {
    // ignore
  }
}

export function removeDeletedMemberTombstones(ids: string[]) {
  try {
    const removeSet = new Set(ids);
    const remaining = getDeletedMemberTombstones().filter((id) => !removeSet.has(id));
    localStorage.setItem(LOCAL_STORAGE_KEY_DELETED_MEMBERS, JSON.stringify(remaining));
  } catch {
    // ignore
  }
}

export function clearAllDeletedMemberTombstones() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY_DELETED_MEMBERS);
  } catch {
    // ignore
  }
}

export function getDeletedAttendanceTombstones(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_DELETED_ATTENDANCE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addDeletedAttendanceTombstones(ids: string[]) {
  try {
    const current = new Set(getDeletedAttendanceTombstones());
    ids.forEach((id) => current.add(id));
    localStorage.setItem(LOCAL_STORAGE_KEY_DELETED_ATTENDANCE, JSON.stringify(Array.from(current)));
  } catch {
    // ignore
  }
}

export function removeDeletedAttendanceTombstones(ids: string[]) {
  try {
    const removeSet = new Set(ids);
    const remaining = getDeletedAttendanceTombstones().filter((id) => !removeSet.has(id));
    localStorage.setItem(LOCAL_STORAGE_KEY_DELETED_ATTENDANCE, JSON.stringify(remaining));
  } catch {
    // ignore
  }
}

export function clearAllDeletedAttendanceTombstones() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY_DELETED_ATTENDANCE);
  } catch {
    // ignore
  }
}

// Full SQL script ready for copying and running in Supabase SQL Editor
export const SUPABASE_SCHEMA_SQL = `-- ----------------------------------------------------
-- สคริปต์สร้างฐานข้อมูลสำหรับระบบเช็คอิน คริสตจักรฟ้าใส
-- นำไปวางใน Supabase Dashboard -> SQL Editor แล้วกด RUN
-- ----------------------------------------------------

-- 1. สร้างตารางสมาชิก (members)
create table if not exists public.members (
  id text primary key,
  full_name text not null default '',
  nickname text not null,
  role text not null default 'สมาชิกทั่วไป ⛪',
  nfc_card_id text default '',
  phone text default '',
  birthday text default '',
  address text default '',
  care_group text default '',
  avatar_url text default '',
  avatar_bg_color text default '#7EC8E3',
  is_visitor boolean default false,
  notes text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. สร้างตารางประวัติการเช็คอิน (attendance_records)
create table if not exists public.attendance_records (
  id text primary key,
  member_id text,
  member_name text not null,
  nickname text not null,
  role text default '',
  temperature numeric(4,1) default 36.5,
  check_in_time text not null,
  date text not null,
  session_type text not null default 'CHURCH',
  care_group_name text default '',
  method text not null default 'SEARCH',
  verse_passage text default '',
  verse_reference text default '',
  avatar_url text default '',
  is_birthday boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. สร้างตารางกลุ่มแคร์ (care_groups)
create table if not exists public.care_groups (
  name text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. ตั้งค่าสิทธิ์ความปลอดภัย (Row Level Security - RLS)
alter table public.members enable row level security;
alter table public.attendance_records enable row level security;
alter table public.care_groups enable row level security;

-- เปิดให้เข้าถึงผ่าน Anon Key สำหรับ Kiosk / Tablet เช็คอินประจำคริสตจักร
create policy "Allow anon full access to members" 
  on public.members 
  for all 
  using (true) 
  with check (true);

create policy "Allow anon full access to attendance_records" 
  on public.attendance_records 
  for all 
  using (true) 
  with check (true);

create policy "Allow anon full access to care_groups" 
  on public.care_groups 
  for all 
  using (true) 
  with check (true);

-- เปิด Realtime สำหรับตาราง members และ attendance_records
alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.attendance_records;
`;

let clientInstance: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function getSupabaseCredentials(): { url: string; key: string; isEnv: boolean; isCustom: boolean } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (envUrl && envKey && !envUrl.includes('your-project-ref')) {
    return { url: envUrl, key: envKey, isEnv: true, isCustom: false };
  }

  try {
    const savedUrl = (localStorage.getItem(LOCAL_STORAGE_KEY_SUPABASE_URL) || '').trim();
    const savedKey = (localStorage.getItem(LOCAL_STORAGE_KEY_SUPABASE_ANON_KEY) || '').trim();
    if (savedUrl && savedKey) {
      return { url: savedUrl, key: savedKey, isEnv: false, isCustom: true };
    }
  } catch {
    // ignore
  }

  return { url: '', key: '', isEnv: false, isCustom: false };
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) {
    return null;
  }

  if (clientInstance && cachedUrl === url && cachedKey === key) {
    return clientInstance;
  }

  try {
    clientInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedUrl = url;
    cachedKey = key;
    return clientInstance;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export function saveSupabaseConfig(url: string, key: string) {
  const cleanUrl = url.trim();
  const cleanKey = key.trim();
  localStorage.setItem(LOCAL_STORAGE_KEY_SUPABASE_URL, cleanUrl);
  localStorage.setItem(LOCAL_STORAGE_KEY_SUPABASE_ANON_KEY, cleanKey);
  clientInstance = null;
  cachedUrl = '';
  cachedKey = '';
  // Also share credentials with the built-in server so other devices automatically connect
  pushToServerCloud({ supabaseConfig: { url: cleanUrl, key: cleanKey } }).catch(() => {});
}

export function clearSupabaseConfig() {
  localStorage.removeItem(LOCAL_STORAGE_KEY_SUPABASE_URL);
  localStorage.removeItem(LOCAL_STORAGE_KEY_SUPABASE_ANON_KEY);
  clientInstance = null;
  cachedUrl = '';
  cachedKey = '';
  pushToServerCloud({ supabaseConfig: null }).catch(() => {});
}

// Test connection by doing a light query on the members table
export async function testSupabaseConnection(
  overrideUrl?: string,
  overrideKey?: string
): Promise<{ success: boolean; message: string; code?: string }> {
  let client: SupabaseClient | null = null;
  if (overrideUrl && overrideKey) {
    try {
      client = createClient(overrideUrl.trim(), overrideKey.trim(), {
        auth: { persistSession: false },
      });
    } catch (e: unknown) {
      const err = e as Error;
      return { success: false, message: `URL ไม่ถูกต้อง: ${err.message || 'โปรดตรวจสอบรูปแบบ URL'}` };
    }
  } else {
    client = getSupabaseClient();
  }

  if (!client) {
    return {
      success: true,
      message: 'ระบบซิงค์อัตโนมัติระหว่างอุปกรณ์ (Cloud Auto-Sync) ทำงานอยู่แล้วค่ะ',
    };
  }

  try {
    const { error } = await client.from('members').select('id').limit(1);
    if (error) {
      if (
        error.code === '42P01' ||
        error.message.includes('relation') ||
        error.message.includes('does not exist')
      ) {
        return {
          success: false,
          code: 'TABLE_NOT_FOUND',
          message:
            'เชื่อมต่อ Supabase ได้แล้ว แต่ยังไม่ได้สร้างตาราง "members" (กรุณารันคำสั่ง SQL ด้านล่างใน Supabase SQL Editor)',
        };
      }
      return { success: false, message: `ข้อผิดพลาดจาก Supabase: ${error.message}` };
    }
    return {
      success: true,
      message: 'เชื่อมต่อกับฐานข้อมูล Supabase สำเร็จสมบูรณ์! พร้อมซิงค์ข้อมูลอัตโนมัติ',
    };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, message: `ไม่สามารถเชื่อมต่อได้: ${error.message || 'เครือข่ายขัดข้อง'}` };
  }
}

// Encode/decode newcomer metadata (invitedBy, firstVisitDate, ageGroup, gender) inside notes so no extra DB columns are needed
const META_DELIMITER = ' ||__META__:';

function packMemberNotes(member: Member): string {
  const baseNotes = member.notes || '';
  if (!member.invitedBy && !member.firstVisitDate && !member.ageGroup && !member.gender) {
    return baseNotes;
  }
  const meta = JSON.stringify({
    invitedBy: member.invitedBy || undefined,
    firstVisitDate: member.firstVisitDate || undefined,
    ageGroup: member.ageGroup || undefined,
    gender: member.gender || undefined,
  });
  return `${baseNotes}${META_DELIMITER}${meta}`;
}

function unpackMemberNotes(rawNotes: string | null | undefined): {
  notes?: string;
  invitedBy?: string;
  firstVisitDate?: string;
  ageGroup?: 'ADULT' | 'CHILD';
  gender?: 'MALE' | 'FEMALE';
} {
  if (!rawNotes) return {};
  const idx = rawNotes.indexOf(META_DELIMITER);
  if (idx === -1) {
    return { notes: rawNotes || undefined };
  }
  const cleanNotes = rawNotes.slice(0, idx).trim();
  const metaJson = rawNotes.slice(idx + META_DELIMITER.length);
  try {
    const parsed = JSON.parse(metaJson);
    return {
      notes: cleanNotes || undefined,
      invitedBy: parsed.invitedBy || undefined,
      firstVisitDate: parsed.firstVisitDate || undefined,
      ageGroup:
        parsed.ageGroup === 'CHILD' || parsed.ageGroup === 'ADULT' ? parsed.ageGroup : undefined,
      gender: parsed.gender === 'MALE' || parsed.gender === 'FEMALE' ? parsed.gender : undefined,
    };
  } catch {
    return { notes: cleanNotes || undefined };
  }
}

// Convert Supabase DB row to app Member interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRowToMember(row: any): Member {
  const unpacked = unpackMemberNotes(row.notes);
  return {
    id: row.id,
    fullName: row.full_name || '',
    nickname: row.nickname || '',
    role: row.role || 'สมาชิกทั่วไป ⛪',
    nfcCardId: row.nfc_card_id || '',
    ageGroup: unpacked.ageGroup,
    gender: unpacked.gender,
    phone: row.phone || undefined,
    birthday: row.birthday || undefined,
    address: row.address || undefined,
    careGroup: row.care_group || undefined,
    avatarUrl: row.avatar_url || undefined,
    avatarBgColor: row.avatar_bg_color || '#7EC8E3',
    isVisitor: Boolean(row.is_visitor),
    notes: unpacked.notes,
    invitedBy: unpacked.invitedBy,
    firstVisitDate: unpacked.firstVisitDate,
  };
}

// Convert app Member interface to Supabase DB row
export function mapMemberToRow(member: Member) {
  return {
    id: member.id,
    full_name: member.fullName || '',
    nickname: member.nickname,
    role: member.role || 'สมาชิกทั่วไป ⛪',
    nfc_card_id: member.nfcCardId || '',
    phone: member.phone || '',
    birthday: member.birthday || '',
    address: member.address || '',
    care_group: member.careGroup || '',
    avatar_url: member.avatarUrl || '',
    avatar_bg_color: member.avatarBgColor || '#7EC8E3',
    is_visitor: Boolean(member.isVisitor),
    notes: packMemberNotes(member),
    updated_at: new Date().toISOString(),
  };
}

// Flush any pending deletions (tombstones) to Cloud Server and Supabase before pulling
export async function flushPendingDeletionsToCloud(): Promise<void> {
  const deletedMembers = getDeletedMemberTombstones();
  const deletedAtt = getDeletedAttendanceTombstones();

  let serverFlushed = false;
  if (deletedMembers.length > 0 || deletedAtt.length > 0) {
    const store = await pushToServerCloud({
      deleteMemberIds: deletedMembers.length > 0 ? deletedMembers : undefined,
      deleteAttendanceIds: deletedAtt.length > 0 ? deletedAtt : undefined,
    });
    if (store) {
      serverFlushed = true;
    }
  }

  const client = getSupabaseClient();
  if (!client) {
    if (serverFlushed) {
      clearAllDeletedMemberTombstones();
      clearAllDeletedAttendanceTombstones();
    }
    return;
  }

  if (deletedMembers.length > 0) {
    try {
      const { error } = await client.from('members').delete().in('id', deletedMembers);
      if (!error) {
        clearAllDeletedMemberTombstones();
      }
    } catch {
      // keep tombstones for next attempt
    }
  }

  if (deletedAtt.length > 0) {
    try {
      const { error } = await client.from('attendance_records').delete().in('id', deletedAtt);
      if (!error) {
        clearAllDeletedAttendanceTombstones();
      }
    } catch {
      // keep tombstones for next attempt
    }
  }
}

// Fetch all members from Supabase (respecting local deletion tombstones)
export async function fetchMembersFromCloud(): Promise<Member[] | null> {
  await flushPendingDeletionsToCloud();

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('members')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data) {
        const tombstones = new Set(getDeletedMemberTombstones());
        return data.map(mapRowToMember).filter((m) => !tombstones.has(m.id));
      }
    } catch (err) {
      console.warn('Supabase fetchMembers warning:', err);
    }
  }

  const serverStore = await pullFromServerCloud();
  if (serverStore && Array.isArray(serverStore.members)) {
    const tombstones = new Set([
      ...getDeletedMemberTombstones(),
      ...(serverStore.deletedMemberIds || []),
    ]);
    return serverStore.members.filter((m: Member) => m && !tombstones.has(m.id));
  }

  return null;
}

// Upsert member into Cloud (both built-in server & Supabase)
export async function upsertMemberToCloud(member: Member): Promise<boolean> {
  removeDeletedMemberTombstones([member.id]);
  const serverPromise = pushToServerCloud({ upsertMembers: [member] });

  const client = getSupabaseClient();
  let supabaseOk = false;
  if (client) {
    try {
      const row = mapMemberToRow(member);
      const { error } = await client.from('members').upsert(row, { onConflict: 'id' });
      if (!error) supabaseOk = true;
    } catch (err) {
      console.warn('Network error saving member to Supabase:', err);
    }
  }

  const serverStore = await serverPromise;
  return Boolean(supabaseOk || serverStore);
}

// Delete member from Cloud (with tombstone protection across all devices)
export async function deleteMemberFromCloud(memberId: string): Promise<boolean> {
  return deleteMultipleMembersFromCloud([memberId]);
}

// Batch delete / reduce multiple members from Cloud across all devices
export async function deleteMultipleMembersFromCloud(memberIds: string[]): Promise<boolean> {
  const cleanIds = Array.from(new Set(memberIds.filter(Boolean)));
  if (cleanIds.length === 0) return true;

  addDeletedMemberTombstones(cleanIds);
  const serverPromise = pushToServerCloud({ deleteMemberIds: cleanIds });

  const client = getSupabaseClient();
  let supabaseOk = false;
  if (client) {
    try {
      const { error } = await client.from('members').delete().in('id', cleanIds);
      if (!error) {
        supabaseOk = true;
      }
    } catch (err) {
      console.warn('Network error deleting members from Supabase:', err);
    }
  }

  const serverStore = await serverPromise;
  if (serverStore && (!client || supabaseOk)) {
    removeDeletedMemberTombstones(cleanIds);
  }
  return Boolean(supabaseOk || serverStore);
}

// Attendance Records DB mapping
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRowToAttendanceRecord(row: any): CheckInRecord {
  const verse: BibleVerse = {
    passage: row.verse_passage || '',
    reference: row.verse_reference || '',
  };

  return {
    id: row.id,
    memberId: row.member_id || '',
    memberName: row.member_name || '',
    nickname: row.nickname || '',
    role: row.role || '',
    temperature: parseFloat(row.temperature) || 36.5,
    checkInTime: row.check_in_time || '',
    date: row.date || '',
    sessionType: (row.session_type as SessionType) || 'CHURCH',
    careGroupName: row.care_group_name || undefined,
    method: row.method || 'SEARCH',
    verse,
    avatarUrl: row.avatar_url || undefined,
    isBirthday: Boolean(row.is_birthday),
    isVisitor: Boolean(
      row.role && (row.role.includes('ผู้มาใหม่') || row.role.includes('ผู้มาเยือน'))
    ),
  };
}

export function mapAttendanceRecordToRow(rec: CheckInRecord) {
  return {
    id: rec.id,
    member_id: rec.memberId,
    member_name: rec.memberName,
    nickname: rec.nickname,
    role: rec.role,
    temperature: rec.temperature,
    check_in_time: rec.checkInTime,
    date: rec.date,
    session_type: rec.sessionType,
    care_group_name: rec.careGroupName || '',
    method: rec.method,
    verse_passage: rec.verse?.passage || '',
    verse_reference: rec.verse?.reference || '',
    avatar_url: rec.avatarUrl || '',
    is_birthday: Boolean(rec.isBirthday),
  };
}

export async function fetchAttendanceFromCloud(): Promise<CheckInRecord[] | null> {
  await flushPendingDeletionsToCloud();

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('attendance_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(400);

      if (!error && data) {
        const tombstones = new Set(getDeletedAttendanceTombstones());
        return data.map(mapRowToAttendanceRecord).filter((r) => !tombstones.has(r.id));
      }
    } catch (err) {
      console.warn('Network error fetching attendance:', err);
    }
  }

  const serverStore = await pullFromServerCloud();
  if (serverStore && Array.isArray(serverStore.attendance)) {
    const tombstones = new Set([
      ...getDeletedAttendanceTombstones(),
      ...(serverStore.deletedAttendanceIds || []),
    ]);
    return serverStore.attendance.filter((r: CheckInRecord) => r && !tombstones.has(r.id));
  }

  return null;
}

export async function insertAttendanceToCloud(record: CheckInRecord): Promise<boolean> {
  removeDeletedAttendanceTombstones([record.id]);
  const serverPromise = pushToServerCloud({ upsertAttendance: [record] });

  const client = getSupabaseClient();
  let supabaseOk = false;
  if (client) {
    try {
      const row = mapAttendanceRecordToRow(record);
      const { error } = await client.from('attendance_records').upsert(row, { onConflict: 'id' });
      if (!error) supabaseOk = true;
    } catch (err) {
      console.warn('Network error inserting attendance:', err);
    }
  }

  const serverStore = await serverPromise;
  return Boolean(supabaseOk || serverStore);
}

export async function deleteAttendanceFromCloud(id: string): Promise<boolean> {
  addDeletedAttendanceTombstones([id]);
  const serverPromise = pushToServerCloud({ deleteAttendanceIds: [id] });

  const client = getSupabaseClient();
  let supabaseOk = false;
  if (client) {
    try {
      const { error } = await client.from('attendance_records').delete().eq('id', id);
      if (!error) {
        removeDeletedAttendanceTombstones([id]);
        supabaseOk = true;
      }
    } catch (err) {
      console.warn('Network error deleting attendance:', err);
    }
  }

  const serverStore = await serverPromise;
  return Boolean(supabaseOk || serverStore);
}

export async function deleteAttendanceByDateFromCloud(
  dateStr: string,
  removedIds: string[] = []
): Promise<boolean> {
  if (removedIds.length > 0) {
    addDeletedAttendanceTombstones(removedIds);
  }
  const serverPromise = pushToServerCloud({
    clearDateAttendance: dateStr,
    deleteAttendanceIds: removedIds.length > 0 ? removedIds : undefined,
  });

  const client = getSupabaseClient();
  let supabaseOk = false;
  if (client) {
    try {
      const { error } = await client.from('attendance_records').delete().eq('date', dateStr);
      if (!error) {
        if (removedIds.length > 0) {
          removeDeletedAttendanceTombstones(removedIds);
        }
        supabaseOk = true;
      }
    } catch (err) {
      console.warn('Network error deleting date attendance:', err);
    }
  }

  const serverStore = await serverPromise;
  return Boolean(supabaseOk || serverStore);
}

export async function deleteAllAttendanceFromCloud(removedIds: string[] = []): Promise<boolean> {
  if (removedIds.length > 0) {
    addDeletedAttendanceTombstones(removedIds);
  }
  const serverPromise = pushToServerCloud({
    clearAllAttendance: true,
    deleteAttendanceIds: removedIds.length > 0 ? removedIds : undefined,
  });

  const client = getSupabaseClient();
  let supabaseOk = false;
  if (client) {
    try {
      const { error } = await client.from('attendance_records').delete().neq('id', '');
      if (!error) {
        clearAllDeletedAttendanceTombstones();
        supabaseOk = true;
      }
    } catch (err) {
      console.warn('Network error clearing all attendance:', err);
    }
  }

  const serverStore = await serverPromise;
  return Boolean(supabaseOk || serverStore);
}

// Care Groups Cloud Functions
export async function fetchCareGroupsFromCloud(): Promise<string[] | null> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('care_groups').select('name').order('name');
      if (!error && data) {
        return data
          .map((d: { name: string }) => d.name)
          .filter((name: string) => !name.startsWith(AUDIT_LOG_ROW_PREFIX));
      }
    } catch {
      // fallback to server store
    }
  }

  const serverStore = await pullFromServerCloud();
  if (serverStore && Array.isArray(serverStore.careGroups)) {
    return serverStore.careGroups;
  }

  return null;
}

export async function saveCareGroupToCloud(groupName: string): Promise<boolean> {
  const trimmed = groupName.trim();
  if (!trimmed) return false;

  const currentServer = await pullFromServerCloud();
  const nextGroups = Array.from(new Set([...(currentServer?.careGroups || []), trimmed]));
  const serverPromise = pushToServerCloud({ careGroups: nextGroups });

  const client = getSupabaseClient();
  let supabaseOk = false;
  if (client) {
    try {
      const { error } = await client.from('care_groups').upsert({ name: trimmed });
      supabaseOk = !error;
    } catch {
      // ignore
    }
  }

  const serverStore = await serverPromise;
  return Boolean(supabaseOk || serverStore);
}

export async function syncCareGroupsToCloud(careGroups: string[]): Promise<boolean> {
  const cleanList = Array.from(new Set(careGroups.map((g) => g.trim()).filter(Boolean)));
  const serverPromise = pushToServerCloud({ careGroups: cleanList });

  const client = getSupabaseClient();
  let supabaseOk = false;
  if (client) {
    try {
      const { data: existing } = await client.from('care_groups').select('name');
      const localSet = new Set(cleanList);
      if (existing && existing.length > 0) {
        const toDelete = existing
          .map((r: { name: string }) => r.name)
          .filter((name: string) => !name.startsWith(AUDIT_LOG_ROW_PREFIX) && !localSet.has(name));
        if (toDelete.length > 0) {
          await client.from('care_groups').delete().in('name', toDelete);
        }
      }
      if (localSet.size > 0) {
        const rows = Array.from(localSet).map((name) => ({ name }));
        await client.from('care_groups').upsert(rows, { onConflict: 'name' });
      }
      supabaseOk = true;
    } catch {
      // ignore
    }
  }

  const serverStore = await serverPromise;
  return Boolean(supabaseOk || serverStore);
}

// Cross-Device Activity & Audit Log Cloud Sync
export async function pushAuditLogToCloud(entry: AuditLogEntry): Promise<boolean> {
  const serverPromise = pushToServerCloud({ auditLog: entry });

  const client = getSupabaseClient();
  let supabaseOk = false;
  if (client) {
    try {
      const rowValue = `${AUDIT_LOG_ROW_PREFIX}${JSON.stringify(entry)}`;
      const { error } = await client
        .from('care_groups')
        .upsert({ name: rowValue }, { onConflict: 'name' });
      supabaseOk = !error;
    } catch {
      // ignore
    }
  }

  const serverStore = await serverPromise;
  return Boolean(supabaseOk || serverStore);
}

export async function fetchAuditLogsFromCloud(): Promise<AuditLogEntry[]> {
  const combined: AuditLogEntry[] = [];

  const serverStore = await pullFromServerCloud();
  if (serverStore && Array.isArray(serverStore.auditLogs)) {
    combined.push(...serverStore.auditLogs);
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('care_groups')
        .select('name')
        .like('name', `${AUDIT_LOG_ROW_PREFIX}%`);
      if (!error && data) {
        for (const row of data) {
          if (row.name && row.name.startsWith(AUDIT_LOG_ROW_PREFIX)) {
            try {
              const jsonStr = row.name.slice(AUDIT_LOG_ROW_PREFIX.length);
              const item = JSON.parse(jsonStr) as AuditLogEntry;
              if (item && item.id) {
                combined.push(item);
              }
            } catch {
              // ignore malformed log
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const uniqueMap = new Map<string, AuditLogEntry>();
  for (const log of combined) {
    if (log && log.id) {
      uniqueMap.set(log.id, log);
    }
  }
  return Array.from(uniqueMap.values()).sort((a, b) => b.timestamp - a.timestamp);
}

export async function pushChurchProfileToCloud(profile: {
  name?: string;
  slogan?: string;
  logoUrl?: string | null;
  welcomeMessage?: string;
  footerMessage?: string;
}): Promise<void> {
  await pushToServerCloud({ churchProfile: profile });
}

/**
 * Full Two-Way Cloud Snapshot Pull:
 * - Pulls from the built-in shared Cloud Server (/api/cloud-state) AND Supabase (if configured).
 * - Automatically adopts shared Supabase credentials if another device configured them.
 * - Returns canonical members, attendance, careGroups, deletedMemberIds, deletedAttendanceIds, and auditLogs.
 */
export async function pullSharedCloudSnapshot(): Promise<SharedCloudSnapshot | null> {
  await flushPendingDeletionsToCloud();

  const serverStore = await pullFromServerCloud();

  // If another device saved Supabase credentials to the server, adopt them automatically!
  if (serverStore?.supabaseConfig?.url && serverStore?.supabaseConfig?.key) {
    const currentCreds = getSupabaseCredentials();
    if (!currentCreds.url || !currentCreds.key) {
      localStorage.setItem(LOCAL_STORAGE_KEY_SUPABASE_URL, serverStore.supabaseConfig.url);
      localStorage.setItem(LOCAL_STORAGE_KEY_SUPABASE_ANON_KEY, serverStore.supabaseConfig.key);
      clientInstance = null;
      cachedUrl = '';
      cachedKey = '';
    }
  } else {
    // Conversely, if THIS device has Supabase credentials and the server doesn't yet, share them!
    const currentCreds = getSupabaseCredentials();
    if (currentCreds.url && currentCreds.key && serverStore && !serverStore.supabaseConfig) {
      pushToServerCloud({
        supabaseConfig: { url: currentCreds.url, key: currentCreds.key },
      }).catch(() => {});
    }
  }

  const deletedMemberIds = Array.from(
    new Set([
      ...getDeletedMemberTombstones(),
      ...(Array.isArray(serverStore?.deletedMemberIds) ? serverStore.deletedMemberIds : []),
    ])
  );
  const deletedAttendanceIds = Array.from(
    new Set([
      ...getDeletedAttendanceTombstones(),
      ...(Array.isArray(serverStore?.deletedAttendanceIds) ? serverStore.deletedAttendanceIds : []),
    ])
  );
  const delMemberSet = new Set(deletedMemberIds);
  const delAttSet = new Set(deletedAttendanceIds);

  const client = getSupabaseClient();
  let supaMembers: Member[] | null = null;
  let supaAttendance: CheckInRecord[] | null = null;
  let supaCareGroups: string[] | null = null;

  if (client) {
    try {
      const [memRes, attRes, cgRes] = await Promise.all([
        client.from('members').select('*').order('id', { ascending: true }),
        client
          .from('attendance_records')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(400),
        client.from('care_groups').select('name').order('name'),
      ]);

      if (!memRes.error && memRes.data) {
        supaMembers = memRes.data.map(mapRowToMember).filter((m) => !delMemberSet.has(m.id));
      }
      if (!attRes.error && attRes.data) {
        supaAttendance = attRes.data
          .map(mapRowToAttendanceRecord)
          .filter((r) => !delAttSet.has(r.id));
      }
      if (!cgRes.error && cgRes.data) {
        supaCareGroups = cgRes.data
          .map((d: { name: string }) => d.name)
          .filter((name: string) => !name.startsWith(AUDIT_LOG_ROW_PREFIX));
      }
    } catch {
      // fallback to serverStore
    }
  }

  if (!serverStore && !supaMembers && !supaAttendance) {
    return null;
  }

  // Merge members from serverStore and supaMembers (respecting deletions)
  let mergedMembers: Member[] | null = null;
  const hasServerData = Boolean(serverStore && serverStore.revision > 0);

  if (supaMembers !== null || hasServerData) {
    const memberMap = new Map<string, Member>();
    if (supaMembers) {
      for (const m of supaMembers) {
        if (m && m.id && !delMemberSet.has(m.id)) {
          memberMap.set(m.id, m);
        }
      }
    }
    if (serverStore && Array.isArray(serverStore.members)) {
      for (const m of serverStore.members) {
        if (m && m.id && !delMemberSet.has(m.id)) {
          // Server store has latest full fields (including gender, ageGroup, invitedBy)
          memberMap.set(m.id, { ...(memberMap.get(m.id) || {}), ...m });
        }
      }
    }
    mergedMembers = Array.from(memberMap.values());
  }

  // Merge attendance from serverStore and supaAttendance (respecting deletions)
  let mergedAttendance: CheckInRecord[] | null = null;
  if (supaAttendance !== null || hasServerData) {
    const attMap = new Map<string, CheckInRecord>();
    if (supaAttendance) {
      for (const r of supaAttendance) {
        if (r && r.id && !delAttSet.has(r.id)) {
          attMap.set(r.id, r);
        }
      }
    }
    if (serverStore && Array.isArray(serverStore.attendance)) {
      for (const r of serverStore.attendance) {
        if (r && r.id && !delAttSet.has(r.id)) {
          attMap.set(r.id, { ...(attMap.get(r.id) || {}), ...r });
        }
      }
    }
    mergedAttendance = Array.from(attMap.values());
  }

  // Merge care groups
  let mergedCareGroups: string[] | null = null;
  if (supaCareGroups !== null || hasServerData) {
    const cgSet = new Set<string>([
      ...(supaCareGroups || []),
      ...(Array.isArray(serverStore?.careGroups) ? serverStore.careGroups : []),
    ]);
    mergedCareGroups = Array.from(cgSet).filter(Boolean);
  }

  return {
    connected: true,
    mode:
      supaMembers !== null && serverStore
        ? 'SUPABASE_AND_SERVER'
        : supaMembers !== null
        ? 'SUPABASE_ONLY'
        : 'SERVER_CLOUD',
    revision: serverStore?.revision || 0,
    updatedAt: serverStore?.updatedAt || Date.now(),
    members: mergedMembers,
    attendance: mergedAttendance,
    careGroups: mergedCareGroups,
    deletedMemberIds,
    deletedAttendanceIds,
    auditLogs: Array.isArray(serverStore?.auditLogs) ? serverStore.auditLogs : [],
    churchProfile: serverStore?.churchProfile,
  };
}

/**
 * Seed initial local data to the shared cloud server if the server has revision === 0
 */
export async function seedInitialDataToCloudIfEmpty(
  members: Member[],
  attendance: CheckInRecord[],
  careGroups: string[]
): Promise<void> {
  await pushToServerCloud({
    fullReplace: {
      onlyIfEmpty: true,
      members,
      attendance,
      careGroups,
      deletedMemberIds: getDeletedMemberTombstones(),
      deletedAttendanceIds: getDeletedAttendanceTombstones(),
    },
  });
}

/**
 * Subscribe to built-in Server-Sent Events (/api/cloud-events) for instant (<50ms) cross-device sync
 */
export function subscribeToServerCloudEvents(
  onRemoteUpdate: (data: { revision: number; updatedAt: number }) => void
): () => void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }

  let es: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  let lastSeenRevision = -1;

  const connect = () => {
    if (closed) return;
    try {
      es = new EventSource('/api/cloud-events');
      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && typeof parsed.revision === 'number') {
            if (lastSeenRevision !== -1 && parsed.revision !== lastSeenRevision) {
              onRemoteUpdate({
                revision: parsed.revision,
                updatedAt: parsed.updatedAt || Date.now(),
              });
            }
            lastSeenRevision = parsed.revision;
          }
        } catch {
          // ignore
        }
      };
      es.onerror = () => {
        if (es) {
          es.close();
          es = null;
        }
        if (!closed) {
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    } catch {
      // ignore
    }
  };

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (es) {
      es.close();
      es = null;
    }
  };
}

/**
 * Subscribe to Supabase Realtime changes on members, attendance_records, and care_groups
 */
export function subscribeToSupabaseRealtime(onRemoteChange: () => void): () => void {
  const client = getSupabaseClient();
  if (!client) {
    return () => {};
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const triggerSync = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onRemoteChange();
    }, 300);
  };

  let channel: RealtimeChannel | null = null;
  try {
    channel = client
      .channel('bright-sky-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, triggerSync)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_records' },
        triggerSync
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'care_groups' }, triggerSync)
      .subscribe();
  } catch {
    // ignore realtime setup errors
  }

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (channel && client) {
      client.removeChannel(channel).catch(() => {});
    }
  };
}

/**
 * Full Mirror Push (Local -> Cloud Server + Supabase Cloud):
 * 1. Deletes any members, attendance records, and care groups on Cloud that were deleted locally.
 * 2. Upserts all current members, attendance records, and care groups from the device to Cloud.
 * Ensures that what you see on screen is 100% saved as the truth on the Cloud.
 */
export async function migrateCurrentDataToSupabase(
  members: Member[],
  attendance: CheckInRecord[],
  careGroups: string[],
  options?: { resetAllTombstones?: boolean }
): Promise<{ success: boolean; message: string; countMembers: number; countAttendance: number }> {
  // Always push full state to the built-in shared server cloud first
  const serverStore = await pushToServerCloud({
    fullReplace: {
      members,
      attendance,
      careGroups,
      deletedMemberIds: getDeletedMemberTombstones(),
      deletedAttendanceIds: getDeletedAttendanceTombstones(),
      resetAllTombstones: Boolean(options?.resetAllTombstones),
    },
  });

  const client = getSupabaseClient();
  if (!client) {
    clearAllDeletedMemberTombstones();
    clearAllDeletedAttendanceTombstones();
    return {
      success: Boolean(serverStore),
      message: serverStore
        ? `ซิงค์ข้อมูลปัจจุบันขึ้นคลาวด์สำเร็จ! (สมาชิก ${members.length} คน, ประวัติเช็คอิน ${attendance.length} รายการ)`
        : 'กรุณาตรวจสอบการเชื่อมต่อเครือข่ายก่อนซิงค์ข้อมูลค่ะ',
      countMembers: members.length,
      countAttendance: attendance.length,
    };
  }

  try {
    // 1. Sync Members (Delete removed members on cloud + Upsert current members)
    const { data: cloudMemberRows, error: fetchMemErr } = await client.from('members').select('id');
    if (fetchMemErr) {
      return {
        success: Boolean(serverStore),
        message: serverStore
          ? `ซิงค์ผ่านระบบคลาวด์หลักสำเร็จ (สมาชิก ${members.length} คน) · หมายเหตุ Supabase: ${fetchMemErr.message}`
          : `เกิดข้อผิดพลาดในการเข้าถึงตารางสมาชิก: ${fetchMemErr.message}`,
        countMembers: members.length,
        countAttendance: attendance.length,
      };
    }

    const currentMemberIds = new Set(members.map((m) => m.id));
    const memberIdsToDelete = (cloudMemberRows || [])
      .map((r: { id: string }) => r.id)
      .filter((id: string) => !currentMemberIds.has(id));

    if (memberIdsToDelete.length > 0) {
      await client.from('members').delete().in('id', memberIdsToDelete);
    }

    if (members.length > 0) {
      const memberRows = members.map(mapMemberToRow);
      const { error: memErr } = await client
        .from('members')
        .upsert(memberRows, { onConflict: 'id' });
      if (memErr) {
        return {
          success: Boolean(serverStore),
          message: `เกิดข้อผิดพลาดในการบันทึกสมาชิก: ${memErr.message}`,
          countMembers: 0,
          countAttendance: 0,
        };
      }
    }
    clearAllDeletedMemberTombstones();

    // 2. Sync Attendance Records (Delete removed attendance records on cloud + Upsert current records)
    const { data: cloudAttRows } = await client.from('attendance_records').select('id');
    const currentAttIds = new Set(attendance.map((a) => a.id));
    const attIdsToDelete = (cloudAttRows || [])
      .map((r: { id: string }) => r.id)
      .filter((id: string) => !currentAttIds.has(id));

    if (attIdsToDelete.length > 0) {
      for (let i = 0; i < attIdsToDelete.length; i += 100) {
        const chunk = attIdsToDelete.slice(i, i + 100);
        await client.from('attendance_records').delete().in('id', chunk);
      }
    }

    if (attendance.length > 0) {
      for (let i = 0; i < attendance.length; i += 100) {
        const chunk = attendance.slice(i, i + 100).map(mapAttendanceRecordToRow);
        await client.from('attendance_records').upsert(chunk, { onConflict: 'id' });
      }
    }
    clearAllDeletedAttendanceTombstones();

    // 3. Sync Care Groups
    await syncCareGroupsToCloud(careGroups);

    return {
      success: true,
      message: `บันทึกข้อมูลปัจจุบันขึ้นคลาวด์สำเร็จ! (สมาชิก ${members.length} คน, ประวัติเช็คอิน ${attendance.length} รายการ${
        memberIdsToDelete.length > 0 || attIdsToDelete.length > 0
          ? ` · ลบข้อมูลเก่าที่นำออกแล้ว ${memberIdsToDelete.length + attIdsToDelete.length} รายการ`
          : ''
      })`,
      countMembers: members.length,
      countAttendance: attendance.length,
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      success: Boolean(serverStore),
      message: `ไม่สามารถบันทึกข้อมูลขึ้น Supabase ได้: ${error.message || 'เกิดข้อผิดพลาด'}`,
      countMembers: 0,
      countAttendance: 0,
    };
  }
}
