import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Member } from '../types';
import {
  formatThaiBirthday,
  BIRTHDAY_BLESSING_VERSES,
  isBirthdayToday,
  getThisMonthBirthdayMembers,
  getCurrentThaiMonthName,
} from '../utils/birthday';
import { playJoyfulChime } from '../utils/audio';
import { DatePickerField } from './DatePickerField';
import {
  X,
  Share2,
  Check,
  Volume2,
  Calendar,
  Gift,
  UserCheck,
  ArrowLeft,
  Search,
  RefreshCw,
  Edit3,
  Cake,
} from 'lucide-react';

interface BirthdayBlessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu?: () => void;
  birthdayMembers: Member[];
  members?: Member[];
  onSaveMember?: (member: Member) => void;
  onSelectMemberForCheckIn: (member: Member) => void;
  soundEnabled: boolean;
}

export function BirthdayBlessingModal({
  isOpen,
  onClose,
  onBackToMenu,
  birthdayMembers,
  members = [],
  onSaveMember,
  onSelectMemberForCheckIn,
  soundEnabled,
}: BirthdayBlessingModalProps) {
  const allMembers = useMemo(
    () => (members.length > 0 ? members : birthdayMembers),
    [members, birthdayMembers]
  );
  const thisMonthMembers = useMemo(
    () => getThisMonthBirthdayMembers(allMembers),
    [allMembers]
  );
  const currentMonthName = getCurrentThaiMonthName();

  const [activeTab, setActiveTab] = useState<'TODAY' | 'MONTH' | 'ALL'>('TODAY');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [verseIdx, setVerseIdx] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditingBirthday, setIsEditingBirthday] = useState<boolean>(false);
  const [birthdayDraft, setBirthdayDraft] = useState<string>('');

  // Initialize tab and selected member when opened
  useEffect(() => {
    if (!isOpen) return;
    setIsEditingBirthday(false);
    setSearchTerm('');

    if (birthdayMembers.length > 0) {
      setActiveTab('TODAY');
      setSelectedMemberId(birthdayMembers[0].id);
    } else if (thisMonthMembers.length > 0) {
      setActiveTab('MONTH');
      setSelectedMemberId(thisMonthMembers[0].id);
    } else if (allMembers.length > 0) {
      setActiveTab('ALL');
      setSelectedMemberId(allMembers[0].id);
    }
  }, [isOpen]);

  // Filter members according to activeTab and searchTerm
  const displayedMembers = useMemo(() => {
    const baseList =
      activeTab === 'TODAY'
        ? birthdayMembers
        : activeTab === 'MONTH'
        ? thisMonthMembers
        : allMembers;

    const q = searchTerm.trim().toLowerCase();
    if (!q) return baseList;
    return baseList.filter(
      (m) =>
        m.nickname.toLowerCase().includes(q) ||
        m.fullName.toLowerCase().includes(q) ||
        (m.careGroup && m.careGroup.toLowerCase().includes(q)) ||
        (m.role && m.role.toLowerCase().includes(q))
    );
  }, [activeTab, birthdayMembers, thisMonthMembers, allMembers, searchTerm]);

  // Resolve currently active member
  const activeMember = useMemo(() => {
    const foundInDisplayed = displayedMembers.find((m) => m.id === selectedMemberId);
    if (foundInDisplayed) return foundInDisplayed;
    const foundInAll = allMembers.find((m) => m.id === selectedMemberId);
    if (foundInAll) return foundInAll;
    return displayedMembers[0] || birthdayMembers[0] || thisMonthMembers[0] || allMembers[0] || null;
  }, [displayedMembers, allMembers, birthdayMembers, thisMonthMembers, selectedMemberId]);

  useEffect(() => {
    if (!isOpen || !activeMember) return;

    // Trigger celebration confetti when opening
    try {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.58 },
        colors: ['#FFD166', '#FF9EAA', '#7EC8E3', '#06D6A0', '#3A86FF'],
      });
    } catch {
      // safe fallback
    }

    if (soundEnabled && isBirthdayToday(activeMember.birthday)) {
      playJoyfulChime();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const verse = BIRTHDAY_BLESSING_VERSES[verseIdx % BIRTHDAY_BLESSING_VERSES.length];

  const handleCopyBlessing = () => {
    if (!activeMember) return;
    const displayFull =
      activeMember.fullName && activeMember.fullName !== activeMember.nickname
        ? ` (${activeMember.fullName})`
        : '';
    const textToCopy = `🎂 สุขสันต์วันเกิดคุณ${activeMember.nickname}${displayFull} ค่ะ! 🎉✨\nขอพระเจ้าทรงอวยพระพร เติมเต็มความสุข สันติสุข และสุขภาพร่างกายแข็งแรง\n\n"${verse.passage}" (${verse.reference})\n— จากครอบครัวคริสตจักรฟ้าใส ☁️💙`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleTriggerMusic = () => {
    playJoyfulChime();
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FFEE93', '#7EC8E3', '#FF9EAA', '#06D6A0'],
      });
    } catch {
      // safe
    }
  };

  const handleSaveMemberBirthday = () => {
    if (!activeMember || !onSaveMember || !birthdayDraft) return;
    onSaveMember({
      ...activeMember,
      birthday: birthdayDraft,
    });
    setIsEditingBirthday(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 font-kanit"
      onClick={onClose}
    >
      <div
        id="birthday-blessing-modal"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Clean Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBackToMenu && (
              <button
                type="button"
                onClick={onBackToMenu}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                title="ย้อนกลับไปเมนูหลัก"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>เมนู</span>
              </button>
            )}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <Cake className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-['Mali'] text-base sm:text-lg font-bold text-slate-900 truncate">
                อวยพรวันเกิดสมาชิก
              </h2>
              <p className="text-xs text-slate-500 truncate">
                เกิดวันนี้ {birthdayMembers.length} คน · เดือน{currentMonthName} {thisMonthMembers.length} คน
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Segmented Filter Tabs */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('TODAY');
                if (birthdayMembers[0]) setSelectedMemberId(birthdayMembers[0].id);
              }}
              className={`rounded-lg py-1.5 px-2 font-semibold transition cursor-pointer ${
                activeTab === 'TODAY'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เกิดวันนี้ ({birthdayMembers.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('MONTH');
                if (thisMonthMembers[0]) setSelectedMemberId(thisMonthMembers[0].id);
              }}
              className={`rounded-lg py-1.5 px-2 font-semibold transition cursor-pointer truncate ${
                activeTab === 'MONTH'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เดือน{currentMonthName} ({thisMonthMembers.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('ALL');
                if (!selectedMemberId && allMembers[0]) setSelectedMemberId(allMembers[0].id);
              }}
              className={`rounded-lg py-1.5 px-2 font-semibold transition cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({allMembers.length})
            </button>
          </div>

          {/* Search input when viewing Month or All members */}
          {(activeTab === 'ALL' || thisMonthMembers.length > 4) && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อเล่น หรือชื่อจริงเพื่อเลือกอวยพร..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-8.5 pr-3 text-xs text-slate-800 focus:border-amber-400 focus:bg-white focus:outline-none"
              />
            </div>
          )}

          {/* Member Picker List for the Selected Tab */}
          {displayedMembers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center">
              <p className="text-sm font-semibold text-slate-700">
                {activeTab === 'TODAY'
                  ? 'วันนี้ยังไม่มีสมาชิกที่ตรงกับวันคล้ายวันเกิด'
                  : activeTab === 'MONTH'
                  ? `ยังไม่มีข้อมูลสมาชิกที่เกิดในเดือน${currentMonthName}`
                  : 'ไม่พบรายชื่อสมาชิกที่ค้นหา'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                สามารถดูรายชื่อผู้เกิดในเดือน{currentMonthName} หรือเลือกสมาชิกทั้งหมดเพื่อส่งการ์ดอวยพรและบันทึกวันเกิดได้ค่ะ
              </p>
              {activeTab !== 'ALL' && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  {activeTab === 'TODAY' && thisMonthMembers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('MONTH');
                        setSelectedMemberId(thisMonthMembers[0].id);
                      }}
                      className="rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
                    >
                      ดูผู้เกิดเดือน{currentMonthName} ({thisMonthMembers.length} คน)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('ALL');
                      if (allMembers[0]) setSelectedMemberId(allMembers[0].id);
                    }}
                    className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition cursor-pointer"
                  >
                    เลือกจากสมาชิกทั้งหมด
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {displayedMembers.map((m) => {
                const isSelected = activeMember?.id === m.id;
                const isToday = isBirthdayToday(m.birthday);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMemberId(m.id);
                      setIsEditingBirthday(false);
                    }}
                    className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white font-semibold shadow-2xs'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-amber-50/70'
                    }`}
                  >
                    <span className="truncate max-w-[110px]">
                      {isToday ? '🎂 ' : ''}คุณ{m.nickname}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Member Blessing Card */}
          {activeMember && (
            <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-[#FFFDF7] via-white to-[#F8FAFC] p-4 sm:p-5 shadow-2xs space-y-4">
              {/* Profile Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    {activeMember.avatarUrl ? (
                      <img
                        src={activeMember.avatarUrl}
                        alt={activeMember.nickname}
                        className="h-14 w-14 rounded-2xl object-cover border-2 border-amber-300 shadow-2xs"
                      />
                    ) : (
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-2xl font-['Mali'] text-xl font-bold text-white shadow-2xs"
                        style={{ backgroundColor: activeMember.avatarBgColor || '#F59E0B' }}
                      >
                        {activeMember.nickname.slice(0, 2)}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs shadow-2xs border border-amber-200">
                      🎂
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900">
                        คุณ{activeMember.nickname}
                      </h3>
                      {activeMember.fullName &&
                        activeMember.fullName !== activeMember.nickname && (
                          <span className="text-xs text-slate-500">
                            ({activeMember.fullName})
                          </span>
                        )}
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeMember.role}
                      {activeMember.careGroup ? ` · ${activeMember.careGroup}` : ''}
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-xs text-amber-800 font-medium flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-amber-600" />
                        <span>{formatThaiBirthday(activeMember.birthday)}</span>
                      </span>
                      {onSaveMember && !isEditingBirthday && (
                        <button
                          type="button"
                          onClick={() => {
                            setBirthdayDraft(activeMember.birthday || '1995-01-01');
                            setIsEditingBirthday(true);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3A86FF] hover:underline cursor-pointer"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>{activeMember.birthday ? 'แก้ไขวันเกิด' : '+ ตั้งวันเกิด'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isBirthdayToday(activeMember.birthday) && (
                  <span className="shrink-0 text-xs font-bold text-amber-700">
                    เกิดวันนี้ 🎉
                  </span>
                )}
              </div>

              {/* Inline Birthday Editor if clicked */}
              {isEditingBirthday && onSaveMember && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>ตั้ง/แก้ไขวันเกิดของ คุณ{activeMember.nickname}</span>
                    <button
                      type="button"
                      onClick={() => setIsEditingBirthday(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1">
                      <DatePickerField
                        value={birthdayDraft}
                        onChange={(val) => setBirthdayDraft(val)}
                        variant="amber"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveMemberBirthday}
                      className="rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-semibold text-white shrink-0 cursor-pointer"
                    >
                      บันทึกวันเกิด
                    </button>
                  </div>
                </div>
              )}

              {/* Scripture Blessing Card */}
              <div className="rounded-xl border border-amber-200/70 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <Gift className="h-3.5 w-3.5 text-amber-500" />
                    <span>พระวจนะอวยพรวันเกิด</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVerseIdx((prev) => (prev + 1) % BIRTHDAY_BLESSING_VERSES.length)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    title="เปลี่ยนข้อพระคัมภีร์อวยพร"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>
                      เปลี่ยนข้อพระคัมภีร์ ({(verseIdx % BIRTHDAY_BLESSING_VERSES.length) + 1}/
                      {BIRTHDAY_BLESSING_VERSES.length})
                    </span>
                  </button>
                </div>
                <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                  &ldquo;{verse.passage}&rdquo;
                </p>
                <p className="mt-1.5 text-right text-xs font-semibold text-[#2B6CB0]">
                  — {verse.reference}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleTriggerMusic}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/90 py-2.5 px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 cursor-pointer"
                  >
                    <Volume2 className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="truncate">บรรเลงเพลงชื่นบาน</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyBlessing}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/90 py-2.5 px-3 text-xs font-semibold text-[#2B6CB0] transition hover:bg-sky-100 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="text-emerald-700 truncate">คัดลอกคำอวยพรแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 shrink-0" />
                        <span className="truncate">คัดลอกคำอวยพรส่งต่อ</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectMemberForCheckIn(activeMember);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3A86FF] hover:bg-[#2563EB] py-2.5 text-xs sm:text-sm font-semibold text-white shadow-2xs transition cursor-pointer"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>เช็คอินให้ คุณ{activeMember.nickname} วันนี้</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
