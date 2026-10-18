import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Keyboard, Check, Layers } from 'lucide-react';

const THAI_MONTHS = [
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

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export interface DatePickerFieldProps {
  value: string; // 'YYYY-MM-DD', '', or 'ALL'
  onChange: (dateStr: string) => void;
  maxDate?: string;
  placeholder?: string;
  allowAllOption?: boolean;
  allOptionLabel?: string;
  recordCountByDate?: Record<string, number>;
  variant?: 'default' | 'amber' | 'compact';
  required?: boolean;
}

export function formatThaiDisplayDate(dateStr: string, allOptionLabel?: string): string {
  if (!dateStr) return '';
  if (dateStr === 'ALL') return allOptionLabel || 'ดูทุกวันที่บันทึกไว้';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  return `${d} ${THAI_MONTHS_SHORT[m - 1] || ''} ${y + 543}`;
}

/**
 * Parses manual user input into 'YYYY-MM-DD' if valid.
 * Supports:
 * - DD/MM/YYYY or DD-MM-YYYY (both Buddhist Year >= 2400 and Christian Year)
 * - YYYY-MM-DD or YYYY/MM/DD
 */
export function parseManualDateInput(raw: string): string | null {
  const cleaned = raw.trim();
  if (!cleaned) return '';

  // Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    let y = parseInt(dmyMatch[3], 10);
    if (y >= 2400) y -= 543; // Convert พ.ศ. to ค.ศ.
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = cleaned.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    let y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (y >= 2400) y -= 543;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return null;
}

export function formatToDMY(dateStr: string): string {
  if (!dateStr || dateStr === 'ALL') return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${parseInt(y, 10) + 543}`;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  value,
  onChange,
  maxDate,
  placeholder = 'วว/ดด/ปปปป หรือเลือกจากปฏิทิน',
  allowAllOption = false,
  allOptionLabel = 'ดูทุกวันที่บันทึกไว้',
  recordCountByDate,
  variant = 'default',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [manualText, setManualText] = useState('');
  const [manualError, setManualError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Determine initial calendar month/year from current value or today
  const initialDateObj = useMemo(() => {
    if (value && value !== 'ALL' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        return { year: y, month: m - 1 };
      }
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, [value]);

  const [viewYear, setViewYear] = useState(initialDateObj.year);
  const [viewMonth, setViewMonth] = useState(initialDateObj.month);

  useEffect(() => {
    if (value && value !== 'ALL' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
      setManualText(formatToDMY(value));
      setManualError(false);
    } else if (!value) {
      setManualText('');
      setManualError(false);
    }
  }, [value]);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsTypingMode(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const daysInMonth = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ day: number | null; dateStr: string }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null, dateStr: '' });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${String(viewYear).padStart(4, '0')}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleManualCommit = (raw: string) => {
    if (!raw.trim()) {
      if (!required) {
        onChange('');
        setManualError(false);
      }
      return;
    }
    const parsed = parseManualDateInput(raw);
    if (parsed) {
      if (maxDate && parsed > maxDate) {
        onChange(maxDate);
      } else {
        onChange(parsed);
      }
      setManualError(false);
    } else {
      setManualError(true);
    }
  };

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear + 1; y >= currentYear - 100; y--) {
      years.push(y);
    }
    return years;
  }, []);

  const borderStyle =
    variant === 'amber'
      ? 'border-2 border-amber-300 bg-white text-slate-800 focus-within:border-amber-500'
      : variant === 'compact'
      ? 'border border-[#BEE3F8] bg-white text-[#2B6CB0] focus-within:border-[#3A86FF]'
      : 'border border-[#CBD5E1] bg-white text-[#2D3748] focus-within:border-[#3A86FF]';

  return (
    <div ref={containerRef} className="relative w-full font-kanit">
      {/* Main Control Bar: Click to open Calendar OR type manually */}
      <div
        className={`flex items-center justify-between gap-1 rounded-xl px-2.5 ${
          variant === 'compact' ? 'py-1' : 'py-1.5'
        } shadow-2xs transition-all ${borderStyle}`}
      >
        {isTypingMode ? (
          <input
            ref={inputRef}
            type="text"
            value={manualText}
            onChange={(e) => {
              setManualText(e.target.value);
              const parsed = parseManualDateInput(e.target.value);
              if (parsed) {
                setManualError(false);
                onChange(maxDate && parsed > maxDate ? maxDate : parsed);
              }
            }}
            onBlur={() => {
              handleManualCommit(manualText);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleManualCommit(manualText);
                if (!manualError) {
                  setIsTypingMode(false);
                  setIsOpen(false);
                }
              } else if (e.key === 'Escape') {
                setIsTypingMode(false);
              }
            }}
            placeholder="พิมพ์ เช่น 25/09/2569 หรือ 2026-09-25"
            className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex-1 min-w-0 flex items-center gap-1.5 text-left cursor-pointer py-0.5"
            title="คลิกเพื่อเปิดปฏิทินเลือกวันที่"
          >
            <Calendar className="h-3.5 w-3.5 text-[#3A86FF] shrink-0" />
            <span
              className={`truncate text-xs ${
                value ? 'font-bold text-slate-800' : 'text-slate-400 font-normal'
              }`}
            >
              {value ? formatThaiDisplayDate(value, allOptionLabel) : placeholder}
            </span>
          </button>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {/* Toggle Manual Typing Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextMode = !isTypingMode;
              setIsTypingMode(nextMode);
              setIsOpen(true);
              if (nextMode) {
                setManualText(value && value !== 'ALL' ? formatToDMY(value) : '');
                setTimeout(() => inputRef.current?.focus(), 20);
              }
            }}
            className={`flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold transition cursor-pointer ${
              isTypingMode
                ? 'bg-[#3A86FF] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-[#2B6CB0]'
            }`}
            title="พิมพ์วันที่ด้วยตัวเอง (เช่น 25/09/2569)"
          >
            <Keyboard className="h-3 w-3" />
            <span className="hidden sm:inline">พิมพ์เอง</span>
          </button>

          {/* Toggle Calendar Popover Button */}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={`flex items-center justify-center rounded-lg p-1 text-xs transition cursor-pointer ${
              isOpen
                ? 'bg-sky-100 text-[#2B6CB0]'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title="เปิดปฏิทิน"
          >
            <Calendar className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Calendar Popover */}
      {isOpen && (
        <div className="absolute right-0 left-0 sm:left-auto sm:w-[300px] z-50 mt-1.5 rounded-2xl border-2 border-[#BEE3F8] bg-white p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Manual Typing Input inside Popover for effortless access */}
          <div className="mb-2.5 pb-2 border-b border-slate-100">
            <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
              ⌨️ พิมพ์วันที่เอง (วว/ดด/ปปปป หรือ ปี-เดือน-วัน):
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={manualText}
                onChange={(e) => {
                  setManualText(e.target.value);
                  const parsed = parseManualDateInput(e.target.value);
                  if (parsed) {
                    setManualError(false);
                    onChange(maxDate && parsed > maxDate ? maxDate : parsed);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualCommit(manualText);
                    if (!manualError) setIsOpen(false);
                  }
                }}
                placeholder="เช่น 25/09/2569"
                className={`flex-1 min-w-0 rounded-xl border px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none ${
                  manualError
                    ? 'border-red-400 bg-red-50/40'
                    : 'border-slate-200 bg-slate-50 focus:border-[#3A86FF] focus:bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  handleManualCommit(manualText);
                  if (parseManualDateInput(manualText)) {
                    setIsOpen(false);
                    setIsTypingMode(false);
                  }
                }}
                className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-[#3A86FF] hover:bg-[#2563EB] px-2.5 py-1.5 text-[11px] font-bold text-white cursor-pointer transition"
              >
                <Check className="h-3 w-3" />
                <span>ตกลง</span>
              </button>
            </div>
            {manualError && (
              <p className="mt-1 text-[10px] text-red-500">
                รูปแบบไม่ถูกต้อง กรุณาพิมพ์เช่น 25/09/2569 หรือ 2026-09-25
              </p>
            )}
          </div>

          {/* Optional "View All Recorded Dates" Button */}
          {allowAllOption && (
            <button
              type="button"
              onClick={() => {
                onChange('ALL');
                setIsOpen(false);
                setIsTypingMode(false);
              }}
              className={`mb-2.5 w-full flex items-center justify-between rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                value === 'ALL'
                  ? 'border-[#3A86FF] bg-[#EBF8FF] text-[#2B6CB0]'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-sky-50'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-[#3A86FF]" />
                <span>{allOptionLabel}</span>
              </span>
              {value === 'ALL' && <Check className="h-3.5 w-3.5 text-[#3A86FF]" />}
            </button>
          )}

          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between gap-1 mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-sky-50 hover:text-[#3A86FF] transition cursor-pointer shrink-0"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1 min-w-0">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold text-slate-800 focus:border-[#3A86FF] focus:outline-none cursor-pointer"
              >
                {THAI_MONTHS.map((mName, idx) => (
                  <option key={mName} value={idx}>
                    {mName}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold text-slate-800 focus:border-[#3A86FF] focus:outline-none cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {y + 543} ({y})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-sky-50 hover:text-[#3A86FF] transition cursor-pointer shrink-0"
              title="เดือนถัดไป"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS.map((w, i) => (
              <span
                key={w}
                className={`text-[10px] font-bold ${
                  i === 0 ? 'text-red-500' : 'text-slate-400'
                }`}
              >
                {w}
              </span>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((cell, idx) => {
              if (!cell.day) {
                return <div key={`empty-${idx}`} className="h-8" />;
              }
              const isSelected = value === cell.dateStr;
              const isToday = todayStr === cell.dateStr;
              const isDisabled = Boolean(maxDate && cell.dateStr > maxDate);
              const recordCount = recordCountByDate?.[cell.dateStr] || 0;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(cell.dateStr);
                    setIsOpen(false);
                    setIsTypingMode(false);
                  }}
                  className={`relative flex flex-col items-center justify-center h-8 rounded-lg text-xs transition-all cursor-pointer select-none ${
                    isDisabled
                      ? 'opacity-30 cursor-not-allowed text-slate-400'
                      : isSelected
                      ? 'bg-[#3A86FF] text-white font-bold shadow-xs scale-105'
                      : isToday
                      ? 'border border-[#3A86FF] bg-sky-50 text-[#2B6CB0] font-bold'
                      : recordCount > 0
                      ? 'bg-emerald-50 text-emerald-800 font-semibold hover:bg-emerald-100'
                      : 'text-slate-700 hover:bg-sky-50 hover:text-[#2B6CB0]'
                  }`}
                  title={
                    recordCount > 0
                      ? `${formatThaiDisplayDate(cell.dateStr)} (เช็คอิน ${recordCount} คน)`
                      : formatThaiDisplayDate(cell.dateStr)
                  }
                >
                  <span className="leading-none">{cell.day}</span>
                  {recordCount > 0 && (
                    <span
                      className={`mt-0.5 h-1 w-1 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Bottom Actions */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => {
                onChange(todayStr);
                setIsOpen(false);
                setIsTypingMode(false);
              }}
              className="font-bold text-[#3A86FF] hover:underline cursor-pointer"
            >
              เลือกวันนี้ ({formatThaiDisplayDate(todayStr)})
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsTypingMode(false);
              }}
              className="text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
            >
              ปิดปฏิทิน
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
