import React, { useState, useEffect, useRef } from 'react';
import { Member } from '../types';
import {
  Smartphone,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  Radio,
  BookOpen,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  HelpCircle,
  Search,
  Trash2,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import {
  normalizeNfcId,
  isWebNfcSupported,
  getDeviceInfo,
  getCheckInUrl,
  getCompactCheckInUrl,
} from '../utils/nfcHelpers';
import { playNfcSuccessChime, triggerNfcHapticFeedback } from '../utils/audio';

interface NfcToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu?: () => void;
  backLabel?: string;
  members: Member[];
  onUpdateMemberNfc: (memberId: string, nfcCardId: string) => void;
  initialMemberId?: string;
  initialCardIdentifier?: string;
}

export const NfcToolModal: React.FC<NfcToolModalProps> = ({
  isOpen,
  onClose,
  onBackToMenu,
  backLabel = 'เมนูหลัก',
  members,
  onUpdateMemberNfc,
  initialMemberId,
  initialCardIdentifier,
}) => {
  const [activeTab, setActiveTab] = useState<'PAIR_UID' | 'WRITE' | 'NFC_TOOLS'>('PAIR_UID');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    initialMemberId || (members[0]?.id ?? '')
  );
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  // Device & Web NFC status
  const deviceInfo = getDeviceInfo();
  const [hasWebNfc, setHasWebNfc] = useState<boolean>(false);

  // Pair UID State
  const [isScanningUid, setIsScanningUid] = useState<boolean>(false);
  const [manualUidInput, setManualUidInput] = useState<string>(initialCardIdentifier || '');
  const [pairStatus, setPairStatus] = useState<{
    type: 'idle' | 'scanning' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  // Web NFC Write State
  const [writeFormat, setWriteFormat] = useState<'compact_url' | 'full_url' | 'text'>('compact_url');
  const [isWriting, setIsWriting] = useState<boolean>(false);
  const [writeStatus, setWriteStatus] = useState<{
    type: 'idle' | 'writing' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  // Copy Link feedback
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setHasWebNfc(isWebNfcSupported());
  }, []);

  useEffect(() => {
    if (initialMemberId) {
      setSelectedMemberId(initialMemberId);
    }
    if (initialCardIdentifier) {
      setManualUidInput(initialCardIdentifier);
      setActiveTab('PAIR_UID');
    }
  }, [initialMemberId, initialCardIdentifier, isOpen]);

  // Clean up on unmount or modal close
  useEffect(() => {
    if (!isOpen && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsScanningUid(false);
      setIsWriting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedMember = members.find((m) => m.id === selectedMemberId) || members[0];

  const fullCheckInUrl = selectedMember ? getCheckInUrl(selectedMember.id) : '';
  const compactCheckInUrl = selectedMember ? getCompactCheckInUrl(selectedMember.id) : '';

  const getTargetUrlForWriting = () => {
    return writeFormat === 'compact_url' ? compactCheckInUrl : fullCheckInUrl;
  };

  const handleCopyLink = async (textToCopy: string) => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // 1. Web NFC Scan & Auto-Pair Hardware UID
  const handleStartScanUid = async () => {
    if (!selectedMember) return;

    const win = window as unknown as {
      NDEFReader?: new () => {
        scan: (options?: { signal: AbortSignal }) => Promise<void>;
        onreading: (e: {
          serialNumber?: string;
          message?: { records?: Array<{ recordType: string; data?: DataView }> };
        }) => void;
        onerror?: (e: unknown) => void;
      };
    };

    if (!win.NDEFReader) {
      setPairStatus({
        type: 'error',
        message:
          'เบราว์เซอร์นี้ยังไม่รองรับ Web NFC สแกนอัตโนมัติ (Apple จำกัดไม่ให้เบราว์เซอร์บน iPhone สแกนโดยตรง) แต่ท่านสามารถกรอกรหัสบัตร UID ด้วยตนเองด้านล่าง หรือใช้แอป NFC Tools ได้เลยค่ะ',
      });
      return;
    }

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsScanningUid(true);
      setPairStatus({
        type: 'scanning',
        message: '📲 นำบัตร NFC มาแตะแนบชิดที่ด้านหลังโทรศัพท์ค้างไว้ 1-2 วินาที...',
      });

      const ndef = new win.NDEFReader();
      await ndef.scan({ signal: controller.signal });

      ndef.onreading = (event) => {
        const serial = (event.serialNumber || '').trim();
        let payloadSummary = '';

        if (event.message?.records && event.message.records.length > 0) {
          try {
            const dec = new TextDecoder();
            payloadSummary = dec.decode(event.message.records[0].data);
          } catch {
            // ignore
          }
        }

        const resolvedCode = serial || payloadSummary || `NFC-${Date.now().toString().slice(-4)}`;
        setManualUidInput(resolvedCode);

        // Haptic feedback & Unique NFC success chime
        triggerNfcHapticFeedback();
        playNfcSuccessChime();

        // AUTO-SAVE IMMEDIATELY! No extra click needed!
        onUpdateMemberNfc(selectedMember.id, resolvedCode);

        setIsScanningUid(false);
        controller.abort();

        setPairStatus({
          type: 'success',
          message: `✓ บันทึกผูกบัตร "${resolvedCode}" กับคุณ "${selectedMember.nickname}" สำเร็จเรียบร้อยแล้วค่ะ! นำไปแตะเช็คอินได้ทันที 🎉`,
        });
      };

      if (ndef.onerror) {
        ndef.onerror = () => {
          setIsScanningUid(false);
          setPairStatus({
            type: 'error',
            message: '⚠️ การอ่านบัตรขัดข้อง กรุณาลองแนบบัตรใหม่อีกครั้งค่ะ',
          });
        };
      }
    } catch (err: unknown) {
      console.warn('Scan UID error:', err);
      setIsScanningUid(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('abort') || msg.includes('cancel')) {
        setPairStatus({ type: 'idle', message: '' });
      } else {
        setPairStatus({
          type: 'error',
          message: '⚠️ ไม่สามารถเปิดระบบอ่าน NFC ได้ โปรดตรวจสอบว่าเปิด NFC ในเครื่องแล้ว',
        });
      }
    }
  };

  const handleStopScanUid = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsScanningUid(false);
    setPairStatus({ type: 'idle', message: '' });
  };

  // Manual save UID
  const handleSaveManualUid = () => {
    if (!selectedMember) return;
    if (!manualUidInput.trim()) {
      alert('กรุณากรอกรหัสบัตร UID ก่อนกดบันทึกค่ะ');
      return;
    }

    onUpdateMemberNfc(selectedMember.id, manualUidInput.trim());
    setPairStatus({
      type: 'success',
      message: `✓ บันทึกผูกรหัสบัตร "${manualUidInput.trim()}" กับคุณ "${selectedMember.nickname}" เรียบร้อยแล้วค่ะ!`,
    });
  };

  // Remove card binding
  const handleRemoveCardBinding = () => {
    if (!selectedMember) return;
    onUpdateMemberNfc(selectedMember.id, '');
    setManualUidInput('');
    setPairStatus({
      type: 'success',
      message: `ยกเลิกการผูกบัตรของคุณ "${selectedMember.nickname}" เรียบร้อยแล้ว`,
    });
  };

  // 2. Web NFC Direct Writer (for Chrome on Android)
  const handleWriteToNfc = async () => {
    if (!selectedMember) {
      alert('กรุณาเลือกสมาชิกที่ต้องการบันทึกลงบัตรค่ะ');
      return;
    }

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
      setWriteStatus({
        type: 'error',
        message:
          'อุปกรณ์นี้ยังไม่รองรับ Web NFC API ในการเขียนบัตรโดยตรงจากหน้าเว็บ (ระบบปฏิบัติการ Apple บน iPhone ไม่อนุญาตให้เบราว์เซอร์เข้าถึง NFC) แนะนำให้ใช้แท็บ "ใช้ร่วมกับแอป NFC Tools" ด้านบนเพื่อเขียนได้ง่ายๆ ฟรีค่ะ!',
      });
      return;
    }

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsWriting(true);
      setWriteStatus({
        type: 'writing',
        message: '📲 พร้อมเขียนข้อมูล! กรุณานำบัตรหรือสติกเกอร์ NFC มาแนบที่ด้านหลังโทรศัพท์ค้างไว้...',
      });

      const ndef = new win.NDEFReader();

      if (writeFormat === 'text') {
        // Write Text record only
        await ndef.write(
          {
            records: [{ recordType: 'text', data: selectedMember.id }],
          },
          { signal: controller.signal }
        );
      } else {
        // Write URL record (Compact or Full)
        const targetUrl = getTargetUrlForWriting();
        await ndef.write(
          {
            records: [{ recordType: 'url', data: targetUrl }],
          },
          { signal: controller.signal }
        );
      }

      // Haptic feedback & Unique NFC success chime
      triggerNfcHapticFeedback();
      playNfcSuccessChime();

      // Automatically update member's NFC ID to match
      onUpdateMemberNfc(selectedMember.id, selectedMember.id);

      setIsWriting(false);
      setWriteStatus({
        type: 'success',
        message: `✓ บันทึกข้อมูลลงบัตร NFC ของคุณ "${selectedMember.nickname}" สำเร็จเรียบร้อยแล้วค่ะ! นำไปแตะเช็คอินได้ทันที`,
      });
    } catch (err: unknown) {
      console.warn('NFC Write Error:', err);
      setIsWriting(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('abort') || errMsg.includes('cancel')) {
        setWriteStatus({
          type: 'error',
          message: 'ยกเลิกการเขียนข้อมูลแล้ว',
        });
      } else {
        setWriteStatus({
          type: 'error',
          message: `⚠️ บันทึกลงบัตรไม่สำเร็จ: ${errMsg} (โปรดตรวจสอบว่าการ์ดไม่ถูกล็อค และแนบชิดเสา NFC ของเครื่อง)`,
        });
      }
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!memberSearchTerm.trim()) return true;
    const q = memberSearchTerm.toLowerCase();
    return (
      m.nickname.toLowerCase().includes(q) ||
      m.fullName.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="nfc-tool-modal"
        className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-[26px] border-3 border-[#D6EEFC] bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-gradient-to-r from-[#F0F9FF] via-[#EBF8FF] to-[#F0FDF4] px-5 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBackToMenu && (
              <button
                type="button"
                onClick={onBackToMenu}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer"
                title={`ย้อนกลับไป${backLabel}`}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{backLabel}</span>
              </button>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-xs border border-[#BEE3F8] text-[#3A86FF] shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-['Mali'] text-base sm:text-lg font-bold text-[#1E3A8A] flex items-center gap-1.5">
                <span>ศูนย์จัดการ & ผูกบัตร NFC 💳</span>
                <span className="rounded-full bg-[#E0F2FE] border border-[#BAE6FD] px-2 py-0.5 text-[10px] font-bold text-[#0369A1]">
                  NFC Suite
                </span>
              </h3>
              <p className="text-[11px] text-[#64748B]">
                ผูกบัตรประจำตัว, สแกนรหัสชิป, หรือเขียนข้อมูลลงบัตรสมาชิก
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition shadow-xs"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Device Compatibility Status Banner */}
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                hasWebNfc ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] text-[#334155] font-medium leading-tight">
              {hasWebNfc ? (
                <strong className="text-emerald-700">
                  เครื่องนี้รองรับ Web NFC เต็มรูปแบบ (Chrome บน Android) แตะอ่าน/เขียนบัตรได้ทันที
                </strong>
              ) : deviceInfo.isIos ? (
                <span className="text-amber-900">
                  <strong>โหมด iPhone (iOS):</strong> Apple ไม่อนุญาตให้เบราว์เซอร์แตะอ่านตรงๆ{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('NFC_TOOLS')}
                    className="underline text-[#0284C7] font-bold ml-1"
                  >
                    ดูวิธีใช้แอป NFC Tools ➔
                  </button>
                </span>
              ) : (
                <span className="text-slate-700">
                  โหมดคอมพิวเตอร์ / เบราว์เซอร์ทั่วไป: แนะนำกรอก UID หรือใช้แอป NFC Tools บนมือถือ
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E2E8F0] bg-white px-3 sm:px-4 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('PAIR_UID')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-bold transition ${
              activeTab === 'PAIR_UID'
                ? 'border-[#06D6A0] text-[#047857]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>1. ผูกบัตรกับสมาชิก (UID) 🔗</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WRITE')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-bold transition ${
              activeTab === 'WRITE'
                ? 'border-[#3A86FF] text-[#1D4ED8]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>2. เขียนลงบัตร (Web NFC) ✍️</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('NFC_TOOLS')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-bold transition ${
              activeTab === 'NFC_TOOLS'
                ? 'border-amber-500 text-amber-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>3. ใช้กับแอป NFC Tools 📋</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Member Selector Bar (Common for Tab 1 & Tab 2) */}
          <div className="rounded-2xl border-2 border-[#D6EEFC] bg-[#F4FBFD] p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#1E3A8A] flex items-center gap-1">
                <span>👤 เลือกสมาชิกที่ต้องการดำเนินการ:</span>
              </label>
              <span className="text-[10px] text-slate-500">
                ทั้งหมด {members.length} ท่าน
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, ชื่อเล่น, รหัสสมาชิก..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-[#3A86FF] focus:outline-none"
                />
              </div>

              <select
                value={selectedMemberId}
                onChange={(e) => {
                  setSelectedMemberId(e.target.value);
                  setPairStatus({ type: 'idle', message: '' });
                  setWriteStatus({ type: 'idle', message: '' });
                }}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-[#3A86FF] focus:outline-none max-w-full sm:max-w-[220px]"
              >
                {filteredMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nickname} ({m.fullName}) - {m.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Member Summary Card */}
            {selectedMember && (
              <div className="mt-2.5 flex items-center justify-between rounded-xl bg-white p-2.5 border border-[#E2E8F0] text-xs">
                <div className="flex items-center gap-2.5">
                  {selectedMember.avatarUrl ? (
                    <img
                      src={selectedMember.avatarUrl}
                      alt=""
                      className="h-9 w-9 rounded-xl object-cover border border-[#7EC8E3]"
                    />
                  ) : (
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white shadow-2xs"
                      style={{ backgroundColor: selectedMember.avatarBgColor || '#7EC8E3' }}
                    >
                      {selectedMember.nickname.slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <strong className="text-slate-800 font-['Mali'] text-sm">
                        {selectedMember.nickname}
                      </strong>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({selectedMember.fullName})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5">
                      <span>รหัสบัตร NFC ปัจจุบัน:</span>
                      {selectedMember.nfcCardId ? (
                        <code className="font-bold text-[#0284C7] bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                          {selectedMember.nfcCardId}
                        </code>
                      ) : (
                        <span className="text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 text-[10px]">
                          ยังไม่มีบัตรผูกไว้
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedMember.nfcCardId && (
                  <button
                    type="button"
                    onClick={handleRemoveCardBinding}
                    className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100 transition"
                    title="ยกเลิกการผูกบัตรใบนี้"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>ยกเลิกผูก</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ==================== TAB 1: PAIR HARDWARE UID ==================== */}
          {activeTab === 'PAIR_UID' && selectedMember && (
            <div className="space-y-4 animate-in fade-in">
              {/* Option A: Web NFC Tap to Pair */}
              <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shrink-0 shadow-xs">
                      <Radio className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                        <span>วิธีที่ 1: แตะบัตรที่หลังเครื่องเพื่อผูกทันที</span>
                        <span className="rounded-full bg-emerald-200/80 px-2 py-0.2 text-[10px] font-bold text-emerald-800">
                          แนะนำ
                        </span>
                      </h4>
                      <p className="mt-1 text-slate-600 text-xs leading-relaxed">
                        ใช้การ์ด NFC เปล่า, คีย์การ์ดคอนโด, บัตรนักเรียน, หรือสติกเกอร์{' '}
                        <strong>โดยไม่ต้องเขียนอะไรลงบัตรเลย!</strong> เพียงแตะบัตร ระบบจะอ่านรหัสชิปโรงงาน (UID) และผูกเข้ากับคุณ &ldquo;{selectedMember.nickname}&rdquo; ให้อัตโนมัติทันที
                      </p>
                    </div>
                  </div>
                </div>

                {/* Big Live Scan Button */}
                <div className="mt-3">
                  {hasWebNfc ? (
                    isScanningUid ? (
                      <button
                        type="button"
                        onClick={handleStopScanUid}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 p-4 font-['Mali'] text-base font-bold text-white shadow-md transition animate-pulse"
                      >
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>📲 กำลังรอแตะบัตร... แตะหลังโทรศัพท์ (กดเพื่อยกเลิก)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartScanUid}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 p-4 font-['Mali'] text-base font-bold text-white shadow-md transition active:scale-98"
                      >
                        <Smartphone className="h-5 w-5" />
                        <span>📲 แตะตรงนี้ แล้วนำบัตรมาแนบหลังเครื่อง</span>
                      </button>
                    )
                  ) : (
                    <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 text-xs text-amber-900">
                      <p className="font-bold flex items-center gap-1">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>เบราว์เซอร์นี้ไม่รองรับการแตะอ่านอัตโนมัติ (เช่น iPhone / Safari / Desktop)</span>
                      </p>
                      <p className="mt-1 text-slate-600 text-[11px]">
                        ไม่ต้องกังวลค่ะ! ท่านสามารถ <strong>กรอกรหัสบัตร UID ด้วยตนเอง</strong> ในวิธีที่ 2 ด้านล่าง หรือใช้แอป <strong>NFC Tools</strong> บนมือถือได้เลย
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Option B: Manual UID Entry / From NFC Tools */}
              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <span>วิธีที่ 2: กรอกรหัสบัตร UID ด้วยตนเอง (หรือดูจากแอป NFC Tools)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('NFC_TOOLS')}
                    className="text-[11px] font-semibold text-[#0284C7] hover:underline"
                  >
                    ดูวิธีหาเลข UID ➔
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualUidInput}
                    onChange={(e) => setManualUidInput(e.target.value)}
                    placeholder="เช่น 04:A2:3B:5C หรือ 042a3b4c หรือ MEM-F001"
                    className="flex-1 rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:border-[#3A86FF] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveManualUid}
                    className="flex items-center gap-1.5 rounded-xl bg-[#3A86FF] hover:bg-[#2563EB] px-4 py-2 text-xs font-bold text-white transition shadow-xs"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>บันทึกผูกบัตร</span>
                  </button>
                </div>
              </div>

              {/* Status Message */}
              {pairStatus.type !== 'idle' && (
                <div
                  className={`rounded-2xl p-3.5 text-xs transition-all ${
                    pairStatus.type === 'scanning'
                      ? 'border-2 border-amber-400 bg-amber-50 text-amber-900 animate-pulse'
                      : pairStatus.type === 'success'
                        ? 'border-2 border-emerald-400 bg-emerald-50 text-emerald-900 shadow-sm'
                        : 'border-2 border-rose-300 bg-rose-50 text-rose-900'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {pairStatus.type === 'scanning' && (
                      <RefreshCw className="h-4 w-4 animate-spin text-amber-600 shrink-0 mt-0.5" />
                    )}
                    {pairStatus.type === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    {pairStatus.type === 'error' && (
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="font-medium leading-relaxed">{pairStatus.message}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 2: WEB NFC DIRECT WRITER ==================== */}
          {activeTab === 'WRITE' && selectedMember && (
            <div className="space-y-4 animate-in fade-in">
              <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 p-4">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3A86FF] text-white shrink-0 shadow-xs">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="text-xs text-[#1E3A8A]">
                    <h4 className="font-bold text-sm text-[#1E3A8A]">
                      เขียนข้อมูลลงบัตร/สติกเกอร์ NFC ของคุณ &ldquo;{selectedMember.nickname}&rdquo;
                    </h4>
                    <p className="mt-1 text-slate-600 leading-relaxed">
                      ระบบจะเขียน <strong>URL เช็คอิน</strong> หรือ <strong>รหัสสมาชิก</strong> ลงในชิป NFC โดยตรง เมื่อนำบัตรไปแตะที่มือถือเครื่องใดก็ได้ จะสามารถเปิดเช็คอินได้ทันที!
                    </p>
                  </div>
                </div>

                {/* Write format selector */}
                <div className="mt-3 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    เลือกรูปแบบข้อมูลที่จะเขียนลงบัตร:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWriteFormat('compact_url')}
                      className={`rounded-xl border p-2.5 text-left transition ${
                        writeFormat === 'compact_url'
                          ? 'border-[#3A86FF] bg-white ring-2 ring-[#3A86FF]/20 shadow-xs'
                          : 'border-slate-200 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">
                          1. ลิงก์กะทัดรัด (Compact URL)
                        </span>
                        <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[9px] font-bold">
                          แนะนำ
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        ขนาดเล็กมาก จุได้ในบัตร NTAG213 (144 bytes) แตะแล้วเปิดเว็บเช็คอินทันที
                      </p>
                      <code className="mt-1 block text-[10px] font-mono text-[#0284C7] truncate">
                        {compactCheckInUrl}
                      </code>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWriteFormat('text')}
                      className={`rounded-xl border p-2.5 text-left transition ${
                        writeFormat === 'text'
                          ? 'border-[#3A86FF] bg-white ring-2 ring-[#3A86FF]/20 shadow-xs'
                          : 'border-slate-200 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">
                          2. ข้อความรหัสสมาชิก (Text)
                        </span>
                        <span className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.2 text-[9px]">
                          NDEF Text
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        เขียนเฉพาะรหัสสมาชิก เช่น สำหรับเครื่องสแกนบาร์โค้ดหรือ NFC reader
                      </p>
                      <code className="mt-1 block text-[10px] font-mono font-bold text-slate-800">
                        {selectedMember.id}
                      </code>
                    </button>
                  </div>
                </div>
              </div>

              {/* Status banner */}
              {writeStatus.type !== 'idle' && (
                <div
                  className={`rounded-2xl p-3.5 text-xs transition-all ${
                    writeStatus.type === 'writing'
                      ? 'border-2 border-amber-400 bg-amber-50 text-amber-900 animate-pulse'
                      : writeStatus.type === 'success'
                        ? 'border-2 border-emerald-400 bg-emerald-50 text-emerald-900 shadow-sm'
                        : 'border-2 border-rose-300 bg-rose-50 text-rose-900'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {writeStatus.type === 'writing' && (
                      <RefreshCw className="h-4 w-4 animate-spin text-amber-600 shrink-0 mt-0.5" />
                    )}
                    {writeStatus.type === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    {writeStatus.type === 'error' && (
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="font-medium leading-relaxed">{writeStatus.message}</span>
                  </div>
                </div>
              )}

              {/* Write Trigger Button */}
              <div>
                <button
                  type="button"
                  onClick={handleWriteToNfc}
                  disabled={isWriting}
                  className={`w-full flex items-center justify-center gap-2 rounded-2xl p-4 font-['Mali'] text-base font-bold text-white shadow-md transition active:scale-98 ${
                    isWriting
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-gradient-to-r from-[#3A86FF] via-[#48CAE4] to-[#06D6A0] hover:opacity-95 hover:shadow-lg'
                  }`}
                >
                  {isWriting ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>กำลังรอแตะบัตร... นำบัตรมาแนบหลังเครื่อง</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      <span>📲 กดตรงนี้ แล้วนำบัตรมาแตะหลังเครื่องเพื่อเขียน</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: NFC TOOLS & IPHONE GUIDE ==================== */}
          {activeTab === 'NFC_TOOLS' && (
            <div className="space-y-4 animate-in fade-in text-xs text-slate-700 leading-relaxed">
              {/* Core Explanation for the user's issue */}
              <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 space-y-2">
                <h4 className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>ทำไมถึงต้องคัดลอกลิงก์แล้วไปใช้แอป NFC Tools?</span>
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  <strong>ตอบข้อสงสัย:</strong> บนระบบ <strong>iPhone (iOS)</strong> และเบราว์เซอร์บางชนิด Apple มีนโยบายความปลอดภัยที่<strong>ไม่อนุญาตให้หน้าเว็บใดๆ เข้าถึงตัวอ่าน NFC ของตัวเครื่องได้โดยตรง</strong> มีเฉพาะแอปเฉพาะทางที่โหลดจาก App Store (เช่น แอปฟรีชื่อ <strong>&ldquo;NFC Tools&rdquo;</strong>) เท่านั้นที่ Apple อนุญาตให้ใช้เสา NFC ได้
                </p>
                <div className="rounded-xl bg-white/90 p-2.5 border border-amber-200 text-[11px] text-emerald-800 font-semibold">
                  ✨ <strong>แต่ข้อดีคือ:</strong> เมื่อท่านใช้แอป NFC Tools เขียนลิงก์เช็คอินลงบัตรเพียง <u>ครั้งเดียว</u> บัตรใบนั้นจะกลายเป็น <strong>Smart NFC</strong> ที่สมาชิกทุกคนสามารถนำไปแตะกับ iPhone หรือ Android เครื่องใดก็ได้ เพื่อเปิดหน้าเว็บเช็คอินให้อัตโนมัติทันที 100%!
                </div>
              </div>

              {/* 1-Click Copy Link Box */}
              {selectedMember && (
                <div className="rounded-2xl border border-sky-300 bg-sky-50/80 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1E3A8A]">
                      🔗 ลิงก์เช็คอินของคุณ &ldquo;{selectedMember.nickname}&rdquo;:
                    </span>
                    <span className="text-[10px] text-slate-500">
                      สำหรับนำไปวางในแอป NFC Tools
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={compactCheckInUrl}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyLink(compactCheckInUrl)}
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white transition shrink-0 ${
                        copiedLink
                          ? 'bg-emerald-600 shadow-xs'
                          : 'bg-[#3A86FF] hover:bg-[#2563EB] shadow-xs'
                      }`}
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>คัดลอกแล้ว!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>คัดลอกลิงก์</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step-by-Step Guide with NFC Tools */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                  <span>ขั้นตอนเขียนบัตรด้วยแอป NFC Tools (ง่ายมาก 4 ขั้นตอน):</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    ฟรีทั้ง iOS & Android
                  </span>
                </h4>

                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-800 font-bold text-xs shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">
                        ดาวน์โหลดแอป &ldquo;NFC Tools&rdquo;
                      </p>
                      <p className="text-[11px] text-slate-500">
                        ค้นหาคำว่า &ldquo;NFC Tools&rdquo; ใน App Store (iPhone) หรือ Google Play (Android)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-800 font-bold text-xs shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">
                        เปิดแอป ➔ ไปที่แท็บ &ldquo;Write&rdquo; ➔ กดปุ่ม &ldquo;Add a record&rdquo;
                      </p>
                      <p className="text-[11px] text-slate-500">
                        จะเป็นหน้าจอเพิ่มข้อมูลที่ต้องการเขียนลงชิป NFC
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-800 font-bold text-xs shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">
                        เลือกเมนู &ldquo;Custom URL / URI&rdquo; ➔ วางลิงก์ที่คัดลอกไว้
                      </p>
                      <p className="text-[11px] text-slate-500">
                        กดวางลิงก์จากกล่องสีฟ้าด้านบน แล้วกด OK
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-800 font-bold text-xs shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">
                        กดปุ่ม &ldquo;Write / 1 Record&rdquo; ➔ นำบัตรมาแตะหลังโทรศัพท์
                      </p>
                      <p className="text-[11px] text-slate-500">
                        เมื่อแอปขึ้นเครื่องหมายถูกสีเขียว (Write complete) เรียบร้อยแล้วค่ะ!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bonus: How to read UID from NFC Tools */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1">
                  <span>💡 วิธีดูรหัสชิป (UID) จากแอป NFC Tools เพื่อนำมาผูกในแท็บที่ 1:</span>
                </h5>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  ในแอป NFC Tools กดแท็บ <strong>&ldquo;Read&rdquo;</strong> ➔ นำบัตรมาแตะ ➔ ดูบรรทัด <strong>&ldquo;Serial number&rdquo;</strong> (เช่น <code className="bg-white px-1 rounded border border-slate-200">04:2A:3B:4C</code>) ➔ สามารถนำเลขนั้นมากรอกในแท็บ 1 ของหน้านี้เพื่อผูกบัตรได้ทันทีโดยไม่ต้องเขียนอะไรเลยค่ะ!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E2E8F0] bg-slate-50 px-5 py-3 flex items-center justify-between">
          {onBackToMenu ? (
            <button
              type="button"
              onClick={onBackToMenu}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>กลับไป{backLabel}</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 truncate max-w-[320px]">
              รองรับ NTAG213, NTAG215, NTAG216, Mifare, คีย์การ์ด และ NFC Sticker ทุกชนิด
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
          >
            ปิดหน้าต่าง (หน้าหลัก)
          </button>
        </div>
      </div>
    </div>
  );
};
