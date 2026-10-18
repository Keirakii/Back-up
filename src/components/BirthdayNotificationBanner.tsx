import React, { useState } from 'react';
import { Member } from '../types';
import { formatThaiBirthday } from '../utils/birthday';
import { Sparkles, X, Gift, ChevronRight, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';

interface BirthdayNotificationBannerProps {
  birthdayMembers: Member[];
  onOpenBlessingModal: () => void;
  onSelectMemberForCheckIn: (member: Member) => void;
  isNfcListening?: boolean;
  isActivelyWaitingForNfc?: boolean;
  isNfcScanInProgress?: boolean;
  isNfcCardNear?: boolean;
  onToggleNfc?: () => void;
}

export function BirthdayNotificationBanner({
  birthdayMembers,
  onOpenBlessingModal,
  onSelectMemberForCheckIn,
}: BirthdayNotificationBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasBirthdays = birthdayMembers && birthdayMembers.length > 0;
  const primaryMember = hasBirthdays ? birthdayMembers[0] : null;

  if (!hasBirthdays || !primaryMember) {
    return null;
  }

  return (
    <div className="w-full max-w-[480px] mb-2.5 font-kanit">
      {/* Minimal Full-Width Birthday Notification Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-r from-[#FFFDF7] via-[#FFFBEB] to-[#FEF3C7]/70 px-3.5 py-2.5 text-left shadow-2xs hover:border-amber-300 transition-all active:scale-[0.99] cursor-pointer"
        title="คลิกเพื่อดูรายละเอียดวันเกิด ร่วมอวยพร หรือเช็คอินทันที"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            {primaryMember.avatarUrl ? (
              <img
                src={primaryMember.avatarUrl}
                alt={primaryMember.nickname}
                className="h-8 w-8 rounded-xl object-cover border border-amber-300"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl font-['Mali'] text-xs font-bold text-white"
                style={{ backgroundColor: primaryMember.avatarBgColor || '#F59E0B' }}
              >
                {primaryMember.nickname.slice(0, 2)}
              </div>
            )}
            <span className="absolute -top-1 -right-1 text-[11px]">🎂</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-800 truncate">
                สุขสันต์วันเกิด คุณ{primaryMember.nickname}
              </span>
              {birthdayMembers.length > 1 && (
                <span className="text-amber-700 font-medium shrink-0">
                  · และอีก {birthdayMembers.length - 1} ท่าน
                </span>
              )}
            </div>
            <p className="text-[11px] text-amber-800/80 truncate">
              คลิกเพื่อเปิดการ์ดอวยพรวันเกิด หรือเลือกเช็คอิน
            </p>
          </div>
        </div>

        <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg bg-white/80 text-amber-700 border border-amber-200/80 group-hover:bg-amber-100/70 transition">
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </span>
      </button>

      {/* Expandable Birthday Detail Card */}
      {isExpanded && (
        <div
          id="birthday-highlight-banner"
          className="mt-2 relative overflow-hidden rounded-2xl border border-amber-200 bg-white p-3.5 shadow-sm transition-all animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Dismiss Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition text-xs cursor-pointer"
            title="ย่อแถบแจ้งเตือนวันเกิด"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Main Content Info */}
          <div className="flex items-center gap-3 pr-6">
            <div
              onClick={onOpenBlessingModal}
              className="relative cursor-pointer transition transform hover:scale-105 shrink-0"
            >
              {primaryMember.avatarUrl ? (
                <img
                  src={primaryMember.avatarUrl}
                  alt={primaryMember.nickname}
                  className="h-11 w-11 rounded-2xl object-cover border border-amber-300 shadow-2xs"
                />
              ) : (
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl font-['Mali'] text-sm font-bold text-white shadow-2xs"
                  style={{ backgroundColor: primaryMember.avatarBgColor || '#F59E0B' }}
                >
                  {primaryMember.nickname.slice(0, 2)}
                </div>
              )}
              <span className="absolute -top-1 -right-1 text-xs">🥳</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <strong
                  onClick={onOpenBlessingModal}
                  className="text-sm font-bold text-slate-900 hover:text-amber-700 cursor-pointer"
                >
                  คุณ{primaryMember.nickname}
                </strong>
                {primaryMember.fullName && primaryMember.fullName !== primaryMember.nickname && (
                  <span className="text-xs text-slate-500">({primaryMember.fullName})</span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {primaryMember.role} · {formatThaiBirthday(primaryMember.birthday)}
              </p>
              <p className="mt-0.5 text-[11px] text-amber-700 font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                <span>ขอพระเจ้าทรงอวยพระพรเป็นพิเศษในวันนี้ค่ะ</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={onOpenBlessingModal}
              className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 font-semibold text-amber-800 border border-amber-200/80 hover:bg-amber-100/80 transition cursor-pointer"
            >
              <Gift className="h-3.5 w-3.5 text-amber-600" />
              <span>เปิดการ์ดอวยพรวันเกิด</span>
              <ChevronRight className="h-3.5 w-3.5 text-amber-700" />
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectMemberForCheckIn(primaryMember);
                setIsExpanded(false);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-[#3A86FF] px-3.5 py-1.5 font-semibold text-white shadow-2xs hover:bg-[#2563EB] transition cursor-pointer"
              title={`เช็คอินให้ ${primaryMember.nickname} ทันที`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>เช็คอินทันที</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
