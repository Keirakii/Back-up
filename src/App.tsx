import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Member, CheckInRecord, SessionType } from './types';
import { INITIAL_MEMBERS } from './data/mockMembers';
import { INITIAL_ATTENDANCE_HISTORY } from './data/mockAttendanceHistory';
import { getRandomVerse } from './data/bibleVerses';
import {
  playJoyfulChime,
  playNfcSuccessChime,
  playWarningAlertSound,
  triggerHapticFeedback,
  triggerNfcHapticFeedback,
  triggerNfcScanInProgressHaptic,
} from './utils/audio';
import { NfcZone } from './components/NfcZone';
import { SuccessModal } from './components/SuccessModal';
import { AttendanceDrawer } from './components/AttendanceDrawer';
import { MemberModal } from './components/MemberModal';
import { MemberRosterModal } from './components/MemberRosterModal';
import { WeeklyReportModal } from './components/WeeklyReportModal';
import { BirthdayNotificationBanner } from './components/BirthdayNotificationBanner';
import { BirthdayBlessingModal } from './components/BirthdayBlessingModal';
import { CareGroupManagerModal } from './components/CareGroupManagerModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { QuickNewcomerModal } from './components/QuickNewcomerModal';
import { NewcomerSummaryModal } from './components/NewcomerSummaryModal';
import { NfcToolModal } from './components/NfcToolModal';
import { MenuHubModal } from './components/MenuHubModal';
import { ChurchLogo } from './components/ChurchLogo';
import { ChurchProfileModal } from './components/ChurchProfileModal';
import { DatePickerField } from './components/DatePickerField';
import {
  RecoveryAndSecurityModal,
  AdminPinPromptModal,
} from './components/RecoveryAndSecurityModal';
import {
  getRecoverySnapshots,
  saveRecoverySnapshot,
  ensureDailySnapshot,
  deleteSnapshotById,
  exportBackupJsonFile,
  DataSnapshot,
  FullBackupPayload,
} from './utils/backupRecovery';
import {
  AuditLogEntry,
  AuditCategory,
  AuditSeverity,
  getAuditLogs,
  createAuditLogEntry,
  mergeCloudAuditLogs,
  isPrivacyShieldEnabled,
  setPrivacyShieldEnabled,
} from './utils/auditAndPrivacy';
import { isBirthdayToday, getTodayBirthdayMembers } from './utils/birthday';
import { findMemberByNfc, normalizeNfcId } from './utils/nfcHelpers';
import {
  getSupabaseCredentials,
  fetchMembersFromCloud,
  upsertMemberToCloud,
  deleteMemberFromCloud,
  deleteMultipleMembersFromCloud,
  fetchAttendanceFromCloud,
  insertAttendanceToCloud,
  deleteAttendanceFromCloud,
  deleteAttendanceByDateFromCloud,
  deleteAllAttendanceFromCloud,
  fetchCareGroupsFromCloud,
  saveCareGroupToCloud,
  syncCareGroupsToCloud,
  migrateCurrentDataToSupabase,
  clearAllDeletedMemberTombstones,
  clearAllDeletedAttendanceTombstones,
  pushAuditLogToCloud,
  fetchAuditLogsFromCloud,
  pullSharedCloudSnapshot,
  seedInitialDataToCloudIfEmpty,
  subscribeToSupabaseRealtime,
  subscribeToServerCloudEvents,
  pushChurchProfileToCloud,
} from './lib/supabase';
import { TemperatureNumpad } from './components/TemperatureNumpad';
import {
  Users,
  Volume2,
  VolumeX,
  UserPlus,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  AlertTriangle,
  Edit3,
  UserCheck,
  BarChart2,
  Church,
  Home,
  Calendar,
  Plus,
  Cloud,
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  Flame,
  Info,
  X,
  Clock,
  History,
  Smartphone,
  Radio,
  Menu,
  Trash2,
  Search,
  Zap,
} from 'lucide-react';
import {
  getMedicalTempStatus,
  MEDICAL_TEMP_PRESETS,
  CLINICAL_TEMP_GUIDELINES,
} from './utils/temperature';

const LOCAL_STORAGE_KEY_ATTENDANCE = 'bright_sky_church_attendance_records_v2';
const LOCAL_STORAGE_KEY_MEMBERS = 'bright_sky_church_members';
const LOCAL_STORAGE_KEY_CARE_GROUPS = 'bright_sky_church_care_groups_v2';
const LOCAL_STORAGE_KEY_CURRENT_CARE_GROUP = 'bright_sky_church_current_care_group_v2';
const LOCAL_STORAGE_KEY_CHURCH_NAME = 'bright_sky_church_name_custom';
const LOCAL_STORAGE_KEY_CHURCH_SLOGAN = 'bright_sky_church_slogan_custom';
const LOCAL_STORAGE_KEY_CHURCH_LOGO = 'bright_sky_church_logo_custom';
const LOCAL_STORAGE_KEY_CHURCH_WELCOME = 'bright_sky_church_welcome_custom';
const LOCAL_STORAGE_KEY_CHURCH_FOOTER = 'bright_sky_church_footer_custom';

export const formatThaiDate = (dStr: string) => {
  if (!dStr) return '';
  try {
    const [y, m, d] = dStr.split('-');
    const monthNames = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];
    const mIndex = parseInt(m, 10) - 1;
    return `${parseInt(d, 10)} ${monthNames[mIndex] || ''} ${parseInt(y, 10) + 543}`;
  } catch {
    return dStr;
  }
};

export const getTodayThaiDateMinimal = () => {
  const now = new Date();
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const monthNames = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  return `วัน${days[now.getDay()]}ที่ ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear() + 543}`;
};

export const getAttendanceSessionKey = (rec: {
  memberId?: string;
  nickname?: string;
  date?: string;
  sessionType?: SessionType;
  careGroupName?: string;
}): string => {
  const memberKey = String(rec.memberId || rec.nickname || '').trim().toLowerCase();
  const dateKey = String(rec.date || '').trim();
  const sessionKey = rec.sessionType === 'CARE_GROUP' ? 'CARE_GROUP' : 'CHURCH';
  const careKey =
    sessionKey === 'CARE_GROUP' ? String(rec.careGroupName || '').trim().toLowerCase() : '';
  return `${memberKey}__${dateKey}__${sessionKey}__${careKey}`;
};

export const deduplicateAttendanceRecords = (records: CheckInRecord[]): CheckInRecord[] => {
  const seenKeys = new Set<string>();
  const seenIds = new Set<string>();
  const result: CheckInRecord[] = [];
  for (const r of records) {
    if (!r || !r.id) continue;
    if (seenIds.has(r.id)) continue;
    const uKey = getAttendanceSessionKey(r);
    if (uKey && seenKeys.has(uKey)) continue;
    seenIds.add(r.id);
    if (uKey) seenKeys.add(uKey);
    result.push(r);
  }
  return result;
};

export default function App() {
  const [members, setMembers] = useState<Member[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_MEMBERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if at least one member has today's birthday.
          // If not, ensure F007 has today's month and day so the church celebration highlight works seamlessly
          const today = new Date();
          const todayMM = String(today.getMonth() + 1).padStart(2, '0');
          const todayDD = String(today.getDate()).padStart(2, '0');
          const hasTodayBday = parsed.some((m: Member) => isBirthdayToday(m.birthday));
          if (!hasTodayBday) {
            const f007 = parsed.find((m: Member) => m.id === 'F007');
            if (f007) {
              f007.birthday = `1998-${todayMM}-${todayDD}`;
            }
          }
          return parsed;
        }
      }
      return INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  });

  const [attendance, setAttendance] = useState<CheckInRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ATTENDANCE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 5) {
          return deduplicateAttendanceRecords(parsed);
        }
      }
    } catch {
      // fallback
    }
    return deduplicateAttendanceRecords(INITIAL_ATTENDANCE_HISTORY);
  });

  const [searchValue, setSearchValue] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [temperature, setTemperature] = useState<string>('36.5');
  const temperatureRef = useRef<string>('36.5');
  useEffect(() => {
    temperatureRef.current = temperature;
  }, [temperature]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hapticTriggerKey, setHapticTriggerKey] = useState<number>(0);
  const prevTempWarningRef = useRef<boolean>(false);

  // Session & Care Group selection
  const [currentSessionType, setCurrentSessionType] = useState<SessionType>('CHURCH');

  // Church Name, Slogan & Custom Logo state (persisted in localStorage)
  const [churchName, setChurchName] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEY_CHURCH_NAME) || 'คริสตจักรฟ้าใส';
  });
  const [churchSlogan, setChurchSlogan] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEY_CHURCH_SLOGAN) || 'ระบบเช็คอินอัจฉริยะ';
  });
  const [churchLogoUrl, setChurchLogoUrl] = useState<string | null>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEY_CHURCH_LOGO) || null;
  });
  const [welcomeMessage, setWelcomeMessage] = useState<string>(() => {
    return (
      localStorage.getItem(LOCAL_STORAGE_KEY_CHURCH_WELCOME) ||
      'ยินดีต้อนรับสู่อ้อมกอดแห่งความรักค่ะ 💙'
    );
  });
  const [footerMessage, setFooterMessage] = useState<string>(() => {
    return (
      localStorage.getItem(LOCAL_STORAGE_KEY_CHURCH_FOOTER) ||
      'ขอความรักและสันติสุขขององค์พระเยซูคริสต์อยู่กับท่าน 🕊️'
    );
  });
  const [isChurchProfileModalOpen, setIsChurchProfileModalOpen] = useState<boolean>(false);

  const handleUpdateChurchName = (name: string) => {
    setChurchName(name);
    localStorage.setItem(LOCAL_STORAGE_KEY_CHURCH_NAME, name);
    pushChurchProfileToCloud({ name }).catch(() => {});
    showToast('อัปเดตข้อมูลคริสตจักรเรียบร้อยแล้วค่ะ ✨');
  };
  const handleUpdateChurchSlogan = (slogan: string) => {
    setChurchSlogan(slogan);
    localStorage.setItem(LOCAL_STORAGE_KEY_CHURCH_SLOGAN, slogan);
    pushChurchProfileToCloud({ slogan }).catch(() => {});
  };
  const handleUpdateWelcomeMessage = (msg: string) => {
    setWelcomeMessage(msg);
    localStorage.setItem(LOCAL_STORAGE_KEY_CHURCH_WELCOME, msg);
    pushChurchProfileToCloud({ welcomeMessage: msg }).catch(() => {});
  };
  const handleUpdateFooterMessage = (msg: string) => {
    setFooterMessage(msg);
    localStorage.setItem(LOCAL_STORAGE_KEY_CHURCH_FOOTER, msg);
    pushChurchProfileToCloud({ footerMessage: msg }).catch(() => {});
  };
  const handleUpdateChurchLogo = (url: string | null) => {
    setChurchLogoUrl(url);
    if (url) {
      localStorage.setItem(LOCAL_STORAGE_KEY_CHURCH_LOGO, url);
      showToast('อัปโหลดโลโก้คริสตจักรเรียบร้อยแล้วค่ะ 🖼️');
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY_CHURCH_LOGO);
      showToast('คืนค่าโลโก้เริ่มต้นเรียบร้อยแล้วค่ะ');
    }
    pushChurchProfileToCloud({ logoUrl: url }).catch(() => {});
  };

  // Care Groups state - empty by default as requested ("เอาข้อมูลออกก่อน แล้วสามารถพิมพ์เข้าไปได้ มีการบันทึกไว้")
  const [careGroups, setCareGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CARE_GROUPS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [currentCareGroup, setCurrentCareGroup] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CURRENT_CARE_GROUP);
      if (saved && typeof saved === 'string') return saved;
    } catch {
      // ignore
    }
    return '';
  });

  // Inline care group controls
  const [isCareGroupManagerOpen, setIsCareGroupManagerOpen] = useState(false);
  const [inlineCareGroupInput, setInlineCareGroupInput] = useState('');
  const [isAddingCareGroupInline, setIsAddingCareGroupInline] = useState(false);
  const [isRenamingCurrentInline, setIsRenamingCurrentInline] = useState(false);
  const [renameInputValue, setRenameInputValue] = useState('');

  // Modals & Drawers
  const [currentSuccessRecord, setCurrentSuccessRecord] = useState<CheckInRecord | null>(null);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isWeeklyReportOpen, setIsWeeklyReportOpen] = useState(false);
  const [isBirthdayBlessingOpen, setIsBirthdayBlessingOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [openedFromRoster, setOpenedFromRoster] = useState(false);
  const [memberModalOrigin, setMemberModalOrigin] = useState<'ROSTER' | 'NEWCOMER' | 'MENU' | 'HOME'>('HOME');
  const [quickNewcomerOrigin, setQuickNewcomerOrigin] = useState<'NEWCOMER' | 'HOME'>('HOME');
  const [nfcToolOrigin, setNfcToolOrigin] = useState<'ROSTER' | 'MEMBER' | 'MENU' | 'HOME'>('MENU');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showClinicalGuide, setShowClinicalGuide] = useState(false);

  // Quick Check-in (No Popup Window) States & Numpad Expansion
  const [isQuickModeActive, setIsQuickModeActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bright_sky_quick_checkin_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [isNumpadExpanded, setIsNumpadExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bright_sky_numpad_expanded');
      return saved !== 'false'; // expanded by default for easy touchscreen use
    } catch {
      return true;
    }
  });

  const [quickCheckInBanner, setQuickCheckInBanner] = useState<{
    id: string;
    member: Member;
    record: CheckInRecord;
    temp: number;
    time: string;
  } | null>(null);
  const quickCheckInTimerRef = useRef<NodeJS.Timeout | number | null>(null);

  const handleToggleQuickMode = () => {
    setIsQuickModeActive((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bright_sky_quick_checkin_mode', String(next));
      } catch {}
      showToast(
        next
          ? '⚡ เปิดโหมดเช็คอินด่วนตลอดเวลา (ข้ามหน้าต่างป็อปอัปอัตโนมัติ) 🚀'
          : 'ปิดโหมดเช็คอินด่วน (จะแสดงหน้าต่างการ์ดอวยพร/พระคัมภีร์ตามปกติ)'
      );
      return next;
    });
  };

  const handleToggleNumpadExpanded = () => {
    setIsNumpadExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bright_sky_numpad_expanded', String(next));
      } catch {}
      return next;
    });
  };

  // Newcomer Management States
  const [isQuickNewcomerOpen, setIsQuickNewcomerOpen] = useState(false);
  const [isNewcomerModalOpen, setIsNewcomerModalOpen] = useState(false);
  const [newcomerInitialName, setNewcomerInitialName] = useState('');

  // Retroactive Check-in States (กรณีสมาชิกมาถึงแต่ลืมเช็คอิน)
  const [isRetroactiveMode, setIsRetroactiveMode] = useState(false);
  const [retroactiveDate, setRetroactiveDate] = useState<string>(() => {
    const now = new Date();
    const d = new Date(now);
    d.setDate(now.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [retroactiveTime, setRetroactiveTime] = useState<string>('10:00');
  const [retroactiveReason, setRetroactiveReason] = useState<string>('ลืมเช็คอิน');

  // Supabase Cloud State
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isSyncingWithCloud, setIsSyncingWithCloud] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');
  const [confirmUndoLast, setConfirmUndoLast] = useState(false);
  const [recoverySnapshots, setRecoverySnapshots] = useState<DataSnapshot[]>(() =>
    getRecoverySnapshots()
  );

  // Security, Activity Audit Logs & Sensitive Data Privacy States
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => getAuditLogs());
  const [privacyShieldEnabled, setPrivacyShieldState] = useState<boolean>(() =>
    isPrivacyShieldEnabled()
  );
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [isRecoverySecurityModalOpen, setIsRecoverySecurityModalOpen] = useState<boolean>(false);
  const [recoverySecurityTab, setRecoverySecurityTab] = useState<'restore' | 'audit' | 'privacy'>(
    'restore'
  );
  const [pinPromptConfig, setPinPromptConfig] = useState<{
    isOpen: boolean;
    reasonTitle: string;
  }>({
    isOpen: false,
    reasonTitle: 'ปลดล็อกเพื่อดูข้อมูลอ่อนไหว หรือลบข้อมูลสำคัญ',
  });

  const isSensitiveDataVisible = !privacyShieldEnabled || isAdminUnlocked;

  const recordAppAuditLog = (params: {
    category: AuditCategory;
    severity?: AuditSeverity;
    actionTitle: string;
    details?: string;
    operatorOverride?: string;
  }) => {
    const { entry, allLogs } = createAuditLogEntry(params);
    setAuditLogs(allLogs);
    pushAuditLogToCloud(entry).catch(() => {});
  };

  const handleRefreshCloudAuditLogs = async () => {
    const cloudLogs = await fetchAuditLogsFromCloud();
    if (cloudLogs && cloudLogs.length > 0) {
      const merged = mergeCloudAuditLogs(cloudLogs);
      setAuditLogs(merged);
    }
  };

  const createAutoSnapshot = (label: string, category: 'PRE_ACTION' | 'MANUAL' = 'PRE_ACTION') => {
    const updated = saveRecoverySnapshot(label, members, attendance, careGroups, category);
    setRecoverySnapshots(updated);
  };

  // Automatic Daily Snapshot into LocalStorage whenever app opens or data updates
  useEffect(() => {
    const updated = ensureDailySnapshot(members, attendance, careGroups);
    setRecoverySnapshots(updated);
  }, [members, attendance, careGroups]);

  // Record initial session access log once on mount
  useEffect(() => {
    recordAppAuditLog({
      category: 'ACCESS',
      severity: 'INFO',
      actionTitle: 'เข้าใช้งานระบบเช็คอินคริสตจักร',
      details: `เปิดหน้าเว็บแอปพลิเคชัน (สมาชิกในเครื่อง ${members.length} คน)`,
    });
  }, []);

  // NFC Suite Tool States
  const [isNfcToolOpen, setIsNfcToolOpen] = useState(false);
  const [isMenuHubOpen, setIsMenuHubOpen] = useState(false);
  const [nfcToolInitialMemberId, setNfcToolInitialMemberId] = useState<string | undefined>(undefined);
  const [nfcToolInitialCardIdentifier, setNfcToolInitialCardIdentifier] = useState<string | undefined>(undefined);
  const [isNfcListening, setIsNfcListening] = useState<boolean>(true);
  const [isNfcScanMatched, setIsNfcScanMatched] = useState<boolean>(false);
  const [isNfcCardNear, setIsNfcCardNear] = useState<boolean>(false);
  const [isNfcScanInProgress, setIsNfcScanInProgress] = useState<boolean>(false);
  const [lastSuccessfulCheckInName, setLastSuccessfulCheckInName] = useState<string | null>(null);
  const lastSuccessfulCheckInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (lastSuccessfulCheckInTimerRef.current) {
        clearTimeout(lastSuccessfulCheckInTimerRef.current);
      }
    };
  }, []);

  const handleNfcScanInProgress = () => {
    setIsNfcScanInProgress(true);
    triggerNfcScanInProgressHaptic();
    setTimeout(() => {
      setIsNfcScanInProgress(false);
    }, 750);
  };

  const handleOpenNfcTool = (
    memberId?: string,
    cardIdentifier?: string,
    origin: 'ROSTER' | 'MEMBER' | 'MENU' | 'HOME' = 'MENU'
  ) => {
    setNfcToolInitialMemberId(memberId);
    setNfcToolInitialCardIdentifier(cardIdentifier);
    setNfcToolOrigin(origin);
    setIsNfcToolOpen(true);
  };

  const handleUpdateMemberNfc = async (memberId: string, nfcCardId: string) => {
    const updated = members.map((m) =>
      m.id === memberId ? { ...m, nfcCardId } : m
    );
    setMembers(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY_MEMBERS, JSON.stringify(updated));

    const updatedMember = updated.find((m) => m.id === memberId);
    if (updatedMember) {
      pendingMemberUpsertsRef.current.set(updatedMember.id, updatedMember);
      const ok = await upsertMemberToCloud(updatedMember);
      if (ok) {
        pendingMemberUpsertsRef.current.delete(updatedMember.id);
        setIsSupabaseConnected(true);
      }
    }
    showToast(`✓ บันทึกรหัส NFC สำหรับคุณ "${updatedMember?.nickname || memberId}" เรียบร้อยแล้ว! 📲`);
  };

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Refs for latest state & in-flight upserts so background auto-sync never uses stale closures
  const membersRef = useRef<Member[]>(members);
  const attendanceRef = useRef<CheckInRecord[]>(attendance);
  const careGroupsRef = useRef<string[]>(careGroups);
  const pendingMemberUpsertsRef = useRef<Map<string, Member>>(new Map());
  const pendingAttendanceUpsertsRef = useRef<Map<string, CheckInRecord>>(new Map());
  const isSyncingRef = useRef<boolean>(false);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);
  useEffect(() => {
    attendanceRef.current = attendance;
  }, [attendance]);
  useEffect(() => {
    careGroupsRef.current = careGroups;
  }, [careGroups]);

  // Automatic Two-Way Sync with Cloud (Push pending changes + Pull latest updates & deletions across devices)
  const syncWithSupabase = async (showNotification = false) => {
    if (isSyncingRef.current && !showNotification) return;
    isSyncingRef.current = true;
    if (showNotification) {
      setIsSyncingWithCloud(true);
    }

    try {
      // 1. Flush any pending offline/in-flight upserts to Cloud first
      if (pendingMemberUpsertsRef.current.size > 0) {
        for (const [id, m] of Array.from(pendingMemberUpsertsRef.current.entries())) {
          const ok = await upsertMemberToCloud(m);
          if (ok) pendingMemberUpsertsRef.current.delete(id);
        }
      }
      if (pendingAttendanceUpsertsRef.current.size > 0) {
        for (const [id, rec] of Array.from(pendingAttendanceUpsertsRef.current.entries())) {
          const ok = await insertAttendanceToCloud(rec);
          if (ok) pendingAttendanceUpsertsRef.current.delete(id);
        }
      }

      // 2. Pull canonical shared cloud snapshot
      const snap = await pullSharedCloudSnapshot();
      if (!snap) {
        setIsSupabaseConnected(false);
        return;
      }

      setIsSupabaseConnected(true);
      setLastSyncedTime(
        new Date().toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );

      // 3. If Cloud has never been seeded yet (revision === 0 and no cloud members), seed it with local data!
      if (
        snap.revision === 0 &&
        (!snap.members || snap.members.length === 0) &&
        membersRef.current.length > 0
      ) {
        await seedInitialDataToCloudIfEmpty(
          membersRef.current,
          attendanceRef.current,
          careGroupsRef.current
        );
        return;
      }

      const delMemberSet = new Set(snap.deletedMemberIds || []);
      const delAttSet = new Set(snap.deletedAttendanceIds || []);

      // 4. Reconcile Members (Cloud truth + any still-pending local upserts - deleted tombstones)
      if (snap.members !== null) {
        const nextMemberMap = new Map<string, Member>();
        for (const cm of snap.members) {
          if (cm && cm.id && !delMemberSet.has(cm.id)) {
            nextMemberMap.set(cm.id, cm);
          }
        }
        // Preserve any in-flight local member creations/edits that haven't finished uploading yet
        for (const [id, pm] of pendingMemberUpsertsRef.current.entries()) {
          if (!delMemberSet.has(id)) {
            nextMemberMap.set(id, pm);
          }
        }
        const nextMembers = Array.from(nextMemberMap.values());
        if (JSON.stringify(nextMembers) !== JSON.stringify(membersRef.current)) {
          setMembers(nextMembers);
          // Keep selectedMember in sync if it was edited or deleted on another device
          setSelectedMember((prevSel) => {
            if (!prevSel) return null;
            if (delMemberSet.has(prevSel.id)) return null;
            return nextMemberMap.get(prevSel.id) || null;
          });
        }
      }

      // 5. Reconcile Attendance Records (Cloud truth + pending local check-ins - deleted tombstones - deduplicated per day/care group)
      if (snap.attendance !== null) {
        const nextAttMap = new Map<string, CheckInRecord>();
        for (const [id, pr] of pendingAttendanceUpsertsRef.current.entries()) {
          if (!delAttSet.has(id)) {
            nextAttMap.set(id, pr);
          }
        }
        for (const cr of snap.attendance) {
          if (cr && cr.id && !delAttSet.has(cr.id) && !nextAttMap.has(cr.id)) {
            nextAttMap.set(cr.id, cr);
          }
        }
        const nextAttendance = deduplicateAttendanceRecords(Array.from(nextAttMap.values()));
        if (JSON.stringify(nextAttendance) !== JSON.stringify(attendanceRef.current)) {
          setAttendance(nextAttendance);
        }
      }

      // 6. Reconcile Care Groups
      if (snap.careGroups !== null && snap.careGroups.length > 0) {
        if (JSON.stringify(snap.careGroups) !== JSON.stringify(careGroupsRef.current)) {
          setCareGroups(snap.careGroups);
        }
      }

      // 7. Reconcile Church Profile if updated on another device
      if (snap.churchProfile) {
        if (snap.churchProfile.name && snap.churchProfile.name !== churchName) {
          setChurchName(snap.churchProfile.name);
          localStorage.setItem(LOCAL_STORAGE_KEY_CHURCH_NAME, snap.churchProfile.name);
        }
        if (snap.churchProfile.slogan && snap.churchProfile.slogan !== churchSlogan) {
          setChurchSlogan(snap.churchProfile.slogan);
          localStorage.setItem(LOCAL_STORAGE_KEY_CHURCH_SLOGAN, snap.churchProfile.slogan);
        }
        if (
          snap.churchProfile.welcomeMessage &&
          snap.churchProfile.welcomeMessage !== welcomeMessage
        ) {
          setWelcomeMessage(snap.churchProfile.welcomeMessage);
          localStorage.setItem(
            LOCAL_STORAGE_KEY_CHURCH_WELCOME,
            snap.churchProfile.welcomeMessage
          );
        }
        if (
          snap.churchProfile.footerMessage &&
          snap.churchProfile.footerMessage !== footerMessage
        ) {
          setFooterMessage(snap.churchProfile.footerMessage);
          localStorage.setItem(LOCAL_STORAGE_KEY_CHURCH_FOOTER, snap.churchProfile.footerMessage);
        }
      }

      // 8. Reconcile Cross-Device Audit Logs
      if (snap.auditLogs && snap.auditLogs.length > 0) {
        setAuditLogs(mergeCloudAuditLogs(snap.auditLogs));
      }

      if (showNotification) {
        const countMem = snap.members ? snap.members.length : membersRef.current.length;
        const countAtt = snap.attendance ? snap.attendance.length : attendanceRef.current.length;
        showToast(
          `☁️ ซิงค์ข้อมูลล่าสุดสำเร็จ! (สมาชิก ${countMem} คน · เช็คอิน ${countAtt} รายการ)`
        );
      }
    } catch (e) {
      console.warn('Cloud auto-sync warning:', e);
    } finally {
      isSyncingRef.current = false;
      if (showNotification) {
        setIsSyncingWithCloud(false);
      }
    }
  };

  // Push Current Local State -> Cloud (Full Mirror: Upsert current + Delete removed across all devices)
  const handlePushCurrentStateToCloud = async () => {
    setIsSyncingWithCloud(true);
    try {
      createAutoSnapshot('ก่อนบันทึกข้อมูลปัจจุบันขึ้นคลาวด์');
      const res = await migrateCurrentDataToSupabase(members, attendance, careGroups);
      if (res.success) {
        setIsSupabaseConnected(true);
        setLastSyncedTime(
          new Date().toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        recordAppAuditLog({
          category: 'SYNC_RESTORE',
          severity: 'INFO',
          actionTitle: 'บันทึกข้อมูลปัจจุบันขึ้นคลาวด์ (Save / Push)',
          details: res.message,
        });
        showToast(`☁️ ${res.message}`);
      } else {
        showToast(`⚠️ ${res.message}`);
      }
    } catch (e) {
      console.warn('Error pushing state to Cloud:', e);
      showToast('⚠️ ไม่สามารถอัปเดตข้อมูลขึ้นคลาวด์ได้ กรุณาตรวจสอบการเชื่อมต่อ');
    } finally {
      setIsSyncingWithCloud(false);
    }
  };

  // Automatic Background Sync + Realtime Subscriptions + Focus/Visibility/Online Auto-Pull
  useEffect(() => {
    syncWithSupabase(false);

    // Poll every 5 seconds so multiple devices at church stay in sync automatically
    const intervalId = window.setInterval(() => {
      syncWithSupabase(false);
    }, 5000);

    // Subscribe to Supabase Realtime changes if Supabase is configured
    const unsubscribeRealtime = subscribeToSupabaseRealtime(() => {
      syncWithSupabase(false);
    });

    // Subscribe to built-in Server-Sent Events (/api/cloud-events) for instant push/pull across devices
    const unsubscribeServerSSE = subscribeToServerCloudEvents(() => {
      syncWithSupabase(false);
    });

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncWithSupabase(false);
      }
    };
    const handleOnline = () => {
      syncWithSupabase(false);
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearInterval(intervalId);
      unsubscribeRealtime();
      unsubscribeServerSSE();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ATTENDANCE, JSON.stringify(attendance));
    } catch {
      // ignore
    }
  }, [attendance]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_MEMBERS, JSON.stringify(members));
    } catch {
      // ignore
    }
  }, [members]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_CARE_GROUPS, JSON.stringify(careGroups));
    } catch {
      // ignore
    }
  }, [careGroups]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT_CARE_GROUP, currentCareGroup);
    } catch {
      // ignore
    }
  }, [currentCareGroup]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleAddNewCareGroup = (newGroup: string) => {
    const trimmed = newGroup.trim();
    if (!trimmed) {
      showToast('⚠️ กรุณากรอกชื่อกลุ่มแคร์');
      return;
    }
    if (!careGroups.includes(trimmed)) {
      const updated = [...careGroups, trimmed];
      setCareGroups(updated);
      saveCareGroupToCloud(trimmed);
    }
    setCurrentCareGroup(trimmed);
    setInlineCareGroupInput('');
    setIsAddingCareGroupInline(false);
    showToast(`✓ บันทึกชื่อกลุ่มแคร์ "${trimmed}" เรียบร้อยแล้ว ✨`);
  };

  const handleRenameCurrentCareGroup = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === currentCareGroup) {
      setIsRenamingCurrentInline(false);
      return;
    }
    const oldName = currentCareGroup;
    const updated = careGroups.map((g) => (g === oldName ? trimmed : g));
    if (!careGroups.includes(oldName)) {
      updated.push(trimmed);
    }
    setCareGroups(updated);
    setCurrentCareGroup(trimmed);
    setIsRenamingCurrentInline(false);
    syncCareGroupsToCloud(updated).catch(() => {});
    showToast(`✓ แก้ไขชื่อกลุ่มแคร์เป็น "${trimmed}" สำเร็จแล้ว ✨`);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const triggerWarningFeedback = () => {
    if (soundEnabled) {
      playWarningAlertSound();
    }
    triggerHapticFeedback();
    setHapticTriggerKey(Date.now());
  };

  const handleTemperatureChange = (val: string) => {
    setTemperature(val);
    temperatureRef.current = val;
    const num = parseFloat(val);
    if (!isNaN(num) && (num >= 37.5 || num < 35.0)) {
      if (!prevTempWarningRef.current) {
        triggerWarningFeedback();
        prevTempWarningRef.current = true;
      }
    } else {
      prevTempWarningRef.current = false;
    }
  };

  const setTemp = (val: number | string) => {
    const strVal = String(val);
    setTemperature(strVal);
    temperatureRef.current = strVal;
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (!isNaN(num) && (num >= 37.5 || num < 35.0)) {
      triggerWarningFeedback();
      prevTempWarningRef.current = true;
    } else {
      prevTempWarningRef.current = false;
    }
  };

  const handleStepTemp = (delta: number) => {
    const current = parseFloat(temperature) || 36.5;
    const next = Math.max(25.0, Math.min(46.0, Math.round((current + delta) * 10) / 10));
    setTemp(next.toFixed(1));
  };

  // Helper to reliably get the latest temperature entered before checking in
  const getEffectiveTemperatureNumber = (customTemp?: number): number => {
    // 1. Direct DOM check (authoritative, handles input typing without blur)
    if (typeof document !== 'undefined') {
      const el = document.getElementById('temperature') as HTMLInputElement | null;
      if (el && el.value !== '' && el.value !== null && el.value !== undefined) {
        const val = parseFloat(el.value);
        if (!isNaN(val) && val > 0) return val;
      }
    }
    // 2. Check synchronized ref (immune to React stale closures)
    if (temperatureRef.current !== '' && temperatureRef.current !== null && temperatureRef.current !== undefined) {
      const val = parseFloat(temperatureRef.current);
      if (!isNaN(val) && val > 0) return val;
    }
    // 3. Custom temp passed in if explicitly specified
    if (typeof customTemp === 'number' && !isNaN(customTemp)) {
      return customTemp;
    }
    // 4. Check React state
    if (temperature !== '' && temperature !== null && temperature !== undefined) {
      const val = parseFloat(temperature);
      if (!isNaN(val)) return val;
    }
    return 36.5;
  };

  const getExistingCheckInForTargetSession = (
    member: Member,
    overrideDate?: string
  ): CheckInRecord | undefined => {
    const todayDateStr = new Date().toISOString().split('T')[0];
    const effectiveDate =
      overrideDate || (isRetroactiveMode ? retroactiveDate || todayDateStr : todayDateStr);
    const effectiveCareGroupName =
      currentSessionType === 'CARE_GROUP'
        ? currentCareGroup.trim() || undefined
        : member.careGroup || undefined;
    const targetKey = getAttendanceSessionKey({
      memberId: member.id,
      nickname: member.nickname,
      date: effectiveDate,
      sessionType: currentSessionType,
      careGroupName: effectiveCareGroupName,
    });
    return (
      attendance.find((r) => getAttendanceSessionKey(r) === targetKey) ||
      attendanceRef.current.find((r) => getAttendanceSessionKey(r) === targetKey)
    );
  };

  const executeCheckIn = (
    member: Member,
    temp?: number,
    method: 'NFC' | 'SEARCH' | 'MANUAL' = 'NFC',
    overrideDate?: string,
    overrideTime?: string,
    overrideReason?: string,
    skipModal: boolean = false
  ): boolean => {
    const now = new Date();
    const todayDateStr = now.toISOString().split('T')[0];
    const isRetro = Boolean(overrideDate || isRetroactiveMode);
    const dateStr =
      overrideDate ||
      (isRetroactiveMode ? retroactiveDate || todayDateStr : todayDateStr);

    if (currentSessionType === 'CARE_GROUP' && !currentCareGroup.trim()) {
      showToast('⚠️ กรุณากรอกหรือระบุชื่อกลุ่มแคร์ก่อนทำการเช็คอินค่ะ');
      return false;
    }

    const effectiveCareGroupName =
      currentSessionType === 'CARE_GROUP'
        ? currentCareGroup.trim() || undefined
        : member.careGroup || undefined;

    // Strictly enforce 1 check-in record per member per day / care group
    const targetSessionKey = getAttendanceSessionKey({
      memberId: member.id,
      nickname: member.nickname,
      date: dateStr,
      sessionType: currentSessionType,
      careGroupName: effectiveCareGroupName,
    });

    const existingRecord = attendanceRef.current.find(
      (r) => getAttendanceSessionKey(r) === targetSessionKey
    );

    if (existingRecord) {
      const dateLabel =
        dateStr === todayDateStr ? 'วันนี้' : `วันที่ ${formatThaiDate(dateStr)}`;
      const sessionLabel =
        currentSessionType === 'CARE_GROUP'
          ? `กลุ่มแคร์ "${effectiveCareGroupName || ''}"`
          : 'รอบนมัสการหลัก';
      showToast(
        `ℹ️ คุณ "${member.nickname}" เช็คอิน${sessionLabel} (${dateLabel}) ไปแล้วเมื่อเวลา ${existingRecord.checkInTime} (จำกัด 1 ครั้ง/วัน/กลุ่มแคร์)`
      );
      setSearchValue('');
      setSelectedMember(null);
      setShowSuggestions(false);
      return false;
    }

    // Force a fresh, authoritative read from the temperature input element or temperatureRef immediately
    // before processing the check-in record, ensuring that any entered temperature is captured accurately
    // even if the user taps the NFC card quickly without blurring the input field.
    let domTemp: number | null = null;
    if (typeof document !== 'undefined') {
      const inputEl = document.getElementById('temperature') as HTMLInputElement | null;
      if (inputEl && inputEl.value !== '' && inputEl.value !== null && inputEl.value !== undefined) {
        const parsed = parseFloat(inputEl.value);
        if (!isNaN(parsed) && parsed > 0) {
          domTemp = parsed;
        }
      }
    }

    let refTemp: number | null = null;
    if (temperatureRef.current !== '' && temperatureRef.current !== null && temperatureRef.current !== undefined) {
      const parsed = parseFloat(temperatureRef.current);
      if (!isNaN(parsed) && parsed > 0) {
        refTemp = parsed;
      }
    }

    let effectiveTemp: number;
    if (isQuickNewcomerOpen && typeof temp === 'number' && !isNaN(temp)) {
      // Explicit newcomer modal temperature input
      effectiveTemp = temp;
    } else if (domTemp !== null) {
      // Prioritize live DOM input value (catches fast NFC tap before blur or state commit)
      effectiveTemp = domTemp;
    } else if (refTemp !== null) {
      effectiveTemp = refTemp;
    } else if (typeof temp === 'number' && !isNaN(temp)) {
      effectiveTemp = temp;
    } else {
      const stateVal = parseFloat(temperature);
      effectiveTemp = !isNaN(stateVal) ? stateVal : 36.5;
    }

    if (effectiveTemp >= 37.5 || effectiveTemp < 35.0) {
      if (soundEnabled) {
        playWarningAlertSound();
      }
      triggerHapticFeedback();
    } else {
      if (soundEnabled) {
        if (method === 'NFC') {
          playNfcSuccessChime();
        } else {
          playJoyfulChime();
        }
      }
      if (method === 'NFC') {
        triggerNfcHapticFeedback();
      }
    }

    if (method === 'NFC') {
      setIsNfcScanMatched(true);
      setTimeout(() => setIsNfcScanMatched(false), 950);
    }

    const timeStr =
      overrideTime ||
      (isRetroactiveMode && retroactiveTime
        ? `${retroactiveTime} น.`
        : now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.');
    const verse = getRandomVerse();
    const isBday = isBirthdayToday(member.birthday);

    const record: CheckInRecord = {
      id: `checkin-${Date.now()}`,
      memberId: member.id,
      memberName: member.fullName,
      nickname: member.nickname,
      role: member.role,
      temperature: effectiveTemp,
      checkInTime: timeStr,
      date: dateStr,
      sessionType: currentSessionType,
      careGroupName: effectiveCareGroupName,
      method,
      verse,
      avatarUrl: member.avatarUrl,
      isBirthday: isBday,
      isVisitor: Boolean(member.isVisitor || member.role?.includes('ผู้มา')),
      isBaptized: member.isBaptized,
      invitedBy: member.invitedBy,
      isRetroactive: isRetro,
      retroactiveReason: isRetro ? (overrideReason || retroactiveReason.trim() || 'ลืมเช็คอิน') : undefined,
    };

    const nextAttendance = deduplicateAttendanceRecords([record, ...attendanceRef.current]);
    attendanceRef.current = nextAttendance;
    setAttendance(nextAttendance);

    if (!skipModal) {
      setCurrentSuccessRecord(record);
    } else {
      // Quick check-in: Completely bypass the window pop up!
      setCurrentSuccessRecord(null);
      setQuickCheckInBanner({
        id: record.id,
        member,
        record,
        temp: effectiveTemp,
        time: timeStr,
      });
      if (quickCheckInTimerRef.current) {
        clearTimeout(quickCheckInTimerRef.current as any);
      }
      quickCheckInTimerRef.current = setTimeout(() => {
        setQuickCheckInBanner(null);
      }, 5500);
    }

    // Briefly display "Last: [Member Name]" under the NFC Ready status pill for 3 seconds
    const memberDisplayName = member.nickname || member.fullName;
    setLastSuccessfulCheckInName(memberDisplayName);
    if (lastSuccessfulCheckInTimerRef.current) {
      clearTimeout(lastSuccessfulCheckInTimerRef.current);
    }
    lastSuccessfulCheckInTimerRef.current = setTimeout(() => {
      setLastSuccessfulCheckInName(null);
    }, 3000);

    // Sync check-in to Cloud (track as pending until confirmed so background poll never drops it)
    pendingAttendanceUpsertsRef.current.set(record.id, record);
    insertAttendanceToCloud(record)
      .then((ok) => {
        if (ok) {
          pendingAttendanceUpsertsRef.current.delete(record.id);
          setIsSupabaseConnected(true);
        }
      })
      .catch((err) => {
        console.warn('Cloud attendance insert skipped:', err);
      });

    if (isRetro) {
      setToastMessage(`บันทึกย้อนหลังของ "${member.nickname}" ประจำวันที่ ${formatThaiDate(dateStr)} เรียบร้อยแล้วค่ะ ⏳ (🌡️ ${effectiveTemp.toFixed(1)}°C)`);
    } else if (skipModal) {
      setToastMessage(`⚡ เช็คอินด่วนสำเร็จ! คุณ "${member.nickname}" (${effectiveTemp.toFixed(1)}°C) บันทึกเรียบร้อย ไม่แสดงหน้าต่างป็อปอัป 🚀`);
    } else {
      setToastMessage(`เช็คอินคุณ "${member.nickname}" เรียบร้อยแล้วค่ะ 💙 (🌡️ ${effectiveTemp.toFixed(1)}°C)`);
    }
    setTimeout(() => setToastMessage(null), 4000);

    // Reset inputs & reset temperature to baseline for next attendee
    setSearchValue('');
    setSelectedMember(null);
    setShowSuggestions(false);
    setTemperature('36.5');
    temperatureRef.current = '36.5';
    if ( typeof document !== 'undefined') {
      const inputEl = document.getElementById('temperature') as HTMLInputElement | null;
      if (inputEl) {
        inputEl.value = '36.5';
      }
    }
    return true;
  };

  // NFC Scan Handler - accurately passes the temperature entered before tapping card
  const handleNfcScan = (member: Member, customTemp?: number) => {
    handleNfcScanInProgress();
    const tempNum = getEffectiveTemperatureNumber(customTemp);
    executeCheckIn(member, tempNum, 'NFC', undefined, undefined, undefined, isQuickModeActive);
  };

  // Quick Check-in Handler: Bypasses window popup completely
  const handleQuickCheckIn = (e?: React.MouseEvent | React.FormEvent, customMember?: Member) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const tempNum = getEffectiveTemperatureNumber();

    if (isRetroactiveMode && !retroactiveDate) {
      showToast('⚠️ กรุณาระบุวันที่ต้องการบันทึกย้อนหลังค่ะ');
      return;
    }

    let targetMember = customMember || selectedMember;

    if (!targetMember && searchValue.trim()) {
      const query = searchValue.trim().toLowerCase();
      const cleanDigits = query.replace(/[-\s]/g, '');
      const match = members.find((m) => {
        const displayFull =
          m.fullName && m.fullName !== m.nickname
            ? `${m.nickname} (${m.fullName})`.toLowerCase()
            : m.nickname.toLowerCase();
        return (
          m.nickname.toLowerCase() === query ||
          displayFull === query ||
          m.id.toLowerCase() === query ||
          m.fullName.toLowerCase().includes(query) ||
          m.nickname.toLowerCase().includes(query) ||
          Boolean(
            cleanDigits.length >= 3 &&
              m.phone &&
              m.phone.replace(/[-\s]/g, '').includes(cleanDigits)
          )
        );
      });

      if (match) {
        targetMember = match;
      } else {
        // Create ad-hoc visitor member
        targetMember = {
          id: `V${Math.floor(100 + Math.random() * 900)}`,
          nickname: searchValue.trim(),
          fullName: searchValue.trim(),
          role: 'ผู้มาเยือน 🌟',
          nfcCardId: `NFC-TEMP`,
          avatarBgColor: '#7EC8E3',
          isVisitor: true,
        };
        setMembers((prev) => [...prev, targetMember!]);
        pendingMemberUpsertsRef.current.set(targetMember.id, targetMember);
        upsertMemberToCloud(targetMember)
          .then((ok) => {
            if (ok) pendingMemberUpsertsRef.current.delete(targetMember!.id);
          })
          .catch(() => {});
      }
    }

    if (!targetMember) {
      // Default to first member if empty for convenience
      targetMember = members[0];
    }

    executeCheckIn(targetMember, tempNum, 'SEARCH', undefined, undefined, undefined, true);
  };

  // Auto Check-in from URL query parameter (for NFC tag taps or direct links e.g. ?checkin=MEM001 or ?c=MEM001)
  useEffect(() => {
    if (typeof window === 'undefined' || members.length === 0) return;
    const urlParams = new URLSearchParams(window.location.search);
    const checkinQuery =
      urlParams.get('checkin') ||
      urlParams.get('c') ||
      urlParams.get('memberId') ||
      urlParams.get('nfc');

    if (checkinQuery) {
      const q = checkinQuery.trim();
      const matched = findMemberByNfc(members, q, q);

      if (matched) {
        const tempNum = parseFloat(temperature) || 36.5;
        executeCheckIn(matched, tempNum, 'NFC', undefined, undefined, undefined, isQuickModeActive);

        // Clean URL query without retriggering or reloading
        try {
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch (e) {
          console.warn('URL clean error:', e);
        }
      }
    }
  }, [members]);

  // Form Submit Handler
  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    const tempNum = getEffectiveTemperatureNumber();

    if (isRetroactiveMode && !retroactiveDate) {
      showToast('⚠️ กรุณาระบุวันที่ต้องการบันทึกย้อนหลังค่ะ');
      return;
    }

    let targetMember = selectedMember;

      if (!targetMember && searchValue.trim()) {
      // Find matching member by any field
      const query = searchValue.trim().toLowerCase();
      const cleanDigits = query.replace(/[-\s]/g, '');
      const match = members.find((m) => {
        const displayFull =
          m.fullName && m.fullName !== m.nickname
            ? `${m.nickname} (${m.fullName})`.toLowerCase()
            : m.nickname.toLowerCase();
        return (
          m.nickname.toLowerCase() === query ||
          displayFull === query ||
          m.id.toLowerCase() === query ||
          m.fullName.toLowerCase().includes(query) ||
          m.nickname.toLowerCase().includes(query) ||
          Boolean(
            cleanDigits.length >= 3 &&
              m.phone &&
              m.phone.replace(/[-\s]/g, '').includes(cleanDigits)
          )
        );
      });

      if (match) {
        targetMember = match;
      } else {
        // Create ad-hoc visitor member
        targetMember = {
          id: `V${Math.floor(100 + Math.random() * 900)}`,
          nickname: searchValue.trim(),
          fullName: searchValue.trim(),
          role: 'ผู้มาเยือน 🌟',
          nfcCardId: `NFC-TEMP`,
          avatarBgColor: '#7EC8E3',
          isVisitor: true,
        };
        setMembers((prev) => [...prev, targetMember!]);
        pendingMemberUpsertsRef.current.set(targetMember.id, targetMember);
        upsertMemberToCloud(targetMember)
          .then((ok) => {
            if (ok) pendingMemberUpsertsRef.current.delete(targetMember!.id);
          })
          .catch(() => {});
      }
    }

    if (!targetMember) {
      // Default to first member if empty for convenience
      targetMember = members[0];
    }

    executeCheckIn(targetMember, tempNum, 'SEARCH', undefined, undefined, undefined, isQuickModeActive);
  };

  const formatMemberSearchDisplay = (member: Member) =>
    member.fullName && member.fullName !== member.nickname
      ? `${member.nickname} (${member.fullName})`
      : member.nickname;

  const handleSelectSuggestion = (member: Member) => {
    setSelectedMember(member);
    setSearchValue(formatMemberSearchDisplay(member));
    setShowSuggestions(false);
  };

  // Open Quick Newcomer Check-in
  const handleOpenQuickNewcomer = (initialName?: string, fromNewcomerHub = false) => {
    setShowSuggestions(false);
    setNewcomerInitialName(initialName ?? (selectedMember ? '' : searchValue) ?? '');
    setQuickNewcomerOrigin(fromNewcomerHub ? 'NEWCOMER' : 'HOME');
    setIsQuickNewcomerOpen(true);
  };

  // Check In Newcomer
  const handleCheckInNewcomer = (data: {
    nickname: string;
    fullName?: string;
    ageGroup?: 'ADULT' | 'CHILD';
    gender?: 'FEMALE' | 'MALE';
    invitedBy?: string;
    phone?: string;
    notes?: string;
    temperature: number;
    isBaptized?: boolean;
  }) => {
    const cleanNick = data.nickname.trim().toLowerCase();
    const cleanFull = (data.fullName || data.nickname).trim().toLowerCase();
    const existingMember = membersRef.current.find(
      (m) =>
        m.nickname.trim().toLowerCase() === cleanNick &&
        m.fullName.trim().toLowerCase() === cleanFull
    );

    if (existingMember) {
      executeCheckIn(existingMember, data.temperature, 'SEARCH');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const newId = `V${Math.floor(100 + Math.random() * 900)}`;

    const newMember: Member = {
      id: newId,
      nickname: data.nickname,
      fullName: data.fullName || data.nickname,
      ageGroup: data.ageGroup || 'ADULT',
      gender: data.gender,
      role: 'ผู้มาใหม่ 🌟',
      nfcCardId: `NFC-${newId}`,
      phone: data.phone,
      notes: data.notes,
      invitedBy: data.invitedBy || 'มาด้วยตนเอง 🌟',
      firstVisitDate: today,
      isVisitor: true,
      avatarBgColor: '#10B981',
      isBaptized: data.isBaptized ?? false,
    };

    const nextMembers = [newMember, ...membersRef.current];
    membersRef.current = nextMembers;
    setMembers(nextMembers);
    pendingMemberUpsertsRef.current.set(newMember.id, newMember);
    upsertMemberToCloud(newMember)
      .then((ok) => {
        if (ok) pendingMemberUpsertsRef.current.delete(newMember.id);
      })
      .catch((e) => console.warn('Cloud member upsert error:', e));

    const checkedIn = executeCheckIn(newMember, data.temperature, 'SEARCH');
    if (checkedIn) {
      setToastMessage(`ยินดีต้อนรับคุณ "${data.nickname}" สู่คริสตจักรฟ้าใส! 🌟`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Update Newcomer Notes or Companion
  const handleUpdateNewcomer = (updated: Member) => {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    pendingMemberUpsertsRef.current.set(updated.id, updated);
    upsertMemberToCloud(updated)
      .then((ok) => {
        if (ok) pendingMemberUpsertsRef.current.delete(updated.id);
      })
      .catch((e) => console.warn('Cloud member update error:', e));
    setToastMessage(`บันทึกข้อมูลของ ${updated.nickname} เรียบร้อยแล้วค่ะ`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Promote Newcomer to Full Church Member
  const handlePromoteNewcomerToMember = (newcomer: Member) => {
    setIsNewcomerModalOpen(false);
    setMemberToEdit({
      ...newcomer,
      role: newcomer.role.includes('ผู้มา') ? 'สมาชิกทั่วไป ⛪' : newcomer.role,
      isVisitor: false,
    });
    setOpenedFromRoster(false);
    setMemberModalOrigin('NEWCOMER');
    setIsMemberModalOpen(true);
  };

  // Check In a Newcomer for today from the Newcomer Hub
  const handleCheckInTodayFromNewcomer = (member: Member) => {
    const tempNum = parseFloat(temperature) || 36.5;
    executeCheckIn(member, tempNum, 'MANUAL');
  };

  const handleOpenAddMember = (nickname?: string, fromRoster = false, fromMenu = false) => {
    // Close other modals so they don't stack underneath
    setIsRosterModalOpen(false);
    setIsAttendanceOpen(false);
    setIsWeeklyReportOpen(false);
    setIsBirthdayBlessingOpen(false);
    setShowSuggestions(false);
    setMemberToEdit(null);
    setOpenedFromRoster(fromRoster);
    setMemberModalOrigin(fromRoster ? 'ROSTER' : fromMenu ? 'MENU' : 'HOME');
    setIsMemberModalOpen(true);
    if (nickname) {
      setSearchValue(nickname);
    }
  };

  const handleOpenEditMember = (member: Member, fromRoster = false) => {
    // Close other modals so they don't stack underneath
    setIsRosterModalOpen(false);
    setIsAttendanceOpen(false);
    setIsWeeklyReportOpen(false);
    setIsBirthdayBlessingOpen(false);
    setShowSuggestions(false);
    setMemberToEdit(member);
    setOpenedFromRoster(fromRoster);
    setMemberModalOrigin('ROSTER');
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = (savedMember: Member) => {
    setMembers((prev) => {
      const existsIndex = prev.findIndex((m) => m.id === savedMember.id);
      if (existsIndex >= 0) {
        const updated = [...prev];
        updated[existsIndex] = savedMember;
        return updated;
      }
      return [savedMember, ...prev];
    });

    // Also update selected member if matching
    if (selectedMember?.id === savedMember.id || !selectedMember) {
      setSelectedMember(savedMember);
      setSearchValue(formatMemberSearchDisplay(savedMember));
    }

    setToastMessage(`✓ บันทึกข้อมูลคุณ "${savedMember.nickname}" เรียบร้อยแล้ว ✨`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);

    recordAppAuditLog({
      category: 'MODIFY',
      severity: 'INFO',
      actionTitle: `บันทึก/แก้ไขข้อมูลสมาชิก: คุณ${savedMember.nickname} (${savedMember.id})`,
      details: `ชื่อเต็ม: ${savedMember.fullName} · กลุ่ม: ${savedMember.role}`,
    });

    // Sync member to Cloud immediately and pull any remote changes
    pendingMemberUpsertsRef.current.set(savedMember.id, savedMember);
    upsertMemberToCloud(savedMember).then((ok) => {
      if (ok) {
        pendingMemberUpsertsRef.current.delete(savedMember.id);
        setIsSupabaseConnected(true);
      }
      syncWithSupabase(false);
    });
  };

  const handleDeleteMember = (memberId: string) => {
    const target = members.find((m) => m.id === memberId);
    createAutoSnapshot(`ก่อนลบสมาชิก: คุณ${target?.nickname || memberId}`);
    recordAppAuditLog({
      category: 'DELETE',
      severity: 'CRITICAL',
      actionTitle: `ลบรายชื่อสมาชิก: คุณ${target?.nickname || memberId} (${target?.fullName || ''})`,
      details: `รหัสสมาชิก: ${memberId} · บทบาท: ${target?.role || '-'}`,
    });
    pendingMemberUpsertsRef.current.delete(memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    if (selectedMember?.id === memberId) {
      setSelectedMember(null);
      setSearchValue('');
    }
    showToast('ลบข้อมูลและซิงค์อัปเดตทุกอุปกรณ์เรียบร้อยแล้วค่ะ (กู้คืนได้ในเมนูย้อนคืนข้อมูล) 🗑️');
    // Delete from Cloud and trigger sync
    deleteMemberFromCloud(memberId).then(() => {
      syncWithSupabase(false);
    });
  };

  const handleDeleteMultipleMembers = (memberIds: string[]) => {
    if (!memberIds || memberIds.length === 0) return;
    const idSet = new Set(memberIds);
    const removedNames = members
      .filter((m) => idSet.has(m.id))
      .map((m) => m.nickname || m.fullName)
      .slice(0, 5)
      .join(', ');

    createAutoSnapshot(`ก่อนลบสมาชิกแบบกลุ่ม (${memberIds.length} คน)`);
    recordAppAuditLog({
      category: 'DELETE',
      severity: 'CRITICAL',
      actionTitle: `ลบรายชื่อสมาชิก/ผู้มาใหม่แบบกลุ่ม จำนวน ${memberIds.length} คน`,
      details: `รายชื่อ: ${removedNames}${memberIds.length > 5 ? '...' : ''}`,
    });

    for (const id of memberIds) {
      pendingMemberUpsertsRef.current.delete(id);
    }

    setMembers((prev) => prev.filter((m) => !idSet.has(m.id)));
    if (selectedMember && idSet.has(selectedMember.id)) {
      setSelectedMember(null);
      setSearchValue('');
    }

    showToast(
      `✓ ลบรายชื่อ ${memberIds.length} คน และ Push อัปเดตซิงค์ทุกเครื่องเรียบร้อยแล้วค่ะ 🗑️☁️`
    );

    deleteMultipleMembersFromCloud(memberIds).then(() => {
      syncWithSupabase(false);
    });
  };

  // Delete a single attendance check-in record
  const handleDeleteAttendanceRecord = (recordId: string) => {
    const targetRec = attendance.find((r) => r.id === recordId);
    createAutoSnapshot(
      `ก่อนลบเช็คอิน: คุณ${targetRec?.nickname || targetRec?.memberName || recordId}`
    );
    recordAppAuditLog({
      category: 'DELETE',
      severity: 'WARNING',
      actionTitle: `ลบประวัติเช็คอิน: คุณ${targetRec?.nickname || targetRec?.memberName || recordId}`,
      details: `วันที่ ${targetRec?.date || '-'} เวลา ${targetRec?.checkInTime || '-'}`,
    });
    setAttendance((prev) => prev.filter((r) => r.id !== recordId));
    if (currentSuccessRecord?.id === recordId) {
      setCurrentSuccessRecord(null);
    }
    setLastSuccessfulCheckInName(null);
    if (lastSuccessfulCheckInTimerRef.current) {
      clearTimeout(lastSuccessfulCheckInTimerRef.current);
    }
    deleteAttendanceFromCloud(recordId).catch(() => {});
    showToast('ลบรายการเช็คอินเรียบร้อยแล้วค่ะ 🗑️');
  };

  // Quick Undo the very last check-in record
  const handleUndoLastCheckIn = () => {
    if (attendance.length === 0) {
      showToast('ยังไม่มีรายการเช็คอินที่สามารถยกเลิกได้ค่ะ ℹ️');
      return;
    }
    const lastRecord = attendance[0];
    setConfirmUndoLast(false);
    handleDeleteAttendanceRecord(lastRecord.id);
    showToast(`✓ ยกเลิกการเช็คอินของ "${lastRecord.nickname || lastRecord.memberName}" สำเร็จแล้วค่ะ 🗑️`);
  };

  // Clear attendance records for a specific date
  const handleClearDateAttendance = (date: string) => {
    createAutoSnapshot(`ก่อนล้างประวัติวันที่ ${formatThaiDate(date) || date}`);
    const removedIds = attendance.filter((r) => r.date === date).map((r) => r.id);
    recordAppAuditLog({
      category: 'DELETE',
      severity: 'CRITICAL',
      actionTitle: `ล้างประวัติเช็คอินวันที่ ${formatThaiDate(date) || date}`,
      details: `ลบออกทั้งหมด ${removedIds.length} รายการ`,
    });
    setAttendance((prev) => prev.filter((r) => r.date !== date));
    deleteAttendanceByDateFromCloud(date, removedIds).catch(() => {});
    showToast(`ล้างประวัติการเช็คอินของวันที่ ${formatThaiDate(date) || date} ทั้งในเครื่องและคลาวด์เรียบร้อยแล้วค่ะ 🗑️`);
  };

  // Clear today's check-in records
  const handleClearTodayAttendance = () => {
    createAutoSnapshot('ก่อนล้างรายการเช็คอินวันนี้');
    const today = new Date().toISOString().split('T')[0];
    const removedIds = attendance.filter((r) => r.date === today).map((r) => r.id);
    recordAppAuditLog({
      category: 'DELETE',
      severity: 'CRITICAL',
      actionTitle: 'ล้างรายการเช็คอินของวันนี้ทั้งหมด',
      details: `ลบออกทั้งหมด ${removedIds.length} รายการ`,
    });
    setAttendance((prev) => prev.filter((r) => r.date !== today));
    deleteAttendanceByDateFromCloud(today, removedIds).catch(() => {});
    showToast('ล้างรายการเช็คอินของวันนี้ (ทั้งในเครื่องและคลาวด์) เรียบร้อยแล้วค่ะ 🗑️');
  };

  // Clear all attendance records
  const handleClearAllAttendance = () => {
    createAutoSnapshot('ก่อนล้างประวัติเช็คอินทั้งหมด');
    const removedIds = attendance.map((r) => r.id);
    recordAppAuditLog({
      category: 'DELETE',
      severity: 'CRITICAL',
      actionTitle: 'ล้างประวัติการเช็คอินทั้งหมดในระบบ',
      details: `ลบออกทั้งหมด ${removedIds.length} รายการ`,
    });
    setAttendance([]);
    deleteAllAttendanceFromCloud(removedIds).catch(() => {});
    showToast('ล้างประวัติการเช็คอินทั้งหมด (ทั้งในเครื่องและคลาวด์) เรียบร้อยแล้วค่ะ 🗑️');
  };

  // Reset demo data
  const handleResetDemoData = () => {
    createAutoSnapshot('ก่อนคืนค่าข้อมูลเริ่มต้น');
    recordAppAuditLog({
      category: 'SYNC_RESTORE',
      severity: 'WARNING',
      actionTitle: 'กดคืนค่าข้อมูลสมาชิกและตัวอย่างเริ่มต้น (Reset Demo Data)',
    });
    clearAllDeletedMemberTombstones();
    clearAllDeletedAttendanceTombstones();
    const defaultGroups = ['แคร์คนรุ่นใหม่', 'แคร์ฟ้าใส 1', 'แคร์ครอบครัว'];
    setMembers(INITIAL_MEMBERS);
    setCareGroups(defaultGroups);
    setAttendance(INITIAL_ATTENDANCE_HISTORY);
    migrateCurrentDataToSupabase(INITIAL_MEMBERS, INITIAL_ATTENDANCE_HISTORY, defaultGroups).catch(
      () => {}
    );
    showToast('คืนค่าข้อมูลสมาชิกและตัวอย่างเริ่มต้นเรียบร้อยแล้วค่ะ ✨');
  };

  // Restore from an Auto-Snapshot
  const handleRestoreSnapshot = async (snapshot: DataSnapshot) => {
    createAutoSnapshot(`ก่อนย้อนคืนข้อมูลไปยัง "${snapshot.label}"`);
    recordAppAuditLog({
      category: 'SYNC_RESTORE',
      severity: 'WARNING',
      actionTitle: `ย้อนคืนข้อมูล (Restore): ${snapshot.label}`,
      details: `กู้คืนสมาชิก ${snapshot.members.length} คน และประวัติเช็คอิน ${snapshot.attendance.length} รายการ`,
    });
    clearAllDeletedMemberTombstones();
    clearAllDeletedAttendanceTombstones();
    pendingMemberUpsertsRef.current.clear();
    pendingAttendanceUpsertsRef.current.clear();
    setMembers(snapshot.members);
    setAttendance(snapshot.attendance);
    if (snapshot.careGroups && snapshot.careGroups.length > 0) {
      setCareGroups(snapshot.careGroups);
    }
    showToast(`✓ ย้อนคืนข้อมูล "${snapshot.label}" และซิงค์ขึ้นคลาวด์เรียบร้อยแล้วค่ะ 🔄`);
    await migrateCurrentDataToSupabase(
      snapshot.members,
      snapshot.attendance,
      snapshot.careGroups || careGroups
    );
  };

  // Manual Snapshot creation
  const handleCreateManualSnapshot = (label: string) => {
    createAutoSnapshot(label, 'MANUAL');
    recordAppAuditLog({
      category: 'SYNC_RESTORE',
      severity: 'INFO',
      actionTitle: `สร้างจุดบันทึก Snapshot: ${label}`,
      details: `สมาชิก ${members.length} คน · ประวัติเช็คอิน ${attendance.length} รายการ`,
    });
    showToast(`✓ สร้างจุดบันทึก "${label}" ลงในเครื่องเรียบร้อยแล้วค่ะ 📌`);
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    const updated = deleteSnapshotById(snapshotId);
    setRecoverySnapshots(updated);
    showToast('ลบจุดบันทึก Snapshot เรียบร้อยแล้วค่ะ');
  };

  const handleUnlockAdminMode = (operatorName: string) => {
    setIsAdminUnlocked(true);
    recordAppAuditLog({
      category: 'VIEW_SENSITIVE',
      severity: 'WARNING',
      actionTitle: 'ปลดล็อกโหมดผู้ดูแล (เปิดดูข้อมูลอ่อนไหว เบอร์โทร/ที่อยู่)',
      details: `ผู้ปลดล็อก: ${operatorName}`,
      operatorOverride: operatorName,
    });
    showToast(`🔓 ปลดล็อกโหมดผู้ดูแลโดย "${operatorName}" เรียบร้อยแล้วค่ะ`);
  };

  const handleLockAdminMode = () => {
    setIsAdminUnlocked(false);
    recordAppAuditLog({
      category: 'ACCESS',
      severity: 'INFO',
      actionTitle: 'ล็อกโหมดผู้ดูแล (ซ่อนเบอร์โทรและที่อยู่กลับตามปกติ)',
    });
    showToast('🔒 ล็อกซ่อนข้อมูลอ่อนไหวเรียบร้อยแล้วค่ะ');
  };

  // Export Backup JSON File
  const handleExportBackupFile = () => {
    exportBackupJsonFile(members, attendance, careGroups, churchName);
    showToast('✓ ดาวน์โหลดไฟล์สำรองข้อมูล (.json) เรียบร้อยแล้วค่ะ 💾');
  };

  // Import Backup JSON File
  const handleImportBackupFile = async (payload: FullBackupPayload) => {
    createAutoSnapshot('ก่อนนำเข้าไฟล์สำรองข้อมูล');
    clearAllDeletedMemberTombstones();
    clearAllDeletedAttendanceTombstones();
    pendingMemberUpsertsRef.current.clear();
    pendingAttendanceUpsertsRef.current.clear();
    setMembers(payload.members);
    setAttendance(payload.attendance);
    if (payload.careGroups && payload.careGroups.length > 0) {
      setCareGroups(payload.careGroups);
    }
    showToast(
      `✓ นำเข้าและซิงค์ข้อมูลขึ้นคลาวด์สำเร็จ! (สมาชิก ${payload.members.length} คน · เช็คอิน ${payload.attendance.length} รายการ)`
    );
    await migrateCurrentDataToSupabase(
      payload.members,
      payload.attendance,
      payload.careGroups || careGroups
    );
  };

  const filteredSuggestions = useMemo(() => {
    const raw = searchValue.trim().toLowerCase();
    if (!raw) return members;

    // If the user has already selected a member and opens the dropdown without changing the text,
    // still match that member (or let them browse)
    const cleanPhoneQuery = raw.replace(/[-\s]/g, '');

    return members.filter((m) => {
      const displayStr =
        m.fullName && m.fullName !== m.nickname
          ? `${m.nickname} (${m.fullName})`.toLowerCase()
          : m.nickname.toLowerCase();

      const ageGroupText =
        m.ageGroup === 'CHILD' ? 'เด็ก ยุวชน child' : m.ageGroup === 'ADULT' ? 'ผู้ใหญ่ adult' : '';
      const genderText =
        m.gender === 'FEMALE'
          ? 'หญิง ผู้หญิง female'
          : m.gender === 'MALE'
          ? 'ชาย ผู้ชาย male'
          : '';
      const visitorText = m.isVisitor ? 'คนมาใหม่ ผู้มาใหม่ ผู้มาเยือน newcomer' : '';

      const searchableBlob = [
        m.nickname,
        m.fullName,
        displayStr,
        m.phone,
        m.role,
        m.careGroup,
        m.address,
        m.notes,
        m.invitedBy,
        m.birthday,
        m.nfcCardId,
        m.id,
        ageGroupText,
        genderText,
        visitorText,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (searchableBlob.includes(raw)) return true;
      if (
        cleanPhoneQuery.length >= 2 &&
        m.phone &&
        m.phone.replace(/[-\s]/g, '').includes(cleanPhoneQuery)
      ) {
        return true;
      }
      return false;
    });
  }, [members, searchValue]);

  const newcomersList = members.filter(
    (m) =>
      m.isVisitor ||
      m.role?.includes('ผู้มาเยือน') ||
      m.role?.includes('ผู้มาใหม่') ||
      m.id.startsWith('V')
  );

  const tempVal = parseFloat(temperature) || 36.5;
  const medicalStatus = getMedicalTempStatus(tempVal);
  const isFever = tempVal >= 37.5;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter((r) => r.date === todayStr || !r.date);
  const birthdayMembers = getTodayBirthdayMembers(members);

  const presetRetroactiveDates = useMemo(() => {
    const now = new Date();

    // Yesterday
    const yDay = new Date(now);
    yDay.setDate(now.getDate() - 1);
    const yDayStr = yDay.toISOString().split('T')[0];

    // Last Sunday (รอบนมัสการ)
    const lastSun = new Date(now);
    const day = now.getDay();
    const diffToSun = day === 0 ? 7 : day;
    lastSun.setDate(now.getDate() - diffToSun);
    const lastSunStr = lastSun.toISOString().split('T')[0];

    // Last Friday (รอบกลุ่มแคร์)
    const lastFri = new Date(now);
    const diffToFri = (day + 2) % 7 || 7;
    lastFri.setDate(now.getDate() - diffToFri);
    const lastFriStr = lastFri.toISOString().split('T')[0];

    return [
      {
        id: 'last-sunday',
        label: 'วันอาทิตย์ที่ผ่านมา ⛪',
        date: lastSunStr,
      },
      {
        id: 'last-friday',
        label: 'วันศุกร์ที่ผ่านมา 🏡',
        date: lastFriStr,
      },
      {
        id: 'yesterday',
        label: 'เมื่อวาน 🗓️',
        date: yDayStr,
      },
    ];
  }, []);

  const handleSelectMemberForCheckIn = (member: Member) => {
    setSelectedMember(member);
    setSearchValue(formatMemberSearchDisplay(member));
    setShowSuggestions(false);
  };

  const isAnyModalOpen = Boolean(
    isMenuHubOpen ||
    isMemberModalOpen ||
    isRosterModalOpen ||
    isNfcToolOpen ||
    isAttendanceOpen ||
    isWeeklyReportOpen ||
    isCareGroupManagerOpen ||
    isSupabaseModalOpen ||
    isQuickNewcomerOpen ||
    isNewcomerModalOpen ||
    isBirthdayBlessingOpen ||
    currentSuccessRecord
  );

  const isActivelyWaitingForNfc = isNfcListening && !isAnyModalOpen;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-3 sm:p-5 font-kanit">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 z-50 flex items-center gap-2 rounded-2xl border border-[#7EC8E3] bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#2B6CB0] shadow-xl animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4 text-[#06D6A0] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Clean & Minimal Top Navigation Bar */}
      <header className="mb-2 flex w-full max-w-[480px] items-center justify-between px-1 py-1">
        {/* Left: Church Logo, Church Name, Green Cloud Status Dot - Clickable to edit profile & logo */}
        <div
          onClick={() => setIsChurchProfileModalOpen(true)}
          className="group flex items-center gap-2 cursor-pointer p-1 -m-1 rounded-2xl hover:bg-sky-50/80 transition"
          title="คลิกเพื่อแก้ไขชื่อคริสตจักร หรืออัปโหลดรูปโลโก้ของคุณเอง"
        >
          <div className="relative shrink-0">
            <ChurchLogo size="md" customLogoUrl={churchLogoUrl} alt={churchName} />
            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-2xs border border-sky-200 text-sky-600 opacity-0 group-hover:opacity-100 transition">
              <Edit3 className="h-2.5 w-2.5" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-['Mali'] text-[15px] font-bold text-[#2D3748] tracking-tight group-hover:text-[#3A86FF] transition-colors truncate">
                {churchName}
              </span>
            </div>
            <p className="text-[10px] text-[#A0AEC0] -mt-0.5 font-medium truncate">{churchSlogan}</p>
          </div>
        </div>

        {/* Right: [ 📋 วันนี้ X คน ], [ 📊 รายงาน ], [ ☰ เมนู & จัดการ ], and Sound Bell toggle */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsAttendanceOpen(true)}
            className="flex items-center gap-1 rounded-full border border-[#BEE3F8] bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-[#2B6CB0] shadow-2xs hover:bg-[#EBF8FF] transition active:scale-95 cursor-pointer"
            title="ดูรายชื่อผู้เช็คอินวันนี้ และประวัติย้อนหลัง"
          >
            <UserCheck className="h-3.5 w-3.5 text-[#3A86FF]" />
            <span>วันนี้ <strong className="font-bold text-[#2B6CB0]">{todayAttendance.length}</strong></span>
          </button>

          <button
            type="button"
            onClick={() => setIsWeeklyReportOpen(true)}
            className="flex items-center gap-1 rounded-full border border-indigo-200 bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-50 transition active:scale-95 cursor-pointer"
            title="เปิดรายงานข้อมูล & ปฏิทินสถิติ"
          >
            <BarChart2 className="h-3.5 w-3.5 text-indigo-600" />
            <span>รายงาน</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMenuHubOpen(true)}
            className="flex items-center gap-1 rounded-full border border-[#D6EEFC] bg-gradient-to-r from-[#EBF8FF] to-[#D6EEFC] px-2.5 sm:px-3 py-1.5 text-xs font-bold text-[#2B6CB0] shadow-2xs hover:shadow-xs hover:border-[#7EC8E3] transition active:scale-95 cursor-pointer"
            title="เปิดศูนย์รวมเมนู & จัดการระบบ"
          >
            <Menu className="h-3.5 w-3.5 text-[#3A86FF]" />
            <span className="hidden sm:inline">เมนู & จัดการ</span>
            <span className="sm:hidden">เมนู</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D6EEFC] bg-white/90 text-[#4A5568] shadow-2xs hover:bg-[#F0F8FF] transition active:scale-90 cursor-pointer"
            title={soundEnabled ? 'ปิดเสียงกระดิ่ง' : 'เปิดเสียงกระดิ่ง'}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-[#3182CE]" />
            ) : (
              <VolumeX className="h-4 w-4 text-[#A0AEC0]" />
            )}
          </button>
        </div>
      </header>

      {/* Sleek Minimal Cloud Auto-Sync Strip */}
      <div className="mb-2.5 flex w-full max-w-[480px] items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-1.5 shadow-2xs">
        <button
          type="button"
          onClick={() => setIsSupabaseModalOpen(true)}
          className="flex items-center gap-2 min-w-0 text-left group cursor-pointer"
          title="คลิกเพื่อเปิดตั้งค่าระบบซิงค์ข้อมูลคลาวด์"
        >
          {isSyncingWithCloud ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#3A86FF] shrink-0" />
          ) : (
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                isSupabaseConnected ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
          )}
          <span className="text-xs font-medium text-slate-700 group-hover:text-[#3A86FF] transition-colors truncate">
            {isSyncingWithCloud ? 'กำลังซิงค์ข้อมูล...' : 'ซิงค์อัตโนมัติ'}
          </span>
          {lastSyncedTime && !isSyncingWithCloud && (
            <span className="text-[11px] text-slate-400 hidden sm:inline truncate">
              · {lastSyncedTime}
            </span>
          )}
        </button>

        <div className="flex items-center gap-1 rounded-xl bg-slate-100/90 p-0.5 shrink-0">
          <button
            type="button"
            onClick={handlePushCurrentStateToCloud}
            disabled={isSyncingWithCloud}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-2xs hover:text-[#3A86FF] transition active:scale-95 disabled:opacity-50 cursor-pointer"
            title="ส่งข้อมูลปัจจุบันจากเครื่องนี้ขึ้นคลาวด์"
          >
            <UploadCloud className="h-3 w-3 text-[#3A86FF]" />
            <span>อัปเดตขึ้นคลาวด์</span>
          </button>

          <button
            type="button"
            onClick={() => syncWithSupabase(true)}
            disabled={isSyncingWithCloud}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-2xs hover:text-emerald-600 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            title="ดึงข้อมูลล่าสุดจากคลาวด์ลงเครื่องนี้"
          >
            <DownloadCloud className="h-3 w-3 text-emerald-600" />
            <span>ดึงข้อมูล</span>
          </button>
        </div>
      </div>

      {/* Birthday Celebration & Notification Banner + NFC Status side-by-side */}
      <BirthdayNotificationBanner
        birthdayMembers={birthdayMembers}
        onOpenBlessingModal={() => setIsBirthdayBlessingOpen(true)}
        onSelectMemberForCheckIn={handleSelectMemberForCheckIn}
        isNfcListening={isNfcListening}
        isActivelyWaitingForNfc={isActivelyWaitingForNfc}
        isNfcScanInProgress={isNfcScanInProgress}
        isNfcCardNear={isNfcCardNear}
        onToggleNfc={() => {
          setIsNfcListening((prev) => !prev);
          showToast(
            isNfcListening
              ? '⏸️ พักการสแกน NFC ชั่วคราว'
              : '📲 เปิดระบบพร้อมสแกนบัตร NFC แล้วค่ะ'
          );
        }}
      />

      {/* Main Container Card matching user CSS - stays completely still */}
      <div
        id="main-checkin-card"
        data-nfc-waiting={isActivelyWaitingForNfc ? 'true' : 'false'}
        data-nfc-matched={isNfcScanMatched ? 'true' : 'false'}
        data-nfc-near={isNfcCardNear ? 'true' : 'false'}
        data-nfc-scanning={isNfcScanInProgress ? 'true' : 'false'}
        className={`w-full max-w-[480px] rounded-[24px] bg-white p-6 sm:p-8 transition-colors ${
          isNfcScanMatched || isNfcScanInProgress
            ? 'border-[#3A86FF]'
            : isNfcCardNear
            ? 'border-emerald-400'
            : ''
        } ${
          isRetroactiveMode
            ? 'border-3 border-amber-300 shadow-[0_10px_30px_rgba(245,158,11,0.22)] ring-2 ring-amber-200/60'
            : 'border-3 border-[#D6EEFC] shadow-[0_10px_30px_rgba(126,200,227,0.25)]'
        }`}
      >
        {/* Headline Section */}
        <div className="text-center">
          <h2 className="mt-0.5 mb-1 font-['Mali'] text-[24px] sm:text-[26px] font-bold text-[#3A86FF] leading-tight">
            {isRetroactiveMode
              ? 'เช็คอินย้อนหลัง 🗓️'
              : currentSessionType === 'CHURCH'
              ? 'เช็คอินวันอาทิตย์ 💙'
              : 'เช็คอินกลุ่มแคร์ 🏡'}
          </h2>

          {/* Minimal Date Display directly under the Headline */}
          <div className="mb-2 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
            <Calendar className="h-3.5 w-3.5 text-sky-500 shrink-0" />
            <span>
              {isRetroactiveMode
                ? `บันทึกย้อนหลัง: วันที่ ${formatThaiDate(retroactiveDate)}`
                : getTodayThaiDateMinimal()}
            </span>
          </div>
          <p
            onClick={() => setIsChurchProfileModalOpen(true)}
            className="mt-0 mb-3 text-[14px] text-[#718096] hover:text-[#3A86FF] transition-colors cursor-pointer"
            title="คลิกเพื่อแก้ไขข้อความต้อนรับ"
          >
            {isRetroactiveMode
              ? `บันทึกข้อมูลย้อนหลังสำหรับวันที่ ${formatThaiDate(retroactiveDate)} ⏳`
              : currentSessionType === 'CHURCH'
              ? welcomeMessage
              : currentCareGroup
              ? `ยินดีต้อนรับสู่ ${currentCareGroup} 💙`
              : 'ยินดีต้อนรับสู่กลุ่มแคร์ (กรุณาระบุชื่อกลุ่มแคร์) 🏡'}
          </p>
        </div>

        {/* 3-Tab Dashboard Switcher: [ ⛪ รอบนมัสการ ] [ 🏡 กลุ่มแคร์ ] [ 🗓️ เช็คอินย้อนหลัง ] */}
        <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl border-2 border-[#D6EEFC] bg-[#F0F8FF] p-1.5 text-xs font-medium shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setCurrentSessionType('CHURCH');
              setIsRetroactiveMode(false);
            }}
            className={`flex items-center justify-center gap-1 rounded-xl py-2 px-1 transition ${
              currentSessionType === 'CHURCH' && !isRetroactiveMode
                ? 'bg-white text-[#2B6CB0] font-bold shadow-xs'
                : 'text-[#718096] hover:text-[#2D3748]'
            }`}
          >
            <Church className="h-3.5 w-3.5 text-[#3A86FF] shrink-0" />
            <span className="truncate">รอบนมัสการ</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentSessionType('CARE_GROUP');
              setIsRetroactiveMode(false);
            }}
            className={`flex items-center justify-center gap-1 rounded-xl py-2 px-1 transition ${
              currentSessionType === 'CARE_GROUP' && !isRetroactiveMode
                ? 'bg-white text-[#059669] font-bold shadow-xs'
                : 'text-[#718096] hover:text-[#2D3748]'
            }`}
          >
            <Home className="h-3.5 w-3.5 text-[#06D6A0] shrink-0" />
            <span className="truncate">กลุ่มแคร์</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRetroactiveMode(true);
            }}
            className={`flex items-center justify-center gap-1 rounded-xl py-2 px-1 transition ${
              isRetroactiveMode
                ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300 shadow-xs'
                : 'text-[#718096] hover:text-amber-800'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="truncate">ย้อนหลัง</span>
          </button>
        </div>

        {/* Care Group selection when on CARE_GROUP tab and not retroactive */}
        {currentSessionType === 'CARE_GROUP' && !isRetroactiveMode && (
          <div className="mb-4 rounded-2xl border border-teal-200 bg-teal-50/50 p-2.5 shadow-2xs">
              {careGroups.length === 0 ? (
                /* No care group names yet: Direct typing & saving UI */
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#059669] flex items-center gap-1">
                      <Home className="h-3.5 w-3.5 text-[#06D6A0]" />
                      พิมพ์ชื่อกลุ่มแคร์:
                    </span>
                    <span className="text-[11px] text-[#A0AEC0]">
                      (ยังไม่มีข้อมูล สามารถพิมพ์แล้วบันทึกได้ทันที)
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={inlineCareGroupInput}
                      onChange={(e) => setInlineCareGroupInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewCareGroup(inlineCareGroupInput);
                        }
                      }}
                      placeholder="พิมพ์ชื่อกลุ่มแคร์ เช่น แคร์บ้านสุขใจ, แคร์วัยรุ่น..."
                      className="flex-1 rounded-xl border border-[#06D6A0] bg-white px-3 py-1.5 text-xs text-[#2D3748] placeholder:text-[#A0AEC0] focus:ring-2 focus:ring-[#06D6A0]/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddNewCareGroup(inlineCareGroupInput)}
                      className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#06D6A0] to-[#059669] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95 transition shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>บันทึกชื่อ</span>
                    </button>
                  </div>
                </div>
              ) : isRenamingCurrentInline ? (
                /* Inline Rename Mode */
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-[#2B6CB0]">
                    แก้ไขชื่อกลุ่มแคร์ &quot;{currentCareGroup}&quot;:
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={renameInputValue}
                      onChange={(e) => setRenameInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRenameCurrentCareGroup(renameInputValue);
                        } else if (e.key === 'Escape') {
                          setIsRenamingCurrentInline(false);
                        }
                      }}
                      autoFocus
                      className="flex-1 rounded-xl border border-[#3A86FF] bg-white px-2.5 py-1.5 text-xs text-[#2D3748] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRenameCurrentCareGroup(renameInputValue)}
                      className="rounded-xl bg-[#3A86FF] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#2563EB]"
                    >
                      ตกลง
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRenamingCurrentInline(false)}
                      className="rounded-xl border border-[#CBD5E1] bg-white px-2 py-1.5 text-xs text-[#718096]"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : isAddingCareGroupInline ? (
                /* Inline Add Another Care Group Mode */
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-[#059669]">
                    พิมพ์เพิ่มชื่อกลุ่มแคร์ใหม่:
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={inlineCareGroupInput}
                      onChange={(e) => setInlineCareGroupInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewCareGroup(inlineCareGroupInput);
                        } else if (e.key === 'Escape') {
                          setIsAddingCareGroupInline(false);
                        }
                      }}
                      autoFocus
                      placeholder="พิมพ์ชื่อกลุ่มแคร์ใหม่..."
                      className="flex-1 rounded-xl border border-[#06D6A0] bg-white px-2.5 py-1.5 text-xs text-[#2D3748] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddNewCareGroup(inlineCareGroupInput)}
                      className="rounded-xl bg-[#06D6A0] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#059669]"
                    >
                      บันทึก
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCareGroupInline(false)}
                      className="rounded-xl border border-[#CBD5E1] bg-white px-2 py-1.5 text-xs text-[#718096]"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal Mode: Dropdown with saved care groups, inline edit, and manage button */
                <div className="flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1 text-[#4A5568] font-medium shrink-0">
                    <Home className="h-3.5 w-3.5 text-[#06D6A0]" />
                    <span>กลุ่มแคร์:</span>
                  </div>

                  <div className="flex items-center gap-1.5 min-w-0">
                    <select
                      value={currentCareGroup}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW__') {
                          setIsAddingCareGroupInline(true);
                          setInlineCareGroupInput('');
                        } else {
                          setCurrentCareGroup(e.target.value);
                        }
                      }}
                      className="max-w-[150px] sm:max-w-[180px] truncate rounded-xl border border-[#BEE3F8] bg-white px-2.5 py-1.5 text-xs font-bold text-[#059669] focus:border-[#06D6A0] focus:outline-none shadow-2xs"
                    >
                      {careGroups.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                      <option value="__ADD_NEW__">+ พิมพ์ชื่อใหม่...</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setRenameInputValue(currentCareGroup);
                        setIsRenamingCurrentInline(true);
                      }}
                      className="rounded-xl border border-[#D6EEFC] bg-white p-1.5 text-[#4A5568] hover:bg-[#EBF8FF] hover:text-[#2B6CB0] transition shadow-2xs"
                      title="แก้ไขชื่อกลุ่มแคร์นี้"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCareGroupManagerOpen(true)}
                      className="rounded-xl border border-[#D6EEFC] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#2B6CB0] hover:bg-[#EBF8FF] transition whitespace-nowrap shadow-2xs"
                      title="จัดการชื่อกลุ่มแคร์ทั้งหมด"
                    >
                      จัดการแคร์
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Retroactive Date Selection Panel (Active when on Retroactive Tab) */}
        {isRetroactiveMode && (
          <div className="mb-4 rounded-2xl border-2 border-amber-300 bg-amber-50/50 p-3.5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>ระบุวันและเวลาที่มาร่วมจริง (กรณีลืมเช็คอิน):</span>
              </span>
              <span className="rounded-md bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                บันทึกย้อนหลัง
              </span>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                ⚡ ทางลัดวันที่ยอดนิยม:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {presetRetroactiveDates.map((preset) => {
                  const isSelected = retroactiveDate === preset.date;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setRetroactiveDate(preset.date)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition active:scale-98 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-400 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-amber-50/50 hover:border-amber-200'
                      }`}
                    >
                      <span className="text-xs font-medium leading-tight">
                        {preset.label}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        {formatThaiDate(preset.date)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Date & Time Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  เลือกวันที่เข้าร่วมจริง <span className="text-red-500">*</span>:
                </label>
                <DatePickerField
                  value={retroactiveDate}
                  onChange={(val) => setRetroactiveDate(val)}
                  maxDate={todayStr}
                  variant="amber"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  เวลาโดยประมาณ:
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    value={retroactiveTime}
                    onChange={(e) => setRetroactiveTime(e.target.value)}
                    className="flex-1 rounded-xl border-2 border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setRetroactiveTime('10:00')}
                    className="rounded-lg bg-amber-100 hover:bg-amber-200 px-2 py-2 text-[10px] font-bold text-amber-900 shrink-0"
                    title="รอบนมัสการ 10:00 น."
                  >
                    10:00 ⛪
                  </button>
                  <button
                    type="button"
                    onClick={() => setRetroactiveTime('19:30')}
                    className="rounded-lg bg-teal-100 hover:bg-teal-200 px-2 py-2 text-[10px] font-bold text-teal-900 shrink-0"
                    title="กลุ่มแคร์ 19:30 น."
                  >
                    19:30 🏡
                  </button>
                </div>
              </div>
            </div>

            {/* Optional Reason / Notes */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                หมายเหตุ / เหตุผลที่บันทึกย้อนหลัง <span className="text-slate-400 font-normal">(ระบุหรือไม่ก็ได้)</span>:
              </label>
              <div className="flex gap-1.5 flex-wrap mb-1.5">
                {['ลืมแตะบัตร', 'ช่วยงานเวทีก่อน', 'มาสายเล็กน้อย', 'เพิ่งนึกขึ้นได้'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRetroactiveReason(r)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] transition ${
                      retroactiveReason === r
                        ? 'bg-amber-200 text-amber-900 font-bold border border-amber-300'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={retroactiveReason}
                onChange={(e) => setRetroactiveReason(e.target.value)}
                placeholder="เช่น มาร่วมรอบเช้าแต่รีบไปซ้อมดนตรี, ลืมแตะบัตร..."
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Notice & Switch back to today button */}
            <div className="flex items-center justify-between rounded-xl bg-amber-100/70 border border-amber-200 p-2 text-xs text-amber-950">
              <span className="flex items-center gap-1 font-medium truncate">
                <span>💡 จะบันทึกเข้าประวัติ: <strong>{formatThaiDate(retroactiveDate)}</strong></span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsRetroactiveMode(false);
                }}
                className="text-xs text-amber-800 hover:underline font-bold shrink-0 ml-2"
              >
                กลับสู่เช็คอินวันนี้ ✕
              </button>
            </div>
          </div>
        )}

        {/* Quick Check-in Instant Success Alert Banner (Bypasses Window Pop-up) */}
        {quickCheckInBanner && (
          <div
            id="quick-checkin-banner"
            className="mb-4 rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-3.5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs shrink-0 animate-pulse">
                  <Zap className="h-5 w-5 fill-amber-300 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-emerald-950">
                      ⚡ เช็คอินด่วนสำเร็จ!
                    </span>
                    <span className="font-extrabold text-sm text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded-lg">
                      คุณ &quot;{quickCheckInBanner.record.nickname}&quot;
                    </span>
                    <span className="rounded-full bg-emerald-200/90 px-2 py-0.5 text-[11px] font-bold text-emerald-900 tabular-nums">
                      🌡️ {quickCheckInBanner.temp.toFixed(1)}°C
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      เวลา {quickCheckInBanner.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-1">
                    ✓ บันทึกประวัติเข้าระบบทันทีโดยไม่แสดงหน้าต่างป็อปอัป พร้อมรับผู้เข้าร่วมคนถัดไปได้เลย ✨
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSuccessRecord(quickCheckInBanner.record);
                    setQuickCheckInBanner(null);
                  }}
                  className="rounded-xl border border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-semibold shadow-2xs transition cursor-pointer"
                  title="เปิดดูการ์ดพระคัมภีร์และร่วมอวยพร"
                >
                  📜 ดูการ์ด
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteAttendanceRecord(quickCheckInBanner.id);
                    setQuickCheckInBanner(null);
                  }}
                  className="rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition cursor-pointer"
                  title="ยกเลิกการเช็คอินนี้"
                >
                  ↩️ ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search & Check-in Form (Placed Above NFC Zone for optimal flow) */}
        <form onSubmit={handleCheckIn} className="space-y-4">
          <div ref={searchContainerRef} className="relative">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <label
                  htmlFor="searchMember"
                  className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <span>ค้นหาชื่อสมาชิก</span>
                </label>
                {isRetroactiveMode && (
                  <span className="rounded-md bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 text-[10px] font-bold">
                    ย้อนหลัง: {formatThaiDate(retroactiveDate)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  id="home-add-member-shortcut"
                  onClick={() => handleOpenAddMember(selectedMember ? undefined : searchValue)}
                  className="flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-[#2B6CB0] hover:bg-sky-100 hover:border-sky-300 transition shadow-2xs cursor-pointer active:scale-95"
                  title="ลงทะเบียนเพิ่มสมาชิกใหม่เข้าทำเนียบคริสตจักร"
                >
                  <UserPlus className="h-3 w-3 text-[#3A86FF]" />
                  <span>+ เพิ่มสมาชิก</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenQuickNewcomer(selectedMember ? undefined : searchValue)}
                  className="flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs cursor-pointer active:scale-95"
                  title="เช็คอินผู้มาใหม่ ไม่ต้องซักประวัติเยอะ ใส่แค่ชื่อและคนที่พามา"
                >
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  <span>+ คนมาใหม่ 🌟</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                id="searchMember"
                placeholder="พิมพ์ชื่อเล่น หรือ ชื่อจริง..."
                value={searchValue}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  setSelectedMember(null);
                  setShowSuggestions(true);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 pl-10 pr-16 py-3 text-[15px] text-slate-800 transition-all focus:border-[#7EC8E3] focus:bg-white focus:ring-3 focus:ring-[#7EC8E3]/20 focus:outline-none placeholder:text-slate-400"
              />

              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchValue('');
                      setSelectedMember(null);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                    title="ล้างข้อความค้นหา"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-[#3182CE] transition cursor-pointer"
                  tabIndex={-1}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Suggestions Dropdown */}
            {showSuggestions && (
              <div
                id="search-suggestions-dropdown"
                className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
              >
                {filteredSuggestions.length > 0 ? (
                  <>
                    {filteredSuggestions.map((m) => {
                      const isBday = isBirthdayToday(m.birthday);
                      const existingRec = getExistingCheckInForTargetSession(m);
                      return (
                        <div
                          key={m.id}
                          onClick={() => handleSelectSuggestion(m)}
                          className={`group flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 transition ${
                            existingRec
                              ? 'bg-emerald-50/60 hover:bg-emerald-50'
                              : isBday
                              ? 'bg-[#FFFDF5] hover:bg-[#FFF9DB]'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              {m.avatarUrl ? (
                                <img
                                  src={m.avatarUrl}
                                  alt={m.nickname}
                                  className={`h-9 w-9 rounded-xl object-cover border shrink-0 ${
                                    isBday ? 'border-[#F59E0B]' : 'border-slate-200'
                                  }`}
                                />
                              ) : (
                                <div
                                  className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white shrink-0"
                                  style={{ backgroundColor: m.avatarBgColor || '#7EC8E3' }}
                                >
                                  {m.nickname.slice(0, 2)}
                                </div>
                              )}
                              {isBday && (
                                <span className="absolute -top-1 -right-1 text-xs" title="วันเกิดวันนี้!">
                                  🎂
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-sm text-slate-800">
                                  {m.nickname}
                                </span>
                                {m.fullName && m.fullName !== m.nickname && (
                                  <span className="text-xs text-slate-500 truncate">
                                    {m.fullName}
                                  </span>
                                )}
                                {m.ageGroup === 'CHILD' && (
                                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-medium">
                                    เด็ก
                                  </span>
                                )}
                                {isBday && (
                                  <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                                    🎂 วันเกิด
                                  </span>
                                )}
                                {existingRec && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                                    ✓ เช็คอินแล้ว ({existingRec.checkInTime})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                                <span>{m.careGroup ? `🏡 ${m.careGroup}` : m.role}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditMember(m);
                                setShowSuggestions(false);
                              }}
                              className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-slate-400 hover:border-sky-200 hover:text-[#2B6CB0] hover:bg-sky-50 transition cursor-pointer"
                              title="แก้ไขข้อมูล หรือรูปถ่าย"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Bottom option to check-in as newcomer */}
                    <div className="mt-1 border-t border-slate-100 pt-1.5 px-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSuggestions(false);
                          handleOpenQuickNewcomer(searchValue);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                          <span>ไม่ใช่คนที่ค้นหาข้างต้น? <strong>เช็คอินเป็นคนมาใหม่ 🌟</strong></span>
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-semibold">
                          Newcomer Tag
                        </span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-3 text-center">
                    <p className="text-xs text-[#718096]">
                      ไม่พบชื่อ &quot;{searchValue}&quot; ในระบบสมาชิก
                    </p>
                    <div className="mt-2.5 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenQuickNewcomer(searchValue);
                          setShowSuggestions(false);
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 py-2 font-['Mali'] text-xs font-bold text-white shadow-xs hover:shadow transition active:scale-98 cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>เช็คอินคนมาใหม่ (รวดเร็ว) 🌟</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleOpenAddMember(searchValue);
                          setShowSuggestions(false);
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2 font-['Mali'] text-xs font-bold text-[#2B6CB0] shadow-xs hover:bg-sky-100 transition active:scale-98 cursor-pointer"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-[#3A86FF]" />
                        <span>ลงทะเบียนสมาชิกเต็มรูปแบบ 📝</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Selected Member Confirmation / Birthday Callout */}
            {selectedMember && (() => {
              const existingRec = getExistingCheckInForTargetSession(selectedMember);
              return (
                <div
                  className={`mt-2.5 flex items-center justify-between rounded-2xl p-2.5 sm:p-3 text-xs transition border ${
                    existingRec
                      ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
                      : isBirthdayToday(selectedMember.birthday)
                      ? 'border-[#FEEA9A] bg-gradient-to-r from-[#FFFDF5] via-[#FFF9DB] to-[#FFEE93]/70 text-[#B7791F] shadow-xs'
                      : 'border-[#D6EEFC] bg-[#F0F8FF] text-[#2B6CB0]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      {selectedMember.avatarUrl ? (
                        <img
                          src={selectedMember.avatarUrl}
                          alt={selectedMember.nickname}
                          className={`h-9 w-9 rounded-xl object-cover border-2 shadow-2xs ${
                            isBirthdayToday(selectedMember.birthday)
                              ? 'border-[#F59E0B]'
                              : 'border-[#7EC8E3]'
                          }`}
                        />
                      ) : (
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white shadow-2xs"
                          style={{ backgroundColor: selectedMember.avatarBgColor || '#7EC8E3' }}
                        >
                          {selectedMember.nickname.slice(0, 2)}
                        </div>
                      )}
                      {isBirthdayToday(selectedMember.birthday) && (
                        <span className="absolute -top-1 -right-1 text-xs">🎂</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[#2D3748] truncate">
                          {selectedMember.nickname}
                        </span>
                        <span className="text-[11px] text-[#718096] truncate">
                          ({selectedMember.fullName})
                        </span>
                        {isBirthdayToday(selectedMember.birthday) && (
                          <span className="rounded-full bg-gradient-to-r from-[#FFD166] to-[#FF9EAA] px-1.5 py-0.2 text-[10px] font-bold text-slate-800 shadow-2xs animate-bounce">
                            🎂 วันเกิดวันนี้!
                          </span>
                        )}
                        {existingRec && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800">
                            ✓ เช็คอินรอบนี้แล้ว ({existingRec.checkInTime}) · จำกัด 1 ครั้ง/วัน/กลุ่มแคร์
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#718096] block truncate">
                        {selectedMember.role}
                        {isBirthdayToday(selectedMember.birthday) && ' • ร่วมอธิษฐานอวยพรวันเกิด ✨'}
                      </span>
                    </div>
                  </div>

                  {isBirthdayToday(selectedMember.birthday) && (
                    <button
                      type="button"
                      onClick={() => setIsBirthdayBlessingOpen(true)}
                      className="shrink-0 rounded-xl bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#B7791F] border border-[#FEEA9A] hover:bg-[#FFF3BF] shadow-2xs transition cursor-pointer"
                    >
                      💌 ร่วมอวยพร
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Redesigned Temperature Section with Interactive Number Pad (Numpad) */}
          <TemperatureNumpad
            temperature={temperature}
            onTemperatureChange={handleTemperatureChange}
            onStepTemp={handleStepTemp}
            medicalStatus={medicalStatus}
            soundEnabled={soundEnabled}
            onTriggerWarning={triggerWarningFeedback}
            showClinicalGuide={showClinicalGuide}
            onToggleClinicalGuide={() => setShowClinicalGuide((prev) => !prev)}
            isNumpadExpanded={isNumpadExpanded}
            onToggleNumpadExpanded={handleToggleNumpadExpanded}
          />

          {/* Submit & Quick Check-in Action Buttons (Super Clean & Minimal) */}
          <div className="pt-1 space-y-2">
            {(() => {
              const existingSelectedRec = selectedMember
                ? getExistingCheckInForTargetSession(selectedMember)
                : undefined;
              if (existingSelectedRec) {
                return (
                  <button
                    type="button"
                    id="submit-checkin-btn"
                    onClick={() => {
                      if (selectedMember) executeCheckIn(selectedMember);
                    }}
                    className="w-full rounded-[16px] p-3.5 font-['Mali'] text-[16px] sm:text-[17px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
                  >
                    ✓ เช็คอินรอบนี้แล้วเมื่อ {existingSelectedRec.checkInTime} (จำกัด 1 ครั้ง/วัน/กลุ่มแคร์)
                  </button>
                );
              }

              const targetDisplayName = selectedMember
                ? selectedMember.nickname
                : searchValue.trim()
                ? searchValue.trim()
                : 'สมาชิก';

              return (
                <div className="space-y-2">
                  {/* Primary: Normal Check-in Button (Opens Blessing Card & Scripture) */}
                  <button
                    type="submit"
                    id="submit-checkin-btn"
                    className="w-full rounded-[18px] p-3.5 font-['Mali'] text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer bg-gradient-to-r from-[#7EC8E3] via-[#48CAE4] to-[#0284C7] shadow-[0_4px_16px_rgba(72,202,228,0.35)] hover:shadow-[0_6px_20px_rgba(2,132,199,0.45)] flex items-center justify-center gap-2.5 group"
                    title="เช็คอินรอบนมัสการ พร้อมเปิดการ์ดอวยพรและข้อพระคัมภีร์หนุนใจ"
                  >
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <span className="text-lg">💙</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[16px] sm:text-[17px] font-extrabold block leading-tight">
                        {isRetroactiveMode
                          ? `เช็คอินย้อนหลัง: คุณ ${targetDisplayName} (${temperature}°C)`
                          : `เช็คอิน: คุณ ${targetDisplayName} (${temperature}°C)`}
                      </span>
                      <span className="text-[11px] font-medium text-white/90 flex items-center justify-center gap-1 opacity-95 mt-0.5">
                        <span>✨ แสดงการ์ดอวยพร & พระวจนะ</span>
                      </span>
                    </div>
                  </button>

                  {/* Single Clean & Minimal Quick Check-in Button (Bypasses Window Pop-up) */}
                  <button
                    type="button"
                    id="quick-checkin-btn"
                    onClick={(e) => handleQuickCheckIn(e)}
                    className="w-full rounded-xl py-2.5 px-3 bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-['Mali'] text-xs sm:text-[13px] font-bold transition shadow-2xs active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                    title="เช็คอินด่วนทันที ไม่แสดงหน้าต่างป็อปอัป (Quick Check-in - No Window Pop-up)"
                  >
                    <Zap className="h-3.5 w-3.5 fill-emerald-500 text-emerald-600 shrink-0" />
                    <span>⚡ เช็คอินด่วน (บันทึกทันที · ไม่เด้งหน้าต่าง)</span>
                  </button>
                </div>
              );
            })()}

            {/* Recent Activity Section (Last 3-5 Check-ins Today, Scrollable) */}
            {(todayAttendance.length > 0 || attendance.length > 0) && (
              <div
                id="recent-activity-section"
                className="mt-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 transition-all"
              >
                {/* Section Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Clock className="h-3.5 w-3.5 text-[#3A86FF] shrink-0" />
                    <span className="text-xs font-bold text-[#2D3748] truncate">
                      {todayAttendance.length > 0
                        ? 'เช็คอินล่าสุดวันนี้ (Recent Activity)'
                        : 'รายการเช็คอินล่าสุด (Recent Activity)'}
                    </span>
                    <span className="rounded-full bg-sky-100 text-[#2B6CB0] px-2 py-0.2 text-[10px] font-bold shrink-0">
                      {(todayAttendance.length > 0 ? todayAttendance : attendance).slice(0, 5).length}{' '}
                      รายการ
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {attendance.length > 0 && (
                      confirmUndoLast ? (
                        <div className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-1.5 py-0.5">
                          <button
                            type="button"
                            onClick={handleUndoLastCheckIn}
                            className="rounded bg-red-600 hover:bg-red-700 px-2 py-0.5 text-[10px] font-bold text-white cursor-pointer"
                          >
                            ยืนยันลบ
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmUndoLast(false)}
                            className="px-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          id="undo-last-checkin-btn"
                          onClick={() => setConfirmUndoLast(true)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-600 hover:text-white px-2 py-0.5 text-[10.5px] font-bold text-red-600 transition-all shadow-2xs active:scale-95 cursor-pointer"
                          title={`คลิกเพื่อยกเลิกการเช็คอินล่าสุดของ คุณ${attendance[0].nickname || attendance[0].memberName}`}
                        >
                          <Trash2 className="h-3 w-3 shrink-0" />
                          <span>ยกเลิกล่าสุด</span>
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() => setIsAttendanceOpen(true)}
                      className="text-[11px] font-semibold text-[#3A86FF] hover:text-[#2B6CB0] hover:underline cursor-pointer"
                    >
                      ดูทั้งหมด
                    </button>
                  </div>
                </div>

                {/* Scrollable List of Last 3-5 Check-ins */}
                <div className="max-h-[168px] overflow-y-auto space-y-1.5 pr-0.5">
                  {(todayAttendance.length > 0 ? todayAttendance : attendance)
                    .slice(0, 5)
                    .map((rec, idx) => {
                      const matchedMember = members.find((m) => m.id === rec.memberId);
                      const avatarUrl = rec.avatarUrl || matchedMember?.avatarUrl;
                      const avatarBg = matchedMember?.avatarBgColor || '#7EC8E3';
                      const displayNickname = rec.nickname || rec.memberName;

                      return (
                        <div
                          key={rec.id}
                          className={`flex items-center justify-between gap-2.5 rounded-xl border px-2.5 py-2 transition ${
                            idx === 0
                              ? 'border-sky-200 bg-white shadow-2xs'
                              : 'border-slate-100 bg-white/85 hover:bg-white'
                          }`}
                        >
                          {/* Left: Avatar + Name & Meta */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={displayNickname}
                                  className="h-9 w-9 rounded-xl object-cover border border-sky-200"
                                />
                              ) : (
                                <div
                                  className="flex h-9 w-9 items-center justify-center rounded-xl font-['Mali'] text-xs font-bold text-white shadow-2xs"
                                  style={{ backgroundColor: avatarBg }}
                                >
                                  {displayNickname.slice(0, 2)}
                                </div>
                              )}
                              {idx === 0 && (
                                <span
                                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                                  title="เช็คอินล่าสุด"
                                />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-[#2D3748] truncate">
                                  {displayNickname}
                                </span>
                                {rec.memberName && rec.memberName !== displayNickname && (
                                  <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                                    ({rec.memberName})
                                  </span>
                                )}
                                {rec.isVisitor && (
                                  <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9.5px] font-bold text-emerald-700 border border-emerald-200 shrink-0">
                                    มาใหม่ 🌟
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 mt-0.5">
                                <span className="font-medium text-slate-600">
                                  {rec.temperature.toFixed(1)}°C
                                </span>
                                <span>•</span>
                                <span>
                                  {rec.method === 'NFC' ? '📲 แตะบัตร NFC' : '🔍 ค้นหาชื่อ'}
                                </span>
                                {todayAttendance.length === 0 && rec.date && (
                                  <>
                                    <span>•</span>
                                    <span>{formatThaiDate(rec.date)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Check-in Time Badge */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="rounded-lg bg-sky-50 border border-sky-100 px-2 py-1 text-[11px] font-bold text-[#2B6CB0] tabular-nums">
                              {rec.checkInTime}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Divider matching user template */}
        <div className="relative my-5 text-center text-xs font-medium text-[#A0AEC0]">
          <div className="absolute top-1/2 left-0 h-[1px] w-[22%] sm:w-[26%] bg-[#E2E8F0]" />
          <span className="bg-white px-3 text-[#718096] flex items-center gap-1.5 justify-center inline-flex">
            <Smartphone className="h-4 w-4 text-[#3A86FF]" />
            <span>หรือแตะบัตร NFC เพื่อเช็คอินทันที</span>
          </span>
          <div className="absolute top-1/2 right-0 h-[1px] w-[22%] sm:w-[26%] bg-[#E2E8F0]" />
        </div>

        {/* NFC Zone Component (Takes the temperature entered above) */}
        <NfcZone
          members={members}
          onNfcScan={handleNfcScan}
          isScanning={isActivelyWaitingForNfc}
          onListeningChange={setIsNfcListening}
          onOpenNfcTool={handleOpenNfcTool}
          onUpdateMemberNfc={handleUpdateMemberNfc}
          isCardNear={isNfcCardNear}
          onCardNearChange={setIsNfcCardNear}
          isScanInProgress={isNfcScanInProgress}
          onScanInProgress={handleNfcScanInProgress}
          currentTemperature={temperature}
        />

        {/* Footer greeting */}
        <div
          onClick={() => setIsChurchProfileModalOpen(true)}
          className="mt-6 text-center text-xs text-[#A0AEC0] hover:text-[#3A86FF] transition-colors cursor-pointer"
          title="คลิกเพื่อแก้ไขข้อความท้ายหน้า"
        >
          {footerMessage}
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        record={currentSuccessRecord}
        onClose={() => setCurrentSuccessRecord(null)}
        onUndo={(recordId) => handleDeleteAttendanceRecord(recordId)}
      />

      {/* Attendance Drawer */}
      <AttendanceDrawer
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        onBackToMenu={() => {
          setIsAttendanceOpen(false);
          setIsMenuHubOpen(true);
        }}
        records={attendance}
        members={members}
        onDeleteRecord={handleDeleteAttendanceRecord}
        onClearDateRecords={handleClearDateAttendance}
      />

      {/* Member Management Form Modal (Add, Edit, Live Camera Snapshot, Upload) */}
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          setMemberToEdit(null);
          setOpenedFromRoster(false);
        }}
        backLabel={
          memberModalOrigin === 'NEWCOMER'
            ? 'หน้าคนมาใหม่'
            : memberModalOrigin === 'MENU'
            ? 'เมนูหลัก'
            : 'ทำเนียบสมาชิก'
        }
        onBackToRoster={
          memberModalOrigin === 'NEWCOMER'
            ? () => {
                setIsMemberModalOpen(false);
                setMemberToEdit(null);
                setOpenedFromRoster(false);
                setIsNewcomerModalOpen(true);
              }
            : memberModalOrigin === 'MENU'
            ? () => {
                setIsMemberModalOpen(false);
                setMemberToEdit(null);
                setOpenedFromRoster(false);
                setIsMenuHubOpen(true);
              }
            : openedFromRoster || Boolean(memberToEdit) || memberModalOrigin === 'ROSTER'
            ? () => {
                setIsMemberModalOpen(false);
                setMemberToEdit(null);
                setOpenedFromRoster(false);
                setIsRosterModalOpen(true);
              }
            : undefined
        }
        memberToEdit={memberToEdit}
        onSaveMember={handleSaveMember}
        onDeleteMember={handleDeleteMember}
        initialNickname={selectedMember ? '' : searchValue}
        savedCareGroups={careGroups}
        onAddNewCareGroup={handleAddNewCareGroup}
        onOpenNfcTool={(memberId) => handleOpenNfcTool(memberId, undefined, 'MEMBER')}
      />

      {/* Care Group Manager Modal */}
      <CareGroupManagerModal
        isOpen={isCareGroupManagerOpen}
        onClose={() => setIsCareGroupManagerOpen(false)}
        onBackToMenu={() => {
          setIsCareGroupManagerOpen(false);
          setIsMenuHubOpen(true);
        }}
        careGroups={careGroups}
        currentCareGroup={currentCareGroup}
        onSaveCareGroups={(groups) => {
          setCareGroups(groups);
          syncCareGroupsToCloud(groups).catch(() => {});
        }}
        onSelectCareGroup={(group) => setCurrentCareGroup(group)}
        onShowToast={showToast}
      />

      {/* Member Roster & Management Modal */}
      <MemberRosterModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        onBackToMenu={() => {
          setIsRosterModalOpen(false);
          setIsMenuHubOpen(true);
        }}
        members={members}
        onEditMember={(m) => {
          handleOpenEditMember(m, true);
        }}
        onAddNewMember={() => {
          handleOpenAddMember(undefined, true);
        }}
        onSelectForCheckIn={(m) => {
          setSelectedMember(m);
          setSearchValue(formatMemberSearchDisplay(m));
        }}
        onOpenNfcTool={(memberId) => {
          handleOpenNfcTool(memberId, undefined, 'ROSTER');
        }}
        onDeleteMember={handleDeleteMember}
        onDeleteMultipleMembers={handleDeleteMultipleMembers}
        onPushToCloud={handlePushCurrentStateToCloud}
        onPullFromCloud={() => syncWithSupabase(true)}
        isSyncingWithCloud={isSyncingWithCloud}
        isCloudConnected={isSupabaseConnected}
        lastSyncedTime={lastSyncedTime}
        isSensitiveDataVisible={isSensitiveDataVisible}
        onRequestUnlockAdmin={(reason) =>
          setPinPromptConfig({
            isOpen: true,
            reasonTitle: reason || 'ปลดล็อกเพื่อดูข้อมูลอ่อนไหว หรือแก้ไข/ลบข้อมูล',
          })
        }
        onLockAdmin={handleLockAdminMode}
      />

      {/* Weekly Check-in Report & Attendance Calendar Modal */}
      <WeeklyReportModal
        isOpen={isWeeklyReportOpen}
        onClose={() => setIsWeeklyReportOpen(false)}
        onBackToMenu={() => {
          setIsWeeklyReportOpen(false);
          setIsMenuHubOpen(true);
        }}
        attendanceHistory={attendance}
      />

      {/* Birthday Celebration & Blessing Card Modal */}
      <BirthdayBlessingModal
        isOpen={isBirthdayBlessingOpen}
        onClose={() => setIsBirthdayBlessingOpen(false)}
        onBackToMenu={() => {
          setIsBirthdayBlessingOpen(false);
          setIsMenuHubOpen(true);
        }}
        birthdayMembers={birthdayMembers}
        members={members}
        onSaveMember={handleSaveMember}
        onSelectMemberForCheckIn={(m) => {
          handleSelectMemberForCheckIn(m);
        }}
        soundEnabled={soundEnabled}
      />

      {/* Quick Newcomer Check-in Modal */}
      <QuickNewcomerModal
        isOpen={isQuickNewcomerOpen}
        onClose={() => setIsQuickNewcomerOpen(false)}
        onBack={
          quickNewcomerOrigin === 'NEWCOMER'
            ? () => {
                setIsQuickNewcomerOpen(false);
                setIsNewcomerModalOpen(true);
              }
            : undefined
        }
        members={members}
        initialName={newcomerInitialName}
        currentTemp={temperature}
        onCheckInNewcomer={handleCheckInNewcomer}
      />

      {/* Newcomer Summary & Companion Tracker Modal */}
      <NewcomerSummaryModal
        isOpen={isNewcomerModalOpen}
        onClose={() => setIsNewcomerModalOpen(false)}
        onBackToMenu={() => {
          setIsNewcomerModalOpen(false);
          setIsMenuHubOpen(true);
        }}
        members={members}
        attendanceHistory={attendance}
        onOpenQuickAdd={() => {
          setIsNewcomerModalOpen(false);
          handleOpenQuickNewcomer(undefined, true);
        }}
        onPromoteToMember={handlePromoteNewcomerToMember}
        onUpdateNewcomer={handleUpdateNewcomer}
        onDeleteNewcomer={handleDeleteMember}
        onDeleteMultipleNewcomers={handleDeleteMultipleMembers}
        onPushToCloud={handlePushCurrentStateToCloud}
        onPullFromCloud={() => syncWithSupabase(true)}
        isSyncingWithCloud={isSyncingWithCloud}
        isCloudConnected={isSupabaseConnected}
        lastSyncedTime={lastSyncedTime}
        onCheckInToday={handleCheckInTodayFromNewcomer}
        isSensitiveDataVisible={isSensitiveDataVisible}
        onRequestUnlockAdmin={(reason) =>
          setPinPromptConfig({
            isOpen: true,
            reasonTitle: reason || 'ปลดล็อกเพื่อดูเบอร์โทร หรือแก้ไข/ลบข้อมูลผู้มาใหม่',
          })
        }
      />

      {/* Supabase Cloud Configuration Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onBackToMenu={() => {
          setIsSupabaseModalOpen(false);
          setIsMenuHubOpen(true);
        }}
        onConnectionStatusChanged={() => syncWithSupabase(true)}
        onPushCurrentToCloud={handlePushCurrentStateToCloud}
        members={members}
        attendance={attendance}
        careGroups={careGroups}
      />

      {/* NFC Card Management & Writer Suite Modal */}
      <NfcToolModal
        isOpen={isNfcToolOpen}
        onClose={() => setIsNfcToolOpen(false)}
        backLabel={
          nfcToolOrigin === 'ROSTER'
            ? 'ทำเนียบสมาชิก'
            : nfcToolOrigin === 'MEMBER'
            ? 'หน้าแก้ไขสมาชิก'
            : 'เมนูหลัก'
        }
        onBackToMenu={() => {
          setIsNfcToolOpen(false);
          if (nfcToolOrigin === 'ROSTER') {
            setIsRosterModalOpen(true);
          } else if (nfcToolOrigin === 'MEMBER') {
            setIsMemberModalOpen(true);
          } else {
            setIsMenuHubOpen(true);
          }
        }}
        members={members}
        initialMemberId={nfcToolInitialMemberId}
        initialCardIdentifier={nfcToolInitialCardIdentifier}
        onUpdateMemberNfc={handleUpdateMemberNfc}
      />

      {/* Categorized Menu Hub Modal */}
      <MenuHubModal
        isOpen={isMenuHubOpen}
        onClose={() => setIsMenuHubOpen(false)}
        todayCount={todayAttendance.length}
        totalMembersCount={members.length}
        newcomersCount={newcomersList.length}
        careGroupsCount={careGroups.length}
        isSupabaseConnected={isSupabaseConnected}
        isSyncingWithCloud={isSyncingWithCloud}
        lastSyncedTime={lastSyncedTime}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        churchName={churchName}
        churchLogoUrl={churchLogoUrl}
        onOpenAttendance={() => setIsAttendanceOpen(true)}
        onOpenWeeklyReport={() => setIsWeeklyReportOpen(true)}
        onOpenNewcomers={() => setIsNewcomerModalOpen(true)}
        onOpenMembersRoster={() => setIsRosterModalOpen(true)}
        onOpenAddMember={() => handleOpenAddMember(undefined, false, true)}
        onOpenCareGroups={() => setIsCareGroupManagerOpen(true)}
        onOpenBirthdayBlessings={() => setIsBirthdayBlessingOpen(true)}
        onOpenNfcTool={() => handleOpenNfcTool(undefined, undefined, 'MENU')}
        onOpenRetroactiveMode={() => {
          setIsRetroactiveMode(true);
        }}
        onOpenSupabaseConfig={() => setIsSupabaseModalOpen(true)}
        onSyncCloud={() => syncWithSupabase(true)}
        onPushCloud={handlePushCurrentStateToCloud}
        onOpenChurchProfile={() => setIsChurchProfileModalOpen(true)}
        recoverySnapshots={recoverySnapshots}
        onRestoreSnapshot={handleRestoreSnapshot}
        onExportBackupFile={handleExportBackupFile}
        onImportBackupFile={handleImportBackupFile}
        onOpenRecoveryAndSecurity={(tab) => {
          setRecoverySecurityTab(tab);
          setIsRecoverySecurityModalOpen(true);
        }}
        auditLogsCount={auditLogs.length}
        isAdminUnlocked={isSensitiveDataVisible}
        onClearTodayAttendance={handleClearTodayAttendance}
        onClearAllAttendance={handleClearAllAttendance}
        onResetDemoData={handleResetDemoData}
      />

      {/* Recovery (Restore), Activity Audit Logs & Sensitive Data Privacy Modal */}
      <RecoveryAndSecurityModal
        isOpen={isRecoverySecurityModalOpen}
        initialTab={recoverySecurityTab}
        onClose={() => setIsRecoverySecurityModalOpen(false)}
        onBackToMenu={() => {
          setIsRecoverySecurityModalOpen(false);
          setIsMenuHubOpen(true);
        }}
        snapshots={recoverySnapshots}
        onRestoreSnapshot={handleRestoreSnapshot}
        onCreateManualSnapshot={handleCreateManualSnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
        onExportBackupFile={handleExportBackupFile}
        onImportBackupFile={handleImportBackupFile}
        auditLogs={auditLogs}
        onRefreshCloudAuditLogs={handleRefreshCloudAuditLogs}
        privacyShieldEnabled={privacyShieldEnabled}
        onTogglePrivacyShield={(enabled) => {
          setPrivacyShieldEnabled(enabled);
          setPrivacyShieldState(enabled);
          showToast(
            enabled
              ? '🛡️ เปิดระบบซ่อนข้อมูลอ่อนไหว (เบอร์โทร/ที่อยู่) เรียบร้อยแล้วค่ะ'
              : 'เปิดแสดงข้อมูลทั้งหมดโดยไม่ต้องใช้ PIN เรียบร้อยแล้วค่ะ'
          );
        }}
        isAdminUnlocked={isSensitiveDataVisible}
        onUnlockAdmin={handleUnlockAdminMode}
        onLockAdmin={handleLockAdminMode}
        onDeviceIdentityUpdated={() =>
          showToast('✓ บันทึกชื่ออุปกรณ์และผู้ใช้งานประจำเครื่องเรียบร้อยแล้วค่ะ')
        }
      />

      {/* Quick Admin PIN Prompt Dialog */}
      <AdminPinPromptModal
        isOpen={pinPromptConfig.isOpen}
        reasonTitle={pinPromptConfig.reasonTitle}
        onClose={() => setPinPromptConfig((prev) => ({ ...prev, isOpen: false }))}
        onSuccessUnlock={handleUnlockAdminMode}
      />

      {/* Church Profile & Custom Logo Upload Modal */}
      <ChurchProfileModal
        isOpen={isChurchProfileModalOpen}
        onClose={() => setIsChurchProfileModalOpen(false)}
        onBackToMenu={() => {
          setIsChurchProfileModalOpen(false);
          setIsMenuHubOpen(true);
        }}
        churchName={churchName}
        onUpdateChurchName={handleUpdateChurchName}
        churchSlogan={churchSlogan}
        onUpdateChurchSlogan={handleUpdateChurchSlogan}
        churchLogoUrl={churchLogoUrl}
        onUpdateChurchLogo={handleUpdateChurchLogo}
        welcomeMessage={welcomeMessage}
        onUpdateWelcomeMessage={handleUpdateWelcomeMessage}
        footerMessage={footerMessage}
        onUpdateFooterMessage={handleUpdateFooterMessage}
      />
    </div>
  );
}
