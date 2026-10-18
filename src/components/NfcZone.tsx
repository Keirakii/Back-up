import React, { useState, useEffect, useRef } from 'react';
import { Member } from '../types';
import {
  Sparkles,
  Smartphone,
  Wrench,
  X,
  CheckCircle2,
  Search,
  UserCheck,
  AlertCircle,
  Radio,
  ExternalLink,
  Zap,
} from 'lucide-react';
import {
  findMemberByNfc,
  normalizeNfcId,
  isWebNfcSupported,
  getDeviceInfo,
} from '../utils/nfcHelpers';
import { playNfcSuccessChime, triggerNfcScanInProgressHaptic } from '../utils/audio';

interface NfcZoneProps {
  members: Member[];
  onNfcScan: (member: Member, customTemp?: number) => void;
  isScanning: boolean;
  onOpenNfcTool?: (initialMemberId?: string, initialCardUid?: string) => void;
  onUpdateMemberNfc?: (memberId: string, nfcCardId: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  isCardNear?: boolean;
  onCardNearChange?: (isNear: boolean) => void;
  isScanInProgress?: boolean;
  onScanInProgress?: () => void;
  currentTemperature?: string | number;
}

export const NfcZone: React.FC<NfcZoneProps> = ({
  members,
  onNfcScan,
  onOpenNfcTool,
  onUpdateMemberNfc,
  onListeningChange,
  isCardNear = false,
  onCardNearChange,
  isScanInProgress = false,
  onScanInProgress,
  currentTemperature = '36.5',
}) => {
  const onNfcScanRef = useRef(onNfcScan);
  useEffect(() => {
    onNfcScanRef.current = onNfcScan;
  }, [onNfcScan]);

  const currentTempRef = useRef(currentTemperature);
  useEffect(() => {
    currentTempRef.current = currentTemperature;
  }, [currentTemperature]);

  const getCurrentTempNumber = (): number | undefined => {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('temperature') as HTMLInputElement | null;
      if (el && el.value !== '' && el.value !== null) {
        const parsed = parseFloat(el.value);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    if (currentTempRef.current !== undefined && currentTempRef.current !== '') {
      const parsed = parseFloat(String(currentTempRef.current));
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return undefined;
  };

  const [localIsNear, setLocalIsNear] = useState<boolean>(false);
  const effectiveIsNear = isCardNear || localIsNear;

  const handleCardNear = (near: boolean) => {
    setLocalIsNear(near);
    onCardNearChange?.(near);
  };

  const handleScanInProgressTrigger = () => {
    triggerNfcScanInProgressHaptic();
    onScanInProgress?.();
  };
  const [hasHardwareNfc, setHasHardwareNfc] = useState<boolean>(false);
  const [hardwareListening, setHardwareListening] = useState<boolean>(false);
  const [hardwareStatus, setHardwareStatus] = useState<string | null>(null);
  const [showSimulateSheet, setShowSimulateSheet] = useState<boolean>(false);
  const [activeCardAnimation, setActiveCardAnimation] = useState<string | null>(null);

  // Unregistered card detected modal state (in-app, no blocking confirm/alert)
  const [unmatchedCardModal, setUnmatchedCardModal] = useState<{
    isOpen: boolean;
    serial: string;
    decodedContent?: string;
  } | null>(null);
  const [unmatchedSearchTerm, setUnmatchedSearchTerm] = useState('');
  const [pairSuccessMessage, setPairSuccessMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const deviceInfo = getDeviceInfo();

  // Notify parent component about listening state
  useEffect(() => {
    onListeningChange?.(hardwareListening);
  }, [hardwareListening, onListeningChange]);

  useEffect(() => {
    // Check Web NFC support (Chrome on Android / NFC enabled devices)
    if (isWebNfcSupported()) {
      setHasHardwareNfc(true);
      startHardwareNfc();
    } else {
      setHasHardwareNfc(false);
      // Even without Web NFC hardware, zone is in active waiting mode for taps / simulation
      setHardwareListening(true);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [members]);

  const startHardwareNfc = async () => {
    try {
      const win = window as unknown as {
        NDEFReader?: new () => {
          scan: (options?: { signal?: AbortSignal }) => Promise<void>;
          onreading: (e: {
            serialNumber?: string;
            message?: { records?: Array<{ recordType: string; data?: DataView; encoding?: string }> };
          }) => void;
          onerror?: (e: unknown) => void;
        };
      };
      if (!win.NDEFReader) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const ndef = new win.NDEFReader();
      await ndef.scan({ signal: controller.signal });
      setHardwareListening(true);
      setHardwareStatus('พร้อมสแกน! แตะบัตรที่หลังมือถือได้เลย');

      ndef.onreading = (event) => {
        // Immediate pre-scan feedback: card held near sensor!
        handleCardNear(true);
        handleScanInProgressTrigger();
        const serial = (event.serialNumber || '').trim();
        let decodedContent = '';

        if (event.message?.records && event.message.records.length > 0) {
          for (const record of event.message.records) {
            try {
              if (record.data) {
                const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                const payload = textDecoder.decode(record.data).trim();
                if (payload) {
                  decodedContent = payload;
                  break;
                }
              }
            } catch (err) {
              console.warn('NDEF record decode error:', err);
            }
          }
        }

        // Haptic feedback if available
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([80, 40, 80]);
          } catch {
            // ignore
          }
        }

        // Match member using robust normalized helper
        const matched = findMemberByNfc(members, serial, decodedContent);

        if (matched) {
          // Play visual animation and check in immediately
          setActiveCardAnimation(matched.id);
          setTimeout(() => {
            setActiveCardAnimation(null);
          }, 600);
          const tempVal = getCurrentTempNumber();
          onNfcScanRef.current(matched, tempVal);
        } else {
          // Unregistered Card: NEVER use window.confirm! Show in-app bottom sheet/modal
          const cardIdentifier = serial || decodedContent || `NFC-${Date.now().toString().slice(-4)}`;
          setUnmatchedCardModal({
            isOpen: true,
            serial: cardIdentifier,
            decodedContent: decodedContent,
          });
          setUnmatchedSearchTerm('');
          setPairSuccessMessage(null);
        }
      };

      if (ndef.onerror) {
        ndef.onerror = () => {
          setHardwareStatus('การอ่าน NFC ขัดข้อง กรุณาลองแตะใหม่อีกครั้ง');
        };
      }
    } catch (error) {
      console.warn('Hardware NFC not accessible:', error);
      setHardwareListening(false);
      setHardwareStatus('แตะเพื่อเปิดโหมดอ่าน NFC หรือเลือกการ์ดทดสอบ');
    }
  };

  const handleSimulateCard = (member: Member) => {
    // Immediate pre-scan feedback: card held near & scan in progress haptic wave
    handleCardNear(true);
    handleScanInProgressTrigger();
    setActiveCardAnimation(member.id);
    setTimeout(() => {
      setActiveCardAnimation(null);
      setShowSimulateSheet(false);
      setTimeout(() => {
        handleCardNear(false);
      }, 600);
    }, 450);
    const tempVal = getCurrentTempNumber();
    onNfcScanRef.current(member, tempVal);
  };

  // Instant Pair from Unregistered Card Modal
  const handleInstantPairAndCheckIn = (member: Member) => {
    if (!unmatchedCardModal) return;
    const cardId = unmatchedCardModal.serial;

    if (onUpdateMemberNfc) {
      onUpdateMemberNfc(member.id, cardId);
    }

    setPairSuccessMessage(`✓ ผูกบัตร "${cardId}" กับคุณ "${member.nickname}" เรียบร้อย!`);

    setTimeout(() => {
      setUnmatchedCardModal(null);
      // Auto check-in the newly paired member with current temperature
      const tempVal = getCurrentTempNumber();
      onNfcScanRef.current(member, tempVal);
    }, 1200);
  };

  // Filter members in unmatched card modal
  const filteredForPairing = members.filter((m) => {
    if (!unmatchedSearchTerm.trim()) return true;
    const q = unmatchedSearchTerm.toLowerCase();
    return (
      m.nickname.toLowerCase().includes(q) ||
      m.fullName.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative">
      <div
        id="nfc-scan-zone"
        onMouseEnter={() => handleCardNear(true)}
        onMouseLeave={() => handleCardNear(false)}
        onTouchStart={() => handleCardNear(true)}
        onTouchEnd={() => handleCardNear(false)}
        onPointerDown={() => handleCardNear(true)}
        onPointerUp={() => handleCardNear(false)}
        onClick={() => {
          handleScanInProgressTrigger();
          if (hasHardwareNfc && !hardwareListening) {
            startHardwareNfc();
          } else {
            setShowSimulateSheet(true);
          }
        }}
        className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed py-3.5 px-4 text-center transition-all duration-300 hover:shadow-xs active:scale-[0.99] ${
          isScanInProgress
            ? 'border-[#3A86FF] bg-blue-50/80 shadow-[0_0_20px_rgba(58,134,255,0.25)] ring-2 ring-[#3A86FF]/50'
            : effectiveIsNear
            ? 'border-emerald-400 bg-emerald-50/80 shadow-[0_0_18px_rgba(16,185,129,0.25)] ring-2 ring-emerald-300'
            : 'border-[#BAE6FD] bg-[#F8FCFE] hover:border-[#3A86FF] hover:bg-[#F0F8FF]'
        }`}
      >
        <div className="flex items-center justify-center gap-3">
          {/* Minimal Icon with gentle pulse */}
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white border border-[#BAE6FD] text-[#3A86FF] shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
            {activeCardAnimation ? (
              <span className="text-xl">✨</span>
            ) : effectiveIsNear ? (
              <Radio className="h-6 w-6 text-emerald-600 animate-pulse" />
            ) : (
              <Radio className="h-6 w-6 text-[#3A86FF]" />
            )}
          </div>

          {/* Minimal Headline and Subtitle */}
          <div className="text-left min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <strong
                className={`font-['Mali'] text-[15px] font-bold transition-colors truncate ${
                  effectiveIsNear ? 'text-emerald-800' : 'text-[#1E3A8A]'
                }`}
              >
                {effectiveIsNear ? 'ตรวจพบบัตร NFC แล้ว! ✨' : 'แตะบัตร NFC เพื่อเช็คอิน'}
              </strong>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[10px] font-semibold shrink-0 ${
                  effectiveIsNear
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100/80 text-blue-700'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    effectiveIsNear ? 'bg-emerald-600 animate-ping' : 'bg-blue-600'
                  }`}
                />
                <span>{effectiveIsNear ? 'พร้อมอ่าน' : 'พร้อมแตะ'}</span>
              </span>
            </div>
            <p className="text-[12px] text-slate-500 mt-0.5 truncate">
              {effectiveIsNear
                ? 'อยู่ในระยะรับสัญญาณ กำลังประมวลผลข้อมูล'
                : 'แตะหลังเครื่อง หรือคลิกเลือกบัตรทดสอบ'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons Row under NFC Zone - Prominent & Visible Button */}
      <div className="mt-2.5 flex items-center justify-between gap-2 px-0.5">
        <span className="text-[11px] text-slate-400">
          อุณหภูมิ: <strong className="text-slate-600 font-semibold">{currentTemperature ? `${parseFloat(String(currentTemperature)).toFixed(1)}°C` : '36.5°C'}</strong>
        </span>

        <div className="flex items-center gap-1.5">
          {hasHardwareNfc && !hardwareListening && (
            <button
              type="button"
              onClick={startHardwareNfc}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-300 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs cursor-pointer active:scale-95"
            >
              <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
              <span>เปิดสแกน</span>
            </button>
          )}

          {onOpenNfcTool && (
            <button
              type="button"
              id="nfc-suite-btn"
              onClick={() => onOpenNfcTool()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#7EC8E3] bg-gradient-to-r from-[#F0F8FF] to-[#E0F2FE] hover:from-[#E0F2FE] hover:to-[#BAE6FD] px-3 py-1.5 text-xs font-bold text-[#1D4ED8] shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
              title="ลงทะเบียนบัตรใหม่, ผูกรหัสการ์ด, และดูวิธีเขียนด้วยแอป NFC Tools"
            >
              <Wrench className="h-3.5 w-3.5 text-[#2563EB]" />
              <span>🛠️ จัดการ & ลงทะเบียนบัตร NFC</span>
            </button>
          )}
        </div>
      </div>

      {/* UNREGISTERED CARD MODAL (In-App Dialog, replaces blocked window.confirm) */}
      {unmatchedCardModal && unmatchedCardModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setUnmatchedCardModal(null)}
        >
          <div
            id="unregistered-card-modal"
            className="w-full max-w-md rounded-[28px] border-3 border-amber-300 bg-white p-5 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shrink-0">
                  <Radio className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-['Mali'] text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🎉 ตรวจพบบัตร NFC ใบใหม่!</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    บัตรนี้ยังไม่ได้ผูกกับสมาชิกท่านใดในระบบ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnmatchedCardModal(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Card Info Box */}
            <div className="mt-3 rounded-2xl bg-amber-50/80 border border-amber-200 p-3 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-600 font-medium">รหัสชิป (Hardware UID):</span>
                <span className="font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-300">
                  {unmatchedCardModal.serial}
                </span>
              </div>
              {unmatchedCardModal.decodedContent && (
                <div className="mt-1 text-[11px] text-slate-600 truncate">
                  ข้อมูลในบัตร: <code>{unmatchedCardModal.decodedContent}</code>
                </div>
              )}
            </div>

            {pairSuccessMessage ? (
              <div className="my-6 rounded-2xl bg-emerald-50 border-2 border-emerald-400 p-4 text-center animate-in zoom-in">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-1" />
                <p className="font-['Mali'] font-bold text-emerald-800 text-sm">
                  {pairSuccessMessage}
                </p>
                <p className="text-xs text-emerald-600 mt-1">กำลังทำรายการเช็คอินอัตโนมัติ...</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    👤 เลือกสมาชิกที่ต้องการผูกบัตรนี้:
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={unmatchedSearchTerm}
                      onChange={(e) => setUnmatchedSearchTerm(e.target.value)}
                      placeholder="พิมพ์ชื่อ, ชื่อเล่น, หรือรหัสสมาชิกเพื่อค้นหา..."
                      className="w-full rounded-xl border border-slate-300 py-1.5 pl-8 pr-3 text-xs focus:border-[#3A86FF] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quick Selection List */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {filteredForPairing.slice(0, 8).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleInstantPairAndCheckIn(m)}
                      className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2 hover:border-[#3A86FF] hover:bg-sky-50/50 transition text-left"
                    >
                      <div className="flex items-center gap-2">
                        {m.avatarUrl ? (
                          <img
                            src={m.avatarUrl}
                            alt=""
                            className="h-7 w-7 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: m.avatarBgColor || '#7EC8E3' }}
                          >
                            {m.nickname.slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-bold text-slate-800">
                            {m.nickname}{' '}
                            <span className="font-normal text-[11px] text-slate-500">
                              ({m.fullName})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {m.id} {m.nfcCardId ? `• บัตรเดิม: ${m.nfcCardId}` : '• ยังไม่มีบัตร'}
                          </div>
                        </div>
                      </div>

                      <span className="flex items-center gap-1 rounded-lg bg-[#3A86FF] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#2563EB] shadow-2xs">
                        <UserCheck className="h-3 w-3" />
                        ผูกบัตรนี้
                      </span>
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const card = unmatchedCardModal.serial;
                      setUnmatchedCardModal(null);
                      if (onOpenNfcTool) {
                        onOpenNfcTool(undefined, card);
                      }
                    }}
                    className="text-[#0284C7] font-semibold hover:underline flex items-center gap-1"
                  >
                    <Wrench className="h-3 w-3" />
                    <span>เปิดศูนย์จัดการ NFC เต็มรูปแบบ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUnmatchedCardModal(null)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK SIMULATION MODAL (for testing without real hardware) */}
      {showSimulateSheet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowSimulateSheet(false)}
        >
          <div
            id="nfc-simulator-modal"
            className="w-full max-w-sm rounded-[26px] border-3 border-[#D6EEFC] bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E0F3FC] text-2xl">
                💳
              </div>
              <h3 className="mt-2 font-['Mali'] text-lg font-bold text-[#1E3A8A]">
                ทดสอบจำลองแตะบัตร NFC
              </h3>
              <p className="mt-0.5 text-xs text-[#64748B]">
                เลือกสมาชิกด้านล่างเพื่อจำลองนำบัตรมาแตะเช็คอิน
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1 text-xs text-sky-800 font-medium">
                <span>🌡️ อุณหภูมิที่จะบันทึกเมื่อแตะบัตร:</span>
                <strong className="text-sky-900 font-bold">
                  {currentTemperature ? `${parseFloat(String(currentTemperature)).toFixed(1)}°C` : '36.5°C'}
                </strong>
              </div>
            </div>

            <div className="mt-4 max-h-60 space-y-2 overflow-y-auto pr-1">
              {members.slice(0, 6).map((member) => {
                const isSelected = activeCardAnimation === member.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onMouseEnter={() => handleCardNear(true)}
                    onMouseLeave={() => handleCardNear(false)}
                    onClick={() => handleSimulateCard(member)}
                    className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition-all duration-150 ${
                      isSelected
                        ? 'scale-98 border-[#3A86FF] bg-[#EBF8FF] shadow-xs'
                        : 'border-[#E2E8F0] hover:border-[#7EC8E3] hover:bg-[#F4FBFD]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.nickname}
                          className="h-9 w-9 rounded-xl object-cover border border-[#7EC8E3] shrink-0"
                        />
                      ) : (
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white shadow-2xs shrink-0"
                          style={{ backgroundColor: member.avatarBgColor || '#7EC8E3' }}
                        >
                          {member.nickname.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#2D3748] text-sm">
                            {member.nickname}
                          </span>
                          <span className="rounded-md bg-[#EDF2F7] px-1.5 py-0.2 text-[10px] font-mono text-[#718096]">
                            {member.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#718096] truncate max-w-[160px]">
                          {member.fullName} • {member.nfcCardId || 'ยังไม่มีบัตร'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center text-xs font-semibold text-[#3A86FF]">
                      <Sparkles className="mr-1 h-3.5 w-3.5 text-[#FFB703]" />
                      แตะการ์ด
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {/* Pre-scan Hold Near Simulator Toggle */}
              <button
                type="button"
                onMouseDown={() => handleCardNear(true)}
                onMouseUp={() => handleCardNear(false)}
                onTouchStart={() => handleCardNear(true)}
                onTouchEnd={() => handleCardNear(false)}
                onClick={() => handleCardNear(!effectiveIsNear)}
                className={`w-full flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition shadow-2xs ${
                  effectiveIsNear
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-300/80 shadow-md'
                    : 'border-sky-300 bg-sky-50 text-[#1D4ED8] hover:bg-sky-100'
                }`}
                title="กดค้างหรือแตะเพื่อจำลองถือบัตรใกล้เครื่อง สังเกตไฟสถานะ NFC Ready เปลี่ยนเป็นสีเขียวสดใส"
              >
                <span>
                  {effectiveIsNear
                    ? '🟢 ตรวจพบบัตรใกล้เครื่องอยู่! (ไฟสถานะเปลี่ยนเป็นสีเขียวสดใส ✨)'
                    : '✋ แตะค้างเพื่อจำลองถือบัตรใกล้เครื่อง (Hold Near Preview)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleScanInProgressTrigger()}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-indigo-300 bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-100 hover:from-blue-100 hover:to-indigo-200 py-2.5 text-xs font-bold text-[#1D4ED8] transition shadow-xs active:scale-98"
                title="ทดลองสัมผัสคลื่นสั่น Haptic ลายพิเศษ [30, 50, 45, 50, 70] ขณะกำลังสแกนบัตร NFC (สอดรับกับแอนิเมชัน scale-pulse)"
              >
                <span>📳 ทดลองสัมผัส Haptic ขณะสแกน (Scan in Progress) ⚡</span>
              </button>

              <button
                type="button"
                onClick={() => playNfcSuccessChime()}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 py-2 text-xs font-bold text-[#1D4ED8] transition shadow-2xs"
                title="ทดลองฟังกริ่งสำเร็จเฉพาะ NFC (กริ่งคริสตัลพิเศษ แยกจากเช็คอินทั่วไป)"
              >
                <span>🔔 กดลองฟังกริ่งสำเร็จเฉพาะ NFC ✨</span>
              </button>

              {onOpenNfcTool && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSimulateSheet(false);
                    onOpenNfcTool();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 py-2.5 text-xs font-bold text-[#1D4ED8] transition"
                >
                  <Wrench className="h-3.5 w-3.5 text-[#3A86FF]" />
                  <span>เปิดศูนย์จัดการ & บันทึกบัตร NFC 💳</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowSimulateSheet(false)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white py-2 text-xs font-medium text-[#718096] hover:bg-gray-50"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
