import React, { useState, useRef } from 'react';
import {
  X,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  History,
  Download,
  Upload,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Smartphone,
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  KeyRound,
  FileJson,
} from 'lucide-react';
import { DataSnapshot, FullBackupPayload } from '../utils/backupRecovery';
import {
  AuditLogEntry,
  AuditCategory,
  getAdminPin,
  setAdminPin,
  getCustomDeviceName,
  setCustomDeviceName,
  getOperatorName,
  setOperatorName,
  getDeviceDisplayLabel,
  getOrCreateDeviceId,
} from '../utils/auditAndPrivacy';

interface RecoveryAndSecurityModalProps {
  isOpen: boolean;
  initialTab?: 'restore' | 'audit' | 'privacy';
  onClose: () => void;
  onBackToMenu?: () => void;
  // Recovery & Snapshots
  snapshots: DataSnapshot[];
  onRestoreSnapshot: (snapshot: DataSnapshot) => void;
  onCreateManualSnapshot: (label: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
  onExportBackupFile: () => void;
  onImportBackupFile: (payload: FullBackupPayload) => void;
  // Audit Logs
  auditLogs: AuditLogEntry[];
  onRefreshCloudAuditLogs?: () => Promise<void>;
  // Privacy & Admin Lock
  privacyShieldEnabled: boolean;
  onTogglePrivacyShield: (enabled: boolean) => void;
  isAdminUnlocked: boolean;
  onUnlockAdmin: (operatorName: string) => void;
  onLockAdmin: () => void;
  onDeviceIdentityUpdated?: () => void;
}

export const RecoveryAndSecurityModal: React.FC<RecoveryAndSecurityModalProps> = ({
  isOpen,
  initialTab = 'restore',
  onClose,
  onBackToMenu,
  snapshots,
  onRestoreSnapshot,
  onCreateManualSnapshot,
  onDeleteSnapshot,
  onExportBackupFile,
  onImportBackupFile,
  auditLogs,
  onRefreshCloudAuditLogs,
  privacyShieldEnabled,
  onTogglePrivacyShield,
  isAdminUnlocked,
  onUnlockAdmin,
  onLockAdmin,
  onDeviceIdentityUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'restore' | 'audit' | 'privacy'>(initialTab);
  const [snapshotFilter, setSnapshotFilter] = useState<'ALL' | 'DAILY' | 'PRE_ACTION'>('ALL');
  const [confirmRestoreSnap, setConfirmRestoreSnap] = useState<DataSnapshot | null>(null);
  const [manualLabel, setManualLabel] = useState('');

  // Audit filter
  const [auditFilter, setAuditFilter] = useState<'ALL' | AuditCategory>('ALL');
  const [refreshingLogs, setRefreshingLogs] = useState(false);

  // Privacy & PIN states
  const [pinInput, setPinInput] = useState('');
  const [operatorInput, setOperatorInput] = useState(() => getOperatorName());
  const [deviceCustomInput, setDeviceCustomInput] = useState(() => getCustomDeviceName());
  const [pinError, setPinError] = useState<string | null>(null);

  // Change PIN states
  const [showChangePin, setShowChangePin] = useState(false);
  const [currentPinForChange, setCurrentPinForChange] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [changePinMsg, setChangePinMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [identitySavedMsg, setIdentitySavedMsg] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setConfirmRestoreSnap(null);
      setPinError(null);
      setOperatorInput(getOperatorName());
      setDeviceCustomInput(getCustomDeviceName());
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const filteredSnapshots = snapshots.filter((s) => {
    if (snapshotFilter === 'ALL') return true;
    if (snapshotFilter === 'DAILY') return s.category === 'DAILY';
    return s.category !== 'DAILY';
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditFilter === 'ALL') return true;
    return log.category === auditFilter;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as FullBackupPayload;
        if (parsed && Array.isArray(parsed.members) && Array.isArray(parsed.attendance)) {
          onImportBackupFile(parsed);
        } else {
          alert('รูปแบบไฟล์สำรองข้อมูลไม่ถูกต้อง กรุณาเลือกไฟล์ .json ที่ส่งออกจากระบบนี้ค่ะ');
        }
      } catch {
        alert('ไม่สามารถอ่านไฟล์สำรองข้อมูลได้ กรุณาตรวจสอบไฟล์ .json ค่ะ');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedPin = getAdminPin();
    if (pinInput.trim() !== expectedPin) {
      setPinError('รหัส PIN ไม่ถูกต้อง (รหัสเริ่มต้นคือ 1234)');
      return;
    }
    const cleanOp = operatorInput.trim() || 'แอดมินผู้ดูแล';
    setOperatorName(cleanOp);
    setPinInput('');
    setPinError(null);
    onUnlockAdmin(cleanOp);
  };

  const handleSaveDeviceIdentity = () => {
    setCustomDeviceName(deviceCustomInput);
    setOperatorName(operatorInput);
    setIdentitySavedMsg(true);
    if (onDeviceIdentityUpdated) onDeviceIdentityUpdated();
    setTimeout(() => setIdentitySavedMsg(false), 2500);
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPinForChange.trim() !== getAdminPin()) {
      setChangePinMsg({ ok: false, text: 'รหัส PIN ปัจจุบันไม่ถูกต้อง' });
      return;
    }
    if (newPinInput.trim().length < 4) {
      setChangePinMsg({ ok: false, text: 'กรุณาตั้งรหัส PIN ใหม่อย่างน้อย 4 หลัก' });
      return;
    }
    setAdminPin(newPinInput.trim());
    setCurrentPinForChange('');
    setNewPinInput('');
    setChangePinMsg({ ok: true, text: '✓ เปลี่ยนรหัส PIN ผู้ดูแลเรียบร้อยแล้วค่ะ' });
    setTimeout(() => {
      setChangePinMsg(null);
      setShowChangePin(false);
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 font-kanit"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-[26px] border border-slate-200 bg-[#F8FAFC] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBackToMenu && (
              <button
                type="button"
                onClick={onBackToMenu}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">เมนูหลัก</span>
              </button>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-['Mali'] text-base sm:text-lg font-bold text-slate-800 truncate">
                ย้อนคืนข้อมูล · ประวัติเข้าใช้งาน & ความปลอดภัย
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                อุปกรณ์นี้: <strong className="text-slate-700">{getDeviceDisplayLabel()}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3 Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1.5 border-b border-slate-200/80 bg-slate-100/80 px-4 py-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'restore'
                ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">ย้อนคืนข้อมูล ({snapshots.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-white text-sky-700 shadow-xs border border-sky-100'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <History className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">ประวัติเข้าใช้งาน ({auditLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-white text-emerald-700 shadow-xs border border-emerald-100'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            {isAdminUnlocked ? (
              <Unlock className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            ) : (
              <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            )}
            <span className="truncate">ข้อมูลอ่อนไหว / PIN</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ========================================================= */}
          {/* TAB 1: ย้อนคืนข้อมูล (RESTORE & DAILY AUTO-SNAPSHOT)       */}
          {/* ========================================================= */}
          {activeTab === 'restore' && (
            <div className="space-y-4">
              {/* Daily Auto-Snapshot Banner & Manual Save */}
              <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/60 p-4 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5">
                      <Calendar className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-800">
                          ระบบบันทึก Snapshot รายวันอัตโนมัติ (LocalStorage)
                        </h4>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          ทำงานอัตโนมัติทุกวัน
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        ระบบบันทึกสถานะข้อมูลรายวันและก่อนการลบ/ซิงค์ลงในเครื่องให้อัตโนมัติ สามารถกด{' '}
                        <strong>&quot;ย้อนคืนข้อมูล (Restore)&quot;</strong> เพื่อกู้คืนข้อมูลกลับไปจุดเวลาก่อนหน้าได้ทันทีค่ะ
                      </p>
                    </div>
                  </div>
                </div>

                {/* Create manual snapshot input + Export/Import JSON */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <div className="flex flex-1 gap-1.5">
                    <input
                      type="text"
                      value={manualLabel}
                      onChange={(e) => setManualLabel(e.target.value)}
                      placeholder="ตั้งชื่อจุดบันทึก (เช่น ก่อนปรับปรุงรายชื่อประจำเดือน)..."
                      className="flex-1 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const label =
                          manualLabel.trim() ||
                          `บันทึกด้วยตนเอง (${new Date().toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })} น.)`;
                        onCreateManualSnapshot(label);
                        setManualLabel('');
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition cursor-pointer shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>สร้าง Snapshot ตอนนี้</span>
                    </button>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={onExportBackupFile}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer"
                      title="ดาวน์โหลดข้อมูลทั้งหมดเก็บเป็นไฟล์ .json ลงเครื่อง"
                    >
                      <Download className="h-3.5 w-3.5 text-indigo-600" />
                      <span>ส่งออกไฟล์ (.json)</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer"
                      title="นำเข้าไฟล์สำรอง .json เพื่อกู้คืนข้อมูล"
                    >
                      <Upload className="h-3.5 w-3.5 text-emerald-600" />
                      <span>นำเข้าไฟล์</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSnapshotFilter('ALL')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      snapshotFilter === 'ALL'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ทั้งหมด ({snapshots.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnapshotFilter('DAILY')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      snapshotFilter === 'DAILY'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    📅 Snapshot รายวัน ({snapshots.filter((s) => s.category === 'DAILY').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnapshotFilter('PRE_ACTION')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      snapshotFilter === 'PRE_ACTION'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ⚡ ก่อนลบ/บันทึก ({snapshots.filter((s) => s.category !== 'DAILY').length})
                  </button>
                </div>
              </div>

              {/* Confirmation Banner if restoring */}
              {confirmRestoreSnap && (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-950">
                      <p className="font-bold text-sm">
                        ยืนยันการย้อนคืนข้อมูล (Restore) ไปยังจุดเวลานี้หรือไม่?
                      </p>
                      <p className="mt-1 text-amber-800">
                        จุดที่เลือก: <strong>{confirmRestoreSnap.label}</strong> ({confirmRestoreSnap.createdAt})
                        <br />
                        ระบบจะนำรายชื่อสมาชิก <strong>{confirmRestoreSnap.members.length} คน</strong> และประวัติเช็คอิน{' '}
                        <strong>{confirmRestoreSnap.attendance.length} รายการ</strong> กลับมาแทนที่สถานะปัจจุบัน
                        พร้อมซิงค์ขึ้นคลาวด์ให้ตรงกันทันทีค่ะ
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmRestoreSnap(null)}
                      className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onRestoreSnapshot(confirmRestoreSnap);
                        setConfirmRestoreSnap(null);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>ยืนยันย้อนคืนข้อมูล (Restore)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Snapshot Cards List */}
              {filteredSnapshots.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-xs text-slate-400">
                  ยังไม่มีรายการ Snapshot ในหมวดหมู่นี้ค่ะ
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredSnapshots.map((snap) => {
                    const isDaily = snap.category === 'DAILY';
                    const isManual = snap.category === 'MANUAL';
                    return (
                      <div
                        key={snap.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 transition ${
                          isDaily
                            ? 'border-indigo-200 bg-white shadow-2xs'
                            : 'border-slate-200 bg-white hover:border-indigo-200'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                              isDaily
                                ? 'bg-indigo-100 text-indigo-700'
                                : isManual
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {isDaily ? (
                              <Calendar className="h-5 w-5" />
                            ) : (
                              <RotateCcw className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-slate-800">
                                {snap.label}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  isDaily
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : isManual
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {isDaily
                                  ? '📅 Snapshot รายวันอัตโนมัติ'
                                  : isManual
                                  ? '📌 บันทึกด้วยตนเอง'
                                  : '⚡ ก่อนลบ/ซิงค์ข้อมูล'}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-slate-400" />
                                บันทึกเมื่อ: {snap.createdAt}
                              </span>
                              <span>• สมาชิก {snap.members.length} คน</span>
                              <span>• ประวัติเช็คอิน {snap.attendance.length} รายการ</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setConfirmRestoreSnap(snap)}
                            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition cursor-pointer active:scale-95"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>ย้อนคืนข้อมูล (Restore)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSnapshot(snap.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition cursor-pointer"
                            title="ลบจุดบันทึกนี้"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: ประวัติการเข้าใช้งาน & ตรวจสอบ (AUDIT LOG)            */}
          {/* ========================================================= */}
          {activeTab === 'audit' && (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-sky-200 bg-sky-50/70 p-3.5">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    🕵️ ประวัติการเข้าใช้งานและติดตามการแก้ไข/ลบข้อมูล
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    บันทึกอัตโนมัติว่าผู้ใช้งานหรืออุปกรณ์เครื่องใดเข้ามาดูข้อมูล กดลบสมาชิก ล้างประวัติเช็คอิน หรือซิงค์ข้อมูล
                  </p>
                </div>
                {onRefreshCloudAuditLogs && (
                  <button
                    type="button"
                    disabled={refreshingLogs}
                    onClick={async () => {
                      setRefreshingLogs(true);
                      await onRefreshCloudAuditLogs();
                      setRefreshingLogs(false);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-sky-300 bg-white hover:bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 shadow-2xs transition cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshingLogs ? 'animate-spin' : ''}`} />
                    <span>ดึงประวัติจากทุกเครื่อง</span>
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { key: 'ALL', label: 'ทั้งหมด' },
                  { key: 'DELETE', label: '🗑️ การลบ/ล้างข้อมูล' },
                  { key: 'VIEW_SENSITIVE', label: '👁️ ดูข้อมูลอ่อนไหว' },
                  { key: 'MODIFY', label: '✏️ เพิ่ม/แก้ไข' },
                  { key: 'SYNC_RESTORE', label: '☁️ ซิงค์/กู้คืน' },
                  { key: 'ACCESS', label: '🚪 เข้าใช้งาน' },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setAuditFilter(f.key as 'ALL' | AuditCategory)}
                    className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                      auditFilter === f.key
                        ? 'bg-sky-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Audit Log List */}
              {filteredAuditLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-xs text-slate-400">
                  ไม่พบประวัติการใช้งานในหมวดหมู่นี้ค่ะ
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAuditLogs.map((log) => {
                    const isCritical = log.severity === 'CRITICAL' || log.category === 'DELETE';
                    const isWarning =
                      log.severity === 'WARNING' || log.category === 'VIEW_SENSITIVE';
                    return (
                      <div
                        key={log.id}
                        className={`rounded-2xl border p-3 transition ${
                          isCritical
                            ? 'border-red-200 bg-red-50/40'
                            : isWarning
                            ? 'border-amber-200 bg-amber-50/40'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                  isCritical
                                    ? 'bg-red-100 text-red-700'
                                    : isWarning
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-sky-100 text-sky-700'
                                }`}
                              >
                                {log.category === 'DELETE'
                                  ? 'ลบข้อมูล'
                                  : log.category === 'VIEW_SENSITIVE'
                                  ? 'ดูข้อมูลส่วนบุคคล'
                                  : log.category === 'MODIFY'
                                  ? 'แก้ไข/เช็คอิน'
                                  : log.category === 'SYNC_RESTORE'
                                  ? 'ซิงค์/กู้คืน'
                                  : 'เข้าใช้งาน'}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {log.actionTitle}
                              </span>
                            </div>
                            {log.details && (
                              <p className="text-[11px] text-slate-600 mt-0.5">{log.details}</p>
                            )}
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1 font-semibold text-slate-700">
                                <UserCheck className="h-3 w-3 text-sky-600" />
                                ผู้ทำรายการ: {log.operatorName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Smartphone className="h-3 w-3 text-indigo-500" />
                                อุปกรณ์: {log.deviceLabel}
                              </span>
                            </div>
                          </div>

                          <span className="shrink-0 text-[10.5px] font-medium text-slate-400">
                            {log.timeFormatted}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: ความปลอดภัย & ข้อมูลอ่อนไหว (PDPA / PIN SHIELD)       */}
          {/* ========================================================= */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              {/* 1. Sensitive Data Shield Status & Unlock Card */}
              <div
                className={`rounded-2xl border p-4 space-y-3 ${
                  isAdminUnlocked
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-amber-200 bg-amber-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                        isAdminUnlocked
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {isAdminUnlocked ? (
                        <Unlock className="h-5 w-5" />
                      ) : (
                        <Lock className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {isAdminUnlocked
                          ? '🔓 โหมดผู้ดูแลเปิดอยู่ (เห็นข้อมูลครบทั้งหมด)'
                          : '🔒 โหมดปกป้องข้อมูลอ่อนไหวทำงานอยู่ (ซ่อนเบอร์โทร/ที่อยู่)'}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {isAdminUnlocked
                          ? `ปลดล็อกโดย "${getOperatorName()}" · สามารถดูเบอร์โทร ที่อยู่ ปีเกิด และลบ/แก้ไขข้อมูลได้ตามปกติ`
                          : 'เครื่องทั่วไปสามารถสแกนเช็คอินได้ตามปกติ แต่ระบบจะพรางเบอร์โทรศัพท์ (081-•••-••89), ซ่อนที่อยู่บ้าน, ซ่อนปีเกิด และล็อกการกดลบข้อมูลไว้ค่ะ'}
                      </p>
                    </div>
                  </div>

                  {isAdminUnlocked && (
                    <button
                      type="button"
                      onClick={onLockAdmin}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition cursor-pointer shrink-0"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>ล็อกกลับทันที</span>
                    </button>
                  )}
                </div>

                {/* If Locked, show PIN unlock form */}
                {!isAdminUnlocked && (
                  <form
                    onSubmit={handleUnlockSubmit}
                    className="rounded-xl border border-amber-200/90 bg-white p-3.5 space-y-2.5"
                  >
                    <div className="text-xs font-bold text-slate-700">
                      🔑 ใส่ชื่อผู้ตรวจดูและรหัส PIN ผู้ดูแลเพื่อปลดล็อกข้อมูลอ่อนไหว:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          ชื่อผู้เข้าดู / ผู้ปฏิบัติงาน (บันทึกในประวัติ)
                        </label>
                        <input
                          type="text"
                          value={operatorInput}
                          onChange={(e) => setOperatorInput(e.target.value)}
                          placeholder="เช่น ครูสราทิพย์, ศิษยาภิบาล, แอดมิน..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          รหัส PIN ผู้ดูแล (ค่าเริ่มต้น: 1234)
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="password"
                            inputMode="numeric"
                            value={pinInput}
                            onChange={(e) => {
                              setPinInput(e.target.value);
                              setPinError(null);
                            }}
                            placeholder="••••"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-center tracking-widest text-sm font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-2xs transition cursor-pointer shrink-0"
                          >
                            ปลดล็อก
                          </button>
                        </div>
                      </div>
                    </div>
                    {pinError && (
                      <p className="text-xs font-semibold text-red-600">{pinError}</p>
                    )}
                  </form>
                )}
              </div>

              {/* 2. Toggle Privacy Shield & Configure Device Name */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800">
                      🛡️ เปิดใช้ระบบซ่อนข้อมูลอ่อนไหวสำหรับเครื่องทั่วไป (PDPA Mode)
                    </div>
                    <p className="text-[11px] text-slate-500">
                      เมื่อเปิดไว้ อุปกรณ์ทุกเครื่องจะซ่อนเบอร์โทร ที่อยู่ ปีเกิด และหมายเหตุส่วนตัวไว้จนกว่าจะใส่รหัส PIN
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTogglePrivacyShield(!privacyShieldEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      privacyShieldEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ${
                        privacyShieldEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Device & Operator Identification */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-indigo-600" />
                    <span>ตั้งชื่อประจำอุปกรณ์เครื่องนี้ (เพื่อแสดงในประวัติการเข้าใช้งาน)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        ชื่อเรียกอุปกรณ์นี้ (รหัสเครื่อง: {getOrCreateDeviceId()})
                      </label>
                      <input
                        type="text"
                        value={deviceCustomInput}
                        onChange={(e) => setDeviceCustomInput(e.target.value)}
                        placeholder="เช่น iPad จุดต้อนรับ 1, มือถือแอดมิน..."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        ชื่อผู้ดูแล/ผู้ใช้งานประจำเครื่องนี้
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={operatorInput}
                          onChange={(e) => setOperatorInput(e.target.value)}
                          placeholder="เช่น ทีมต้อนรับ, ครูสราทิพย์..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleSaveDeviceIdentity}
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white transition cursor-pointer shrink-0"
                        >
                          บันทึกชื่อ
                        </button>
                      </div>
                    </div>
                  </div>
                  {identitySavedMsg && (
                    <p className="text-xs font-semibold text-emerald-600">
                      ✓ บันทึกชื่ออุปกรณ์และผู้ใช้งานเรียบร้อยแล้วค่ะ
                    </p>
                  )}
                </div>

                {/* Change Admin PIN */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowChangePin(!showChangePin)}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>{showChangePin ? 'ซ่อนการเปลี่ยนรหัส PIN' : 'เปลี่ยนรหัส PIN ผู้ดูแล (ค่าเริ่มต้น 1234)'}</span>
                  </button>

                  {showChangePin && (
                    <form onSubmit={handleChangePinSubmit} className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <input
                        type="password"
                        inputMode="numeric"
                        value={currentPinForChange}
                        onChange={(e) => setCurrentPinForChange(e.target.value)}
                        placeholder="รหัส PIN เดิม"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                      />
                      <input
                        type="password"
                        inputMode="numeric"
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value)}
                        placeholder="รหัส PIN ใหม่ (4 หลักขึ้นไป)"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-slate-800 hover:bg-slate-900 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                      >
                        บันทึกรหัส PIN ใหม่
                      </button>
                      {changePinMsg && (
                        <p
                          className={`sm:col-span-3 text-xs font-semibold ${
                            changePinMsg.ok ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {changePinMsg.text}
                        </p>
                      )}
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200/80 bg-white px-5 py-3 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            สถานะข้อมูลส่วนบุคคล:{' '}
            <strong className={isAdminUnlocked ? 'text-emerald-600' : 'text-amber-600'}>
              {isAdminUnlocked ? 'ปลดล็อกผู้ดูแลแล้ว' : 'ซ่อนข้อมูลอ่อนไหวอยู่'}
            </strong>
          </span>
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

interface AdminPinPromptModalProps {
  isOpen: boolean;
  reasonTitle?: string;
  onClose: () => void;
  onSuccessUnlock: (operatorName: string) => void;
}

export const AdminPinPromptModal: React.FC<AdminPinPromptModalProps> = ({
  isOpen,
  reasonTitle = 'ปลดล็อกเพื่อดูข้อมูลอ่อนไหว หรือลบข้อมูลสำคัญ',
  onClose,
  onSuccessUnlock,
}) => {
  const [operatorInput, setOperatorInput] = useState(() => getOperatorName());
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() !== getAdminPin()) {
      setError('รหัส PIN ไม่ถูกต้อง (รหัสเริ่มต้นคือ 1234)');
      return;
    }
    const cleanOp = operatorInput.trim() || 'แอดมินผู้ดูแล';
    setOperatorName(cleanOp);
    setPinInput('');
    setError(null);
    onSuccessUnlock(cleanOp);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs animate-in fade-in duration-150 font-kanit"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-amber-200 bg-white p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-['Mali'] text-base font-bold text-slate-800">
                ยืนยันสิทธิ์ผู้ดูแล (Admin PIN)
              </h4>
              <p className="text-[11px] text-slate-500">{reasonTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              ชื่อผู้เข้าใช้งาน / ผู้ทำรายการ (บันทึกในประวัติ)
            </label>
            <input
              type="text"
              value={operatorInput}
              onChange={(e) => setOperatorInput(e.target.value)}
              placeholder="เช่น ครูสราทิพย์, ศิษยาภิบาล, แอดมิน..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              รหัส PIN ผู้ดูแล (ค่าเริ่มต้น: 1234)
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setError(null);
              }}
              placeholder="••••"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-base font-bold tracking-widest text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-none"
              required
            />
          </div>

          {error && <p className="text-xs font-semibold text-red-600 text-center">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              <Unlock className="h-3.5 w-3.5" />
              <span>ปลดล็อกข้อมูล</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
