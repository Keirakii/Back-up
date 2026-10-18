import React, { useState, useMemo } from 'react';
import { CheckInRecord, SessionType } from '../types';
import {
  X,
  Flame,
  Clock,
  Calendar,
  Users,
  TrendingUp,
  Filter,
  Info,
  ChevronRight,
  Sun,
  Sparkles,
  CheckCircle2,
  Activity,
  Award,
  AlertCircle,
} from 'lucide-react';

interface AttendanceHeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendanceHistory: CheckInRecord[];
}

interface TimeSlotDef {
  id: string;
  label: string;
  minMinutes: number; // minutes from 00:00
  maxMinutes: number;
}

const SUNDAY_TIME_SLOTS: TimeSlotDef[] = [
  { id: 'slot-pre-0800', label: 'ก่อน 8.00 น.', minMinutes: 0, maxMinutes: 479 },
  { id: 'slot-0800-0830', label: '8.00 - 8.30 น.', minMinutes: 480, maxMinutes: 509 },
  { id: 'slot-0830-0900', label: '8.30 - 9.00 น.', minMinutes: 510, maxMinutes: 539 },
  { id: 'slot-0900-0930', label: '9.00 - 9.30 น.', minMinutes: 540, maxMinutes: 569 },
  { id: 'slot-0930-1000', label: '9.30 - 10.00 น.', minMinutes: 570, maxMinutes: 599 },
  { id: 'slot-1000-1030', label: '10.00 - 10.30 น.', minMinutes: 600, maxMinutes: 629 },
  { id: 'slot-post-1030', label: 'หลัง 10.30 น.', minMinutes: 630, maxMinutes: 1440 },
];

export function AttendanceHeatmapModal({
  isOpen,
  onClose,
  attendanceHistory,
}: AttendanceHeatmapModalProps) {
  // View mode: 'timeslot' (Heatmap by hour/slot on Sundays) | 'calendar' (28-day daily heatmap)
  const [viewMode, setViewMode] = useState<'timeslot' | 'calendar'>('timeslot');

  // Filter: 'ALL', 'CHURCH', 'CARE_GROUP'
  const [sessionFilter, setSessionFilter] = useState<'ALL' | SessionType>('CHURCH');

  // Cell selection for drill-down inspect
  const [selectedCell, setSelectedCell] = useState<{
    dateLabel: string;
    slotLabel: string;
    records: CheckInRecord[];
  } | null>(null);

  // Determine the 4 target Sundays dynamically from data or fallback
  const targetSundays = useMemo(() => {
    // Collect all dates from records
    const sundayDates = new Set<string>();
    attendanceHistory.forEach((r) => {
      if (r.date) {
        const d = new Date(r.date + 'T00:00:00');
        if (d.getDay() === 0) {
          sundayDates.add(r.date);
        }
      }
    });

    // Sort descending
    const sorted = Array.from(sundayDates).sort().reverse();
    let selectedDates = sorted.slice(0, 4);

    // If less than 4, fallback to standard mock Sundays
    if (selectedDates.length < 4) {
      const fallbackSundays = ['2026-09-20', '2026-09-13', '2026-09-06', '2026-08-30'];
      fallbackSundays.forEach((fs) => {
        if (!selectedDates.includes(fs)) selectedDates.push(fs);
      });
      selectedDates = selectedDates.slice(0, 4);
    }

    // Sort ascending (chronological left to right: oldest to newest)
    selectedDates.sort();

    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    return selectedDates.map((dateStr, idx) => {
      const d = new Date(dateStr + 'T00:00:00');
      const day = d.getDate();
      const month = thaiMonths[d.getMonth()];
      const year = d.getFullYear();
      return {
        key: `W${idx + 1}`,
        date: dateStr,
        label: `${day} ${month}`,
        fullLabel: `อาทิตย์ ${day} ${month} ${year}`,
        weekNum: idx + 1,
        isLatest: idx === selectedDates.length - 1,
      };
    });
  }, [attendanceHistory]);

  // Parse time to minutes from midnight
  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d{1,2})[:.](\d{2})/);
    if (!match) return 0;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
  };

  // Filter records based on session filter
  const filteredHistory = useMemo(() => {
    if (sessionFilter === 'ALL') return attendanceHistory;
    return attendanceHistory.filter((r) => r.sessionType === sessionFilter);
  }, [attendanceHistory, sessionFilter]);

  // Compute Heatmap Matrix for Time Slots x 4 Sundays
  const { matrix, maxSlotCount, peakSlotOverall, totalCheckInsIn4Sundays, punctualityStats } = useMemo(() => {
    let maxCount = 0;
    let totalSundaysCount = 0;
    let onTimeCount = 0; // arrived before 09:00

    const slotStatsMap: Record<string, { total: number; label: string }> = {};
    SUNDAY_TIME_SLOTS.forEach((s) => {
      slotStatsMap[s.id] = { total: 0, label: s.label };
    });

    const dataMatrix = SUNDAY_TIME_SLOTS.map((slot) => {
      const sundayCols = targetSundays.map((sun) => {
        const records = filteredHistory.filter((r) => {
          if (r.date !== sun.date) return false;
          const mins = parseTimeToMinutes(r.checkInTime);
          return mins >= slot.minMinutes && mins <= slot.maxMinutes;
        });

        const count = records.length;
        if (count > maxCount) maxCount = count;

        totalSundaysCount += count;
        if (slot.maxMinutes <= 539) {
          onTimeCount += count;
        }

        slotStatsMap[slot.id].total += count;

        return {
          sunday: sun,
          count,
          records,
        };
      });

      return {
        slot,
        sundayCols,
        totalInSlot: sundayCols.reduce((sum, c) => sum + c.count, 0),
      };
    });

    // Find peak slot
    let peakSlotId = SUNDAY_TIME_SLOTS[0].id;
    let peakSlotMax = -1;
    Object.entries(slotStatsMap).forEach(([id, st]) => {
      if (st.total > peakSlotMax) {
        peakSlotMax = st.total;
        peakSlotId = id;
      }
    });

    const peakSlotDef = SUNDAY_TIME_SLOTS.find((s) => s.id === peakSlotId);

    const onTimeRate = totalSundaysCount > 0 ? ((onTimeCount / totalSundaysCount) * 100).toFixed(1) : '0';

    return {
      matrix: dataMatrix,
      maxSlotCount: Math.max(maxCount, 1),
      peakSlotOverall: {
        slot: peakSlotDef,
        total: peakSlotMax,
        avg: (peakSlotMax / targetSundays.length).toFixed(1),
      },
      totalCheckInsIn4Sundays: totalSundaysCount,
      punctualityStats: {
        onTimeCount,
        totalSundaysCount,
        rate: onTimeRate,
      },
    };
  }, [filteredHistory, targetSundays]);

  // Color generator for heatmap intensity
  const getCellColor = (count: number, max: number) => {
    if (count === 0) {
      return {
        bg: 'bg-slate-50 hover:bg-slate-100 text-slate-400',
        border: 'border-slate-100',
        badge: 'bg-slate-200 text-slate-500',
        bar: 'bg-slate-200',
      };
    }
    const ratio = count / max;

    if (ratio < 0.25) {
      return {
        bg: 'bg-sky-50 hover:bg-sky-100 text-sky-800',
        border: 'border-sky-100',
        badge: 'bg-sky-100 text-sky-700 font-semibold',
        bar: 'bg-sky-300',
      };
    }
    if (ratio < 0.5) {
      return {
        bg: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900',
        border: 'border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-800 font-bold',
        bar: 'bg-emerald-400',
      };
    }
    if (ratio < 0.8) {
      return {
        bg: 'bg-amber-100 hover:bg-amber-200 text-amber-950 shadow-2xs',
        border: 'border-amber-300',
        badge: 'bg-amber-200 text-amber-900 font-bold',
        bar: 'bg-amber-500',
      };
    }
    // High heat (Peak)
    return {
      bg: 'bg-gradient-to-br from-orange-400 to-rose-500 hover:from-orange-500 hover:to-rose-600 text-white shadow-xs font-bold animate-pulse-slow',
      border: 'border-rose-400',
      badge: 'bg-white/90 text-rose-700 font-black',
      bar: 'bg-white',
    };
  };

  // 28-Day Daily Matrix (last 4 full weeks: Monday to Sunday)
  const dailyMatrix = useMemo(() => {
    if (targetSundays.length === 0) return [];
    const latestSundayStr = targetSundays[targetSundays.length - 1].date;
    const latestSundayDate = new Date(latestSundayStr + 'T00:00:00');

    // Start 27 days before latest Sunday (total 28 days = 4 full weeks)
    const startDate = new Date(latestSundayDate);
    startDate.setDate(startDate.getDate() - 27);

    const weeks: Array<{
      weekLabel: string;
      days: Array<{
        dateStr: string;
        dayName: string;
        dayNum: number;
        count: number;
        isSunday: boolean;
        records: CheckInRecord[];
      }>;
    }> = [];

    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const curDate = new Date(startDate);

    let currentWeekDays: Array<{
      dateStr: string;
      dayName: string;
      dayNum: number;
      count: number;
      isSunday: boolean;
      records: CheckInRecord[];
    }> = [];

    for (let i = 0; i < 28; i++) {
      const year = curDate.getFullYear();
      const month = String(curDate.getMonth() + 1).padStart(2, '0');
      const day = String(curDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayOfWeek = curDate.getDay();

      const dayRecords = filteredHistory.filter((r) => r.date === dateStr);

      currentWeekDays.push({
        dateStr,
        dayName: dayNames[dayOfWeek],
        dayNum: curDate.getDate(),
        count: dayRecords.length,
        isSunday: dayOfWeek === 0,
        records: dayRecords,
      });

      if (currentWeekDays.length === 7) {
        weeks.push({
          weekLabel: `สัปดาห์ที่ ${weeks.length + 1}`,
          days: currentWeekDays,
        });
        currentWeekDays = [];
      }

      curDate.setDate(curDate.getDate() + 1);
    }

    return weeks;
  }, [targetSundays, filteredHistory]);

  const maxDailyCount = useMemo(() => {
    let max = 1;
    dailyMatrix.forEach((w) => {
      w.days.forEach((d) => {
        if (d.count > max) max = d.count;
      });
    });
    return max;
  }, [dailyMatrix]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex h-[94vh] max-h-[890px] w-full max-w-5xl flex-col rounded-3xl border-3 border-[#D6EEFC] bg-white shadow-2xl overflow-hidden font-kanit"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-gradient-to-r from-[#FFF5EB] via-[#FFF9F2] to-[#EBF8FF] px-4 py-3 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Mali'] text-base sm:text-lg font-bold text-[#2D3748]">
                  แผนภูมิความร้อน (Attendance Heatmap) 🔥
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-orange-100 border border-orange-200 px-2.5 py-0.5 text-[11px] font-semibold text-orange-800">
                  <Activity className="h-3 w-3" /> 4 สัปดาห์ล่าสุด
                </span>
              </div>
              <p className="text-xs text-[#718096]">
                วิเคราะห์ช่วงเวลาที่มีคนเข้าโบสถ์หนาแน่นที่สุด เพื่อจัดสรรทีมต้อนรับและเตรียมพร้อมรอบนมัสการ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#718096] transition hover:bg-[#E2E8F0] hover:text-[#2D3748] shadow-xs"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Top Control Bar & Insights Ribbon */}
        <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 sm:px-6 shrink-0 flex flex-wrap items-center justify-between gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-200/70 p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setViewMode('timeslot');
                setSelectedCell(null);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition ${
                viewMode === 'timeslot'
                  ? 'bg-white text-[#3A86FF] shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>ช่วงเวลานมัสการวันอาทิตย์</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('calendar');
                setSelectedCell(null);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition ${
                viewMode === 'calendar'
                  ? 'bg-white text-[#3A86FF] shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>ปฏิทิน 28 วัน (Day Matrix)</span>
            </button>
          </div>

          {/* Session Type Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#64748B] flex items-center gap-1 font-medium">
              <Filter className="h-3 w-3" /> ประเภท:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSessionFilter('CHURCH')}
                className={`rounded-lg px-2.5 py-1 font-medium transition ${
                  sessionFilter === 'CHURCH'
                    ? 'bg-[#7EC8E3] text-white shadow-xs font-semibold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                รอบโบสถ์ ⛪
              </button>
              <button
                type="button"
                onClick={() => setSessionFilter('ALL')}
                className={`rounded-lg px-2.5 py-1 font-medium transition ${
                  sessionFilter === 'ALL'
                    ? 'bg-[#3A86FF] text-white shadow-xs font-semibold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                ทั้งหมด (รวมแคร์)
              </button>
            </div>
          </div>
        </div>

        {/* 4 Insight Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:px-6 bg-[#FBFDFF] border-b border-[#E2E8F0] shrink-0">
          <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-2.5 flex items-center gap-2.5 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-xs">
              <Flame className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-[#718096] truncate">ช่วงพีคคนมามากสุด</p>
              <p className="font-['Mali'] text-xs sm:text-sm font-bold text-orange-950 truncate">
                {peakSlotOverall.slot?.label || '8.30 - 9.00 น.'}
              </p>
              <p className="text-[10px] font-semibold text-orange-700">เฉลี่ย {peakSlotOverall.avg} คน/อาทิตย์</p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-2.5 flex items-center gap-2.5 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-[#718096] truncate">อัตรามาตรงเวลาก่อน 9:00</p>
              <p className="font-['Mali'] text-xs sm:text-sm font-bold text-emerald-950">
                {punctualityStats.rate}%
              </p>
              <p className="text-[10px] font-semibold text-emerald-700">{punctualityStats.onTimeCount} จาก {punctualityStats.totalSundaysCount} คน</p>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-2.5 flex items-center gap-2.5 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3A86FF] text-white shadow-xs">
              <Users className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-[#718096] truncate">รวมเช็คอิน 4 อาทิตย์</p>
              <p className="font-['Mali'] text-xs sm:text-sm font-bold text-sky-950">
                {totalCheckInsIn4Sundays} คน
              </p>
              <p className="text-[10px] font-semibold text-[#3182CE]">เฉลี่ย {(totalCheckInsIn4Sundays / targetSundays.length).toFixed(1)} คน/สัปดาห์</p>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-2.5 flex items-center gap-2.5 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-xs">
              <Award className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-[#718096] truncate">อาทิตย์ที่คนเยอะสุด</p>
              <p className="font-['Mali'] text-xs sm:text-sm font-bold text-indigo-950 truncate">
                {targetSundays[targetSundays.length - 1]?.label || '-'}
              </p>
              <p className="text-[10px] font-semibold text-indigo-700">สถิติสูงสุดในรอบเดือน</p>
            </div>
          </div>
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-4 py-2 sm:px-6 text-[11px] text-[#64748B]">
          <span className="flex items-center gap-1 font-medium">
            <Info className="h-3.5 w-3.5 text-[#3A86FF]" />
            คลิกที่แต่ละช่องความร้อน เพื่อดูรายชื่อสมาชิกและเวลาเช็คอินอย่างละเอียด
          </span>
          <div className="flex items-center gap-1.5">
            <span>น้อย</span>
            <span className="h-3 w-4 rounded-xs bg-slate-100 border border-slate-200" title="0 คน" />
            <span className="h-3 w-4 rounded-xs bg-sky-100 border border-sky-200" title="1-25%" />
            <span className="h-3 w-4 rounded-xs bg-emerald-200 border border-emerald-300" title="25-50%" />
            <span className="h-3 w-4 rounded-xs bg-amber-300 border border-amber-400" title="50-80%" />
            <span className="h-3 w-4 rounded-xs bg-rose-500 border border-rose-600" title="พีคสูงสุด" />
            <span>หนาแน่นมาก 🔥</span>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50/50">
          {viewMode === 'timeslot' ? (
            <div className="space-y-4">
              {/* The Matrix Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#D6EEFC] bg-white shadow-xs">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F0F8FF] text-[#2D3748]">
                      <th className="p-3 font-semibold text-xs min-w-[160px] sm:min-w-[190px]">
                        ช่วงเวลาเข้าโบสถ์ ⏱️
                      </th>
                      {targetSundays.map((sun) => (
                        <th key={sun.date} className="p-3 text-center font-bold min-w-[110px]">
                          <div className="flex flex-col items-center">
                            <span className="font-['Mali'] text-sm text-[#2B6CB0]">{sun.label}</span>
                            <span className="text-[10px] text-[#718096] font-normal">
                              {sun.isLatest ? '🌟 อาทิตย์ล่าสุด' : `สัปดาห์ ${sun.weekNum}`}
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="p-3 text-center font-semibold text-[#4A5568] min-w-[100px] bg-slate-100/70">
                        รวมทั้งเดือน
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matrix.map((row) => (
                      <tr key={row.slot.id} className="hover:bg-slate-50/70 transition">
                        {/* Time Slot Label */}
                        <td className="p-3 bg-white">
                          <div className="font-bold text-[#1A202C] text-xs flex items-center gap-1.5 whitespace-nowrap">
                            <Clock className="h-3.5 w-3.5 text-[#3A86FF] shrink-0" />
                            <span>{row.slot.label}</span>
                          </div>
                        </td>

                        {/* Sunday Columns */}
                        {row.sundayCols.map((col) => {
                          const styling = getCellColor(col.count, maxSlotCount);
                          const isSelected =
                            selectedCell?.dateLabel === col.sunday.fullLabel &&
                            selectedCell?.slotLabel === row.slot.label;

                          return (
                            <td key={col.sunday.date} className="p-1.5 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedCell({
                                    dateLabel: col.sunday.fullLabel,
                                    slotLabel: row.slot.label,
                                    records: col.records,
                                  })
                                }
                                className={`w-full h-14 rounded-xl border p-1.5 flex flex-col items-center justify-center transition transform active:scale-95 cursor-pointer ${
                                  styling.bg
                                } ${styling.border} ${
                                  isSelected
                                    ? 'ring-2 ring-[#3A86FF] ring-offset-2 scale-102 shadow-md'
                                    : ''
                                }`}
                              >
                                <span className="font-['Mali'] text-sm font-bold leading-tight">
                                  {col.count > 0 ? `${col.count} คน` : '-'}
                                </span>
                                {col.count > 0 && (
                                  <div className="mt-1 flex items-center gap-1">
                                    <span
                                      className={`text-[9px] px-1.5 py-0.2 rounded-full ${styling.badge}`}
                                    >
                                      {Math.round((col.count / maxSlotCount) * 100)}%
                                    </span>
                                  </div>
                                )}
                              </button>
                            </td>
                          );
                        })}

                        {/* Row Summary */}
                        <td className="p-2 text-center bg-slate-50">
                          <span className="font-['Mali'] text-xs font-bold text-[#2D3748]">
                            {row.totalInSlot} คน
                          </span>
                          <p className="text-[9px] text-[#718096]">
                            เฉลี่ย {(row.totalInSlot / targetSundays.length).toFixed(1)}/อาทิตย์
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Footer Total */}
                  <tfoot>
                    <tr className="border-t-2 border-[#D6EEFC] bg-[#F0F8FF] font-bold text-xs text-[#2B6CB0]">
                      <td className="p-3">รวมผู้เช็คอินทั้งวัน</td>
                      {targetSundays.map((sun) => {
                        const dayTotal = matrix.reduce(
                          (sum, r) => sum + (r.sundayCols.find((c) => c.sunday.date === sun.date)?.count || 0),
                          0
                        );
                        return (
                          <td key={sun.date} className="p-3 text-center">
                            <span className="font-['Mali'] text-sm font-bold text-[#1E3A8A]">
                              {dayTotal} คน
                            </span>
                          </td>
                        );
                      })}
                      <td className="p-3 text-center bg-blue-100/60 font-['Mali'] text-sm text-[#1E3A8A]">
                        {totalCheckInsIn4Sundays} คน
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            /* 28-Day Daily Matrix Mode */
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#D6EEFC] bg-white p-4 shadow-xs">
                <h3 className="font-['Mali'] text-sm font-bold text-[#2D3748] mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#3A86FF]" />
                  ตารางความหนาแน่นรายวัน 4 สัปดาห์ (28 วันย้อนหลัง)
                </h3>

                <div className="space-y-3">
                  {dailyMatrix.map((wk) => (
                    <div key={wk.weekLabel} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#4A5568]">
                        <span>{wk.weekLabel}</span>
                        <span className="text-[11px] text-[#718096]">
                          รวม {wk.days.reduce((s, d) => s + d.count, 0)} คน
                        </span>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {wk.days.map((day) => {
                          const styling = getCellColor(day.count, maxDailyCount);
                          const isSelected = selectedCell?.dateLabel === day.dateStr;

                          return (
                            <button
                              key={day.dateStr}
                              type="button"
                              onClick={() =>
                                setSelectedCell({
                                  dateLabel: day.dateStr,
                                  slotLabel: day.isSunday ? 'วันอาทิตย์ (รอบนมัสการ)' : 'วันทำการ / แคร์',
                                  records: day.records,
                                })
                              }
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition text-center cursor-pointer ${
                                styling.bg
                              } ${styling.border} ${
                                day.isSunday ? 'ring-1 ring-blue-300 ring-offset-1' : ''
                              } ${isSelected ? 'ring-2 ring-[#3A86FF] shadow-md scale-102' : ''}`}
                            >
                              <span className="text-[10px] text-gray-500 font-medium">
                                {day.dayName} {day.dayNum}
                              </span>
                              <span className="font-['Mali'] text-xs sm:text-sm font-bold mt-0.5">
                                {day.count > 0 ? `${day.count}` : '-'}
                              </span>
                              {day.isSunday && (
                                <span className="text-[9px] text-blue-600 font-semibold mt-0.5">
                                  โบสถ์ ⛪
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Drill-down: Member List for Selected Cell */}
          {selectedCell && (
            <div className="mt-4 rounded-2xl border-2 border-[#7EC8E3] bg-white p-4 shadow-md animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3A86FF] text-white">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-['Mali'] text-sm font-bold text-[#1A202C]">
                      รายชื่อผู้มาเช็คอิน: {selectedCell.slotLabel} ({selectedCell.dateLabel})
                    </h4>
                    <p className="text-[11px] text-[#718096]">
                      จำนวน {selectedCell.records.length} คน
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="rounded-full bg-slate-100 p-1 text-slate-500 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selectedCell.records.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#718096]">
                  <p>ไม่มีข้อมูลการเช็คอินในช่วงเวลานี้</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {selectedCell.records.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-2 hover:bg-slate-100 transition"
                    >
                      {/* Avatar */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7EC8E3] text-xs font-bold text-white shadow-2xs overflow-hidden">
                        {rec.avatarUrl ? (
                          <img
                            src={rec.avatarUrl}
                            alt={rec.nickname}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          rec.nickname.slice(0, 2)
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-['Mali'] text-xs font-bold text-[#2D3748] truncate">
                            {rec.nickname}
                          </p>
                          <span className="text-[10px] font-semibold text-[#3A86FF] flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {rec.checkInTime}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#718096] truncate">{rec.memberName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="rounded-md bg-white border border-slate-200 px-1.5 py-0.2 text-[9px] text-[#4A5568]">
                            {rec.role || 'สมาชิก'}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {rec.temperature}°C
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 sm:px-6 shrink-0">
          <p className="text-[11px] text-[#718096] flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            ข้อมูลประมวลผลจาก Attendance History เพื่อช่วยวางแผนงานอภิบาลและต้อนรับ
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-[#4A5568] hover:bg-slate-100 transition shadow-2xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
