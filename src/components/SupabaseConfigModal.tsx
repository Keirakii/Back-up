import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Database,
  ExternalLink,
  X,
  UploadCloud,
  DownloadCloud,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Laptop,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  migrateCurrentDataToSupabase,
  SUPABASE_SCHEMA_SQL,
} from '../lib/supabase';
import { Member, CheckInRecord } from '../types';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu?: () => void;
  onConnectionStatusChanged: () => void;
  onPushCurrentToCloud?: () => Promise<void>;
  members: Member[];
  attendance: CheckInRecord[];
  careGroups: string[];
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onBackToMenu,
  onConnectionStatusChanged,
  members,
  attendance,
  careGroups,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isEnvMode, setIsEnvMode] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; code?: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'sql' | 'guide'>('config');
  const [migrating, setMigrating] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrlInput(creds.url);
      setKeyInput(creds.key);
      setIsEnvMode(creds.isEnv);
      setMigrationResult(null);

      testSupabaseConnection().then((res) => {
        setTestResult(res);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) {
      setTestResult({ success: false, message: 'กรุณากรอกทั้ง Supabase URL และ Anon Key' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    const result = await testSupabaseConnection(urlInput, keyInput);
    setTesting(false);
    setTestResult(result);

    if (result.success) {
      saveSupabaseConfig(urlInput, keyInput);
      // Push current local data to cloud on initial save or refresh status without overwriting local edits
      const pushRes = await migrateCurrentDataToSupabase(members, attendance, careGroups);
      setMigrationResult(pushRes);
    }
  };

  const handleDisconnect = () => {
    clearSupabaseConfig();
    setUrlInput('');
    setKeyInput('');
    setTestResult(null);
    setMigrationResult(null);
    onConnectionStatusChanged();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Push Current Local State -> Cloud (including deleting removed members/attendance on Cloud!)
  const handlePushCurrentToCloud = async () => {
    setMigrating(true);
    setMigrationResult(null);
    const res = await migrateCurrentDataToSupabase(members, attendance, careGroups);
    setMigrating(false);
    setMigrationResult(res);
  };

  // Pull Cloud -> Local (for when opening on another device)
  const handlePullFromCloud = async () => {
    setPulling(true);
    setMigrationResult(null);
    await onConnectionStatusChanged();
    setPulling(false);
    setMigrationResult({
      success: true,
      message: 'ดึงข้อมูลล่าสุดจากคลาวด์ลงมาที่เครื่องนี้เรียบร้อยแล้วค่ะ ☁️✨',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in font-kanit"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-[26px] border-3 border-[#D6EEFC] bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4 bg-gradient-to-r from-[#F0F8FF] to-[#E6F4FE]">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBackToMenu && (
              <button
                type="button"
                onClick={onBackToMenu}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer"
                title="ย้อนกลับไปเมนู & จัดการ"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">เมนูหลัก</span>
              </button>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00C48C] text-white shadow-xs shrink-0">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-['Mali'] text-base sm:text-lg font-bold text-[#1A202C]">
                  ระบบคลาวด์ & ซิงค์ข้อมูลข้ามอุปกรณ์
                </h3>
                {testResult?.success !== false ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> ออนไลน์ · ซิงค์อัตโนมัติ
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                    <AlertCircle className="h-3 w-3" /> รอการตรวจสอบ
                  </span>
                )}
              </div>
              <p className="text-xs text-[#718096]">
                บันทึกข้อมูลปัจจุบันขึ้นคลาวด์ และซิงค์ข้อมูลข้ามอุปกรณ์
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#718096] hover:bg-white hover:text-[#2D3748] transition shadow-xs cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 pt-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'config'
                ? 'border-[#3A86FF] text-[#3A86FF]'
                : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            1. ซิงค์ข้อมูล & ตั้งค่าคลาวด์
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'sql'
                ? 'border-[#3A86FF] text-[#3A86FF]'
                : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <Copy className="h-3.5 w-3.5" />
            2. โครงสร้างตาราง (SQL Script)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'guide'
                ? 'border-[#3A86FF] text-[#3A86FF]'
                : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            3. วิธีตั้งค่า & คำแนะนำหลายอุปกรณ์
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {activeTab === 'config' && (
            <div className="space-y-5">
              {/* Cloud Sync Control Center (Always Prominent at the very top) */}
              <div className="rounded-2xl border-2 border-[#3A86FF]/30 bg-gradient-to-br from-[#F0F8FF] via-white to-emerald-50/40 p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="font-['Mali'] text-sm sm:text-base font-bold text-[#1E293B] flex items-center gap-2">
                    <Cloud className="h-4.5 w-4.5 text-[#3A86FF]" />
                    <span>ศูนย์ควบคุมซิงค์ข้อมูลข้ามอุปกรณ์ (Push & Pull)</span>
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                    ในเครื่องตอนนี้: สมาชิก <strong>{members.length}</strong> คน · เช็คอิน{' '}
                    <strong>{attendance.length}</strong> รายการ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Action 1: PUSH (Save Local -> Cloud, including deletions!) */}
                  <div className="flex flex-col justify-between rounded-2xl border-2 border-[#3A86FF] bg-white p-3.5 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#2B6CB0]">
                        <UploadCloud className="h-4 w-4 text-[#3A86FF] shrink-0" />
                        <span>1. ดันข้อมูลเครื่องนี้ขึ้นคลาวด์ (Push to Cloud)</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                        บันทึกข้อมูลที่ทำอยู่ในเครื่องนี้ (รวมถึงรายชื่อสมาชิกหรือคนมาใหม่ที่เพิ่ง<strong>ลบ/ลดจำนวน หรือเพิ่มใหม่</strong>) ขึ้นไปอัปเดตบนคลาวด์ทันที ให้ทุกอุปกรณ์เห็นข้อมูลชุดเดียวกัน
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={migrating || pulling}
                      onClick={handlePushCurrentToCloud}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#3A86FF] to-[#2563EB] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-95 disabled:opacity-50 transition cursor-pointer active:scale-98"
                    >
                      {migrating ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>กำลังดันข้อมูลขึ้นคลาวด์...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-4 w-4" />
                          <span>Push บันทึกปัจจุบันขึ้นคลาวด์</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Action 2: PULL (Fetch Cloud -> Local for secondary devices) */}
                  <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <DownloadCloud className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>2. ดึงข้อมูลล่าสุดลงเครื่องนี้ (Pull from Cloud)</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                        ดึงรายชื่อสมาชิก คนมาใหม่ และประวัติเช็คอินที่อัปเดตล่าสุดจากคลาวด์ลงมาแสดงผลที่เครื่องนี้ทันที (ปกติระบบจะดึงให้อัตโนมัติแบบเรียลไทม์อยู่แล้ว)
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={migrating || pulling}
                      onClick={handlePullFromCloud}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 text-xs font-bold text-emerald-800 disabled:opacity-50 transition cursor-pointer active:scale-98"
                    >
                      {pulling ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>กำลังดึงข้อมูลจากคลาวด์...</span>
                        </>
                      ) : (
                        <>
                          <DownloadCloud className="h-4 w-4" />
                          <span>Pull ดึงข้อมูลจากคลาวด์</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {migrationResult && (
                  <div
                    className={`rounded-xl p-3 text-xs font-medium flex items-center gap-2 ${
                      migrationResult.success
                        ? 'bg-emerald-100/90 text-emerald-900 border border-emerald-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{migrationResult.message}</span>
                  </div>
                )}

                {/* Multi-Device Explanation Note */}
                <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-3 text-[11px] text-amber-900 leading-relaxed">
                  <div className="font-bold flex items-center gap-1.5 mb-0.5">
                    <Laptop className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>การทำงานเมื่อใช้หลายอุปกรณ์พร้อมกัน (Auto-Push & Auto-Pull):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                    <li>
                      ทุกครั้งที่ <strong>เพิ่ม/แก้ไข/ลบสมาชิก หรือลดรายชื่อคนมาใหม่</strong> เครื่องนั้นจะส่งข้อมูลขึ้นคลาวด์ทันที (Auto-Push)
                    </li>
                    <li>
                      เครื่องอื่นๆ ที่เปิดอยู่จะได้รับแจ้งเตือนแบบเรียลไทม์และดึงข้อมูลชุดใหม่ลงมาอัตโนมัติ (Auto-Pull) โดยที่รายชื่อที่ถูกลบไปแล้วจะไม่เด้งกลับมาอีก
                    </li>
                    <li>
                      สามารถกดปุ่ม <strong>Push ขึ้นคลาวด์</strong> หรือ <strong>Pull ดึงข้อมูลล่าสุด</strong> ได้ทุกเมื่อทั้งในหน้าแรก หน้าทำเนียบสมาชิก และหน้าคนมาใหม่ค่ะ
                    </li>
                  </ul>
                </div>
              </div>

              {/* Status Alert */}
              {testResult && (
                <div
                  className={`rounded-2xl border p-4 text-xs ${
                    testResult.success
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-sm mb-1">
                    {testResult.success ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>การเชื่อมต่อออนไลน์สมบูรณ์!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>สถานะการเชื่อมต่อ</span>
                      </>
                    )}
                  </div>
                  <p className="leading-relaxed">{testResult.message}</p>
                  {testResult.code === 'TABLE_NOT_FOUND' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('sql')}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700 cursor-pointer"
                    >
                      ดูคำสั่ง SQL เพื่อสร้างตารางคลิกที่นี่ →
                    </button>
                  )}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#2D3748] mb-1.5">
                    Supabase Project URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    disabled={isEnvMode}
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://xxxxxxxxxxxxxxxx.supabase.co"
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm text-[#2D3748] focus:border-[#3A86FF] focus:ring-2 focus:ring-[#3A86FF]/20 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D3748] mb-1.5">
                    Supabase anon public key <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      disabled={isEnvMode}
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 pr-10 text-sm font-mono text-[#2D3748] focus:border-[#3A86FF] focus:ring-2 focus:ring-[#3A86FF]/20 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={testing}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00C48C] to-[#00A876] px-5 py-2.5 font-['Mali'] text-xs sm:text-sm font-semibold text-white shadow-sm hover:shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    {testing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> กำลังตรวจสอบ...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" /> บันทึกการเชื่อมต่อ & อัปเดตข้อมูลขึ้นคลาวด์
                      </>
                    )}
                  </button>

                  {urlInput && !isEnvMode && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer"
                    >
                      ตัดการเชื่อมต่อ / ล้างค่า
                    </button>
                  )}
                </div>
              </form>

              {/* Security info banner */}
              <div className="flex items-start gap-3 rounded-2xl border border-[#BEE3F8] bg-[#EBF8FF]/70 p-3.5 text-xs text-[#2B6CB0]">
                <ShieldCheck className="h-5 w-5 text-[#3182CE] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">ความปลอดภัยของข้อมูล (Security Notice)</p>
                  <p className="text-[#4A5568] leading-relaxed text-[11px]">
                    ระบบรองรับการตั้งค่าผ่าน <strong>.env</strong> หรือกรอกในหน้านี้โดยเก็บเฉพาะในเบราว์เซอร์เครื่องของท่าน และใช้เฉพาะ <strong>Anon Public Key</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-['Mali'] text-sm font-bold text-[#2D3748]">
                    คำสั่ง SQL สำหรับสร้างตาราง (Database Schema)
                  </h4>
                  <p className="text-xs text-[#718096]">
                    ตาราง: <code>members</code>, <code>attendance_records</code>, <code>care_groups</code> พร้อมเปิด RLS
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center gap-1.5 rounded-xl bg-[#3A86FF] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#2563EB] transition cursor-pointer"
                >
                  {copiedSql ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> คัดลอกเรียบร้อย!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> คัดลอกคำสั่ง SQL
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-2xl bg-[#1E293B] p-4 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[380px]">
                <pre>{SUPABASE_SCHEMA_SQL}</pre>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-[#4A5568]">
              <h4 className="font-['Mali'] text-sm font-bold text-[#2D3748]">
                ขั้นตอนการเปิดใช้งาน Supabase และการซิงค์หลายอุปกรณ์:
              </h4>

              <div className="space-y-3">
                <div className="flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3A86FF] font-bold text-white text-xs">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-[#2D3748] mb-0.5">
                      สมัคร / เปิดโปรเจกต์ใหม่ที่ Supabase
                    </p>
                    <p className="text-[#718096]">
                      เข้าไปที่{' '}
                      <a
                        href="https://supabase.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#3A86FF] inline-flex items-center gap-0.5 underline font-medium"
                      >
                        supabase.com <ExternalLink className="h-3 w-3" />
                      </a>{' '}
                      กด <strong>New project</strong> และตั้งรหัสผ่าน Database Password
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3A86FF] font-bold text-white text-xs">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-[#2D3748] mb-0.5">
                      รันคำสั่ง SQL สร้างตาราง
                    </p>
                    <p className="text-[#718096]">
                      ในหน้าโปรเจกต์ Supabase คลิกเมนู <strong>SQL Editor</strong> ทางซ้าย แล้วกด <strong>New query</strong> นำโค้ดจากแท็บ <em>2. โครงสร้างตาราง (SQL Script)</em> มาวาง แล้วกดปุ่ม <strong>Run</strong>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3A86FF] font-bold text-white text-xs">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-[#2D3748] mb-0.5">
                      วิธีใช้งานร่วมกันหลายเครื่องโดยข้อมูลไม่ตีกัน
                    </p>
                    <p className="text-[#718096]">
                      เมื่อแก้ไขหรือลบข้อมูลในเครื่องหลักเสร็จแล้ว สามารถกดปุ่ม <strong>&quot;บันทึกข้อมูลปัจจุบันขึ้นคลาวด์&quot;</strong> เพื่อให้คลาวด์จำข้อมูลชุดล่าสุด จากนั้นเมื่อเปิดจากเครื่องอื่น ให้กด <strong>&quot;ดึงข้อมูลจากคลาวด์&quot;</strong> ข้อมูลทุกเครื่องจะตรงกัน 100% ค่ะ
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] px-6 py-3.5 bg-[#F8FAFC]">
          {onBackToMenu ? (
            <button
              type="button"
              onClick={onBackToMenu}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>กลับไปเมนู & จัดการ</span>
            </button>
          ) : (
            <span className="text-[11px] text-[#718096]">
              ข้อมูลจะถูกสำรองไว้ในเครื่องอัตโนมัติด้วย แม้ขณะออฟไลน์
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 font-['Mali'] text-xs font-semibold text-[#4A5568] hover:bg-gray-50 shadow-xs cursor-pointer"
          >
            ปิดหน้าต่าง (หน้าหลัก)
          </button>
        </div>
      </div>
    </div>
  );
};
