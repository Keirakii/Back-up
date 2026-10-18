import React, { useState } from 'react';
import { Member } from '../types';
import { UserPlus, X, Sparkles } from 'lucide-react';

interface NewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (member: Member) => void;
  initialName?: string;
}

export const NewMemberModal: React.FC<NewMemberModalProps> = ({
  isOpen,
  onClose,
  onAddMember,
  initialName = '',
}) => {
  const [nickname, setNickname] = useState(initialName);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('ผู้มาเยือนใหม่ 🌟');
  const [isBaptized, setIsBaptized] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    const newId = `V${Math.floor(100 + Math.random() * 900)}`;
    const newMember: Member = {
      id: newId,
      nickname: nickname.trim(),
      fullName: fullName.trim() || nickname.trim(),
      role: role,
      nfcCardId: `NFC-${newId}`,
      avatarBgColor: '#06D6A0',
      isVisitor: true,
      isBaptized: isBaptized,
    };

    onAddMember(newMember);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="new-member-modal"
        className="w-full max-w-sm rounded-[24px] border-3 border-[#D6EEFC] bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFEE93] text-[#B7791F]">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="font-['Mali'] text-base font-bold text-[#2D3748]">
              ลงทะเบียนผู้มาเยือน / สมาชิกใหม่
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F0F8FF] text-[#718096] hover:bg-[#E2E8F0]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#2D3748] mb-1">
              ชื่อเล่น / ชื่อเรียกที่คุ้นเคย <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="เช่น น้องมุก, พี่ต้น"
              className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-sm focus:border-[#7EC8E3] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2D3748] mb-1">
              ชื่อ-นามสกุลจริง (ถ้ามี)
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="เช่น มุกดา แสงประกาย"
              className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-sm focus:border-[#7EC8E3] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2D3748] mb-1">
              ประเภท / กลุ่ม
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-sm focus:border-[#7EC8E3] focus:outline-none"
            >
              <option value="ผู้มาเยือนใหม่ 🌟">ผู้มาเยือนใหม่ 🌟</option>
              <option value="สมาชิกทั่วไป ⛪">สมาชิกทั่วไป ⛪</option>
              <option value="วัยรุ่น / นักศึกษา 🎒">วัยรุ่น / นักศึกษา 🎒</option>
              <option value="ครอบครัว / เด็ก 🎈">ครอบครัว / เด็ก 🎈</option>
              <option value="ผู้สนใจพระคัมภีร์ 📖">ผู้สนใจพระคัมภีร์ 📖</option>
            </select>
          </div>

          {/* Baptism Status Selection Tile */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-2.5">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>🕊️ การรับบัพติศมา (Baptism)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isBaptized
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {isBaptized ? '✓ รับแล้ว' : 'ยังไม่รับ'}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsBaptized(true)}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs transition cursor-pointer select-none active:scale-95 border ${
                  isBaptized === true
                    ? 'bg-white text-emerald-700 border-emerald-400 ring-2 ring-emerald-300 shadow-2xs font-bold'
                    : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-800 font-medium'
                }`}
              >
                <input
                  type="radio"
                  name="modalBaptismChoice"
                  checked={isBaptized === true}
                  onChange={() => setIsBaptized(true)}
                  className="h-3.5 w-3.5 accent-emerald-600 pointer-events-none"
                />
                <span>🕊️ รับบัพติศมาแล้ว</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBaptized(false)}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs transition cursor-pointer select-none active:scale-95 border ${
                  isBaptized === false
                    ? 'bg-white text-amber-800 border-amber-400 ring-2 ring-amber-300 shadow-2xs font-bold'
                    : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-800 font-medium'
                }`}
              >
                <input
                  type="radio"
                  name="modalBaptismChoice"
                  checked={isBaptized === false}
                  onChange={() => setIsBaptized(false)}
                  className="h-3.5 w-3.5 accent-amber-500 pointer-events-none"
                />
                <span>🌱 ยังไม่รับ</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#CBD5E1] py-2 text-xs font-semibold text-slate-600 hover:bg-gray-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-gradient-to-r from-[#7EC8E3] to-[#48CAE4] py-2 font-['Mali'] text-xs font-bold text-white shadow-sm hover:shadow cursor-pointer"
            >
              บันทึกและเลือกทันที ✨
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
