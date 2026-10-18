import React, { useState, useEffect } from 'react';
import { Member } from '../types';
import { PhotoPicker } from './PhotoPicker';
import { DatePickerField } from './DatePickerField';
import {
  UserCheck,
  UserPlus,
  X,
  Sparkles,
  Phone,
  Calendar,
  MapPin,
  Tag,
  FileText,
  Trash2,
  Heart,
  ArrowLeft,
  Home,
  Smartphone,
  Radio,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Wrench,
} from 'lucide-react';
import {
  isWebNfcSupported,
  getCompactCheckInUrl,
  getCheckInUrl,
} from '../utils/nfcHelpers';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: Member | null;
  onSaveMember: (member: Member) => void;
  onDeleteMember?: (memberId: string) => void;
  initialNickname?: string;
  onBackToRoster?: () => void;
  backLabel?: string;
  savedCareGroups?: string[];
  onAddNewCareGroup?: (groupName: string) => void;
  onOpenNfcTool?: (memberId?: string) => void;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  memberToEdit,
  onSaveMember,
  onDeleteMember,
  initialNickname = '',
  onBackToRoster,
  backLabel = 'กลับหน้าก่อนหน้า',
  savedCareGroups = [],
  onAddNewCareGroup,
  onOpenNfcTool,
}) => {
  const isEditing = Boolean(memberToEdit);

  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [ageGroup, setAgeGroup] = useState<'ADULT' | 'CHILD'>('ADULT');
  const [gender, setGender] = useState<'FEMALE' | 'MALE' | undefined>(undefined);
  const [role, setRole] = useState('สมาชิกทั่วไป ⛪');
  const [careGroup, setCareGroup] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [nfcCardId, setNfcCardId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [avatarBgColor, setAvatarBgColor] = useState('#7EC8E3');
  const [isVisitor, setIsVisitor] = useState(false);
  const [isBaptized, setIsBaptized] = useState<boolean>(false);
  const [baptismDate, setBaptismDate] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // NFC Scanning states for phone/tablet
  const [isNfcScanning, setIsNfcScanning] = useState(false);
  const [nfcScanStatus, setNfcScanStatus] = useState<string | null>(null);
  const [hasWebNfc, setHasWebNfc] = useState(false);
  const [nfcController, setNfcController] = useState<AbortController | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setHasWebNfc(true);
    }
  }, []);

  // Stop NFC scanning when modal closes
  useEffect(() => {
    if (!isOpen && nfcController) {
      nfcController.abort();
      setNfcController(null);
      setIsNfcScanning(false);
      setNfcScanStatus(null);
    }
  }, [isOpen, nfcController]);

  const handleStartNfcScan = async () => {
    setNfcScanStatus(null);
    const win = window as unknown as {
      NDEFReader?: new () => {
        scan: (options?: { signal: AbortSignal }) => Promise<void>;
        onreading: (e: { serialNumber?: string }) => void;
        onerror?: (e: unknown) => void;
      };
    };

    if (!win.NDEFReader) {
      setNfcScanStatus(
        '📱 เบราว์เซอร์นี้ไม่รองรับการแตะอ่านอัตโนมัติ (เช่น iPhone / Safari) ท่านสามารถพิมพ์เลข UID หรือกด "ศูนย์จัดการ NFC 🛠️" ด้านล่างได้ค่ะ'
      );
      return;
    }

    try {
      const controller = new AbortController();
      setNfcController(controller);
      setIsNfcScanning(true);
      setNfcScanStatus('📲 กำลังรอแตะบัตร... นำบัตร NFC มาแนบที่ด้านหลังโทรศัพท์');

      const ndef = new win.NDEFReader();
      await ndef.scan({ signal: controller.signal });

      ndef.onreading = (event: { serialNumber?: string }) => {
        const serial = (event.serialNumber || '').trim();
        const finalId = serial || `NFC-${Math.floor(1000 + Math.random() * 9000)}`;

        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([80, 40, 80]);
          } catch {
            // ignore
          }
        }

        setNfcCardId(finalId);
        setNfcScanStatus(`✓ อ่านสำเร็จ! รหัสบัตร: ${finalId}`);
        setIsNfcScanning(false);
        controller.abort();
        setNfcController(null);
      };

      if (ndef.onerror) {
        ndef.onerror = () => {
          setNfcScanStatus('⚠️ ไม่สามารถอ่านบัตรได้ กรุณาลองแตะใหม่อีกครั้ง');
          setIsNfcScanning(false);
        };
      }
    } catch (err: unknown) {
      console.warn('NFC scanning error:', err);
      setIsNfcScanning(false);
      setNfcScanStatus('⚠️ ไม่สามารถเปิดอ่าน NFC ได้ โปรดตรวจสอบว่าเปิด NFC ในเครื่องแล้ว');
    }
  };

  const handleStopNfcScan = () => {
    if (nfcController) {
      nfcController.abort();
      setNfcController(null);
    }
    setIsNfcScanning(false);
    setNfcScanStatus(null);
  };

  const [isNfcWriting, setIsNfcWriting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const getMemberCheckinUrl = () => {
    const targetId = memberToEdit?.id || nfcCardId.trim() || 'MEM-TARGET';
    return getCompactCheckInUrl(targetId);
  };

  const handleCopyLink = async () => {
    const url = getMemberCheckinUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setNfcScanStatus('✓ คัดลอกลิงก์สำหรับใส่ในแอป NFC Tools เรียบร้อยแล้วค่ะ');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      setNfcScanStatus(`ลิงก์สำหรับใส่ในแอป NFC Tools: ${url}`);
    }
  };

  const handleWriteNfc = async () => {
    const targetId = memberToEdit?.id || nfcCardId.trim() || `MEM-${Date.now().toString().slice(-4)}`;
    const url = getMemberCheckinUrl();

    const win = window as unknown as {
      NDEFReader?: new () => {
        write: (
          message: {
            records: Array<{ recordType: string; data: string }>;
          },
          options?: { signal?: AbortSignal }
        ) => Promise<void>;
      };
    };

    if (!win.NDEFReader) {
      setNfcScanStatus(
        '📱 บนอุปกรณ์นี้ (เช่น iPhone) แนะนำให้กด "คัดลอกลิงก์ 📋" แล้วนำไปเขียนด้วยแอปฟรี "NFC Tools" ค่ะ'
      );
      handleCopyLink();
      return;
    }

    try {
      setIsNfcWriting(true);
      setNfcScanStatus('📲 กำลังรอแตะบัตร... นำบัตร NFC มาแนบที่ด้านหลังโทรศัพท์ค้างไว้ 1-2 วินาที');

      const ndef = new win.NDEFReader();
      // Write compact URL record
      await ndef.write({
        records: [{ recordType: 'url', data: url }],
      });

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {
          // ignore
        }
      }

      setNfcCardId(targetId);
      setIsNfcWriting(false);
      setNfcScanStatus(`✓ บันทึกข้อมูลลงบัตร NFC สำเร็จเรียบร้อยแล้ว! (รหัส: ${targetId})`);
    } catch (err: unknown) {
      console.warn('NFC Write error in modal:', err);
      setIsNfcWriting(false);
      const msg = err instanceof Error ? err.message : String(err);
      setNfcScanStatus(`⚠️ บันทึกลงบัตรไม่สำเร็จ: ${msg}`);
    }
  };

  useEffect(() => {
    if (memberToEdit) {
      setFullName(memberToEdit.fullName || '');
      setNickname(memberToEdit.nickname || '');
      setRole(memberToEdit.role || 'สมาชิกทั่วไป ⛪');
      setCareGroup(memberToEdit.careGroup || '');
      setPhone(memberToEdit.phone || '');
      setAgeGroup(memberToEdit.ageGroup || 'ADULT');
      setGender(memberToEdit.gender);
      setNotes(memberToEdit.notes || '');
      setNfcCardId(memberToEdit.nfcCardId || `NFC-${memberToEdit.id}`);
      setAvatarUrl(memberToEdit.avatarUrl);
      setAvatarBgColor(memberToEdit.avatarBgColor || '#7EC8E3');
      setIsVisitor(Boolean(memberToEdit.isVisitor));
      setIsBaptized(Boolean(memberToEdit.isBaptized));
      setBaptismDate(memberToEdit.baptismDate || '');
    } else {
      // New member
      setFullName('');
      setNickname(initialNickname || '');
      setAgeGroup('ADULT');
      setGender(undefined);
      setRole('สมาชิกทั่วไป ⛪');
      setCareGroup('');
      setPhone('');
      setNotes('');
      setIsBaptized(false);
      setBaptismDate('');
      const randId = Math.floor(100 + Math.random() * 900);
      setNfcCardId(`NFC-F${randId}`);
      setAvatarUrl(undefined);
      setAvatarBgColor(
        ['#7EC8E3', '#06D6A0', '#FFD166', '#FF9EAA', '#B5838D', '#90E0EF'][
          Math.floor(Math.random() * 6)
        ]
      );
      setIsVisitor(false);
    }
    setConfirmDelete(false);
  }, [memberToEdit, initialNickname, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    const id = memberToEdit?.id || `F${Math.floor(100 + Math.random() * 900)}`;
    const trimmedCareGroup = careGroup.trim();

    if (trimmedCareGroup && onAddNewCareGroup) {
      onAddNewCareGroup(trimmedCareGroup);
    }

    const savedMember: Member = {
      id,
      fullName: fullName.trim() || nickname.trim(),
      nickname: nickname.trim(),
      ageGroup,
      gender,
      role: role.trim(),
      careGroup: trimmedCareGroup || undefined,
      phone: phone.trim() || undefined,
      birthday: memberToEdit?.birthday, // retain historical if existed, not collected
      address: memberToEdit?.address,   // retain historical if existed, not collected
      notes: notes.trim() || undefined,
      nfcCardId: nfcCardId.trim() || `NFC-${id}`,
      avatarUrl: avatarUrl,
      avatarBgColor: avatarBgColor,
      isVisitor: isVisitor,
      isBaptized,
      baptismDate: isBaptized ? baptismDate.trim() || undefined : undefined,
    };

    onSaveMember(savedMember);
    if (onBackToRoster) {
      onBackToRoster();
    } else {
      onClose();
    }
  };

  const handleDelete = () => {
    if (memberToEdit && onDeleteMember) {
      onDeleteMember(memberToEdit.id);
      if (onBackToRoster) {
        onBackToRoster();
      } else {
        onClose();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="member-modal"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[24px] border-3 border-[#D6EEFC] bg-white p-5 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2">
            {onBackToRoster && (
              <button
                type="button"
                onClick={onBackToRoster}
                className="flex items-center gap-1 rounded-xl border border-[#D6EEFC] bg-[#F0F8FF] px-2.5 py-1.5 text-xs font-semibold text-[#2B6CB0] hover:bg-[#E0F3FC] transition shrink-0 cursor-pointer"
                title={backLabel}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{backLabel}</span>
              </button>
            )}
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs shrink-0"
              style={{ backgroundColor: isEditing ? '#3A86FF' : '#06D6A0' }}
            >
              {isEditing ? <UserCheck className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-['Mali'] text-base sm:text-lg font-bold text-[#2D3748]">
                {isEditing ? `แก้ไขข้อมูล: ${memberToEdit?.nickname}` : 'เพิ่มสมาชิกใหม่ / ผู้มาเยือน'}
              </h3>
              <p className="text-xs text-[#718096]">
                {isEditing
                  ? `รหัสสมาชิก: ${memberToEdit?.id}`
                  : 'กรอกข้อมูลส่วนตัว ถ่ายรูป หรืออัปโหลดรูปสมาชิก'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F8FF] text-[#718096] hover:bg-[#E2E8F0] transition shrink-0 ml-2"
            title="ปิดหน้าต่าง (กลับหน้าหลัก)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Photo Picker Component (Camera live or Upload) */}
          <PhotoPicker
            currentPhoto={avatarUrl}
            onPhotoChange={setAvatarUrl}
            nicknameFallback={nickname || 'สมาชิก'}
            bgColorFallback={avatarBgColor}
          />

          {/* Name & Nickname row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                ชื่อเล่น / ชื่อเรียกคุ้นเคย <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="เช่น พี่ฟ้า, น้องต้น"
                className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#2D3748] focus:border-[#7EC8E3] focus:ring-2 focus:ring-[#7EC8E3]/30 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                ชื่อ-นามสกุลจริง
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="เช่น นภัสสร รุ่งเรืองฟ้าใส"
                className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#2D3748] focus:border-[#7EC8E3] focus:ring-2 focus:ring-[#7EC8E3]/30 focus:outline-none"
              />
            </div>
          </div>

          {/* Age Group (Required Radio Group: Adult / Child) & Gender (Female / Male) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Age Group Required Radio Button Group */}
            <fieldset id="age-group-radio-group">
              <div className="flex items-center justify-between mb-1">
                <legend className="text-xs font-semibold text-[#2D3748]">
                  ช่วงวัย (Age Group) <span className="text-red-500">*</span>
                </legend>
                <span className="text-[10px] text-slate-400">สำหรับสถิติและรวี</span>
              </div>
              <div
                role="radiogroup"
                aria-label="ช่วงวัย (ผู้ใหญ่ หรือ เด็ก)"
                className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100/90 p-1 border border-slate-200/80"
              >
                <label
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2.5 text-xs transition cursor-pointer select-none ${
                    ageGroup === 'ADULT'
                      ? 'bg-white text-[#2B6CB0] shadow-xs ring-1 ring-sky-200 font-bold'
                      : 'text-slate-600 hover:text-slate-800 font-medium'
                  }`}
                >
                  <input
                    type="radio"
                    name="ageGroup"
                    value="ADULT"
                    required
                    checked={ageGroup === 'ADULT'}
                    onChange={() => setAgeGroup('ADULT')}
                    className="h-3.5 w-3.5 accent-[#3A86FF] cursor-pointer"
                  />
                  <span>🧑 ผู้ใหญ่</span>
                </label>

                <label
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2.5 text-xs transition cursor-pointer select-none ${
                    ageGroup === 'CHILD'
                      ? 'bg-white text-amber-700 shadow-xs ring-1 ring-amber-200 font-bold'
                      : 'text-slate-600 hover:text-slate-800 font-medium'
                  }`}
                >
                  <input
                    type="radio"
                    name="ageGroup"
                    value="CHILD"
                    required
                    checked={ageGroup === 'CHILD'}
                    onChange={() => setAgeGroup('CHILD')}
                    className="h-3.5 w-3.5 accent-amber-600 cursor-pointer"
                  />
                  <span>👧 เด็ก</span>
                </label>
              </div>
            </fieldset>

            {/* Gender Radio Button Group (หญิง / ชาย) */}
            <fieldset id="gender-radio-group">
              <div className="flex items-center justify-between mb-1">
                <legend className="text-xs font-semibold text-[#2D3748]">
                  เพศ (หญิง / ชาย)
                </legend>
                {gender && (
                  <button
                    type="button"
                    onClick={() => setGender(undefined)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ล้างค่า
                  </button>
                )}
              </div>
              <div
                role="radiogroup"
                aria-label="เพศ (หญิง หรือ ชาย)"
                className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100/90 p-1 border border-slate-200/80"
              >
                <label
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2.5 text-xs transition cursor-pointer select-none ${
                    gender === 'FEMALE'
                      ? 'bg-white text-pink-600 shadow-xs ring-1 ring-pink-200 font-bold'
                      : 'text-slate-600 hover:text-slate-800 font-medium'
                  }`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value="FEMALE"
                    checked={gender === 'FEMALE'}
                    onChange={() => setGender('FEMALE')}
                    className="h-3.5 w-3.5 accent-pink-500 cursor-pointer"
                  />
                  <span>👩 หญิง</span>
                </label>

                <label
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2.5 text-xs transition cursor-pointer select-none ${
                    gender === 'MALE'
                      ? 'bg-white text-sky-700 shadow-xs ring-1 ring-sky-200 font-bold'
                      : 'text-slate-600 hover:text-slate-800 font-medium'
                  }`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value="MALE"
                    checked={gender === 'MALE'}
                    onChange={() => setGender('MALE')}
                    className="h-3.5 w-3.5 accent-[#3A86FF] cursor-pointer"
                  />
                  <span>👨 ชาย</span>
                </label>
              </div>
            </fieldset>
          </div>

          {/* Phone Field */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-[#2D3748] mb-1">
              <Phone className="h-3.5 w-3.5 text-[#3A86FF]" />
              เบอร์โทรศัพท์ <span className="text-[11px] font-normal text-slate-400">(ไม่บังคับ)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="เช่น 081-234-5678"
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#2D3748] focus:border-[#7EC8E3] focus:ring-2 focus:ring-[#7EC8E3]/30 focus:outline-none"
            />
          </div>

          {/* Baptism Status (รับบัพติศมาแล้ว หรือ ยังไม่รับ) */}
          <fieldset id="baptism-status-field" className="rounded-2xl border border-sky-100 bg-sky-50/40 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <legend className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>🕊️ สถานะการรับบัพติศมา</span>
                <span className="text-[11px] font-normal text-slate-400">(Baptism Status)</span>
              </legend>
              <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-bold ${
                isBaptized
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {isBaptized ? '✓ รับแล้ว' : 'ยังไม่รับ'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs transition cursor-pointer select-none border ${
                  isBaptized === true
                    ? 'bg-white text-emerald-700 border-emerald-400 shadow-xs ring-2 ring-emerald-300 font-bold'
                    : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-800 font-medium'
                }`}
              >
                <input
                  type="radio"
                  name="isBaptized"
                  checked={isBaptized === true}
                  onChange={() => setIsBaptized(true)}
                  className="h-4 w-4 accent-emerald-600 cursor-pointer"
                />
                <span>🕊️ รับบัพติศมาแล้ว</span>
              </label>

              <label
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs transition cursor-pointer select-none border ${
                  isBaptized === false
                    ? 'bg-white text-amber-800 border-amber-400 shadow-xs ring-2 ring-amber-300 font-bold'
                    : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-800 font-medium'
                }`}
              >
                <input
                  type="radio"
                  name="isBaptized"
                  checked={isBaptized === false}
                  onChange={() => setIsBaptized(false)}
                  className="h-4 w-4 accent-amber-500 cursor-pointer"
                />
                <span>🌱 ยังไม่รับ</span>
              </label>
            </div>

            {isBaptized === true && (
              <div className="mt-2.5 pt-2 border-t border-sky-100 flex items-center justify-between gap-2 flex-wrap">
                <label className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                  <span>📅 วันที่รับบัพติศมา (ถ้าทราบ):</span>
                </label>
                <div className="w-full sm:w-56">
                  <DatePickerField
                    value={baptismDate}
                    onChange={(val) => setBaptismDate(val)}
                    placeholder="เลือกวันที่รับบัพติศมา"
                  />
                </div>
              </div>
            )}
          </fieldset>

          {/* Role, Care Group & NFC Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-[#2D3748] mb-1">
                <Tag className="h-3.5 w-3.5 text-[#D69E2E]" />
                บทบาท / ฝ่ายรับใช้
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#2D3748] focus:border-[#7EC8E3] focus:outline-none"
              >
                <option value="สมาชิกทั่วไป ⛪">สมาชิกทั่วไป ⛪</option>
                <option value="ผู้นำนมัสการ 🎶">ผู้นำนมัสการ 🎶</option>
                <option value="ทีมนมัสการ / นักดนตรี 🎹">ทีมนมัสการ / นักดนตรี 🎹</option>
                <option value="มัคนายก / ต้อนรับ 🤝">มัคนายก / ต้อนรับ 🤝</option>
                <option value="ครูรวีเด็ก 🎨">ครูรวีเด็ก 🎨</option>
                <option value="ผู้ปกครองคริสตจักร ⛪">ผู้ปกครองคริสตจักร ⛪</option>
                <option value="ศิษยาภิบาล 📖">ศิษยาภิบาล 📖</option>
                <option value="ทีมมีเดียและถ่ายทอดสด 🎥">ทีมมีเดียและถ่ายทอดสด 🎥</option>
                <option value="ผู้มาเยือนใหม่ 🌟">ผู้มาเยือนใหม่ 🌟</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-[#2D3748] mb-1">
                <Home className="h-3.5 w-3.5 text-[#06D6A0]" />
                กลุ่มแคร์ที่สังกัด
              </label>
              <input
                type="text"
                list="saved-care-groups-list"
                value={careGroup}
                onChange={(e) => setCareGroup(e.target.value)}
                placeholder="พิมพ์ชื่อกลุ่มแคร์..."
                className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#2D3748] focus:border-[#06D6A0] focus:ring-2 focus:ring-[#06D6A0]/20 focus:outline-none"
              />
              {savedCareGroups && savedCareGroups.length > 0 && (
                <datalist id="saved-care-groups-list">
                  {savedCareGroups.map((group) => (
                    <option key={group} value={group} />
                  ))}
                </datalist>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="flex items-center gap-1 text-xs font-semibold text-[#2D3748]">
                  <Sparkles className="h-3.5 w-3.5 text-[#7EC8E3]" />
                  รหัสบัตร NFC
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={isNfcScanning ? handleStopNfcScan : handleStartNfcScan}
                    className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium transition ${
                      isNfcScanning
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : 'bg-[#EBF8FF] text-[#2B6CB0] hover:bg-[#BEE3F8]'
                    }`}
                    title="แตะบัตร NFC หลังมือถือเพื่ออ่านรหัสชิป (UID)"
                  >
                    {isNfcScanning ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>กำลังรอแตะ...</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="h-3 w-3 text-[#3A86FF]" />
                        <span>แตะอ่าน 📲</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleWriteNfc}
                    disabled={isNfcWriting}
                    className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
                    title="เขียนข้อมูลสมาชิกและ URL เช็คอินลงในบัตร NFC ทันที"
                  >
                    {isNfcWriting ? (
                      <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />
                    ) : (
                      <Zap className="h-3 w-3 text-emerald-600" />
                    )}
                    <span>เขียนลงบัตร ✍️</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={nfcCardId}
                  onChange={(e) => setNfcCardId(e.target.value)}
                  placeholder="เช่น 04:A2:3B:5C หรือ MEM001"
                  className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-[#2D3748] font-mono focus:outline-none transition ${
                    isNfcScanning || isNfcWriting
                      ? 'border-[#3A86FF] ring-2 ring-[#3A86FF]/30'
                      : 'border-[#CBD5E1] focus:border-[#7EC8E3]'
                  }`}
                />
              </div>

              {nfcScanStatus && (
                <p className="mt-1 text-[11px] text-[#2B6CB0] font-medium animate-in fade-in">
                  {nfcScanStatus}
                </p>
              )}

              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#718096]">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-[#3A86FF] font-semibold hover:underline flex items-center gap-0.5"
                  title="คัดลอกลิงก์สำหรับใส่ในแอป NFC Tools บน iPhone/Android"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedLink ? '✓ คัดลอกแล้ว!' : 'คัดลอกลิงก์เช็คอิน'}</span>
                </button>

                {onOpenNfcTool && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenNfcTool(memberToEdit?.id);
                    }}
                    className="text-[#0284C7] font-bold hover:underline flex items-center gap-1 bg-sky-50 px-2 py-0.5 rounded border border-sky-200"
                    title="เปิดหน้าต่างจัดการ NFC พร้อมคู่มือวิธีใช้งาน"
                  >
                    <Wrench className="h-3 w-3" />
                    <span>ศูนย์จัดการ NFC ➔</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-[#2D3748] mb-1">
              <FileText className="h-3.5 w-3.5 text-[#718096]" />
              หมายเหตุ / หัวข้ออธิษฐานเผื่อ
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น อธิษฐานเผื่อเรื่องสุขภาพ, ภาระงาน หรือกลุ่มแคร์ที่สังกัด"
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#2D3748] focus:border-[#7EC8E3] focus:ring-2 focus:ring-[#7EC8E3]/30 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#E2E8F0]">
            {isEditing && onDeleteMember ? (
              confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    ยืนยันลบ
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-xl border border-gray-300 px-2.5 py-2 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบสมาชิก
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              {onBackToRoster && (
                <button
                  type="button"
                  onClick={onBackToRoster}
                  className="rounded-xl border border-[#D6EEFC] bg-[#F0F8FF] px-3.5 py-2.5 text-xs font-semibold text-[#2B6CB0] hover:bg-[#E0F3FC] transition cursor-pointer"
                >
                  ← {backLabel}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-xs font-medium text-[#718096] hover:bg-gray-50 cursor-pointer"
              >
                ปิดหน้าต่าง (หน้าหลัก)
              </button>
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-[#7EC8E3] to-[#48CAE4] px-5 py-2.5 font-['Mali'] text-xs font-semibold text-white shadow-md shadow-[#7EC8E3]/30 hover:shadow-lg active:scale-98"
              >
                {isEditing ? '💾 บันทึกการแก้ไข' : '✨ บันทึกสมาชิกใหม่'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
