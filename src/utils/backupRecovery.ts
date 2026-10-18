import { Member, CheckInRecord } from '../types';

export type SnapshotCategory = 'DAILY' | 'PRE_ACTION' | 'MANUAL';

export interface DataSnapshot {
  id: string;
  label: string;
  category: SnapshotCategory;
  dateKey?: string; // YYYY-MM-DD for daily snapshots
  createdAt: string; // Display time e.g. "26 ก.ย. 14:30 น."
  timestamp: number;
  members: Member[];
  attendance: CheckInRecord[];
  careGroups: string[];
}

export interface FullBackupPayload {
  version: string;
  exportedAt: string;
  churchName?: string;
  members: Member[];
  attendance: CheckInRecord[];
  careGroups: string[];
}

const LOCAL_STORAGE_KEY_SNAPSHOTS = 'bright_sky_recovery_snapshots_v1';
const LOCAL_STORAGE_KEY_DAILY_SNAPSHOTS = 'bright_sky_daily_snapshots_v1';
const MAX_ACTION_SNAPSHOTS = 8;
const MAX_DAILY_SNAPSHOTS = 7;

export function getActionSnapshots(): DataSnapshot[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SNAPSHOTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s) => ({
      ...s,
      category: s.category || 'PRE_ACTION',
    }));
  } catch {
    return [];
  }
}

export function getDailySnapshots(): DataSnapshot[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_SNAPSHOTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s) => ({
      ...s,
      category: 'DAILY' as const,
    }));
  } catch {
    return [];
  }
}

/**
 * Returns all recovery snapshots (Daily Auto-Snapshots + Action/Manual Snapshots)
 * sorted newest first.
 */
export function getRecoverySnapshots(): DataSnapshot[] {
  const daily = getDailySnapshots();
  const actions = getActionSnapshots();
  return [...daily, ...actions].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Saves an action or manual snapshot to LocalStorage before destructive edits or syncs.
 */
export function saveRecoverySnapshot(
  label: string,
  members: Member[],
  attendance: CheckInRecord[],
  careGroups: string[],
  category: SnapshotCategory = 'PRE_ACTION'
): DataSnapshot[] {
  try {
    const now = new Date();
    const createdAt = now.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newSnapshot: DataSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      category,
      createdAt,
      timestamp: Date.now(),
      members,
      attendance,
      careGroups,
    };

    const existing = getActionSnapshots();
    const updated = [newSnapshot, ...existing].slice(0, MAX_ACTION_SNAPSHOTS);
    localStorage.setItem(LOCAL_STORAGE_KEY_SNAPSHOTS, JSON.stringify(updated));
    return getRecoverySnapshots();
  } catch (e) {
    console.warn('Could not save recovery snapshot:', e);
    return getRecoverySnapshots();
  }
}

/**
 * Automatically creates or updates today's Daily Auto-Snapshot in LocalStorage.
 * Retains up to 7 distinct days of daily snapshots so the user can always roll back to any recent day.
 */
export function ensureDailySnapshot(
  members: Member[],
  attendance: CheckInRecord[],
  careGroups: string[]
): DataSnapshot[] {
  try {
    if (!members || members.length === 0) {
      return getRecoverySnapshots();
    }

    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    const thaiDateLabel = now.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const createdAt = now.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const existingDaily = getDailySnapshots();
    const todayExisting = existingDaily.find((s) => s.dateKey === todayKey);

    // Create today's snapshot if none exists yet, or update it if current state has more check-ins/members
    const shouldUpdateToday =
      !todayExisting ||
      attendance.length > todayExisting.attendance.length ||
      members.length > todayExisting.members.length;

    if (!shouldUpdateToday) {
      return getRecoverySnapshots();
    }

    const dailySnapshot: DataSnapshot = {
      id: todayExisting?.id || `daily-${todayKey}`,
      label: `Snapshot รายวันอัตโนมัติ (${thaiDateLabel})`,
      category: 'DAILY',
      dateKey: todayKey,
      createdAt,
      timestamp: Date.now(),
      members,
      attendance,
      careGroups,
    };

    const otherDays = existingDaily.filter((s) => s.dateKey !== todayKey);
    const updatedDaily = [dailySnapshot, ...otherDays].slice(0, MAX_DAILY_SNAPSHOTS);
    localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_SNAPSHOTS, JSON.stringify(updatedDaily));
    return getRecoverySnapshots();
  } catch (e) {
    console.warn('Could not save daily auto-snapshot:', e);
    return getRecoverySnapshots();
  }
}

export function deleteSnapshotById(snapshotId: string): DataSnapshot[] {
  try {
    const daily = getDailySnapshots().filter((s) => s.id !== snapshotId);
    const actions = getActionSnapshots().filter((s) => s.id !== snapshotId);
    localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_SNAPSHOTS, JSON.stringify(daily));
    localStorage.setItem(LOCAL_STORAGE_KEY_SNAPSHOTS, JSON.stringify(actions));
    return getRecoverySnapshots();
  } catch {
    return getRecoverySnapshots();
  }
}

export function exportBackupJsonFile(
  members: Member[],
  attendance: CheckInRecord[],
  careGroups: string[],
  churchName = 'คริสตจักรฟ้าใส'
) {
  const payload: FullBackupPayload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    churchName,
    members,
    attendance,
    careGroups,
  };

  const dateStr = new Date().toISOString().split('T')[0];
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup-church-checkin-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
