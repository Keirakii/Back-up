import React, { useState, useRef } from 'react';
import {
  X,
  BarChart2,
  UserCheck,
  Sparkles,
  Users,
  UserPlus,
  Home,
  Cake,
  Smartphone,
  Clock,
  Cloud,
  Volume2,
  VolumeX,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  Building,
  UploadCloud,
  DownloadCloud,
  RotateCcw,
  Download,
  Upload,
  History,
  ShieldCheck,
  Lock,
  Unlock,
} from 'lucide-react';
import { ChurchLogo } from './ChurchLogo';
import { DataSnapshot, FullBackupPayload } from '../utils/backupRecovery';

interface MenuHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Statistics
  todayCount: number;
  totalMembersCount: number;
  newcomersCount: number;
  careGroupsCount: number;
  isSupabaseConnected: boolean;
  isSyncingWithCloud: boolean;
  lastSyncedTime?: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  churchName?: string;
  churchLogoUrl?: string | null;
  // Navigation actions
  onOpenAttendance: () => void;
  onOpenWeeklyReport: () => void;
  onOpenNewcomers: () => void;
  onOpenMembersRoster: () => void;
  onOpenAddMember: () => void;
  onOpenCareGroups: () => void;
  onOpenBirthdayBlessings: () => void;
  onOpenNfcTool: () => void;
  onOpenRetroactiveMode: () => void;
  onOpenSupabaseConfig: () => void;
  onSyncCloud: () => void;
  onPushCloud?: () => void;
  onOpenChurchProfile?: () => void;
  // Backup & Recovery & Security
  recoverySnapshots?: DataSnapshot[];
  onRestoreSnapshot?: (snapshot: DataSnapshot) => void;
  onExportBackupFile?: () => void;
  onImportBackupFile?: (payload: FullBackupPayload) => void;
  onOpenRecoveryAndSecurity?: (tab: 'restore' | 'audit' | 'privacy') => void;
  auditLogsCount?: number;
  isAdminUnlocked?: boolean;
  // Safe Data Management actions
  onClearTodayAttendance: () => void;
  onClearAllAttendance: () => void;
  onResetDemoData: () => void;
}

export const MenuHubModal: React.FC<MenuHubModalProps> = ({
  isOpen,
  onClose,
  todayCount,
  totalMembersCount,
  newcomersCount,
  careGroupsCount,
  isSupabaseConnected,
  isSyncingWithCloud,
  lastSyncedTime,
  soundEnabled,
  onToggleSound,
  churchName = 'คริสตจักรฟ้าใส',
  churchLogoUrl = null,
  onOpenAttendance,
  onOpenWeeklyReport,
  onOpenNewcomers,
  onOpenMembersRoster,
  onOpenAddMember,
  onOpenCareGroups,
  onOpenBirthdayBlessings,
  onOpenNfcTool,
  onOpenRetroactiveMode,
  onOpenSupabaseConfig,
  onSyncCloud,
  onPushCloud,
  onOpenChurchProfile,
  recoverySnapshots = [],
  onRestoreSnapshot,
  onExportBackupFile,
  onImportBackupFile,
  onOpenRecoveryAndSecurity,
  auditLogsCount = 0,
  isAdminUnlocked = false,
  onClearTodayAttendance,
  onClearAllAttendance,
  onResetDemoData,
}) => {
  const [confirmAction, setConfirmAction] = useState<
    'CLEAR_TODAY' | 'CLEAR_ALL' | 'RESET_DEMO' | null
  >(null);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [showRecoveryZone, setShowRecoveryZone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportBackupFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as FullBackupPayload;
        if (parsed && Array.isArray(parsed.members) && Array.isArray(parsed.attendance)) {
          onImportBackupFile(parsed);
          onClose();
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

  const handleAction = (cb: () => void) => {
    onClose();
    cb();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 font-kanit"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-[26px] border border-slate-200/90 bg-[#F8FAFC] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Header */}
        <div className="flex items-center justify-between border-b border-slate-200/70 bg-white px-5 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <ChurchLogo size="md" customLogoUrl={churchLogoUrl} alt={churchName} />
            <div className="min-w-0">
              <h3 className="font-['Mali'] text-base font-bold text-slate-800 leading-tight truncate">
                เมนู & จัดการระบบ
              </h3>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {churchName} · ศูนย์รวมคำสั่งทั้งหมด
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer shrink-0"
            title="ปิดหน้าต่าง"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Quick Summary Bar (Interactive Shortcuts) */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-200/80 bg-white py-2.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleAction(onOpenAttendance)}
              className="flex flex-col items-center justify-center px-2 py-1 hover:bg-slate-50/80 transition cursor-pointer"
            >
              <span className="font-['Mali'] text-lg font-bold text-[#3A86FF] tabular-nums">
                {todayCount}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">เช็คอินวันนี้</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(onOpenMembersRoster)}
              className="flex flex-col items-center justify-center px-2 py-1 hover:bg-slate-50/80 transition cursor-pointer"
            >
              <span className="font-['Mali'] text-lg font-bold text-slate-800 tabular-nums">
                {totalMembersCount}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">สมาชิกทั้งหมด</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(onOpenNewcomers)}
              className="flex flex-col items-center justify-center px-2 py-1 hover:bg-slate-50/80 transition cursor-pointer"
            >
              <span className="font-['Mali'] text-lg font-bold text-emerald-600 tabular-nums">
                {newcomersCount}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">คนมาใหม่</span>
            </button>
          </div>

          {/* Sleek Minimal Cloud Auto-Sync Control Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleAction(onOpenSupabaseConfig)}
                className="flex items-center gap-2.5 min-w-0 text-left group cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-sky-50 group-hover:text-[#3A86FF] transition shrink-0">
                  {isSyncingWithCloud ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-[#3A86FF]" />
                  ) : (
                    <Cloud className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-slate-800 group-hover:text-[#3A86FF] transition-colors truncate">
                      ซิงค์ข้อมูลอัตโนมัติ
                    </span>
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        isSupabaseConnected ? 'bg-emerald-500' : 'bg-amber-400'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {isSyncingWithCloud
                      ? 'กำลังซิงค์ข้อมูลกับคลาวด์...'
                      : lastSyncedTime
                      ? `ออนไลน์ · อัปเดตล่าสุด ${lastSyncedTime}`
                      : 'ออนไลน์ · ซิงค์ข้อมูลข้ามอุปกรณ์เรียลไทม์'}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAction(onOpenSupabaseConfig)}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition shrink-0 cursor-pointer"
              >
                ตั้งค่า
              </button>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100/90 p-1">
              {onPushCloud && (
                <button
                  type="button"
                  disabled={isSyncingWithCloud}
                  onClick={() => onPushCloud()}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-white py-1.5 px-2.5 text-xs font-semibold text-slate-800 shadow-2xs hover:text-[#3A86FF] disabled:opacity-50 transition cursor-pointer active:scale-98"
                  title="ส่งข้อมูลปัจจุบันจากเครื่องนี้ขึ้นคลาวด์"
                >
                  <UploadCloud className="h-3.5 w-3.5 text-[#3A86FF] shrink-0" />
                  <span className="truncate">อัปเดตขึ้นคลาวด์</span>
                </button>
              )}

              <button
                type="button"
                disabled={isSyncingWithCloud}
                onClick={() => onSyncCloud()}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-white py-1.5 px-2.5 text-xs font-semibold text-slate-800 shadow-2xs hover:text-emerald-600 disabled:opacity-50 transition cursor-pointer active:scale-98"
                title="ดึงข้อมูลล่าสุดจากคลาวด์ลงเครื่องนี้"
              >
                <DownloadCloud className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">ดึงข้อมูลล่าสุด</span>
              </button>
            </div>
          </div>

          {/* Category 1: สมาชิกและการต้อนรับ */}
          <div>
            <h4 className="px-1 mb-2 text-xs font-semibold text-slate-500">
              สมาชิกและการต้อนรับ
            </h4>
            <div className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100 shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => handleAction(onOpenMembersRoster)}
                className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-slate-50/90 transition text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#3A86FF] shrink-0">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-slate-800 group-hover:text-[#3A86FF] transition-colors">
                      ศูนย์ข้อมูลสมาชิก
                    </div>
                    <p className="text-[11.5px] text-slate-500 truncate">
                      ค้นหา แก้ไขข้อมูล และจัดการรายชื่อ ({totalMembersCount} คน)
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={() => handleAction(onOpenNewcomers)}
                className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-slate-50/90 transition text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">
                      ศูนย์ข้อมูลคนมาใหม่
                    </div>
                    <p className="text-[11.5px] text-slate-500 truncate">
                      ติดตามผู้มาเยือน แก้ไข/ลบ และบันทึกผู้พามา ({newcomersCount} คน)
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={() => handleAction(onOpenAddMember)}
                className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-slate-50/90 transition text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 shrink-0">
                    <UserPlus className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-slate-800 group-hover:text-sky-700 transition-colors">
                      ลงทะเบียนสมาชิกใหม่
                    </div>
                    <p className="text-[11.5px] text-slate-500 truncate">
                      เพิ่มสมาชิกใหม่พร้อมถ่ายรูปหรืออัปโหลดรูปภาพ
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={() => handleAction(onOpenCareGroups)}
                className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-slate-50/90 transition text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 shrink-0">
                    <Home className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-slate-800 group-hover:text-teal-700 transition-colors">
                      จัดการรายชื่อกลุ่มแคร์
                    </div>
                    <p className="text-[11.5px] text-slate-500 truncate">
                      เพิ่ม แก้ไข หรือลบชื่อกลุ่มแคร์ ({careGroupsCount} กลุ่ม)
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={() => handleAction(onOpenBirthdayBlessings)}
                className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-slate-50/90 transition text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                    <Cake className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-slate-800 group-hover:text-amber-700 transition-colors">
                      อวยพรวันเกิดสมาชิก
                    </div>
                    <p className="text-[11.5px] text-slate-500 truncate">
                      ดูรายชื่อผู้เกิดในเดือนนี้และส่งการ์ดคำอวยพร
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2" />
              </button>
            </div>
          </div>

          {/* Category 2: รายงานและประวัติการเช็คอิน */}
          <div>
            <h4 className="px-1 mb-2 text-xs font-semibold text-slate-500">
              รายงานและประวัติการเช็คอิน
            </h4>
            <div className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100 shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => handleAction(onOpenAttendance)}
                className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-slate-50/90 transition text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                    <UserCheck className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                      ประวัติผู้เช็คอิน & ส่งออก CSV
                    </div>
                    <p className="text-[11.5px] text-slate-500 truncate">
                      ดูรายชื่อวันนี้ ({todayCount} คน) ค้นหาย้อนหลัง และดาวน์โหลดไฟล์
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={() => handleAction(onOpenWeeklyReport)}
                className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-slate-50/90 transition text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                    <BarChart2 className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                      รายงานข้อมูล & ปฏิทินสถิติ
                    </div>
                    <p className="text-[11.5px] text-slate-500 truncate">
                      สรุปสถิติผู้เข้าร่วมรอบนมัสการและกลุ่มแคร์
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2" />
              </button>
            </div>
          </div>

          {/* Category 3: เครื่องมือเช็คอิน & บัตร NFC */}
          <div>
            <h4 className="px-1 mb-2 text-xs font-semibold text-slate-500">
              เครื่องมือเช็คอิน & บัตร NFC
            </h4>
            <div className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100 shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => handleAction(onOpenNfcTool)}
                className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-slate-50/90 transition text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-[#3A86FF] shrink-0">
                    <Smartphone className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-slate-800 group-hover:text-[#3A86FF] transition-colors">
                      จัดการ & ลงทะเบียนบัตร NFC
                    </div>
                    <p className="text-[11.5px] text-slate-500 truncate">
                      ผูกบัตรสมาชิก เขียนลิงก์ลงบัตร หรือตั้งค่า NFC Tools
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={() => handleAction(onOpenRetroactiveMode)}
                className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-slate-50/90 transition text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-slate-800 group-hover:text-amber-700 transition-colors">
                      โหมดเช็คอินย้อนหลัง
                    </div>
                    <p className="text-[11.5px] text-slate-500 truncate">
                      บันทึกข้อมูลย้อนหลังสำหรับผู้ที่ลืมแตะบัตรเช็คอิน
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2" />
              </button>
            </div>
          </div>

          {/* Category 4: ตั้งค่าระบบและข้อมูลคริสตจักร */}
          <div>
            <h4 className="px-1 mb-2 text-xs font-semibold text-slate-500">
              ตั้งค่าระบบและข้อมูลคริสตจักร
            </h4>
            <div className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100 shadow-2xs overflow-hidden">
              {onOpenChurchProfile && (
                <button
                  type="button"
                  onClick={() => handleAction(onOpenChurchProfile)}
                  className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-slate-50/90 transition text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shrink-0">
                      <Building className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-slate-800 group-hover:text-[#3A86FF] transition-colors">
                        ข้อมูลคริสตจักร & โลโก้
                      </div>
                      <p className="text-[11.5px] text-slate-500 truncate">
                        เปลี่ยนชื่อคริสตจักร สโลแกน และอัปโหลดรูปโลโก้
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2" />
                </button>
              )}

              <button
                type="button"
                onClick={onToggleSound}
                className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-slate-50/90 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shrink-0">
                    {soundEnabled ? (
                      <Volume2 className="h-4.5 w-4.5 text-[#3A86FF]" />
                    ) : (
                      <VolumeX className="h-4.5 w-4.5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-slate-800">
                      เสียงแจ้งเตือนเมื่อเช็คอิน
                    </div>
                    <p className="text-[11.5px] text-slate-500 truncate">
                      {soundEnabled ? 'เปิดเสียงกระดิ่งอยู่' : 'ปิดเสียงอยู่'}
                    </p>
                  </div>
                </div>
                <div
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    soundEnabled ? 'bg-[#3A86FF]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition-transform ${
                      soundEnabled ? 'translate-x-5.5' : 'translate-x-1'
                    }`}
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAction(onOpenSupabaseConfig)}
                className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-slate-50/90 transition text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shrink-0">
                    <Cloud className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-slate-800 group-hover:text-[#3A86FF] transition-colors">
                        ตั้งค่าระบบคลาวด์ (Cloud Sync)
                      </span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSupabaseConnected ? 'bg-emerald-500' : 'bg-amber-400'
                        }`}
                      />
                    </div>
                    <p className="text-[11.5px] text-slate-500 truncate">
                      จัดการฐานข้อมูลคลาวด์ และตรวจสอบสถานะการซิงค์ข้ามอุปกรณ์
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2" />
              </button>

              {/* Restore & Daily Auto-Snapshot Row */}
              <div>
                <div className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-indigo-50/50 transition text-left">
                  <div
                    onClick={() => {
                      if (onOpenRecoveryAndSecurity) {
                        handleAction(() => onOpenRecoveryAndSecurity('restore'));
                      } else {
                        setShowRecoveryZone(!showRecoveryZone);
                      }
                    }}
                    className="flex flex-1 items-center gap-3 min-w-0 cursor-pointer"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13.5px] font-semibold text-slate-800">
                          ย้อนคืนข้อมูล (Restore) & Snapshot รายวัน
                        </span>
                        {recoverySnapshots.length > 0 && (
                          <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                            {recoverySnapshots.length} จุดบันทึก
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        กู้คืนข้อมูลรายวันอัตโนมัติ หรือย้อนเวลาก่อนกดลบ/ซิงค์ผิดพลาด
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRecoveryZone(!showRecoveryZone)}
                    className="p-1.5 rounded-lg hover:bg-indigo-100/60 text-slate-400 hover:text-indigo-600 transition cursor-pointer shrink-0 ml-1"
                    title="ดูรายการย้อนคืนด่วน"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        showRecoveryZone ? 'rotate-180 text-indigo-600' : ''
                      }`}
                    />
                  </button>
                </div>

                {showRecoveryZone && (
                  <div className="bg-indigo-50/30 px-3.5 pb-3.5 pt-2.5 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
                    {/* File Export & Import */}
                    <div className="grid grid-cols-2 gap-2">
                      {onExportBackupFile && (
                        <button
                          type="button"
                          onClick={onExportBackupFile}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 py-2 px-2.5 text-[11.5px] font-semibold text-indigo-700 shadow-2xs transition cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">ดาวน์โหลดไฟล์สำรอง</span>
                        </button>
                      )}
                      {onImportBackupFile && (
                        <>
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
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2 px-2.5 text-[11.5px] font-semibold text-slate-700 shadow-2xs transition cursor-pointer"
                          >
                            <Upload className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                            <span className="truncate">นำเข้าไฟล์กู้คืน (.json)</span>
                          </button>
                        </>
                      )}
                    </div>

                    {/* Auto Snapshots List */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                        <History className="h-3 w-3 text-indigo-500" />
                        <span>จุดย้อนเวลาอัตโนมัติ (บันทึกไว้ก่อนการลบ/ล้างข้อมูล)</span>
                      </div>

                      {recoverySnapshots.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white/80 px-3 py-2.5 text-center text-[11px] text-slate-400">
                          ระบบจะสร้างจุดย้อนเวลาให้อัตโนมัติเมื่อมีการลบสมาชิกหรือล้างประวัติเช็คอินค่ะ
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                          {recoverySnapshots.map((snap) => (
                            <div
                              key={snap.id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-white px-2.5 py-2 shadow-2xs"
                            >
                              <div className="min-w-0">
                                <div className="text-[11.5px] font-bold text-slate-700 truncate">
                                  {snap.label}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {snap.createdAt} · สมาชิก {snap.members.length} คน · เช็คอิน{' '}
                                  {snap.attendance.length} รายการ
                                </div>
                              </div>
                              {onRestoreSnapshot && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onRestoreSnapshot(snap);
                                    onClose();
                                  }}
                                  className="shrink-0 flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 text-[11px] font-bold text-white transition cursor-pointer"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>กู้คืน</span>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Activity Audit Log & Sensitive Data Privacy Row */}
              {onOpenRecoveryAndSecurity && (
                <div className="px-3.5 py-3 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => handleAction(() => onOpenRecoveryAndSecurity('audit'))}
                    className="flex w-full items-center justify-between hover:bg-slate-50/90 transition text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                        <ShieldCheck className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13.5px] font-semibold text-slate-800 group-hover:text-slate-900">
                            ประวัติเข้าใช้งาน & ปกป้องข้อมูลอ่อนไหว
                          </span>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                              isAdminUnlocked
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isAdminUnlocked ? '🔓 ปลดล็อกแอดมิน' : '🔒 ซ่อนเบอร์/ที่อยู่'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          ตรวจสอบว่าใคร/เครื่องไหนกดลบข้อมูล ({auditLogsCount} รายการ) · ตั้งรหัส PIN
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2" />
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAction(() => onOpenRecoveryAndSecurity('audit'))}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/80 hover:bg-sky-100/80 px-2.5 py-1.5 text-[11px] font-bold text-sky-800 transition cursor-pointer"
                    >
                      <History className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                      <span className="truncate">ดูประวัติเข้าใช้งาน ({auditLogsCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(() => onOpenRecoveryAndSecurity('privacy'))}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/80 hover:bg-amber-100/80 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 transition cursor-pointer"
                    >
                      {isAdminUnlocked ? (
                        <Unlock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      )}
                      <span className="truncate">
                        {isAdminUnlocked ? 'ตั้งค่า PIN / ล็อกกลับ' : 'ปลดล็อกข้อมูลอ่อนไหว'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Collapsible Data Management Row */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDangerZone(!showDangerZone);
                    setConfirmAction(null);
                  }}
                  className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-red-50/40 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-slate-700">
                        จัดการล้างข้อมูล / รีเซ็ตระบบ
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        ล้างรายการเช็คอินวันนี้ ล้างประวัติ หรือคืนค่าข้อมูลเริ่มต้น
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                      showDangerZone ? 'rotate-180 text-red-500' : ''
                    }`}
                  />
                </button>

                {showDangerZone && (
                  <div className="bg-slate-50/80 px-3.5 pb-3.5 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                    {confirmAction ? (
                      <div className="p-3 rounded-xl border border-red-200 bg-red-50/90 space-y-2.5">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                          <div className="text-xs text-red-900">
                            <p className="font-bold">
                              {confirmAction === 'CLEAR_TODAY'
                                ? 'ยืนยันล้างประวัติเช็คอินเฉพาะวันนี้?'
                                : confirmAction === 'CLEAR_ALL'
                                ? 'ยืนยันล้างประวัติเช็คอินทั้งหมด?'
                                : 'ยืนยันคืนค่าข้อมูลตัวอย่างเริ่มต้น?'}
                            </p>
                            <p className="text-[11px] text-red-700 mt-0.5">
                              {confirmAction === 'CLEAR_TODAY'
                                ? `ลบรายการเช็คอินวันนี้จำนวน ${todayCount} รายการ`
                                : confirmAction === 'CLEAR_ALL'
                                ? 'ประวัติการเช็คอินทั้งหมดจะถูกลบออกจากเครื่อง'
                                : 'ระบบจะนำข้อมูลสมาชิกตัวอย่างและกลุ่มแคร์เริ่มต้นกลับมา'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmAction(null)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirmAction === 'CLEAR_TODAY') onClearTodayAttendance();
                              else if (confirmAction === 'CLEAR_ALL') onClearAllAttendance();
                              else if (confirmAction === 'RESET_DEMO') onResetDemoData();
                              setConfirmAction(null);
                              onClose();
                            }}
                            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
                          >
                            ยืนยัน
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmAction('CLEAR_TODAY')}
                          disabled={todayCount === 0}
                          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-red-200/80 bg-white hover:bg-red-50 text-red-600 text-xs font-medium transition disabled:opacity-40 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>ล้างวันนี้ ({todayCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmAction('CLEAR_ALL')}
                          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-red-200/80 bg-white hover:bg-red-50 text-red-600 text-xs font-medium transition cursor-pointer"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span>ล้างประวัติทั้งหมด</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmAction('RESET_DEMO')}
                          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium transition cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>คืนค่าเริ่มต้น</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="border-t border-slate-200/70 bg-white px-5 py-3 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>แตะพื้นที่ด้านนอกเพื่อกลับหน้าเช็คอิน</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
