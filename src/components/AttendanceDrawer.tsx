import React, { useState, useMemo, useEffect } from 'react';
import { CheckInRecord, Member } from '../types';
import {
  X,
  Users,
  Search,
  Download,
  Clock,
  Thermometer,
  UserCheck,
  Sparkles,
  Calendar,
  Filter,
  Cake,
  Heart,
  ChevronDown,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { DatePickerField } from './DatePickerField';

interface AttendanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu?: () => void;
  records: CheckInRecord[];
  members?: Member[];
  onDeleteRecord?: (recordId: string) => void;
  onClearDateRecords?: (date: string) => void;
}

type AgeGroupKey = 'ALL' | 'KIDS' | 'YOUTH' | 'ADULTS' | 'SENIORS' | 'UNKNOWN';

export const AttendanceDrawer: React.FC<AttendanceDrawerProps> = ({
  isOpen,
  onClose,
  onBackToMenu,
  records,
  members = [],
  onDeleteRecord,
  onClearDateRecords,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroupKey>('ALL');
  const [confirmClearDate, setConfirmClearDate] = useState(false);
  const [confirmDeleteRecordId, setConfirmDeleteRecordId] = useState<string | null>(null);

  // Extract all distinct dates in records, sorted descending
  const availableDates = useMemo(() => {
    const dates = Array.from(
      new Set(records.map((r) => r.date).filter(Boolean))
    ) as string[];
    dates.sort((a, b) => b.localeCompare(a));
    return dates;
  }, [records]);

  const recordCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach((r) => {
      if (r.date) {
        counts[r.date] = (counts[r.date] || 0) + 1;
      }
    });
    return counts;
  }, [records]);

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Selected date state - default to today if it has records, or latest date with records
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (availableDates.includes(todayStr)) return todayStr;
    if (availableDates.length > 0) return availableDates[0];
    return todayStr;
  });

  useEffect(() => {
    if (!isOpen) return;
    if (availableDates.includes(todayStr)) {
      setSelectedDate(todayStr);
    } else if (availableDates.length > 0 && !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]);
    }
  }, [isOpen, availableDates, todayStr]);

  // Fast Member Lookup Map
  const memberMap = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => {
      map.set(m.id, m);
    });
    return map;
  }, [members]);

  // Age group classifier for a given record
  const getRecordAgeInfo = (record: CheckInRecord) => {
    const member = memberMap.get(record.memberId);
    let age: number | null = null;

    if (member?.birthday) {
      const bday = new Date(member.birthday);
      const refDate = new Date(record.date || selectedDate || '2026-09-22');
      if (!isNaN(bday.getTime()) && !isNaN(refDate.getTime())) {
        age = refDate.getFullYear() - bday.getFullYear();
        const m = refDate.getMonth() - bday.getMonth();
        if (m < 0 || (m === 0 && refDate.getDate() < bday.getDate())) {
          age--;
        }
      }
    }

    if (age !== null && age >= 0) {
      if (age <= 12) return { age, groupKey: 'KIDS' as const, label: 'เด็ก (0-12 ปี)' };
      if (age <= 18) return { age, groupKey: 'YOUTH' as const, label: 'วัยรุ่น (13-18 ปี)' };
      if (age <= 59) return { age, groupKey: 'ADULTS' as const, label: 'วัยทำงาน (19-59 ปี)' };
      return { age, groupKey: 'SENIORS' as const, label: 'ผู้อาวุโส (60+ ปี)' };
    }

    // Role heuristics if birthday not available
    const role = (member?.role || record.role || '').toLowerCase();
    if (role.includes('เด็ก') || role.includes('รวี')) {
      return { age: null, groupKey: 'KIDS' as const, label: 'เด็ก (0-12 ปี)' };
    }
    if (role.includes('อนุชน') || role.includes('มัธยม') || role.includes('วัยรุ่น')) {
      return { age: null, groupKey: 'YOUTH' as const, label: 'วัยรุ่น (13-18 ปี)' };
    }
    if (role.includes('ผู้อาวุโส') || role.includes('สูงวัย')) {
      return { age: null, groupKey: 'SENIORS' as const, label: 'ผู้อาวุโส (60+ ปี)' };
    }
    if (role) {
      return { age: null, groupKey: 'ADULTS' as const, label: 'วัยทำงาน (19-59 ปี)' };
    }

    return { age: null, groupKey: 'UNKNOWN' as const, label: 'ไม่ระบุอายุ' };
  };

  const isVisitorRecord = (record: CheckInRecord) => {
    const member = memberMap.get(record.memberId);
    return Boolean(
      member?.isVisitor ||
      record.role?.includes('ผู้มาเยือน') ||
      record.memberId.startsWith('V')
    );
  };

  // Records filtered by selected date
  const recordsOnSelectedDate = useMemo(() => {
    if (selectedDate === 'ALL') return records;
    return records.filter((r) => r.date === selectedDate);
  }, [records, selectedDate]);

  // Small Summary Dashboard metrics on selected date
  const dashboardStats = useMemo(() => {
    const total = recordsOnSelectedDate.length;
    let visitors = 0;
    let regularMembers = 0;
    let kids = 0;
    let youth = 0;
    let adults = 0;
    let seniors = 0;
    let unknown = 0;

    recordsOnSelectedDate.forEach((r) => {
      if (isVisitorRecord(r)) {
        visitors++;
      } else {
        regularMembers++;
      }

      const ageInfo = getRecordAgeInfo(r);
      switch (ageInfo.groupKey) {
        case 'KIDS':
          kids++;
          break;
        case 'YOUTH':
          youth++;
          break;
        case 'ADULTS':
          adults++;
          break;
        case 'SENIORS':
          seniors++;
          break;
        case 'UNKNOWN':
          unknown++;
          break;
      }
    });

    return {
      total,
      regularMembers,
      visitors,
      kids,
      youth,
      adults,
      seniors,
      unknown,
    };
  }, [recordsOnSelectedDate, memberMap]);

  // Format date helper in Thai
  const formatDateThai = (dateStr: string) => {
    if (!dateStr || dateStr === 'ALL') return 'ทุกวันที่บันทึก';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
      ];
      const thaiYear = y + 543;
      let suffix = '';
      if (dateStr === todayStr) suffix = ' (วันนี้)';
      return `${d} ${thaiMonths[m - 1]} ${thaiYear}${suffix}`;
    } catch {
      return dateStr;
    }
  };

  // Filter list by search term and selected age group
  const filteredRecords = useMemo(() => {
    return recordsOnSelectedDate.filter((r) => {
      // Age group filter
      if (selectedAgeGroup !== 'ALL') {
        const ageInfo = getRecordAgeInfo(r);
        if (ageInfo.groupKey !== selectedAgeGroup) return false;
      }

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        r.memberName.toLowerCase().includes(q) ||
        r.nickname.toLowerCase().includes(q) ||
        r.memberId.toLowerCase().includes(q) ||
        (r.role && r.role.toLowerCase().includes(q)) ||
        (r.careGroupName && r.careGroupName.toLowerCase().includes(q))
      );
    });
  }, [recordsOnSelectedDate, searchTerm, selectedAgeGroup, memberMap]);

  if (!isOpen) return null;

  const exportCSV = () => {
    if (recordsOnSelectedDate.length === 0) return;
    const headers = [
      'ลำดับ',
      'วันที่',
      'รหัสสมาชิก',
      'ชื่อเล่น',
      'ชื่อ-นามสกุล',
      'ประเภทสมาชิก',
      'ฝ่าย/บทบาท',
      'ช่วงอายุ',
      'อายุ(ปี)',
      'เวลาเช็คอิน',
      'อุณหภูมิ(°C)',
      'วิธี',
    ];
    const rows = recordsOnSelectedDate.map((r, index) => {
      const ageInfo = getRecordAgeInfo(r);
      const isVisitor = isVisitorRecord(r);
      return [
        index + 1,
        r.date,
        r.memberId,
        r.nickname,
        r.memberName,
        isVisitor ? 'ผู้มาเยือน' : 'สมาชิก',
        r.role,
        ageInfo.label,
        ageInfo.age !== null ? ageInfo.age : '-',
        r.checkInTime,
        r.temperature,
        r.method,
      ];
    });
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `เช็คอิน_${selectedDate}_คริสตจักรฟ้าใส.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="attendance-drawer"
        className="h-full w-full max-w-lg border-l-2 border-[#D6EEFC] bg-white p-4 sm:p-5 shadow-2xl flex flex-col font-kanit"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBackToMenu && (
              <button
                type="button"
                onClick={onBackToMenu}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer"
                title="ย้อนกลับไปเมนู & จัดการ"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">เมนูหลัก</span>
              </button>
            )}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7EC8E3] to-[#3A86FF] text-white shadow-xs shrink-0">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-['Mali'] text-base sm:text-lg font-bold text-[#2D3748] leading-tight">
                รายชื่อผู้เช็คอิน & สรุปข้อมูล
              </h2>
              <p className="text-[11px] text-[#718096]">
                คริสตจักรฟ้าใส • ข้อมูลสถิติและประวัติการเข้าร่วม
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F8FF] text-[#718096] hover:bg-[#E2E8F0] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Date Selector Row: Click to open Calendar OR type manually */}
        <div className="my-2.5 flex items-center justify-between gap-2 rounded-xl bg-[#F8FAFC] p-2 border border-[#E2E8F0] shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-[#4A5568] shrink-0 font-semibold">
            <Calendar className="h-3.5 w-3.5 text-[#3A86FF]" />
            <span>เลือกวันที่:</span>
          </div>

          <div className="flex-1 max-w-[270px]">
            <DatePickerField
              value={selectedDate}
              onChange={(val) => {
                setSelectedDate(val || 'ALL');
                setSelectedAgeGroup('ALL');
              }}
              allowAllOption={true}
              allOptionLabel={`ดูทุกวันที่บันทึกไว้ (${records.length} ครั้ง)`}
              recordCountByDate={recordCountByDate}
              variant="compact"
            />
          </div>
        </div>

        {/* Small Summary Dashboard Container */}
        <div className="mb-3 rounded-2xl border-2 border-[#D6EEFC] bg-gradient-to-br from-[#F0F8FF] via-white to-[#F0FFF4] p-3 shadow-xs shrink-0">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#2B6CB0] flex items-center gap-1 font-['Mali']">
              <Sparkles className="h-3.5 w-3.5 text-[#3A86FF]" />
              สรุปยอดวันที่ {formatDateThai(selectedDate)}
            </span>
            <span className="rounded-full bg-[#E0F3FC] px-2 py-0.2 text-[10px] font-semibold text-[#2B7A78]">
              {selectedDate === 'ALL' ? 'ข้อมูลทั้งหมด' : selectedDate}
            </span>
          </div>

          {/* 3 Core Metric Cards */}
          <div className="grid grid-cols-3 gap-2">
            {/* Total Checked In */}
            <div className="rounded-xl border border-[#BEE3F8] bg-white/90 p-2 text-center shadow-2xs">
              <span className="text-[11px] font-medium text-[#4A5568] block">รวมเช็คอิน</span>
              <div className="mt-0.5 flex items-baseline justify-center gap-0.5">
                <span className="font-['Mali'] text-xl font-bold text-[#2D3748]">
                  {dashboardStats.total}
                </span>
                <span className="text-[10px] text-[#718096]">คน</span>
              </div>
            </div>

            {/* Regular Members */}
            <div className="rounded-xl border border-[#90E0EF] bg-white/90 p-2 text-center shadow-2xs">
              <span className="text-[11px] font-medium text-[#0077B6] flex items-center justify-center gap-1">
                <Users className="h-3 w-3" />
                สมาชิก
              </span>
              <div className="mt-0.5 flex items-baseline justify-center gap-0.5">
                <span className="font-['Mali'] text-xl font-bold text-[#0077B6]">
                  {dashboardStats.regularMembers}
                </span>
                <span className="text-[10px] text-[#718096]">คน</span>
              </div>
            </div>

            {/* Visitors */}
            <div className="rounded-xl border border-[#FEFCBF] bg-white/90 p-2 text-center shadow-2xs">
              <span className="text-[11px] font-medium text-[#B7791F] flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3 text-[#F59E0B]" />
                ผู้มาเยือน
              </span>
              <div className="mt-0.5 flex items-baseline justify-center gap-0.5">
                <span className="font-['Mali'] text-xl font-bold text-[#B7791F]">
                  {dashboardStats.visitors}
                </span>
                <span className="text-[10px] text-[#718096]">ท่าน</span>
              </div>
            </div>
          </div>

          {/* Age Group Breakdown */}
          <div className="mt-2.5 pt-2 border-t border-[#D6EEFC]/80">
            <div className="flex items-center justify-between mb-1.5 text-[11px]">
              <span className="font-semibold text-[#4A5568] flex items-center gap-1">
                <span>จำแนกตามช่วงอายุ</span>
                <span className="text-[10px] text-[#A0AEC0] font-normal">(คลิกเพื่อกรองรายชื่อ)</span>
              </span>
              {selectedAgeGroup !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedAgeGroup('ALL')}
                  className="text-[10px] font-medium text-[#3A86FF] hover:underline"
                >
                  ล้างตัวกรองอายุ ✕
                </button>
              )}
            </div>

            {/* Age Group Segment Bar */}
            {dashboardStats.total > 0 && (
              <div className="mb-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
                {dashboardStats.kids > 0 && (
                  <div
                    style={{ width: `${(dashboardStats.kids / dashboardStats.total) * 100}%` }}
                    className="bg-[#FFD166] transition-all"
                    title={`เด็ก: ${dashboardStats.kids} คน`}
                  />
                )}
                {dashboardStats.youth > 0 && (
                  <div
                    style={{ width: `${(dashboardStats.youth / dashboardStats.total) * 100}%` }}
                    className="bg-[#06D6A0] transition-all"
                    title={`วัยรุ่น: ${dashboardStats.youth} คน`}
                  />
                )}
                {dashboardStats.adults > 0 && (
                  <div
                    style={{ width: `${(dashboardStats.adults / dashboardStats.total) * 100}%` }}
                    className="bg-[#3A86FF] transition-all"
                    title={`วัยทำงาน: ${dashboardStats.adults} คน`}
                  />
                )}
                {dashboardStats.seniors > 0 && (
                  <div
                    style={{ width: `${(dashboardStats.seniors / dashboardStats.total) * 100}%` }}
                    className="bg-[#9D4EDD] transition-all"
                    title={`ผู้อาวุโส: ${dashboardStats.seniors} คน`}
                  />
                )}
                {dashboardStats.unknown > 0 && (
                  <div
                    style={{ width: `${(dashboardStats.unknown / dashboardStats.total) * 100}%` }}
                    className="bg-slate-400 transition-all"
                    title={`ไม่ระบุ: ${dashboardStats.unknown} คน`}
                  />
                )}
              </div>
            )}

            {/* Clickable Age Group Filter Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              {/* Kids */}
              <button
                type="button"
                onClick={() =>
                  setSelectedAgeGroup(selectedAgeGroup === 'KIDS' ? 'ALL' : 'KIDS')
                }
                className={`flex items-center justify-between rounded-lg px-2 py-1 transition border text-left ${
                  selectedAgeGroup === 'KIDS'
                    ? 'border-[#F59E0B] bg-[#FFFBEB] font-bold text-[#B45309] shadow-2xs ring-1 ring-[#F59E0B]'
                    : 'border-[#FEF08A] bg-white text-[#713F12] hover:bg-[#FEFCE8]'
                }`}
              >
                <span className="truncate">👶 เด็ก (0-12)</span>
                <span className="ml-1 font-bold font-mono">{dashboardStats.kids}</span>
              </button>

              {/* Youth */}
              <button
                type="button"
                onClick={() =>
                  setSelectedAgeGroup(selectedAgeGroup === 'YOUTH' ? 'ALL' : 'YOUTH')
                }
                className={`flex items-center justify-between rounded-lg px-2 py-1 transition border text-left ${
                  selectedAgeGroup === 'YOUTH'
                    ? 'border-[#059669] bg-[#ECFDF5] font-bold text-[#047857] shadow-2xs ring-1 ring-[#059669]'
                    : 'border-[#A7F3D0] bg-white text-[#065F46] hover:bg-[#F0FDF4]'
                }`}
              >
                <span className="truncate">🎒 วัยรุ่น (13-18)</span>
                <span className="ml-1 font-bold font-mono">{dashboardStats.youth}</span>
              </button>

              {/* Adults */}
              <button
                type="button"
                onClick={() =>
                  setSelectedAgeGroup(selectedAgeGroup === 'ADULTS' ? 'ALL' : 'ADULTS')
                }
                className={`flex items-center justify-between rounded-lg px-2 py-1 transition border text-left ${
                  selectedAgeGroup === 'ADULTS'
                    ? 'border-[#2563EB] bg-[#EFF6FF] font-bold text-[#1D4ED8] shadow-2xs ring-1 ring-[#2563EB]'
                    : 'border-[#BFDBFE] bg-white text-[#1E40AF] hover:bg-[#F0F9FF]'
                }`}
              >
                <span className="truncate">💼 ทำงาน (19-59)</span>
                <span className="ml-1 font-bold font-mono">{dashboardStats.adults}</span>
              </button>

              {/* Seniors */}
              <button
                type="button"
                onClick={() =>
                  setSelectedAgeGroup(selectedAgeGroup === 'SENIORS' ? 'ALL' : 'SENIORS')
                }
                className={`flex items-center justify-between rounded-lg px-2 py-1 transition border text-left ${
                  selectedAgeGroup === 'SENIORS'
                    ? 'border-[#7C3AED] bg-[#F5F3FF] font-bold text-[#6D28D9] shadow-2xs ring-1 ring-[#7C3AED]'
                    : 'border-[#DDD6FE] bg-white text-[#5B21B6] hover:bg-[#FAF5FF]'
                }`}
              >
                <span className="truncate">🧓 ผู้อาวุโส (60+)</span>
                <span className="ml-1 font-bold font-mono">{dashboardStats.seniors}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter bar and Export */}
        <div className="mb-2.5 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#A0AEC0]" />
            <input
              type="text"
              placeholder="ค้นหาชื่อเล่น, ชื่อ-สกุล, รหัส..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] py-1.5 pl-8 pr-3 text-xs focus:border-[#7EC8E3] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onClearDateRecords && recordsOnSelectedDate.length > 0 && (
              confirmClearDate ? (
                <div className="flex items-center gap-1 rounded-xl border border-red-300 bg-red-50 px-2 py-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      onClearDateRecords(selectedDate);
                      setConfirmClearDate(false);
                    }}
                    className="rounded-lg bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-red-700 cursor-pointer"
                  >
                    ยืนยันล้าง ({recordsOnSelectedDate.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearDate(false)}
                    className="rounded-lg bg-white px-2 py-0.5 text-[11px] text-slate-600 border border-slate-200 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearDate(true)}
                  className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50/80 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition shadow-2xs cursor-pointer"
                  title="ล้างประวัติการเช็คอินของวันที่เลือก"
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                  <span className="hidden sm:inline">ล้างวันที่เลือก</span>
                  <span className="sm:hidden">ล้าง</span>
                </button>
              )
            )}

            <button
              type="button"
              onClick={exportCSV}
              disabled={recordsOnSelectedDate.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-[#BEE3F8] bg-[#EBF8FF] px-3 py-1.5 text-xs font-semibold text-[#2B6CB0] hover:bg-[#BEE3F8] transition disabled:opacity-50"
              title="ส่งออกรายการวันที่เลือกเป็น CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>ส่งออก CSV</span>
            </button>
          </div>
        </div>

        {/* List of Attendees */}
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[#A0AEC0]">
              <UserCheck className="h-10 w-10 text-[#CBD5E1] mb-2" />
              <p className="text-sm font-medium">ยังไม่มีข้อมูลเช็คอินที่ตรงกัน</p>
              <p className="text-xs text-[#94A3B8]">
                {selectedAgeGroup !== 'ALL'
                  ? 'ลองกด "ล้างตัวกรองอายุ" หรือเลือกวันที่อื่น'
                  : 'แตะบัตร NFC หรือพิมพ์ชื่อเพื่อเช็คอิน'}
              </p>
            </div>
          ) : (
            filteredRecords.map((record, index) => {
              const ageInfo = getRecordAgeInfo(record);
              const isVisitor = isVisitorRecord(record);

              return (
                <div
                  key={record.id || `${record.memberId}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-[#EDF2F7] bg-[#F8FAFC] p-2.5 transition-colors hover:border-[#BEE3F8] hover:bg-[#F0F8FF]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-mono text-[#A0AEC0] w-4 text-center shrink-0">
                      {index + 1}
                    </span>
                    {record.avatarUrl ? (
                      <img
                        src={record.avatarUrl}
                        alt={record.nickname}
                        className="h-9 w-9 rounded-xl object-cover border border-[#7EC8E3] shrink-0"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E0F3FC] font-['Mali'] text-xs font-bold text-[#2B6CB0] shrink-0">
                        {record.nickname.slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <strong className="text-sm font-medium text-[#2D3748]">
                          {record.nickname}
                        </strong>
                        <span className="text-xs text-[#718096] font-mono">
                          ({record.memberId})
                        </span>
                        {isVisitor ? (
                          <span className="rounded bg-[#FEFCBF] px-1.5 py-0.2 text-[10px] font-bold text-[#B7791F]">
                            ผู้มาเยือน 🌟
                          </span>
                        ) : (
                          <span className="rounded bg-[#E0F3FC] px-1.5 py-0.2 text-[10px] text-[#2B6CB0]">
                            {record.method}
                          </span>
                        )}
                        {record.isBirthday && (
                          <span className="rounded-full bg-gradient-to-r from-[#FFD166] to-[#FF9EAA] px-1.5 py-0.2 text-[10px] font-bold text-slate-800 shadow-2xs">
                            🎂 วันเกิด
                          </span>
                        )}
                        {record.isRetroactive && (
                          <span
                            className="rounded bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[10px] font-bold text-amber-800"
                            title={record.retroactiveReason ? `บันทึกย้อนหลัง: ${record.retroactiveReason}` : 'บันทึกย้อนหลัง (ลืมเช็คอิน)'}
                          >
                            ย้อนหลัง ⏳
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#718096] truncate max-w-[200px]">
                        {record.memberName} • {record.role}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#4A5568]">
                        <span
                          className={`rounded px-1.5 py-0.2 font-medium ${
                            ageInfo.groupKey === 'KIDS'
                              ? 'bg-amber-100 text-amber-800'
                              : ageInfo.groupKey === 'YOUTH'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ageInfo.groupKey === 'ADULTS'
                              ? 'bg-blue-100 text-blue-800'
                              : ageInfo.groupKey === 'SENIORS'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {ageInfo.label}
                          {ageInfo.age !== null ? ` (${ageInfo.age} ปี)` : ''}
                        </span>
                        {record.careGroupName && (
                          <span className="text-[#059669] truncate">
                            {record.careGroupName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 pl-2">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 text-xs text-[#4A5568]">
                        <Clock className="h-3 w-3 text-[#A0AEC0]" />
                        <span>{record.checkInTime}</span>
                      </div>
                      <span
                        className={`inline-block text-[11px] font-medium ${
                          record.temperature >= 37.5 ? 'text-[#E63946]' : 'text-[#2B7A78]'
                        }`}
                      >
                        {record.temperature.toFixed(1)}°C
                      </span>
                    </div>

                    {onDeleteRecord && (
                      confirmDeleteRecordId === record.id ? (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRecord(record.id);
                              setConfirmDeleteRecordId(null);
                            }}
                            className="rounded-lg bg-red-600 px-2 py-1 text-[10.5px] font-bold text-white hover:bg-red-700 cursor-pointer"
                          >
                            ลบ
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteRecordId(null);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[10.5px] text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteRecordId(record.id);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                          title="ลบรายการเช็คอินนี้"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-2.5 pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#718096] shrink-0">
          {onBackToMenu ? (
            <button
              type="button"
              onClick={onBackToMenu}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>กลับไปเมนู & จัดการ</span>
            </button>
          ) : (
            <span>
              แสดง <strong>{filteredRecords.length}</strong> จาก {recordsOnSelectedDate.length} คน
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#F0F8FF] px-3.5 py-1.5 font-semibold text-[#2B6CB0] hover:bg-[#E2E8F0] transition cursor-pointer"
          >
            ปิดหน้าต่าง (หน้าหลัก)
          </button>
        </div>
      </div>
    </div>
  );
};
