import React, { useState, useMemo } from 'react';
import { Member, CheckInRecord } from '../types';
import { maskPhone, maskNotes } from '../utils/auditAndPrivacy';
import {
  Sparkles,
  X,
  Search,
  Users,
  Calendar,
  UserPlus,
  Phone,
  FileText,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  Share2,
  CheckCircle2,
  ShieldAlert,
  ArrowLeft,
  Lock,
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  CheckSquare,
  Square,
} from 'lucide-react';

interface NewcomerSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu?: () => void;
  members: Member[];
  attendanceHistory: CheckInRecord[];
  onPromoteToMember: (newcomer: Member) => void;
  onCheckInToday?: (member: Member) => void;
  onUpdateNewcomer: (updatedMember: Member) => void;
  onDeleteNewcomer?: (memberId: string) => void;
  onDeleteMultipleNewcomers?: (memberIds: string[]) => void;
  onPushToCloud?: () => void;
  onPullFromCloud?: () => void;
  isSyncingWithCloud?: boolean;
  isCloudConnected?: boolean;
  lastSyncedTime?: string | null;
  onOpenQuickAdd: () => void;
  isSensitiveDataVisible?: boolean;
  onRequestUnlockAdmin?: (reason?: string) => void;
}

export const NewcomerSummaryModal: React.FC<NewcomerSummaryModalProps> = ({
  isOpen,
  onClose,
  onBackToMenu,
  members,
  attendanceHistory,
  onPromoteToMember,
  onCheckInToday,
  onUpdateNewcomer,
  onDeleteNewcomer,
  onDeleteMultipleNewcomers,
  onPushToCloud,
  onPullFromCloud,
  isSyncingWithCloud = false,
  isCloudConnected = true,
  lastSyncedTime,
  onOpenQuickAdd,
  isSensitiveDataVisible = true,
  onRequestUnlockAdmin,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'ALL' | 'FIRST_TIME' | 'RETURNING' | 'HAS_INVITER'
  >('ALL');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    nickname: string;
    fullName: string;
    phone: string;
    invitedBy: string;
    notes: string;
    isBaptized: boolean;
  }>({
    nickname: '',
    fullName: '',
    phone: '',
    invitedBy: '',
    notes: '',
    isBaptized: false,
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const newcomers = useMemo(() => {
    return members.filter(
      (m) =>
        m.isVisitor ||
        m.role?.includes('ผู้มาเยือน') ||
        m.role?.includes('ผู้มาใหม่') ||
        m.id.startsWith('V')
    );
  }, [members]);

  const newcomerStats = useMemo(() => {
    const map = new Map<
      string,
      {
        totalVisits: number;
        firstDate: string;
        lastDate: string;
        history: CheckInRecord[];
      }
    >();

    for (const nc of newcomers) {
      const records = attendanceHistory
        .filter(
          (r) =>
            r.memberId === nc.id ||
            r.memberName.toLowerCase() === nc.fullName.toLowerCase() ||
            r.nickname.toLowerCase() === nc.nickname.toLowerCase()
        )
        .sort((a, b) => b.date.localeCompare(a.date));

      const totalVisits = Math.max(records.length, 1);
      const firstDate =
        records.length > 0 ? records[records.length - 1].date : nc.firstVisitDate || '2026-09-20';
      const lastDate =
        records.length > 0 ? records[0].date : nc.firstVisitDate || '2026-09-20';

      map.set(nc.id, {
        totalVisits,
        firstDate,
        lastDate,
        history: records,
      });
    }

    return map;
  }, [newcomers, attendanceHistory]);

  const filteredNewcomers = useMemo(() => {
    return newcomers.filter((nc) => {
      const stats = newcomerStats.get(nc.id);
      const visits = stats ? stats.totalVisits : 1;
      const inviter = nc.invitedBy || '';

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        nc.nickname.toLowerCase().includes(q) ||
        nc.fullName.toLowerCase().includes(q) ||
        inviter.toLowerCase().includes(q) ||
        (nc.notes && nc.notes.toLowerCase().includes(q)) ||
        (nc.phone && nc.phone.includes(q));

      if (!matchesSearch) return false;
      if (filterType === 'FIRST_TIME') return visits <= 1;
      if (filterType === 'RETURNING') return visits >= 2;
      if (filterType === 'HAS_INVITER') return Boolean(inviter && !inviter.includes('ตนเอง'));
      return true;
    });
  }, [newcomers, newcomerStats, searchQuery, filterType]);

  const totalNewcomersCount = newcomers.length;
  const firstTimeCount = newcomers.filter(
    (nc) => (newcomerStats.get(nc.id)?.totalVisits || 1) <= 1
  ).length;
  const returningCount = newcomers.filter(
    (nc) => (newcomerStats.get(nc.id)?.totalVisits || 1) >= 2
  ).length;

  const topInviter = useMemo(() => {
    const counts = new Map<string, number>();
    for (const nc of newcomers) {
      const inv = nc.invitedBy?.trim();
      if (inv && !inv.includes('ตนเอง')) {
        const cleanInv = inv.replace(/\(.*\)/, '').trim();
        counts.set(cleanInv, (counts.get(cleanInv) || 0) + 1);
      }
    }
    let topName = 'ยังไม่มีข้อมูล';
    let topCount = 0;
    for (const [name, count] of counts.entries()) {
      if (count > topCount) {
        topCount = count;
        topName = name;
      }
    }
    return topCount > 0 ? `${topName} (${topCount} ท่าน)` : '-';
  }, [newcomers]);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const handleStartFullEdit = (nc: Member) => {
    setConfirmDeleteId(null);
    setEditingMemberId(nc.id);
    setEditForm({
      nickname: nc.nickname || '',
      fullName: nc.fullName || '',
      phone: nc.phone || '',
      invitedBy: nc.invitedBy || '',
      notes: nc.notes || '',
      isBaptized: Boolean(nc.isBaptized),
    });
  };

  const handleSaveFullEdit = (nc: Member) => {
    const trimmedNickname = editForm.nickname.trim() || nc.nickname;
    onUpdateNewcomer({
      ...nc,
      nickname: trimmedNickname,
      fullName: editForm.fullName.trim() || trimmedNickname,
      phone: editForm.phone.trim() || undefined,
      invitedBy: editForm.invitedBy.trim() || 'มาด้วยตนเอง 🌟',
      notes: editForm.notes.trim() || undefined,
      isBaptized: editForm.isBaptized,
    });
    setEditingMemberId(null);
  };

  const handleCopySummaryForLine = () => {
    const lines = [
      '🌟 สรุปรายชื่อผู้มาใหม่ คริสตจักรฟ้าใส 🌟',
      `วันที่สรุป: ${new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}`,
      `จำนวนคนมาใหม่ทั้งหมด: ${totalNewcomersCount} ท่าน (มาซ้ำ ≥ 2 ครั้ง: ${returningCount} ท่าน)`,
      '----------------------------------------',
      ...newcomers.map((nc, idx) => {
        const stats = newcomerStats.get(nc.id);
        const visits = stats ? stats.totalVisits : 1;
        const inviter = nc.invitedBy ? `🤝 พามาโดย: ${nc.invitedBy}` : '';
        const phone = nc.phone ? `📞 ${maskPhone(nc.phone, isSensitiveDataVisible)}` : '';
        const notes = nc.notes ? `📝 ${nc.notes}` : '';
        return `${idx + 1}. คุณ${nc.nickname} (${nc.fullName}) - มาร่วม ${visits} ครั้ง\n   ${inviter} ${phone}\n   ${notes}`.trim();
      }),
      '----------------------------------------',
      'ขอพี่น้องและทีมต้อนรับร่วมกันอธิษฐานเผื่อและสานสัมพันธ์อย่างอบอุ่นค่ะ 🕊️🤍',
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/45 backdrop-blur-xs animate-in fade-in duration-150 font-kanit"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-2xl rounded-[26px] bg-[#F8FAFC] shadow-2xl border border-slate-200 max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sleek Minimal Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 sm:px-6 py-4 bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBackToMenu && (
              <button
                type="button"
                onClick={onBackToMenu}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer"
                title="ย้อนกลับไปเมนูหลัก"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">เมนู</span>
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-['Mali'] text-base sm:text-lg font-bold text-slate-900 truncate">
                  ศูนย์ข้อมูลคนมาใหม่
                </h2>
                <span className="text-xs font-medium text-slate-400 shrink-0">
                  · {newcomers.length} คน
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    isCloudConnected ? 'bg-emerald-500' : 'bg-amber-400'
                  }`}
                />
                <span className="truncate">
                  ซิงค์อัตโนมัติ{lastSyncedTime ? ` · ล่าสุด ${lastSyncedTime}` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {(onPushToCloud || onPullFromCloud) && (
              <div className="hidden sm:inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                {onPushToCloud && (
                  <button
                    type="button"
                    disabled={isSyncingWithCloud}
                    onClick={onPushToCloud}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-white hover:text-[#2B6CB0] hover:shadow-2xs disabled:opacity-50 transition cursor-pointer"
                    title="อัปเดตข้อมูลชุดนี้ขึ้นคลาวด์ (Push)"
                  >
                    {isSyncingWithCloud ? (
                      <RefreshCw className="h-3 w-3 animate-spin text-[#3A86FF]" />
                    ) : (
                      <UploadCloud className="h-3 w-3 text-[#3A86FF]" />
                    )}
                    <span>อัปเดตขึ้นคลาวด์</span>
                  </button>
                )}
                {onPullFromCloud && (
                  <button
                    type="button"
                    disabled={isSyncingWithCloud}
                    onClick={onPullFromCloud}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-white hover:text-emerald-700 hover:shadow-2xs disabled:opacity-50 transition cursor-pointer"
                    title="ดึงข้อมูลล่าสุดจากคลาวด์ (Pull)"
                  >
                    <DownloadCloud className="h-3 w-3 text-emerald-600" />
                    <span>ดึงข้อมูล</span>
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onOpenQuickAdd}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 sm:px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>เพิ่มคนมาใหม่</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
          {/* Clean Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
            <div className="p-3 text-center">
              <span className="text-[11px] text-slate-500 block">ทั้งหมด</span>
              <span className="font-['Mali'] text-xl font-bold text-slate-900 tabular-nums">
                {totalNewcomersCount}
              </span>
            </div>
            <div className="p-3 text-center">
              <span className="text-[11px] text-slate-500 block">มาครั้งแรก</span>
              <span className="font-['Mali'] text-xl font-bold text-amber-600 tabular-nums">
                {firstTimeCount}
              </span>
            </div>
            <div className="p-3 text-center">
              <span className="text-[11px] text-slate-500 block">มาซ้ำ ≥ 2 ครั้ง</span>
              <span className="font-['Mali'] text-xl font-bold text-sky-600 tabular-nums">
                {returningCount}
              </span>
            </div>
            <div className="p-3 text-center">
              <span className="text-[11px] text-slate-500 block">ผู้พามาบ่อยสุด</span>
              <span className="text-xs font-semibold text-slate-800 truncate block mt-1" title={topInviter}>
                {topInviter}
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อคนมาใหม่, คนที่พามา, เบอร์โทร..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9.5 pr-4 py-2 text-xs sm:text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition"
                />
              </div>

              <button
                type="button"
                onClick={handleCopySummaryForLine}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shrink-0 cursor-pointer"
                title="คัดลอกข้อความสรุปเพื่อส่งเข้ากลุ่ม LINE"
              >
                {copySuccess ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 text-slate-500" />
                    <span className="hidden sm:inline">ส่งสรุป LINE</span>
                  </>
                )}
              </button>

              {(onDeleteNewcomer || onDeleteMultipleNewcomers) && newcomers.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!isSensitiveDataVisible && onRequestUnlockAdmin) {
                      onRequestUnlockAdmin('ปลดล็อกรหัสผู้ดูแลก่อนเลือกลบรายชื่อคนมาใหม่');
                      return;
                    }
                    setIsBulkSelectMode((prev) => !prev);
                    setSelectedIds(new Set());
                    setConfirmBulkDelete(false);
                    setConfirmDeleteId(null);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition shrink-0 cursor-pointer ${
                    isBulkSelectMode
                      ? 'border-red-600 bg-red-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>{isBulkSelectMode ? 'เสร็จสิ้น' : 'เลือกลบ'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs overflow-x-auto">
              {[
                { key: 'ALL', label: 'ทั้งหมด' },
                { key: 'FIRST_TIME', label: 'มาครั้งแรก' },
                { key: 'RETURNING', label: 'มาซ้ำ 2+ ครั้ง' },
                { key: 'HAS_INVITER', label: 'มีคนพามา' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilterType(f.key as any)}
                  className={`flex-1 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                    filterType === f.key
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Select Action Bar */}
          {isBulkSelectMode && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50/90 px-3.5 py-2 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allIds = filteredNewcomers.map((n) => n.id);
                    const allSelected =
                      allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (allSelected) {
                        allIds.forEach((id) => next.delete(id));
                      } else {
                        allIds.forEach((id) => next.add(id));
                      }
                      return next;
                    });
                    setConfirmBulkDelete(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {filteredNewcomers.length > 0 &&
                  filteredNewcomers.every((n) => selectedIds.has(n.id)) ? (
                    <CheckSquare className="h-3.5 w-3.5 text-red-600" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <span>เลือกทั้งหมด ({filteredNewcomers.length})</span>
                </button>
                <span className="font-semibold text-red-900">
                  เลือกแล้ว {selectedIds.size} คน
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {confirmBulkDelete ? (
                  <>
                    <span className="text-[11px] font-semibold text-red-800 mr-1">
                      ยืนยันลบ {selectedIds.size} คนนี้?
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfirmBulkDelete(false)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const ids = Array.from(selectedIds);
                        if (onDeleteMultipleNewcomers) {
                          onDeleteMultipleNewcomers(ids);
                        } else if (onDeleteNewcomer) {
                          ids.forEach((id) => onDeleteNewcomer(id));
                        }
                        setSelectedIds(new Set());
                        setConfirmBulkDelete(false);
                        setIsBulkSelectMode(false);
                      }}
                      className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1 text-[11px] font-semibold text-white cursor-pointer"
                    >
                      ยืนยันลบและซิงค์ทันที
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={selectedIds.size === 0}
                    onClick={() => setConfirmBulkDelete(true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 px-3 py-1 text-[11px] font-semibold text-white transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>ลบที่เลือก ({selectedIds.size})</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Newcomers List - Clean & Minimal Cards */}
          {filteredNewcomers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center bg-white">
              <Users className="mx-auto h-9 w-9 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                {searchQuery ? `ไม่พบข้อมูลที่ตรงกับ "${searchQuery}"` : 'ยังไม่มีข้อมูลคนมาใหม่'}
              </p>
              <button
                type="button"
                onClick={onOpenQuickAdd}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>เพิ่มคนมาใหม่</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredNewcomers.map((nc) => {
                const stats = newcomerStats.get(nc.id);
                const visits = stats ? stats.totalVisits : 1;
                const isExpanded = expandedMemberId === nc.id;
                const isCheckedInToday = stats?.history.some((r) => r.date === todayStr);
                const isSelectedForBulk = selectedIds.has(nc.id);

                const metaParts: string[] = [];
                if (nc.ageGroup === 'CHILD') metaParts.push('เด็ก');
                else metaParts.push('ผู้ใหญ่');
                if (nc.gender === 'FEMALE') metaParts.push('หญิง');
                else if (nc.gender === 'MALE') metaParts.push('ชาย');
                metaParts.push(`มาร่วม ${visits} ครั้ง`);
                if (stats?.lastDate) metaParts.push(`ล่าสุด ${stats.lastDate}`);

                return (
                  <div
                    key={nc.id}
                    onClick={() => {
                      if (isBulkSelectMode) {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(nc.id)) next.delete(nc.id);
                          else next.add(nc.id);
                          return next;
                        });
                        setConfirmBulkDelete(false);
                      }
                    }}
                    className={`rounded-2xl border bg-white p-4 transition-all ${
                      isBulkSelectMode ? 'cursor-pointer' : ''
                    } ${
                      isSelectedForBulk
                        ? 'border-red-300 bg-red-50/20 ring-1 ring-red-200'
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Top Area: Avatar + Full-Width Unobstructed Name & Clean Metadata */}
                    <div className="flex items-start gap-3.5">
                      {isBulkSelectMode && (
                        <div className="pt-2.5 shrink-0">
                          {isSelectedForBulk ? (
                            <CheckSquare className="h-5 w-5 text-red-600" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-300" />
                          )}
                        </div>
                      )}

                      <div className="relative shrink-0">
                        {nc.avatarUrl ? (
                          <img
                            src={nc.avatarUrl}
                            alt={nc.nickname}
                            className="h-11 w-11 rounded-xl object-cover border border-slate-200"
                          />
                        ) : (
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-xl font-['Mali'] text-sm font-bold text-white"
                            style={{ backgroundColor: nc.avatarBgColor || '#10B981' }}
                          >
                            {nc.nickname.slice(0, 2)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                                คุณ{nc.nickname}
                              </h3>
                              {nc.fullName && nc.fullName !== nc.nickname && (
                                <span className="text-[13.5px] font-normal text-slate-500">
                                  {nc.fullName}
                                </span>
                              )}
                            </div>

                            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                              {metaParts.join(' · ')}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isCheckedInToday ? (
                              <span className="text-[11px] font-semibold text-emerald-700">
                                ✓ วันนี้มาแล้ว
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400">
                                {visits >= 2 ? 'มาซ้ำ' : 'มาครั้งแรก'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Clean, Scannable Details Row */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>พามาโดย: {nc.invitedBy || 'มาด้วยตนเอง'}</span>
                          </span>

                          {nc.phone && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isSensitiveDataVisible && onRequestUnlockAdmin) {
                                  onRequestUnlockAdmin(
                                    `ปลดล็อกเพื่อดูเบอร์โทรของคุณ${nc.nickname}`
                                  );
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 tabular-nums ${
                                !isSensitiveDataVisible
                                  ? 'cursor-pointer text-slate-500 hover:text-amber-700'
                                  : ''
                              }`}
                            >
                              <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{maskPhone(nc.phone, isSensitiveDataVisible)}</span>
                            </span>
                          )}

                          {nc.notes && (
                            <span className="inline-flex items-center gap-1.5 text-slate-500">
                              <FileText className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{maskNotes(nc.notes, isSensitiveDataVisible)}</span>
                            </span>
                          )}

                          {/* Baptism Status Badge */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold border ${
                              nc.isBaptized
                                ? 'bg-sky-50 text-sky-800 border-sky-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            <span>{nc.isBaptized ? '🕊️ รับบัพติศมาแล้ว' : '🌱 ยังไม่รับ'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Inline Full Edit Panel */}
                    {editingMemberId === nc.id && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <span className="text-xs font-semibold text-slate-800">
                            แก้ไขข้อมูลของ คุณ{nc.nickname}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingMemberId(null)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              ชื่อเล่น *
                            </label>
                            <input
                              type="text"
                              value={editForm.nickname}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, nickname: e.target.value }))
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              ชื่อ-นามสกุล
                            </label>
                            <input
                              type="text"
                              value={editForm.fullName}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, fullName: e.target.value }))
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              เบอร์โทรศัพท์
                            </label>
                            <input
                              type="text"
                              value={editForm.phone}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              คนที่พามา (ผู้แนะนำ)
                            </label>
                            <input
                              type="text"
                              value={editForm.invitedBy}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, invitedBy: e.target.value }))
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Baptism Status Choice in Edit Form */}
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-slate-700">
                              🕊️ สถานะการรับบัพติศมา (Baptism)
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              editForm.isBaptized
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {editForm.isBaptized ? '✓ รับแล้ว' : 'ยังไม่รับ'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setEditForm((prev) => ({ ...prev, isBaptized: true }))}
                              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2.5 text-xs transition cursor-pointer select-none border ${
                                editForm.isBaptized
                                  ? 'bg-white text-emerald-700 border-emerald-400 ring-2 ring-emerald-300 shadow-2xs font-bold'
                                  : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-800 font-medium'
                              }`}
                            >
                              <input
                                type="radio"
                                checked={editForm.isBaptized === true}
                                onChange={() => setEditForm((prev) => ({ ...prev, isBaptized: true }))}
                                className="h-3 w-3 accent-emerald-600 pointer-events-none"
                              />
                              <span>🕊️ รับบัพติศมาแล้ว</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditForm((prev) => ({ ...prev, isBaptized: false }))}
                              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2.5 text-xs transition cursor-pointer select-none border ${
                                !editForm.isBaptized
                                  ? 'bg-white text-amber-800 border-amber-400 ring-2 ring-amber-300 shadow-2xs font-bold'
                                  : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-800 font-medium'
                              }`}
                            >
                              <input
                                type="radio"
                                checked={editForm.isBaptized === false}
                                onChange={() => setEditForm((prev) => ({ ...prev, isBaptized: false }))}
                                className="h-3 w-3 accent-amber-500 pointer-events-none"
                              />
                              <span>🌱 ยังไม่รับ</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            บันทึกการติดตาม / หมายเหตุ
                          </label>
                          <textarea
                            rows={2}
                            value={editForm.notes}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingMemberId(null)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveFullEdit(nc)}
                            className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                          >
                            บันทึกข้อมูล
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Inline Delete Confirmation Panel */}
                    {confirmDeleteId === nc.id && onDeleteNewcomer && !isBulkSelectMode && (
                      <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs animate-in fade-in duration-150">
                        <div className="flex items-center gap-1.5 text-red-900">
                          <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
                          <span>
                            ยืนยันลบข้อมูลของ <strong>คุณ{nc.nickname}</strong> ({nc.fullName})?
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteNewcomer(nc.id);
                              setConfirmDeleteId(null);
                            }}
                            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
                          >
                            ยืนยันลบข้อมูล
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Clean Dedicated Bottom Action Strip */}
                    {!isBulkSelectMode && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {onCheckInToday && !isCheckedInToday && (
                            <button
                              type="button"
                              onClick={() => onCheckInToday(nc)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>เช็คอินวันนี้</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onPromoteToMember(nc)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition cursor-pointer"
                          >
                            <UserPlus className="h-3.5 w-3.5 text-[#3A86FF]" />
                            <span>เลื่อนเป็นสมาชิก</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedMemberId(isExpanded ? null : nc.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition cursor-pointer"
                          >
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>ประวัติ ({stats?.history.length || 0})</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (!isSensitiveDataVisible && onRequestUnlockAdmin) {
                                onRequestUnlockAdmin(`ปลดล็อกเพื่อแก้ไขข้อมูลของคุณ${nc.nickname}`);
                                return;
                              }
                              if (editingMemberId === nc.id) {
                                setEditingMemberId(null);
                              } else {
                                handleStartFullEdit(nc);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                            <span>แก้ไข</span>
                          </button>

                          {onDeleteNewcomer && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!isSensitiveDataVisible && onRequestUnlockAdmin) {
                                  onRequestUnlockAdmin(
                                    `ปลดล็อกรหัสผู้ดูแลก่อนลบข้อมูลคุณ${nc.nickname}`
                                  );
                                  return;
                                }
                                setEditingMemberId(null);
                                setConfirmDeleteId(confirmDeleteId === nc.id ? null : nc.id);
                              }}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                confirmDeleteId === nc.id
                                  ? 'border-red-600 bg-red-600 text-white'
                                  : 'border-transparent text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                              }`}
                              title="ลบข้อมูล"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Expanded History Records */}
                    {isExpanded && (
                      <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 animate-in fade-in duration-150">
                        <p className="text-xs font-semibold text-slate-600">
                          ประวัติเช็คอินของ คุณ{nc.nickname}
                        </p>
                        {stats && stats.history.length > 0 ? (
                          <div className="space-y-1">
                            {stats.history.map((rec) => (
                              <div
                                key={rec.id}
                                className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-xs border border-slate-100"
                              >
                                <span className="font-medium text-slate-800">
                                  {rec.date} · {rec.checkInTime}
                                </span>
                                <span className="text-slate-500">
                                  {rec.temperature}°C ·{' '}
                                  {rec.sessionType === 'CARE_GROUP' ? 'กลุ่มแคร์' : 'รอบนมัสการ'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">ยังไม่มีประวัติเช็คอิน</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Minimal Footer */}
        <div className="border-t border-slate-200/80 bg-white px-5 py-3 flex items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          {onBackToMenu ? (
            <button
              type="button"
              onClick={onBackToMenu}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>กลับไปเมนูหลัก</span>
            </button>
          ) : (
            <span>ซิงค์ข้อมูลอัตโนมัติทุกอุปกรณ์</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
