import React, { useState, useEffect } from 'react';
import { Member } from '../types';
import { Sparkles, UserPlus, X, Heart, Users, Thermometer, ShieldCheck, ArrowLeft } from 'lucide-react';

interface QuickNewcomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  members: Member[];
  initialName?: string;
  currentTemp?: string;
  onCheckInNewcomer: (newcomerData: {
    nickname: string;
    fullName?: string;
    ageGroup?: 'ADULT' | 'CHILD';
    gender?: 'FEMALE' | 'MALE';
    invitedBy?: string;
    phone?: string;
    notes?: string;
    temperature: number;
    isBaptized?: boolean;
  }) => void;
}

export const QuickNewcomerModal: React.FC<QuickNewcomerModalProps> = ({
  isOpen,
  onClose,
  onBack,
  members,
  initialName = '',
  currentTemp = '36.5',
  onCheckInNewcomer,
}) => {
  const [nickname, setNickname] = useState('');
  const [fullName, setFullName] = useState('');
  const [ageGroup, setAgeGroup] = useState<'ADULT' | 'CHILD'>('ADULT');
  const [gender, setGender] = useState<'FEMALE' | 'MALE' | undefined>(undefined);
  const [invitedBy, setInvitedBy] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [temp, setTemp] = useState('36.5');
  const [isBaptized, setIsBaptized] = useState<boolean>(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNickname(initialName);
      setFullName(initialName);
      setAgeGroup('ADULT');
      setGender(undefined);
      setTemp(currentTemp || '36.5');
      setInvitedBy('');
      setPhone('');
      setNotes('');
      setIsBaptized(false);
      setShowMemberDropdown(false);
    }
  }, [isOpen, initialName, currentTemp]);

  if (!isOpen) return null;

  // Filter regular church members (excluding other newcomers) as inviter suggestions
  const inviterCandidates = members.filter((m) => !m.isVisitor);
  const filteredInviters = invitedBy.trim()
    ? inviterCandidates.filter(
        (m) =>
          m.nickname.toLowerCase().includes(invitedBy.toLowerCase()) ||
          m.fullName.toLowerCase().includes(invitedBy.toLowerCase())
      )
    : inviterCandidates.slice(0, 5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      alert('กรุณากรอกชื่อหรือชื่อเล่นของผู้มาใหม่ค่ะ');
      return;
    }

    const tempNum = parseFloat(temp) || 36.5;

    onCheckInNewcomer({
      nickname: nickname.trim(),
      fullName: fullName.trim() || nickname.trim(),
      ageGroup,
      gender,
      invitedBy: invitedBy.trim() || 'มาด้วยตนเอง 🌟',
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      temperature: tempNum,
      isBaptized,
    });

    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl border border-emerald-100 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-emerald-100 pb-3 mb-4 pr-8">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer"
              title="ย้อนกลับไปศูนย์ข้อมูลคนมาใหม่"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ย้อนกลับ</span>
            </button>
          )}
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-200 shrink-0">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-['Mali'] text-lg font-bold text-slate-800 flex items-center gap-1.5">
              <span>เช็คอินคนมาใหม่</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                Newcomer Tag 🌟
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              บันทึกรวดเร็ว ไม่ซักประวัติเยอะ ให้คนมาใหม่รู้สึกอบอุ่นและสบายใจ
            </p>
          </div>
        </div>

        {/* Privacy Assurance Banner */}
        <div className="mb-4 flex items-start gap-2 rounded-2xl bg-emerald-50/80 border border-emerald-200 p-2.5 text-xs text-emerald-900">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>ยินดีต้อนรับสู่คริสตจักร:</strong> ระบบจะติดแท็ก &quot;ผู้มาใหม่&quot; ไว้ในประวัติเช็คอินทันที แอดมินสามารถดูสรุปและลงทะเบียนข้อมูลเต็มรูปแบบให้ภายหลังได้เมื่อมาสม่ำเสมอ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Nickname / Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อเล่น / ชื่อเรียก <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น น้องโบว์, คุณเอก, พี่นุช"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (!fullName || fullName === nickname) {
                  setFullName(e.target.value);
                }
              }}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              autoFocus
            />
          </div>

          {/* Full name (optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อ-นามสกุลจริง <span className="text-slate-400 font-normal">(ไม่บังคับ/กรอกทีหลังได้)</span>
            </label>
            <input
              type="text"
              placeholder="ชื่อจริง (หากสะดวกแจ้ง)"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Age Group (Adult / Child) & Gender (Female / Male) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ช่วงวัย <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setAgeGroup('ADULT')}
                  className={`flex items-center justify-center gap-1 rounded-lg py-1.5 px-2 text-xs font-semibold transition cursor-pointer ${
                    ageGroup === 'ADULT'
                      ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-200 font-bold'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <span>🧑</span>
                  <span>ผู้ใหญ่</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAgeGroup('CHILD')}
                  className={`flex items-center justify-center gap-1 rounded-lg py-1.5 px-2 text-xs font-semibold transition cursor-pointer ${
                    ageGroup === 'CHILD'
                      ? 'bg-white text-amber-700 shadow-xs ring-1 ring-amber-200 font-bold'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <span>👧</span>
                  <span>เด็ก</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เพศ (หญิง / ชาย)
              </label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setGender(gender === 'FEMALE' ? undefined : 'FEMALE')}
                  className={`flex items-center justify-center gap-1 rounded-lg py-1.5 px-2 text-xs font-semibold transition cursor-pointer ${
                    gender === 'FEMALE'
                      ? 'bg-white text-pink-600 shadow-xs ring-1 ring-pink-200 font-bold'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <span>👩</span>
                  <span>หญิง</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGender(gender === 'MALE' ? undefined : 'MALE')}
                  className={`flex items-center justify-center gap-1 rounded-lg py-1.5 px-2 text-xs font-semibold transition cursor-pointer ${
                    gender === 'MALE'
                      ? 'bg-white text-sky-700 shadow-xs ring-1 ring-sky-200 font-bold'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <span>👨</span>
                  <span>ชาย</span>
                </button>
              </div>
            </div>
          </div>

          {/* Baptism Status (รับบัพติศมาแล้ว หรือ ยังไม่รับ) */}
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>🕊️ สถานะการรับบัพติศมา</span>
                <span className="text-[11px] font-normal text-slate-400">(Baptism)</span>
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isBaptized
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {isBaptized ? '✓ รับแล้ว' : 'ยังไม่รับ'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsBaptized(true)}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs transition cursor-pointer select-none active:scale-95 border ${
                  isBaptized === true
                    ? 'bg-white text-emerald-700 border-emerald-400 ring-2 ring-emerald-300 shadow-xs font-bold'
                    : 'bg-white/70 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-800 font-medium'
                }`}
              >
                <input
                  type="radio"
                  name="newcomerBaptism"
                  checked={isBaptized === true}
                  onChange={() => setIsBaptized(true)}
                  className="h-3.5 w-3.5 accent-emerald-600 pointer-events-none"
                />
                <span>🕊️ รับบัพติศมาแล้ว</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBaptized(false)}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs transition cursor-pointer select-none active:scale-95 border ${
                  isBaptized === false
                    ? 'bg-white text-amber-800 border-amber-400 ring-2 ring-amber-300 shadow-xs font-bold'
                    : 'bg-white/70 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-800 font-medium'
                }`}
              >
                <input
                  type="radio"
                  name="newcomerBaptism"
                  checked={isBaptized === false}
                  onChange={() => setIsBaptized(false)}
                  className="h-3.5 w-3.5 accent-amber-500 pointer-events-none"
                />
                <span>🌱 ยังไม่รับ</span>
              </button>
            </div>
          </div>

          {/* Invited By / Companion (คนที่พามา / มากับใคร) */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-emerald-600" />
                <span>คนที่พามา / มากับใคร (Invited by):</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">แอดมินใช้ติดตามผล</span>
            </label>
            <input
              type="text"
              placeholder="พิมพ์ชื่อสมาชิกที่พามา หรือเลือกจากด้านล่าง"
              value={invitedBy}
              onFocus={() => setShowMemberDropdown(true)}
              onChange={(e) => {
                setInvitedBy(e.target.value);
                setShowMemberDropdown(true);
              }}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
            />

            {/* Quick Inviter Member Suggestions Dropdown */}
            {showMemberDropdown && filteredInviters.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg text-xs">
                <p className="px-2 py-1 text-[10px] font-semibold text-slate-400">
                  เลือกสมาชิกคริสตจักรที่พามา:
                </p>
                {filteredInviters.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setInvitedBy(`${m.nickname} (${m.fullName})`);
                      setShowMemberDropdown(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-emerald-50 hover:text-emerald-800 transition"
                  >
                    <span className="font-medium text-slate-800">{m.nickname}</span>
                    <span className="text-[10px] text-slate-400">{m.role}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick chips for common responses */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {['มาด้วยตนเอง / ทราบจากเพจ', 'เพื่อนร่วมงาน', 'คนในครอบครัว'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setInvitedBy(chip);
                    setShowMemberDropdown(false);
                  }}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5 text-sky-600" />
                <span>อุณหภูมิร่างกาย (°C):</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">เกณฑ์ปกติ 36.5°C</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="25.0"
                max="46.0"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
              />
              <div className="flex items-center gap-1 text-xs">
                {[36.0, 36.5, 36.8].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTemp(String(t))}
                    className={`rounded-lg px-2 py-1 border text-[11px] transition ${
                      temp === String(t)
                        ? 'border-emerald-500 bg-emerald-100 text-emerald-800 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                    }`}
                  >
                    {t}°C
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Contact phone (optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เบอร์โทรศัพท์ <span className="text-slate-400 font-normal">(ระบุหรือไม่ก็ได้ ตามความสะดวก)</span>
            </label>
            <input
              type="tel"
              placeholder="08x-xxx-xxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Notes (optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              บันทึกเพิ่มเติมสำหรับทีมต้อนรับ / แคร์
            </label>
            <input
              type="text"
              placeholder="เช่น สนใจกลุ่มแคร์คนรุ่นใหม่, อาศัยอยู่แถวรามคำแหง"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Submit buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onBack || onClose}
              className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              {onBack ? '← กลับหน้าคนมาใหม่' : 'ยกเลิก'}
            </button>
            <button
              type="submit"
              className="flex-[2] rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 font-['Mali'] text-sm font-bold text-white shadow-md shadow-emerald-200 hover:from-emerald-600 hover:to-teal-700 transition active:scale-98 flex items-center justify-center gap-1.5"
            >
              <Heart className="h-4 w-4 fill-white" />
              <span>เช็คอินคนมาใหม่ทันที 🌟</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
