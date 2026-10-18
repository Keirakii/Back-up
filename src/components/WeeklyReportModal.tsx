import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { CheckInRecord, SessionType } from '../types';
import {
  X,
  Calendar as CalendarIcon,
  BarChart2,
  Users,
  TrendingUp,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  Church,
  Home,
  Table as TableIcon,
  LayoutGrid,
  ArrowLeft,
} from 'lucide-react';

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu?: () => void;
  attendanceHistory: CheckInRecord[];
}

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const THAI_DAYS_FULL = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
];

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatThaiDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return `${d} ${THAI_MONTHS_SHORT[m] || ''} ${String(y + 543).slice(-2)}`;
}

function formatThaiDateFull(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dateObj = new Date(y, m, d);
  const dayName = THAI_DAYS_FULL[dateObj.getDay()] || '';
  return `${dayName}ที่ ${d} ${THAI_MONTHS_FULL[m] || ''} ${y + 543}`;
}

export function WeeklyReportModal({
  isOpen,
  onClose,
  onBackToMenu,
  attendanceHistory,
}: WeeklyReportModalProps) {
  const todayStr = useMemo(() => toLocalDateString(new Date()), []);

  // Filter by session type: 'ALL', 'CHURCH', 'CARE_GROUP'
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | SessionType>('ALL');

  // Selected date for the calendar and detail view
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Attendee search term within selected date
  const [attendeeSearch, setAttendeeSearch] = useState<string>('');

  // List vs Table view mode toggle for attendees
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');

  // Calendar month state (0-indexed month)
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());

  // When modal opens, initialize to today if today has records, otherwise latest date with records (or today)
  useEffect(() => {
    if (!isOpen) return;
    const nowStr = toLocalDateString(new Date());
    const hasToday = attendanceHistory.some((r) => r.date === nowStr);

    let initialDate = nowStr;
    if (!hasToday && attendanceHistory.length > 0) {
      const sortedDates = Array.from(
        new Set(attendanceHistory.map((r) => r.date).filter(Boolean))
      ).sort((a, b) => b.localeCompare(a));
      if (sortedDates[0]) {
        initialDate = sortedDates[0];
      }
    }

    setSelectedDate(initialDate);
    const parts = initialDate.split('-');
    if (parts.length === 3) {
      setCalendarYear(parseInt(parts[0], 10));
      setCalendarMonth(parseInt(parts[1], 10) - 1);
    }
  }, [isOpen]);

  // Map dates to counts for calendar badges (respecting or showing both church & care group)
  const dateRecordMap = useMemo(() => {
    const map = new Map<
      string,
      {
        total: number;
        church: number;
        care: number;
        visitors: number;
        records: CheckInRecord[];
      }
    >();
    attendanceHistory.forEach((rec) => {
      const d = rec.date || todayStr;
      const existing = map.get(d) || {
        total: 0,
        church: 0,
        care: 0,
        visitors: 0,
        records: [],
      };
      existing.total += 1;
      if (rec.sessionType === 'CARE_GROUP') {
        existing.care += 1;
      } else {
        existing.church += 1;
      }
      if (rec.isVisitor || rec.role?.includes('ผู้มา') || rec.memberId.startsWith('V')) {
        existing.visitors += 1;
      }
      existing.records.push(rec);
      map.set(d, existing);
    });
    return map;
  }, [attendanceHistory, todayStr]);

  // Dynamically compute the 4 most recent Sundays up to the latest Sunday (or today)
  const dynamicSundays = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const latestSunday = new Date(now);
    latestSunday.setDate(now.getDate() - dayOfWeek);

    const sundays: Array<{
      date: string;
      label: string;
      fullLabel: string;
    }> = [];

    for (let i = 3; i >= 0; i--) {
      const d = new Date(latestSunday);
      d.setDate(latestSunday.getDate() - i * 7);
      const dateStr = toLocalDateString(d);
      const dayNum = d.getDate();
      const monthShort = THAI_MONTHS_SHORT[d.getMonth()] || '';
      sundays.push({
        date: dateStr,
        label: `${dayNum} ${monthShort}`,
        fullLabel: formatThaiDateFull(dateStr),
      });
    }
    return sundays;
  }, []);

  // Aggregate stats for the 4 latest Sundays for the Bar Chart
  const weeklyChartData = useMemo(() => {
    return dynamicSundays.map((sun) => {
      const recordsOnSunday = attendanceHistory.filter((r) => r.date === sun.date);
      const churchCount = recordsOnSunday.filter((r) => r.sessionType !== 'CARE_GROUP').length;

      // Care group records within that 7-day week (Monday to Sunday)
      const [y, m, d] = sun.date.split('-').map(Number);
      const weekStartObj = new Date(y, m - 1, d - 6);
      const weekStartStr = toLocalDateString(weekStartObj);

      const careRecordsInWeek = attendanceHistory.filter(
        (r) => r.sessionType === 'CARE_GROUP' && r.date >= weekStartStr && r.date <= sun.date
      );

      const visitorCount = recordsOnSunday.filter(
        (r) => r.isVisitor || r.role?.includes('ผู้มา') || r.memberId.startsWith('V')
      ).length;

      return {
        date: sun.date,
        name: sun.label,
        fullLabel: sun.fullLabel,
        church: churchCount,
        careGroup: careRecordsInWeek.length,
        total: churchCount + careRecordsInWeek.length,
        visitors: visitorCount,
      };
    });
  }, [attendanceHistory, dynamicSundays]);

  // Attendees for the currently selected date
  const selectedDateAllRecords = useMemo(() => {
    return attendanceHistory.filter((r) => (r.date || todayStr) === selectedDate);
  }, [attendanceHistory, selectedDate, todayStr]);

  const selectedDateAttendees = useMemo(() => {
    const sessionFiltered =
      selectedTypeFilter === 'ALL'
        ? selectedDateAllRecords
        : selectedDateAllRecords.filter((r) => r.sessionType === selectedTypeFilter);

    if (!attendeeSearch.trim()) return sessionFiltered;
    const q = attendeeSearch.toLowerCase().trim();
    return sessionFiltered.filter(
      (r) =>
        r.nickname.toLowerCase().includes(q) ||
        r.memberName.toLowerCase().includes(q) ||
        r.memberId.toLowerCase().includes(q) ||
        (r.careGroupName && r.careGroupName.toLowerCase().includes(q)) ||
        (r.role && r.role.toLowerCase().includes(q))
    );
  }, [selectedDateAllRecords, selectedTypeFilter, attendeeSearch]);

  // Summary metrics for the top strip
  const summaryMetrics = useMemo(() => {
    const selectedDayChurch = selectedDateAllRecords.filter(
      (r) => r.sessionType !== 'CARE_GROUP'
    ).length;
    const selectedDayCare = selectedDateAllRecords.filter(
      (r) => r.sessionType === 'CARE_GROUP'
    ).length;

    const total4Weeks = weeklyChartData.reduce((acc, d) => acc + d.church, 0);
    const avgPerSunday =
      weeklyChartData.length > 0 ? (total4Weeks / weeklyChartData.length).toFixed(1) : '0';

    // Current viewed calendar month prefix (e.g. '2026-09')
    const monthPrefix = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`;
    const monthRecords = attendanceHistory.filter((r) => (r.date || '').startsWith(monthPrefix));
    const monthCareCount = monthRecords.filter((r) => r.sessionType === 'CARE_GROUP').length;
    const monthVisitorsCount = monthRecords.filter(
      (r) => r.isVisitor || r.role?.includes('ผู้มา') || r.memberId.startsWith('V')
    ).length;

    return {
      selectedTotal: selectedDateAllRecords.length,
      selectedDayChurch,
      selectedDayCare,
      avgPerSunday,
      monthCareCount,
      monthVisitorsCount,
      monthRecordsCount: monthRecords.length,
    };
  }, [selectedDateAllRecords, weeklyChartData, attendanceHistory, calendarYear, calendarMonth]);

  // Build calendar matrix for selected month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 = Sunday
    const totalDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const days: Array<{
      dayNum: number;
      dateStr: string;
      isSunday: boolean;
      isToday: boolean;
    } | null> = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const monthStr = String(calendarMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${calendarYear}-${monthStr}-${dayStr}`;
      const dayOfWeek = new Date(calendarYear, calendarMonth, d).getDay();
      days.push({
        dayNum: d,
        dateStr,
        isSunday: dayOfWeek === 0,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [calendarYear, calendarMonth, todayStr]);

  const handleSelectDateAndSyncMonth = (dateStr: string) => {
    setSelectedDate(dateStr);
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      setCalendarYear(parseInt(parts[0], 10));
      setCalendarMonth(parseInt(parts[1], 10) - 1);
    }
  };

  // Export CSV for the selected date or current filter
  const handleExportCSV = () => {
    const recordsToExport =
      selectedDateAttendees.length > 0 ? selectedDateAttendees : attendanceHistory;
    if (recordsToExport.length === 0) return;

    const headers = [
      'วันที่',
      'รหัสสมาชิก',
      'ชื่อเล่น',
      'ชื่อ-นามสกุล',
      'บทบาท',
      'ประเภทการเช็คอิน',
      'กลุ่มแคร์',
      'เวลา',
      'อุณหภูมิ',
      'วิธีเช็คอิน',
    ];
    const rows = recordsToExport.map((r) => [
      r.date,
      r.memberId,
      r.nickname,
      r.memberName,
      r.role,
      r.sessionType === 'CARE_GROUP' ? 'กลุ่มแคร์' : 'รอบนมัสการ',
      r.careGroupName || '-',
      r.checkInTime,
      `${r.temperature.toFixed(1)}°C`,
      r.method,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join(
        '\n'
      );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `church_report_${selectedDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-2.5 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 font-kanit"
      onClick={onClose}
    >
      <div
        id="weekly-report-modal"
        className="flex h-[92vh] max-h-[900px] w-full max-w-4xl flex-col rounded-[26px] border border-slate-200 bg-[#F8FAFC] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sleek Minimal Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-4 sm:px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBackToMenu && (
              <button
                type="button"
                onClick={onBackToMenu}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer"
                title="ย้อนกลับไปเมนูหลัก"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">เมนู</span>
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-['Mali'] text-base sm:text-lg font-bold text-slate-900 truncate">
                  รายงานข้อมูล & สถิติเช็คอิน
                </h2>
              </div>
              <p className="text-xs text-slate-500 truncate">
                คลิกเลือกวันที่ในปฏิทินเพื่อดูรายชื่อผู้มาเช็คอินในแต่ละวัน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Clean Segmented Session Filter */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedTypeFilter('ALL')}
                className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
                  selectedTypeFilter === 'ALL'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setSelectedTypeFilter('CHURCH')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
                  selectedTypeFilter === 'CHURCH'
                    ? 'bg-white text-[#2B6CB0] font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Church className="h-3 w-3 text-[#3A86FF]" />
                <span>รอบโบสถ์</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTypeFilter('CARE_GROUP')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
                  selectedTypeFilter === 'CARE_GROUP'
                    ? 'bg-white text-emerald-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Home className="h-3 w-3 text-emerald-600" />
                <span>กลุ่มแคร์</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              title="ดาวน์โหลดไฟล์ CSV"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">ส่งออก CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
          {/* Clean, Unified 4-Metric Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
            <div className="p-3.5">
              <span className="text-xs text-slate-500 block truncate">
                ยอดเช็คอิน ({formatThaiDateShort(selectedDate)})
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-['Mali'] text-2xl font-bold text-[#3A86FF] tabular-nums">
                  {summaryMetrics.selectedTotal}
                </span>
                <span className="text-xs text-slate-400">คน</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                โบสถ์ {summaryMetrics.selectedDayChurch} · แคร์ {summaryMetrics.selectedDayCare}
              </p>
            </div>

            <div className="p-3.5">
              <span className="text-xs text-slate-500 block truncate">
                เฉลี่ยรอบวันอาทิตย์
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-['Mali'] text-2xl font-bold text-slate-900 tabular-nums">
                  {summaryMetrics.avgPerSunday}
                </span>
                <span className="text-xs text-slate-400">คน/สัปดาห์</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                คำนวณจาก 4 สัปดาห์ล่าสุด
              </p>
            </div>

            <div className="p-3.5">
              <span className="text-xs text-slate-500 block truncate">
                กลุ่มแคร์ ({THAI_MONTHS_SHORT[calendarMonth]})
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-['Mali'] text-2xl font-bold text-emerald-600 tabular-nums">
                  {summaryMetrics.monthCareCount}
                </span>
                <span className="text-xs text-slate-400">รายการ</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                ยอดเช็คอินแคร์ในเดือนนี้
              </p>
            </div>

            <div className="p-3.5">
              <span className="text-xs text-slate-500 block truncate">
                คนมาใหม่ ({THAI_MONTHS_SHORT[calendarMonth]})
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-['Mali'] text-2xl font-bold text-amber-600 tabular-nums">
                  {summaryMetrics.monthVisitorsCount}
                </span>
                <span className="text-xs text-slate-400">ท่าน</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                รวมเช็คอินเดือนนี้ {summaryMetrics.monthRecordsCount} รายการ
              </p>
            </div>
          </div>

          {/* Interactive Calendar & Weekly Trend Chart Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Interactive Calendar Card (7 cols - Primary Date Selector) */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col justify-between">
              <div>
                {/* Calendar Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-[#3A86FF]">
                      <CalendarIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        ปฏิทินเช็คอิน {THAI_MONTHS_FULL[calendarMonth]} {calendarYear + 543}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        แตะที่วันที่ในปฏิทินเพื่อดูข้อมูลรายวัน
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSelectDateAndSyncMonth(todayStr)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                        selectedDate === todayStr
                          ? 'bg-sky-50 text-[#3A86FF] font-semibold'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      วันนี้
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (calendarMonth === 0) {
                          setCalendarMonth(11);
                          setCalendarYear((y) => y - 1);
                        } else {
                          setCalendarMonth((m) => m - 1);
                        }
                      }}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                      title="เดือนก่อนหน้า"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (calendarMonth === 11) {
                          setCalendarMonth(0);
                          setCalendarYear((y) => y + 1);
                        } else {
                          setCalendarMonth((m) => m + 1);
                        }
                      }}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                      title="เดือนถัดไป"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Day of Week Header */}
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold mb-1.5">
                  <span className="text-rose-500">อา.</span>
                  <span className="text-slate-400">จ.</span>
                  <span className="text-slate-400">อ.</span>
                  <span className="text-slate-400">พ.</span>
                  <span className="text-slate-400">พฤ.</span>
                  <span className="text-emerald-600">ศ.</span>
                  <span className="text-slate-400">ส.</span>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {calendarDays.map((cell, idx) => {
                    if (!cell) {
                      return <div key={`empty-${idx}`} className="h-10" />;
                    }

                    const dayInfo = dateRecordMap.get(cell.dateStr);
                    const isSelected = selectedDate === cell.dateStr;
                    const count =
                      selectedTypeFilter === 'ALL'
                        ? dayInfo?.total || 0
                        : selectedTypeFilter === 'CHURCH'
                        ? dayInfo?.church || 0
                        : dayInfo?.care || 0;
                    const hasCheckins = count > 0;

                    return (
                      <button
                        key={cell.dateStr}
                        type="button"
                        onClick={() => setSelectedDate(cell.dateStr)}
                        className={`relative flex h-10 flex-col items-center justify-center rounded-xl transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#3A86FF] text-white font-bold shadow-xs'
                            : hasCheckins
                            ? cell.isSunday
                              ? 'bg-sky-50/90 text-[#2B6CB0] font-semibold hover:bg-sky-100/80 border border-sky-200/70'
                              : 'bg-emerald-50/90 text-emerald-700 font-semibold hover:bg-emerald-100/80 border border-emerald-200/70'
                            : cell.isToday
                            ? 'ring-1 ring-[#3A86FF] bg-slate-50 text-slate-900 font-semibold'
                            : cell.isSunday
                            ? 'text-rose-500 hover:bg-slate-50'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs leading-none">{cell.dayNum}</span>

                        {hasCheckins && (
                          <span
                            className={`mt-0.5 text-[9.5px] leading-none tabular-nums ${
                              isSelected
                                ? 'text-white/95 font-semibold'
                                : cell.isSunday
                                ? 'text-[#3A86FF] font-bold'
                                : 'text-emerald-600 font-bold'
                            }`}
                          >
                            {count} คน
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calendar Legend */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#3A86FF]" />
                    <span>วันอาทิตย์ (โบสถ์)</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>วันกลุ่มแคร์</span>
                  </span>
                </div>
                <span className="text-slate-400">
                  เลือกอยู่: <strong className="text-slate-700">{formatThaiDateShort(selectedDate)}</strong>
                </span>
              </div>
            </div>

            {/* Weekly Trend Chart Card (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      แนวโน้ม 4 สัปดาห์ล่าสุด
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      เปรียบเทียบรอบนมัสการและกลุ่มแคร์ (แตะแท่งกราฟเพื่อเลือกวัน)
                    </p>
                  </div>
                </div>

                <div className="h-48 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={weeklyChartData}
                      margin={{ top: 8, right: 6, left: -24, bottom: 0 }}
                      onClick={(e: any) => {
                        if (e && e.activePayload && e.activePayload.length > 0) {
                          const clickedDate = e.activePayload[0].payload.date;
                          if (clickedDate) handleSelectDateAndSyncMonth(clickedDate);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Kanit' }}
                        axisLine={{ stroke: '#E2E8F0' }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'Kanit' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg font-kanit text-xs">
                                <p className="font-semibold text-slate-900 mb-1">
                                  {data.fullLabel}
                                </p>
                                <div className="space-y-1 text-[11px]">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-1.5 text-slate-600">
                                      <span className="h-2 w-2 rounded-full bg-[#3A86FF]" />
                                      รอบนมัสการ:
                                    </span>
                                    <strong className="text-slate-900">{data.church} คน</strong>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-1.5 text-slate-600">
                                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                      กลุ่มแคร์ในสัปดาห์:
                                    </span>
                                    <strong className="text-slate-900">{data.careGroup} คน</strong>
                                  </div>
                                  {data.visitors > 0 && (
                                    <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 text-amber-700">
                                      <span>คนมาใหม่:</span>
                                      <span className="font-semibold">{data.visitors} ท่าน</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="church"
                        name="church"
                        fill="#3A86FF"
                        radius={[6, 6, 0, 0]}
                        cursor="pointer"
                      />
                      <Bar
                        dataKey="careGroup"
                        name="careGroup"
                        fill="#10B981"
                        radius={[6, 6, 0, 0]}
                        cursor="pointer"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-2 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-xs bg-[#3A86FF]" />
                    <span>รอบนมัสการ</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-xs bg-emerald-500" />
                    <span>กลุ่มแคร์รายสัปดาห์</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Attendance Section for Selected Date */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
            {/* Clean Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    รายชื่อผู้มาเช็คอิน · {formatThaiDateFull(selectedDate)}
                  </h3>
                  <span className="text-xs font-semibold text-[#3A86FF]">
                    ({selectedDateAttendees.length} คน)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  รอบนมัสการ {summaryMetrics.selectedDayChurch} คน · กลุ่มแคร์{' '}
                  {summaryMetrics.selectedDayCare} คน
                </p>
              </div>

              {/* Search & View Switcher */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-52">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อเล่น, ชื่อจริง, แคร์..."
                    value={attendeeSearch}
                    onChange={(e) => setAttendeeSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-8.5 pr-3 text-xs text-slate-800 focus:border-[#3A86FF] focus:bg-white focus:outline-none transition"
                  />
                </div>

                <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>รายการ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TableIcon className="h-3.5 w-3.5" />
                    <span>ตาราง</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Attendees Display */}
            {selectedDateAttendees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                <Users className="h-9 w-9 stroke-1.5 opacity-40 mb-2" />
                <p className="text-sm font-medium text-slate-600">
                  ไม่มีรายการเช็คอินใน{formatThaiDateFull(selectedDate)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  แตะเลือกวันที่ที่มีตัวเลขกำกับในปฏิทินด้านบนเพื่อดูรายชื่อผู้เข้าร่วม
                </p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-0.5">
                {selectedDateAttendees.map((rec, index) => (
                  <div
                    key={rec.id || `rec-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {rec.avatarUrl ? (
                        <img
                          src={rec.avatarUrl}
                          alt={rec.nickname}
                          className="h-9 w-9 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 font-['Mali'] text-xs font-bold text-[#2B6CB0] shrink-0">
                          {rec.nickname.slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">
                            คุณ{rec.nickname}
                          </span>
                          {rec.memberName && rec.memberName !== rec.nickname && (
                            <span className="text-xs text-slate-500 truncate">
                              {rec.memberName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {rec.sessionType === 'CARE_GROUP' ? 'กลุ่มแคร์' : 'รอบนมัสการ'}
                          {rec.careGroupName ? ` (${rec.careGroupName})` : ''} · {rec.role}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-slate-800 tabular-nums block">
                        {rec.checkInTime}
                      </span>
                      <span
                        className={`text-[11px] font-medium tabular-nums ${
                          rec.temperature >= 37.5 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        {rec.temperature.toFixed(1)}°C
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">ชื่อสมาชิก</th>
                      <th className="py-2.5 px-3">บทบาท</th>
                      <th className="py-2.5 px-3">ประเภท / กลุ่มแคร์</th>
                      <th className="py-2.5 px-3 w-24 text-center">เวลา</th>
                      <th className="py-2.5 px-3 w-20 text-right">อุณหภูมิ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedDateAttendees.map((rec, index) => (
                      <tr key={rec.id || `rec-${index}`} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 text-center text-slate-400 tabular-nums">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-slate-900">คุณ{rec.nickname}</span>
                            {rec.memberName && rec.memberName !== rec.nickname && (
                              <span className="text-slate-500">{rec.memberName}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-600">{rec.role}</td>
                        <td className="py-2 px-3 text-slate-600">
                          {rec.sessionType === 'CARE_GROUP' ? 'กลุ่มแคร์' : 'รอบนมัสการ'}
                          {rec.careGroupName ? ` · ${rec.careGroupName}` : ''}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-700 font-medium tabular-nums">
                          {rec.checkInTime}
                        </td>
                        <td className="py-2 px-3 text-right font-medium tabular-nums">
                          <span
                            className={
                              rec.temperature >= 37.5 ? 'text-rose-600 font-bold' : 'text-slate-600'
                            }
                          >
                            {rec.temperature.toFixed(1)}°C
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-white px-5 py-3 text-xs text-slate-500 shrink-0">
          {onBackToMenu ? (
            <button
              type="button"
              onClick={onBackToMenu}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>กลับไปเมนูหลัก</span>
            </button>
          ) : (
            <span>ข้อมูลสถิติอัปเดตแบบเรียลไทม์</span>
          )}

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
}
