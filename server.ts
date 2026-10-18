import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORE_FILE_PATH = path.resolve(__dirname, '.cloud-sync-store.json');

const DEFAULT_MOCK_MEMBER_IDS = [
  'F001',
  'F002',
  'F003',
  'F004',
  'F005',
  'F006',
  'F007',
  'F008',
  'F009',
  'F010',
  'F011',
  'F012',
];

interface CloudStoreData {
  revision: number;
  updatedAt: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  members: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attendance: any[];
  careGroups: string[];
  deletedMemberIds: string[];
  deletedAttendanceIds: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auditLogs: any[];
  supabaseConfig?: {
    url: string;
    key: string;
  };
  churchProfile?: {
    name?: string;
    slogan?: string;
    logoUrl?: string | null;
    welcomeMessage?: string;
    footerMessage?: string;
  };
}

const DEFAULT_STORE: CloudStoreData = {
  revision: 0,
  updatedAt: 0,
  members: [],
  attendance: [],
  careGroups: [],
  deletedMemberIds: [],
  deletedAttendanceIds: [],
  auditLogs: [],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAttendanceUniqueKey(rec: any): string {
  if (!rec) return '';
  const memberKey = String(rec.memberId || rec.nickname || '').trim().toLowerCase();
  const dateKey = String(rec.date || '').trim();
  const sessionKey = rec.sessionType === 'CARE_GROUP' ? 'CARE_GROUP' : 'CHURCH';
  const careKey =
    sessionKey === 'CARE_GROUP' ? String(rec.careGroupName || '').trim().toLowerCase() : '';
  return `${memberKey}__${dateKey}__${sessionKey}__${careKey}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deduplicateAttendanceRecords(records: any[]): any[] {
  const seenKeys = new Set<string>();
  const seenIds = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = [];
  for (const r of records) {
    if (!r || !r.id) continue;
    if (seenIds.has(r.id)) continue;
    const uKey = getAttendanceUniqueKey(r);
    if (uKey && seenKeys.has(uKey)) continue;
    seenIds.add(r.id);
    if (uKey) seenKeys.add(uKey);
    result.push(r);
  }
  return result;
}

function readCloudStore(): CloudStoreData {
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_STORE,
        ...parsed,
        members: Array.isArray(parsed.members) ? parsed.members : [],
        attendance: Array.isArray(parsed.attendance)
          ? deduplicateAttendanceRecords(parsed.attendance)
          : [],
        careGroups: Array.isArray(parsed.careGroups) ? parsed.careGroups : [],
        deletedMemberIds: Array.isArray(parsed.deletedMemberIds) ? parsed.deletedMemberIds : [],
        deletedAttendanceIds: Array.isArray(parsed.deletedAttendanceIds)
          ? parsed.deletedAttendanceIds
          : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      };
    }
  } catch (err) {
    console.warn('Error reading cloud store:', err);
  }
  return { ...DEFAULT_STORE };
}

function writeCloudStore(data: CloudStoreData): void {
  try {
    const tempPath = `${STORE_FILE_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, STORE_FILE_PATH);
  } catch (err) {
    try {
      fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (fallbackErr) {
      console.warn('Error writing cloud store:', fallbackErr);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Connected SSE clients for instant real-time cross-device push notifications
  const sseClients = new Set<express.Response>();

  function broadcastCloudUpdate(store: CloudStoreData) {
    const payload = JSON.stringify({
      type: 'update',
      revision: store.revision,
      updatedAt: store.updatedAt,
      membersCount: store.members.length,
      attendanceCount: store.attendance.length,
    });
    for (const client of sseClients) {
      try {
        client.write(`data: ${payload}\n\n`);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  // Heartbeat every 20s to keep SSE connections alive across proxies
  setInterval(() => {
    for (const client of sseClients) {
      try {
        client.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        sseClients.delete(client);
      }
    }
  }, 20000);

  // Support large payloads for base64 member photos
  app.use(express.json({ limit: '25mb' }));

  // GET /api/cloud-events - Real-time Server-Sent Events stream for instant multi-device sync
  app.get('/api/cloud-events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const store = readCloudStore();
    res.write(
      `data: ${JSON.stringify({
        type: 'init',
        revision: store.revision,
        updatedAt: store.updatedAt,
        membersCount: store.members.length,
        attendanceCount: store.attendance.length,
      })}\n\n`
    );

    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // GET /api/cloud-state - Pull current shared state across devices
  app.get('/api/cloud-state', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const store = readCloudStore();
    res.json({
      ok: true,
      store,
    });
  });

  // POST /api/cloud-state - Push incremental or full updates from any device
  app.post('/api/cloud-state', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const store = readCloudStore();
    const body = req.body || {};
    let changed = false;

    // 1. Shared Supabase Credentials (so configuring once connects all devices)
    if (body.supabaseConfig !== undefined) {
      if (body.supabaseConfig && body.supabaseConfig.url && body.supabaseConfig.key) {
        store.supabaseConfig = {
          url: String(body.supabaseConfig.url).trim(),
          key: String(body.supabaseConfig.key).trim(),
        };
      } else if (body.supabaseConfig === null) {
        delete store.supabaseConfig;
      }
      changed = true;
    }

    // 2. Shared Church Profile
    if (body.churchProfile && typeof body.churchProfile === 'object') {
      store.churchProfile = {
        ...(store.churchProfile || {}),
        ...body.churchProfile,
      };
      changed = true;
    }

    // 3. Full Replace (Push Current State to Cloud, Restore Snapshot, Import Backup, Reset Demo, or Initial Seed)
    if (body.fullReplace && typeof body.fullReplace === 'object') {
      const isInitialSeedOnly = Boolean(body.fullReplace.onlyIfEmpty);
      if (!isInitialSeedOnly || store.revision === 0) {
        const prevMemberIds = store.members.map((m) => m?.id).filter(Boolean);
        const prevAttIds = store.attendance.map((r) => r?.id).filter(Boolean);

        if (Array.isArray(body.fullReplace.members)) {
          store.members = body.fullReplace.members;
        }
        if (Array.isArray(body.fullReplace.attendance)) {
          store.attendance = deduplicateAttendanceRecords(body.fullReplace.attendance);
        }
        if (Array.isArray(body.fullReplace.careGroups)) {
          store.careGroups = body.fullReplace.careGroups;
        }

        if (body.fullReplace.resetAllTombstones) {
          store.deletedMemberIds = [];
          store.deletedAttendanceIds = [];
        } else {
          // Record any removed members as tombstones so other devices & Supabase never resurrect them
          const activeMemberIds = new Set<string>(
            store.members.map((m) => m?.id).filter(Boolean)
          );
          const explicitDelMembers = Array.isArray(body.fullReplace.deletedMemberIds)
            ? body.fullReplace.deletedMemberIds
            : [];
          const nextDelMembers = new Set<string>([
            ...store.deletedMemberIds,
            ...DEFAULT_MOCK_MEMBER_IDS.filter((id) => !activeMemberIds.has(id)),
            ...prevMemberIds.filter((id) => !activeMemberIds.has(id)),
            ...explicitDelMembers,
          ]);
          activeMemberIds.forEach((id) => nextDelMembers.delete(id));
          store.deletedMemberIds = Array.from(nextDelMembers);

          // Record any removed attendance records as tombstones
          const activeAttIds = new Set<string>(
            store.attendance.map((r) => r?.id).filter(Boolean)
          );
          const explicitDelAtt = Array.isArray(body.fullReplace.deletedAttendanceIds)
            ? body.fullReplace.deletedAttendanceIds
            : [];
          const nextDelAtt = new Set<string>([
            ...store.deletedAttendanceIds,
            ...prevAttIds.filter((id) => !activeAttIds.has(id)),
            ...explicitDelAtt,
          ]);
          activeAttIds.forEach((id) => nextDelAtt.delete(id));
          store.deletedAttendanceIds = Array.from(nextDelAtt).slice(-2000);
        }

        changed = true;
      }
    }

    // 4. Delete Member IDs (Reducing / removing single or multiple members across all devices)
    if (Array.isArray(body.deleteMemberIds) && body.deleteMemberIds.length > 0) {
      const delSet = new Set<string>(body.deleteMemberIds.filter(Boolean));
      const tombstoneSet = new Set<string>(store.deletedMemberIds);
      delSet.forEach((id) => tombstoneSet.add(id));
      store.deletedMemberIds = Array.from(tombstoneSet);
      store.members = store.members.filter((m) => m && !delSet.has(m.id));
      changed = true;
    }

    // 5. Upsert Members (Adding or editing members across all devices)
    if (Array.isArray(body.upsertMembers) && body.upsertMembers.length > 0) {
      const upsertedIds = new Set<string>();
      for (const incoming of body.upsertMembers) {
        if (!incoming || !incoming.id) continue;
        upsertedIds.add(incoming.id);
        const existingIdx = store.members.findIndex((m) => m && m.id === incoming.id);
        if (existingIdx >= 0) {
          store.members[existingIdx] = {
            ...store.members[existingIdx],
            ...incoming,
            updatedAt: Date.now(),
          };
        } else {
          store.members.unshift({
            ...incoming,
            updatedAt: Date.now(),
          });
        }
      }
      // Remove from deleted tombstones if re-added/upserted
      if (upsertedIds.size > 0) {
        store.deletedMemberIds = store.deletedMemberIds.filter((id) => !upsertedIds.has(id));
      }
      changed = true;
    }

    // 6. Delete Attendance Records
    if (body.clearAllAttendance) {
      const allIds = store.attendance.map((r) => r?.id).filter(Boolean);
      const explicitIds = Array.isArray(body.deleteAttendanceIds) ? body.deleteAttendanceIds : [];
      const tombstoneSet = new Set<string>([
        ...store.deletedAttendanceIds,
        ...allIds,
        ...explicitIds,
      ]);
      store.deletedAttendanceIds = Array.from(tombstoneSet).slice(-2000);
      store.attendance = [];
      changed = true;
    } else if (typeof body.clearDateAttendance === 'string' && body.clearDateAttendance) {
      const targetDate = body.clearDateAttendance;
      const removedIds = store.attendance
        .filter((r) => r && r.date === targetDate)
        .map((r) => r.id);
      const explicitIds = Array.isArray(body.deleteAttendanceIds) ? body.deleteAttendanceIds : [];
      const tombstoneSet = new Set<string>([
        ...store.deletedAttendanceIds,
        ...removedIds,
        ...explicitIds,
      ]);
      store.deletedAttendanceIds = Array.from(tombstoneSet).slice(-2000);
      store.attendance = store.attendance.filter((r) => r && r.date !== targetDate);
      changed = true;
    } else if (Array.isArray(body.deleteAttendanceIds) && body.deleteAttendanceIds.length > 0) {
      const delSet = new Set<string>(body.deleteAttendanceIds);
      const tombstoneSet = new Set<string>(store.deletedAttendanceIds);
      delSet.forEach((id) => tombstoneSet.add(id));
      store.deletedAttendanceIds = Array.from(tombstoneSet).slice(-2000);
      store.attendance = store.attendance.filter((r) => r && !delSet.has(r.id));
      changed = true;
    }

    // 7. Upsert Attendance Records (Check-ins - enforce 1 record per member per day/care group)
    if (Array.isArray(body.upsertAttendance) && body.upsertAttendance.length > 0) {
      const upsertedIds = new Set<string>();
      for (const rec of body.upsertAttendance) {
        if (!rec || !rec.id) continue;
        const incomingKey = getAttendanceUniqueKey(rec);
        const existingIdx = store.attendance.findIndex(
          (r) =>
            r &&
            (r.id === rec.id ||
              (Boolean(incomingKey) && getAttendanceUniqueKey(r) === incomingKey))
        );
        if (existingIdx >= 0) {
          const keptId = store.attendance[existingIdx].id || rec.id;
          upsertedIds.add(keptId);
          store.attendance[existingIdx] = {
            ...rec,
            ...store.attendance[existingIdx],
            id: keptId,
          };
        } else {
          upsertedIds.add(rec.id);
          store.attendance.unshift(rec);
        }
      }
      store.attendance = deduplicateAttendanceRecords(store.attendance);
      if (upsertedIds.size > 0) {
        store.deletedAttendanceIds = store.deletedAttendanceIds.filter(
          (id) => !upsertedIds.has(id)
        );
      }
      changed = true;
    }

    // 8. Care Groups Sync
    if (Array.isArray(body.careGroups)) {
      store.careGroups = Array.from(
        new Set(body.careGroups.map((g: unknown) => String(g || '').trim()).filter(Boolean))
      );
      changed = true;
    }

    // 9. Audit Log Entry
    if (body.auditLog && body.auditLog.id) {
      const exists = store.auditLogs.some((l) => l && l.id === body.auditLog.id);
      if (!exists) {
        store.auditLogs = [body.auditLog, ...store.auditLogs].slice(0, 250);
        changed = true;
      }
    }

    if (changed) {
      store.revision = (store.revision || 0) + 1;
      store.updatedAt = Date.now();
      writeCloudStore(store);
      broadcastCloudUpdate(store);
    }

    res.json({
      ok: true,
      store,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
