import React, { useEffect } from 'react';
import { CheckInRecord } from '../types';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Heart,
  Check,
  Clock,
  Thermometer,
  Church,
  X,
  AlertTriangle,
  Calendar,
  Trash2,
} from 'lucide-react';
import { getMedicalTempStatus } from '../utils/temperature';

interface SuccessModalProps {
  record: CheckInRecord | null;
  onClose: () => void;
  onUndo?: (recordId: string) => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ record, onClose, onUndo }) => {
  useEffect(() => {
    if (!record) return;

    // Trigger sweet confetti burst
    try {
      confetti({
        particleCount: record.isBirthday ? 90 : 50,
        spread: record.isBirthday ? 85 : 60,
        origin: { y: 0.55 },
        colors: record.isBirthday
          ? ['#FFD166', '#FF9EAA', '#7EC8E3', '#06D6A0', '#FFEE93', '#3A86FF']
          : ['#7EC8E3', '#48CAE4', '#FFEE93', '#FFFFFF', '#06D6A0'],
      });
    } catch {
      // safe fallback
    }
  }, [record]);

  if (!record) return null;

  const medicalStatus = getMedicalTempStatus(record.temperature);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="checkin-success-modal"
        className="relative w-full max-w-md sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-[28px] border-3 border-[#D6EEFC] bg-white p-4 sm:p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative corner cloud */}
        <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#E0F3FC] opacity-60" />
        <div className="pointer-events-none absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-[#FFEE93]/40 opacity-70" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 hover:bg-slate-100 hover:text-slate-800 shadow-sm border border-slate-200/80 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Church Greeting Pill */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F3FC] px-3.5 py-1 text-xs font-semibold text-[#2B7A78] shadow-2xs">
            <Church className="h-3.5 w-3.5" />
            <span>คริสตจักรฟ้าใส • ฟ้าใหม่ในพระคริสต์</span>
          </div>
        </div>

        {/* Big Hero Picture Section (Occupying half of the popup) */}
        <div className="relative w-full h-80 sm:h-96 md:h-[420px] rounded-3xl overflow-hidden border-2 border-sky-200/90 shadow-lg bg-gradient-to-br from-[#E0F3FC] via-[#F0F8FF] to-[#FFEE93]/40 group">
          {record.avatarUrl ? (
            <img
              src={record.avatarUrl}
              alt={record.nickname}
              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-[#7EC8E3] via-[#48CAE4] to-[#0096C7] p-6 text-white relative">
              {/* Background decorative watermark */}
              <div className="absolute -right-8 -bottom-8 opacity-20 text-9xl select-none pointer-events-none">
                ☁️
              </div>
              <div className="relative flex h-28 w-28 sm:h-36 sm:w-36 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-md shadow-xl border-2 border-white/50 mb-4 transition-transform duration-500 group-hover:scale-105">
                <span className="font-['Mali'] text-5xl sm:text-6xl font-black text-white drop-shadow-md">
                  {record.nickname.slice(0, 2)}
                </span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-white/95 bg-black/25 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/20 shadow-sm">
                {record.role || 'สมาชิกครอบครัวฟ้าใส 💙'}
              </span>
            </div>
          )}

          {/* Floating Badges on Picture */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 max-w-[70%]">
            {/* Status Check-in badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/95 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-white shadow-md border border-emerald-400/60">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>{record.isRetroactive ? 'บันทึกย้อนหลังแล้ว' : 'เช็คอินสำเร็จ 💙'}</span>
            </span>

            {/* Baptism Status Badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-md border backdrop-blur-md ${
                record.isBaptized
                  ? 'bg-sky-600/95 text-white border-sky-300/80'
                  : 'bg-amber-500/95 text-white border-amber-300/80'
              }`}
            >
              <span>{record.isBaptized ? '🕊️ รับบัพติศมาแล้ว' : '🌱 ยังไม่รับบัพติศมา'}</span>
            </span>
          </div>

          {/* Birthday Badge on top right */}
          {record.isBirthday && (
            <div className="absolute top-3 right-12 z-10">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FFD166] to-[#FF9EAA] px-3 py-1 text-xs font-extrabold text-slate-800 shadow-md animate-bounce border border-white">
                🎂 วันเกิดวันนี้!
              </span>
            </div>
          )}

          {/* Bottom Gradient Overlay on Picture */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent pt-16 pb-4 px-4 sm:px-5 text-white">
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-['Kanit'] text-2xl sm:text-3xl md:text-4xl font-extrabold text-white drop-shadow-md truncate">
                    คุณ{record.nickname}
                  </h3>
                  <span className="rounded-full bg-[#FFEE93] px-3 py-0.5 text-xs font-bold text-[#8D5B00] shadow-2xs shrink-0">
                    {record.role}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 drop-shadow truncate mt-0.5">
                  {record.memberName} • รหัส: <span className="font-mono font-bold text-sky-200">{record.memberId}</span>
                </p>
              </div>

              {/* Undo Button right on profile picture corner */}
              {onUndo && (
                <button
                  type="button"
                  onClick={() => {
                    const confirmUndo = window.confirm(
                      `ต้องการยกเลิกการเช็คอินของ "${record.nickname || record.memberName}" หรือไม่?`
                    );
                    if (confirmUndo) {
                      onUndo(record.id);
                    }
                  }}
                  className="shrink-0 flex items-center gap-1 rounded-xl bg-red-600/90 hover:bg-red-600 text-white px-2.5 py-1.5 text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer backdrop-blur-xs border border-red-400/40"
                  title="เช็คอินผิดคน? คลิกเพื่อยกเลิกรายการนี้"
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="hidden sm:inline">ยกเลิกรายการนี้</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Invited By Info (if available) */}
        {record.invitedBy && (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            <span>🤝 ผู้แนะนำ / คนที่พามา:</span>
            <strong>{record.invitedBy}</strong>
          </div>
        )}

        {/* Retroactive Callout Banner if applicable */}
        {record.isRetroactive && (
          <div className="mt-2.5 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="h-4 w-4 text-amber-600" />
              <span>เช็คอินย้อนหลัง: <strong>{record.date}</strong></span>
            </div>
            {record.retroactiveReason && (
              <span className="text-[11px] text-amber-700 bg-white/80 border border-amber-200 px-2 py-0.5 rounded-md">
                {record.retroactiveReason}
              </span>
            )}
          </div>
        )}

        {/* Quick Metrics: Time & Temperature */}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#E2E8F0] pt-3 text-xs">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 border border-slate-100 text-[#4A5568]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-[#3A86FF] shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400">เวลาเช็คอิน</span>
              <span className="font-bold text-sm text-[#2D3748]">{record.checkInTime}</span>
            </div>
          </div>

          <div
            className={`flex items-center gap-2 rounded-xl p-2 border transition-all ${
              medicalStatus.category === 'hypothermia'
                ? 'border-indigo-300 bg-indigo-50/90 text-indigo-950'
                : medicalStatus.category === 'subnormal'
                ? 'border-sky-300 bg-sky-50/90 text-sky-950'
                : medicalStatus.isAlert
                ? 'border-red-300 bg-red-50/90 text-red-950 animate-warning-pulse'
                : 'border-slate-100 bg-slate-50 text-[#4A5568]'
            }`}
          >
            <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-[#06D6A0]">
              {medicalStatus.category === 'hypothermia' ? (
                <span className="text-base leading-none">🥶</span>
              ) : medicalStatus.category === 'subnormal' ? (
                <span className="text-base leading-none">❄️</span>
              ) : medicalStatus.isAlert ? (
                <Thermometer className="h-4 w-4 text-red-600 animate-bounce" />
              ) : (
                <Thermometer className="h-4 w-4 text-[#06D6A0]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] text-slate-400">อุณหภูมิร่างกาย</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-sm text-slate-800">
                  {record.temperature.toFixed(1)} °C
                </span>
                <span
                  className={`text-[9.5px] px-1.5 py-0.2 rounded font-semibold ${
                    medicalStatus.category === 'hypothermia'
                      ? 'bg-indigo-200 text-indigo-900'
                      : medicalStatus.category === 'subnormal'
                      ? 'bg-sky-200 text-sky-900'
                      : medicalStatus.category === 'normal'
                      ? 'bg-emerald-100 text-emerald-800'
                      : medicalStatus.category === 'low_fever'
                      ? 'bg-amber-200 text-amber-950'
                      : 'bg-red-200 text-red-950'
                  }`}
                >
                  {medicalStatus.category === 'normal'
                    ? '✨ ปกติ'
                    : medicalStatus.category === 'low_fever'
                    ? '⚠️ มีไข้ต่ำ'
                    : medicalStatus.category === 'high_fever'
                    ? '🚨 ไข้สูง'
                    : medicalStatus.summary}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Health Warning Advisory when not normal */}
        {medicalStatus.isWarning && (
          <div
            className={`mt-2.5 flex items-start gap-2.5 rounded-xl border p-2.5 text-xs animate-in fade-in slide-in-from-top-1 ${medicalStatus.cardClass}`}
          >
            <div
              className={`rounded-full p-1.5 shrink-0 mt-0.5 flex items-center justify-center ${medicalStatus.iconBgClass}`}
            >
              {medicalStatus.category === 'hypothermia' ? (
                <span className="text-sm leading-none">🥶</span>
              ) : (
                <AlertTriangle className="h-4 w-4 animate-bounce text-inherit" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <strong className="block font-bold text-[12px] leading-tight text-inherit">
                {medicalStatus.title} ({record.temperature.toFixed(1)}°C)
              </strong>
              <p className="mt-0.5 text-[11px] leading-relaxed opacity-95">
                {medicalStatus.recommendation}
              </p>
            </div>
          </div>
        )}

        {/* Birthday Celebration Box */}
        {record.isBirthday && (
          <div className="mt-3 rounded-2xl border-2 border-[#FEEA9A] bg-gradient-to-r from-[#FFFDF5] via-[#FFF9DB] to-[#FFEE93]/70 p-3 text-center shadow-xs">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#B7791F]">
              <span>🎂 สุขสันต์วันเกิดคุณ{record.nickname}! 🎉✨</span>
            </div>
            <p className="mt-0.5 font-['Mali'] text-xs text-[#744210]">
              ขอพระเจ้าทรงอวยพระพร เติมเต็มความสุข สันติสุข และความชื่นบานตลอดปีใหม่นี้นะคะ 💙🕊️
            </p>
          </div>
        )}

        {/* Bible Verse Card */}
        <div className="mt-3 rounded-2xl border border-[#FFEE93] bg-[#FFFBEA] p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#B7791F]">
            <Sparkles className="h-3.5 w-3.5 text-[#D69E2E]" />
            <span>พระวจนะหนุนใจประจำวัน</span>
          </div>
          <p className="mt-1.5 font-['Mali'] text-xs sm:text-sm leading-relaxed text-[#744210]">
            “{record.verse.passage}”
          </p>
          <span className="mt-1 inline-block text-[11px] font-medium text-[#975A16]">
            — {record.verse.reference} —
          </span>
        </div>

        {/* Action Button */}
        <div className="mt-4">
          <button
            type="button"
            id="next-checkin-btn"
            onClick={onClose}
            className="w-full rounded-2xl bg-gradient-to-r from-[#7EC8E3] to-[#48CAE4] hover:from-[#65B7D7] hover:to-[#38B6D0] py-3.5 font-['Mali'] text-base font-bold text-white shadow-md shadow-[#7EC8E3]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            💙 เช็คอินคนถัดไป
          </button>
        </div>
      </div>
    </div>
  );
};
