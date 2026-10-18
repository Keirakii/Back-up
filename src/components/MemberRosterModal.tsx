import React, { useState } from 'react';
import { Member } from '../types';
import { isBirthdayToday } from '../utils/birthday';
import {
  maskPhone,
  maskAddress,
  maskBirthday,
  maskNotes,
} from '../utils/auditAndPrivacy';
import {
  Search,
  UserPlus,
  Edit3,
  Phone,
  Calendar,
  MapPin,
  X,
  Users,
  CheckCircle2,
  Smartphone,
  Trash2,
  ArrowLeft,
  Lock,
  Unlock,
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  CheckSquare,
  Square,
  ShieldAlert,
} from 'lucide-react';

interface MemberRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu?: () => void;
  members: Member[];
  onEditMember: (member: Member) => void;
  onAddNewMember: () => void;
  onSelectForCheckIn: (member: Member) => void;
  onOpenNfcTool?: (memberId: string) => void;
  onDeleteMember?: (memberId: string) => void;
  onDeleteMultipleMembers?: (memberIds: string[]) => void;
  onPushToCloud?: () => void;
  onPullFromCloud?: () => void;
  isSyncingWithCloud?: boolean;
  isCloudConnected?: boolean;
  lastSyncedTime?: string | null;
  isSensitiveDataVisible?: boolean;
  onRequestUnlockAdmin?: (reason?: string) => void;
  onLockAdmin?: () => void;
}

export const MemberRosterModal: React.FC<MemberRosterModalProps> = ({
  isOpen,
  onClose,
  onBackToMenu,
  members,
  onEditMember,
  onAddNewMember,
  onSelectForCheckIn,
  onOpenNfcTool,
  onDeleteMember,
  onDeleteMultipleMembers,
  onPushToCloud,
  onPullFromCloud,
  isSyncingWithCloud = false,
  isCloudConnected = true,
  lastSyncedTime,
  isSensitiveDataVisible = true,
  onRequestUnlockAdmin,
  onLockAdmin,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  if (!isOpen) return null;

  const filteredMembers = members.filter((m) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.nickname.toLowerCase().includes(q) ||
      m.fullName.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      (m.phone && m.phone.includes(q)) ||
      (m.careGroup && m.careGroup.toLowerCase().includes(q)) ||
      (m.role && m.role.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (filterRole === 'ALL') return true;
    if (filterRole === 'VISITOR') return Boolean(m.isVisitor || m.role?.includes('ผู้มา'));
    if (filterRole === 'CHILD') return m.ageGroup === 'CHILD';
    if (filterRole === 'ADULT') return m.ageGroup !== 'CHILD';
    if (filterRole === 'CARE') return Boolean(m.careGroup);
    return m.role.includes(filterRole);
  });

  const toggleSelectMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setConfirmBulkDelete(false);
  };

  const handleToggleSelectAllFiltered = () => {
    const allFilteredIds = filteredMembers.map((m) => m.id);
    const allSelected =
      allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
    setConfirmBulkDelete(false);
  };

  const handleExecuteBulkDelete = () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;
    if (onDeleteMultipleMembers) {
      onDeleteMultipleMembers(idsToDelete);
    } else if (onDeleteMember) {
      idsToDelete.forEach((id) => onDeleteMember(id));
    }
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
    setIsBulkSelectMode(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-2.5 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 font-kanit"
      onClick={onClose}
    >
      <div
        id="member-roster-modal"
        className="flex h-[90vh] w-full max-w-2xl flex-col rounded-[26px] border border-slate-200 bg-[#F8FAFC] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sleek Minimal Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-6 py-4 shrink-0">
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
                <h3 className="font-['Mali'] text-base sm:text-lg font-bold text-slate-900 truncate">
                  ศูนย์ข้อมูลสมาชิก
                </h3>
                <span className="text-xs font-medium text-slate-400 shrink-0">
                  · {members.length} คน
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
            {/* Compact Auto-Sync Push / Pull Controls */}
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

            {/* Compact Privacy Toggle */}
            {isSensitiveDataVisible ? (
              onLockAdmin && (
                <button
                  type="button"
                  onClick={onLockAdmin}
                  className="flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  title="ซ่อนเบอร์โทรและที่อยู่"
                >
                  <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="hidden md:inline">ล็อกข้อมูล</span>
                </button>
              )
            ) : (
              onRequestUnlockAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    onRequestUnlockAdmin('ปลดล็อกเพื่อดูเบอร์โทร ที่อยู่ หรือแก้ไข/ลบข้อมูลสมาชิก')
                  }
                  className="flex h-8 items-center gap-1 rounded-xl border border-amber-200 bg-amber-50/80 px-2.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100 transition cursor-pointer"
                  title="ปลดล็อกเพื่อดูเบอร์โทรและที่อยู่ทั้งหมด"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-600" />
                  <span className="hidden md:inline">ปลดล็อก</span>
                </button>
              )
            )}

            <button
              type="button"
              onClick={onAddNewMember}
              className="flex items-center gap-1.5 rounded-xl bg-[#3A86FF] hover:bg-[#2563EB] px-3 sm:px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition active:scale-98 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>เพิ่มสมาชิก</span>
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

        {/* Clean Search & Filter Toolbar */}
        <div className="border-b border-slate-200/80 bg-white px-4 sm:px-6 py-3 space-y-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อเล่น, ชื่อจริง, เบอร์โทร, กลุ่มแคร์..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9.5 pr-8 text-xs sm:text-sm text-slate-800 focus:border-[#3A86FF] focus:bg-white focus:outline-none transition placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {(onDeleteMember || onDeleteMultipleMembers) && (
              <button
                type="button"
                onClick={() => {
                  if (!isSensitiveDataVisible && onRequestUnlockAdmin) {
                    onRequestUnlockAdmin('ปลดล็อกรหัสผู้ดูแลก่อนเลือกลบรายชื่อสมาชิก');
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
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
                title="เลือกลบหลายคนพร้อมกัน"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>{isBulkSelectMode ? 'เสร็จสิ้น' : 'เลือกลบ'}</span>
              </button>
            )}
          </div>

          {/* Segmented Filter Row */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5">
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs shrink-0">
              {[
                { key: 'ALL', label: `ทั้งหมด (${members.length})` },
                { key: 'ADULT', label: 'ผู้ใหญ่' },
                { key: 'CHILD', label: 'เด็ก' },
                { key: 'CARE', label: 'มีกลุ่มแคร์' },
                { key: 'VISITOR', label: 'คนมาใหม่' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterRole(tab.key)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                    filterRole === tab.key
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mobile Sync Buttons */}
            {(onPushToCloud || onPullFromCloud) && (
              <div className="flex sm:hidden items-center gap-1 shrink-0">
                {onPushToCloud && (
                  <button
                    type="button"
                    disabled={isSyncingWithCloud}
                    onClick={onPushToCloud}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 cursor-pointer"
                  >
                    <UploadCloud className="h-3 w-3 text-[#3A86FF]" />
                    <span>Push</span>
                  </button>
                )}
                {onPullFromCloud && (
                  <button
                    type="button"
                    disabled={isSyncingWithCloud}
                    onClick={onPullFromCloud}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 cursor-pointer"
                  >
                    <DownloadCloud className="h-3 w-3 text-emerald-600" />
                    <span>Pull</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bulk Select Action Bar */}
          {isBulkSelectMode && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50/90 px-3 py-2 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAllFiltered}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {filteredMembers.length > 0 &&
                  filteredMembers.every((m) => selectedIds.has(m.id)) ? (
                    <CheckSquare className="h-3.5 w-3.5 text-red-600" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <span>เลือกทั้งหมด ({filteredMembers.length})</span>
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
                      onClick={handleExecuteBulkDelete}
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
        </div>

        {/* Sleek, Minimal Member Cards List */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-2.5">
          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-400">
              <Users className="h-9 w-9 stroke-1.5 opacity-50 mb-2" />
              <p className="text-sm font-medium text-slate-600">ไม่พบรายชื่อสมาชิกตามที่ค้นหา</p>
              <button
                type="button"
                onClick={onAddNewMember}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#3A86FF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>เพิ่มสมาชิกใหม่</span>
              </button>
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isBday = isBirthdayToday(member.birthday);
              const isSelectedForBulk = selectedIds.has(member.id);
              const isConfirmingDelete = confirmDeleteId === member.id;

              // Build clean, unboxed metadata items separated by '·'
              const metaParts: string[] = [];
              if (member.ageGroup === 'CHILD') metaParts.push('เด็ก');
              else if (member.ageGroup === 'ADULT') metaParts.push('ผู้ใหญ่');

              if (member.gender === 'FEMALE') metaParts.push('หญิง');
              else if (member.gender === 'MALE') metaParts.push('ชาย');

              if (member.role) metaParts.push(member.role);
              if (member.careGroup) metaParts.push(`แคร์ ${member.careGroup}`);

              return (
                <div
                  key={member.id}
                  onClick={() => {
                    if (isBulkSelectMode) {
                      toggleSelectMember(member.id);
                    }
                  }}
                  className={`group rounded-2xl border bg-white p-4 transition-all ${
                    isBulkSelectMode ? 'cursor-pointer' : ''
                  } ${
                    isSelectedForBulk
                      ? 'border-red-300 bg-red-50/20 ring-1 ring-red-200'
                      : isBday
                      ? 'border-amber-300/90 bg-[#FFFDF9]'
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

                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.nickname}
                          className={`h-11 w-11 rounded-xl object-cover border ${
                            isBday ? 'border-amber-400' : 'border-slate-200'
                          }`}
                        />
                      ) : (
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-xl font-['Mali'] text-sm font-bold text-white"
                          style={{ backgroundColor: member.avatarBgColor || '#7EC8E3' }}
                        >
                          {member.nickname.slice(0, 2)}
                        </div>
                      )}
                      {isBday && (
                        <span
                          className="absolute -top-1.5 -right-1.5 text-xs"
                          title="วันเกิดวันนี้!"
                        >
                          🎂
                        </span>
                      )}
                    </div>

                    {/* Member Name & Unboxed Metadata (Full Remaining Width!) */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <h4 className="text-[15px] font-bold text-slate-900 leading-snug">
                              คุณ{member.nickname}
                            </h4>
                            {member.fullName && member.fullName !== member.nickname && (
                              <span className="text-[13.5px] font-normal text-slate-500">
                                {member.fullName}
                              </span>
                            )}
                          </div>

                          {/* Quiet Unboxed Metadata Line */}
                          <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                            {metaParts.join(' · ')}
                          </p>
                        </div>

                        {/* Subtle Status Indicator on Top Right */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[10.5px] font-bold border ${
                              member.isBaptized
                                ? 'bg-sky-50 text-sky-800 border-sky-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            <span>{member.isBaptized ? '🕊️ รับบัพติศมาแล้ว' : '🌱 ยังไม่รับ'}</span>
                          </span>
                          {isBday && (
                            <span className="text-[11px] font-semibold text-amber-700">
                              🎂 วันเกิดวันนี้
                            </span>
                          )}
                          {member.isVisitor && !isBday && (
                            <span className="text-[11px] font-medium text-emerald-700">
                              คนมาใหม่
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Contact & Details Row */}
                      {(member.phone || member.birthday || member.address || member.notes) && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          {member.phone && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isSensitiveDataVisible && onRequestUnlockAdmin) {
                                  onRequestUnlockAdmin(
                                    `ปลดล็อกเพื่อดูเบอร์โทรของคุณ${member.nickname}`
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
                              <span>{maskPhone(member.phone, isSensitiveDataVisible)}</span>
                            </span>
                          )}

                          {member.birthday && (
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{maskBirthday(member.birthday, isSensitiveDataVisible)}</span>
                            </span>
                          )}

                          {member.address && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isSensitiveDataVisible && onRequestUnlockAdmin) {
                                  onRequestUnlockAdmin(
                                    `ปลดล็อกเพื่อดูที่อยู่ของคุณ${member.nickname}`
                                  );
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 max-w-[260px] truncate ${
                                !isSensitiveDataVisible
                                  ? 'cursor-pointer text-slate-500 hover:text-amber-700'
                                  : ''
                              }`}
                              title={
                                isSensitiveDataVisible
                                  ? member.address
                                  : 'คลิกเพื่อปลดล็อกดูที่อยู่'
                              }
                            >
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {maskAddress(member.address, isSensitiveDataVisible)}
                              </span>
                            </span>
                          )}

                          {member.notes && (
                            <span className="text-slate-400 truncate max-w-[260px]">
                              หมายเหตุ: {maskNotes(member.notes, isSensitiveDataVisible)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clean Dedicated Bottom Action Strip (Never Crushes the Name!) */}
                  {!isBulkSelectMode && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 font-mono truncate">
                        ID: {member.id}
                        {member.nfcCardId ? ` · ${member.nfcCardId}` : ''}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectForCheckIn(member);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#3A86FF] hover:bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
                          title="เลือกเพื่อเช็คอินทันที"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>เช็คอิน</span>
                        </button>

                        {onOpenNfcTool && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenNfcTool(member.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition cursor-pointer"
                            title="ผูกหรือเขียนบัตร NFC"
                          >
                            <Smartphone className="h-3.5 w-3.5 text-slate-500" />
                            <span>NFC</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (!isSensitiveDataVisible && onRequestUnlockAdmin) {
                              onRequestUnlockAdmin(
                                `ปลดล็อกเพื่อดูและแก้ไขข้อมูลส่วนตัวของคุณ${member.nickname}`
                              );
                              return;
                            }
                            onEditMember(member);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition cursor-pointer"
                          title="แก้ไขข้อมูลส่วนตัว"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                          <span>แก้ไข</span>
                        </button>

                        {onDeleteMember && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!isSensitiveDataVisible && onRequestUnlockAdmin) {
                                onRequestUnlockAdmin(
                                  `ปลดล็อกรหัสผู้ดูแลก่อนลบรายชื่อคุณ${member.nickname}`
                                );
                                return;
                              }
                              setConfirmDeleteId(isConfirmingDelete ? null : member.id);
                            }}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              isConfirmingDelete
                                ? 'border-red-600 bg-red-600 text-white'
                                : 'border-transparent text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                            }`}
                            title="ลบสมาชิกนี้"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Inline Delete Confirmation Banner */}
                  {isConfirmingDelete && onDeleteMember && !isBulkSelectMode && (
                    <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5 text-red-900">
                        <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
                        <span>
                          ยืนยันลบรายชื่อ <strong>คุณ{member.nickname}</strong> ({member.fullName})?
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
                            onDeleteMember(member.id);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1 text-xs font-semibold text-white cursor-pointer"
                        >
                          ยืนยันลบข้อมูล
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Minimal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-white px-5 py-3 text-xs shrink-0">
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
            <span className="text-slate-400">ซิงค์ข้อมูลอัตโนมัติทุกอุปกรณ์</span>
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
