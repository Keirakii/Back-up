import React, { useState } from 'react';
import {
  Sparkles,
  Delete,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
  Check,
  Flame,
} from 'lucide-react';
import {
  MedicalTempStatus,
  MEDICAL_TEMP_PRESETS,
  CLINICAL_TEMP_GUIDELINES,
  getMedicalTempStatus,
} from '../utils/temperature';

interface TemperatureNumpadProps {
  temperature: string;
  onTemperatureChange: (value: string) => void;
  onStepTemp: (delta: number) => void;
  medicalStatus: MedicalTempStatus;
  soundEnabled: boolean;
  onTriggerWarning?: () => void;
  showClinicalGuide: boolean;
  onToggleClinicalGuide: () => void;
  isNumpadExpanded: boolean;
  onToggleNumpadExpanded: () => void;
  isQuickModeActive?: boolean;
}

export const TemperatureNumpad: React.FC<TemperatureNumpadProps> = ({
  temperature,
  onTemperatureChange,
  onStepTemp,
  medicalStatus,
  soundEnabled,
  onTriggerWarning,
  showClinicalGuide,
  onToggleClinicalGuide,
  isNumpadExpanded,
  onToggleNumpadExpanded,
  isQuickModeActive = false,
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const handleKeyPressFeedback = (keyLabel: string) => {
    setActiveKey(keyLabel);
    setTimeout(() => {
      setActiveKey(null);
    }, 150);
  };

  // High-efficiency typing logic with auto-decimal insertion
  const handleKeypadPress = (key: string) => {
    handleKeyPressFeedback(key);

    if (key === 'CLEAR') {
      onTemperatureChange('');
      return;
    }

    if (key === 'BACKSPACE') {
      if (!temperature) return;
      // If ends with dot, remove dot
      const next = temperature.slice(0, -1);
      onTemperatureChange(next);
      return;
    }

    if (key === 'NORMAL_36_5') {
      onTemperatureChange('36.5');
      return;
    }

    if (key === '.') {
      if (!temperature) {
        onTemperatureChange('0.');
      } else if (!temperature.includes('.')) {
        onTemperatureChange(`${temperature}.`);
      }
      return;
    }

    // Number digits 0-9
    if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
      // If current value is the default "36.5" and user is typing a new number starting with 3, 2, 4, etc.
      // (except pressing 5 directly), start fresh so they don't have to press clear first!
      if (temperature === '36.5' && key !== '5') {
        onTemperatureChange(key);
        return;
      }

      if (!temperature) {
        onTemperatureChange(key);
        return;
      }

      // If already has decimal point
      if (temperature.includes('.')) {
        const [integerPart, decimalPart] = temperature.split('.');
        if (decimalPart && decimalPart.length >= 1) {
          // If already has 1 decimal digit (e.g. 36.5), replace decimal digit with the new one
          onTemperatureChange(`${integerPart}.${key}`);
          return;
        }
        onTemperatureChange(`${temperature}${key}`);
        return;
      }

      // If no decimal point yet
      if (temperature.length === 1) {
        // When typing second digit (e.g., '3' then '6' or '7'), automatically append '.'
        // This allows entering 36.5 in just 3 rapid taps: [3] -> [6] -> [5]!
        onTemperatureChange(`${temperature}${key}.`);
        return;
      }

      if (temperature.length >= 2) {
        onTemperatureChange(`${temperature}.${key}`);
        return;
      }

      onTemperatureChange(`${temperature}${key}`);
    }
  };

  const tempVal = parseFloat(temperature) || 0;

  return (
    <div className={`rounded-2xl transition-all duration-300 ${medicalStatus.containerClass}`}>
      {/* Temperature Header: Title, Clinical Guide Toggle, Status Badge, Numpad Toggle */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label
            htmlFor="temperature"
            className={`text-[15px] font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
              medicalStatus.isAlert ? 'text-red-600' : 'text-[#2D3748]'
            }`}
          >
            <span>🌡️ อุณหภูมิร่างกาย</span>
          </label>

          {/* Expand / Collapse Numpad Button */}
          <button
            type="button"
            onClick={onToggleNumpadExpanded}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition cursor-pointer active:scale-95 ${
              isNumpadExpanded
                ? 'bg-sky-500 text-white border-sky-600 shadow-2xs'
                : 'bg-white text-sky-700 border-sky-300 hover:bg-sky-50'
            }`}
            title="เปิด/ปิด แป้นพิมพ์ตัวเลข (Number Pad) สำหรับจิ้มอุณหภูมิสะดวก"
          >
            <span>🔢 แป้นตัวเลข</span>
            {isNumpadExpanded ? (
              <ChevronUp className="h-3 w-3 stroke-[2.5]" />
            ) : (
              <ChevronDown className="h-3 w-3 stroke-[2.5]" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={onToggleClinicalGuide}
            className={`text-[11px] font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition cursor-pointer ${
              showClinicalGuide
                ? 'bg-[#3A86FF] text-white border-[#3A86FF] shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:bg-sky-50 hover:text-[#2B6CB0]'
            }`}
            title="คลิกเพื่อเปิด/ปิดเกณฑ์วัดอุณหภูมิทางการแพทย์"
          >
            <Info className="h-3 w-3 text-sky-500 shrink-0" />
            <span>เกณฑ์การแพทย์</span>
          </button>

          {/* Status Badge */}
          <span
            className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition-all inline-flex items-center gap-1 shrink-0 ${medicalStatus.badgeClass}`}
          >
            {medicalStatus.isAlert && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            )}
            <span>{medicalStatus.badgeText}</span>
          </span>
        </div>
      </div>

      {/* Main Temperature Display with Steppers */}
      <div
        className={`flex items-center justify-between bg-white rounded-2xl border-2 shadow-2xs p-1.5 mb-2.5 transition-all focus-within:ring-4 focus-within:ring-[#3A86FF]/15 ${medicalStatus.inputBorderClass}`}
      >
        <button
          type="button"
          onClick={() => onStepTemp(-0.1)}
          className="w-13 sm:w-16 h-12 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-sky-50 hover:text-[#3A86FF] active:scale-95 text-slate-700 font-bold text-2xl transition cursor-pointer select-none shrink-0"
          title="ลดอุณหภูมิ 0.1°C"
        >
          −
        </button>

        <div className="flex-1 flex items-center justify-center gap-1 px-2">
          <input
            type="number"
            id="temperature"
            inputMode="decimal"
            step="0.1"
            min="25.0"
            max="46.0"
            placeholder="36.5"
            value={temperature}
            onFocus={(e) => e.target.select()}
            onChange={(e) => onTemperatureChange(e.target.value)}
            required
            className="w-28 sm:w-32 text-center font-['Mali'] text-[28px] sm:text-[32px] font-extrabold tracking-tight text-slate-800 bg-transparent focus:outline-none tabular-nums leading-none"
          />
          <span className="text-lg sm:text-xl font-bold text-slate-400 select-none">°C</span>
        </div>

        <button
          type="button"
          onClick={() => onStepTemp(0.1)}
          className="w-13 sm:w-16 h-12 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-sky-50 hover:text-[#3A86FF] active:scale-95 text-slate-700 font-bold text-2xl transition cursor-pointer select-none shrink-0"
          title="เพิ่มอุณหภูมิ 0.1°C"
        >
          +
        </button>
      </div>

      {/* Medical Warning & Advisory Card */}
      {medicalStatus.isWarning && (
        <div
          className={`mb-2.5 flex items-start gap-2.5 rounded-xl border p-3 text-xs shadow-xs animate-in fade-in slide-in-from-top-1 duration-200 ${medicalStatus.cardClass}`}
        >
          <div
            className={`rounded-full p-1.5 shrink-0 mt-0.5 flex items-center justify-center ${medicalStatus.iconBgClass}`}
          >
            {medicalStatus.category === 'hypothermia' ? (
              <span className="text-sm leading-none">🥶</span>
            ) : medicalStatus.category === 'subnormal' ? (
              <span className="text-sm leading-none">❄️</span>
            ) : (
              <AlertTriangle className="h-4 w-4 animate-bounce text-inherit" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <strong className="font-bold text-[13px] leading-tight">
                {medicalStatus.summary}
              </strong>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed opacity-95">
              <strong>คำแนะนำทางการแพทย์:</strong> {medicalStatus.recommendation}
            </p>
          </div>
          {soundEnabled && medicalStatus.isAlert && onTriggerWarning && (
            <button
              type="button"
              onClick={onTriggerWarning}
              className="shrink-0 rounded-lg border border-slate-300 bg-white/95 px-2 py-1 text-[11px] font-medium hover:bg-white shadow-2xs text-slate-800 cursor-pointer"
              title="กดเพื่อส่งสัญญาณเสียงเตือนอีกครั้ง"
            >
              🔊 เตือนซ้ำ
            </button>
          )}
        </div>
      )}

      {/* 6 Quick One-Touch Clinical Temperature Presets */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-2.5">
        {MEDICAL_TEMP_PRESETS.map((preset) => {
          const isSelected = Math.abs(tempVal - preset.temp) < 0.05;
          return (
            <button
              key={preset.temp}
              type="button"
              onClick={() => onTemperatureChange(preset.temp.toFixed(1))}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border text-center transition-all active:scale-95 cursor-pointer shadow-2xs ${
                isSelected
                  ? 'ring-2 ring-[#3A86FF] ring-offset-1 font-bold shadow-xs scale-[1.02] bg-white border-[#3A86FF]'
                  : 'opacity-95 hover:opacity-100 hover:shadow-xs'
              } ${preset.badgeClass}`}
              title={`${preset.label} - ${preset.note}`}
            >
              <span className="font-['Mali'] text-xs font-black leading-tight tabular-nums">
                {preset.label}
              </span>
              <span className="text-[10px] mt-0.5 leading-tight truncate max-w-full font-medium">
                {preset.shortNote || preset.note}
              </span>
            </button>
          );
        })}
      </div>

      {/* Touchscreen-Friendly Number Pad (Numpad) */}
      {isNumpadExpanded && (
        <div
          id="temperature-numpad-container"
          className="rounded-2xl border-2 border-sky-100 bg-gradient-to-b from-slate-50 to-white p-2.5 shadow-sm mb-2.5 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <span>🔢 แป้นพิมพ์ตัวเลขอัจฉริยะ (Smart Number Pad)</span>
              <span className="text-[10px] font-normal text-slate-400">
                (จิ้ม 3-6-5 เพื่อใส่ 36.5°C อัตโนมัติ)
              </span>
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleKeypadPress('NORMAL_36_5')}
                className="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10.5px] font-bold border border-emerald-300 transition active:scale-95 cursor-pointer"
                title="ตั้งค่ากลับเป็น 36.5°C ทันที"
              >
                ✨ 36.5 ปกติ
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('CLEAR')}
                className="px-2 py-0.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-[10.5px] font-bold transition active:scale-95 cursor-pointer"
                title="ล้างค่าเพื่อเริ่มพิมพ์ใหม่"
              >
                ล้าง (C)
              </button>
            </div>
          </div>

          {/* Keypad Grid: 3 columns x 4 rows + Quick Action Column */}
          <div className="grid grid-cols-4 gap-1.5">
            {/* Row 1 */}
            {['7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className={`h-11 sm:h-12 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-800 font-['Mali'] text-xl font-bold shadow-2xs active:scale-95 transition flex items-center justify-center cursor-pointer ${
                  activeKey === digit ? 'ring-2 ring-sky-400 bg-sky-100' : ''
                }`}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeypadPress('BACKSPACE')}
              className="h-11 sm:h-12 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold shadow-2xs active:scale-95 transition flex items-center justify-center cursor-pointer"
              title="ลบตัวเลขตัวล่าสุด"
            >
              <Delete className="h-5 w-5" />
            </button>

            {/* Row 2 */}
            {['4', '5', '6'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className={`h-11 sm:h-12 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-800 font-['Mali'] text-xl font-bold shadow-2xs active:scale-95 transition flex items-center justify-center cursor-pointer ${
                  activeKey === digit ? 'ring-2 ring-sky-400 bg-sky-100' : ''
                }`}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onStepTemp(-0.5)}
              className="h-11 sm:h-12 rounded-xl bg-slate-100 border border-slate-200 hover:bg-sky-50 text-slate-700 text-xs font-bold shadow-2xs active:scale-95 transition flex items-center justify-center cursor-pointer"
              title="ลดลงทีละ 0.5°C"
            >
              −0.5
            </button>

            {/* Row 3 */}
            {['1', '2', '3'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className={`h-11 sm:h-12 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-800 font-['Mali'] text-xl font-bold shadow-2xs active:scale-95 transition flex items-center justify-center cursor-pointer ${
                  activeKey === digit ? 'ring-2 ring-sky-400 bg-sky-100' : ''
                }`}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onStepTemp(0.5)}
              className="h-11 sm:h-12 rounded-xl bg-slate-100 border border-slate-200 hover:bg-sky-50 text-slate-700 text-xs font-bold shadow-2xs active:scale-95 transition flex items-center justify-center cursor-pointer"
              title="เพิ่มขึ้นทีละ 0.5°C"
            >
              +0.5
            </button>

            {/* Row 4: . (dot), 0, 36.5, Quick Check-in Button */}
            <button
              type="button"
              onClick={() => handleKeypadPress('.')}
              className="h-11 sm:h-12 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-800 font-['Mali'] text-2xl font-bold shadow-2xs active:scale-95 transition flex items-center justify-center cursor-pointer"
              title="ใส่จุดทศนิยม"
            >
              .
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="h-11 sm:h-12 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-800 font-['Mali'] text-xl font-bold shadow-2xs active:scale-95 transition flex items-center justify-center cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('NORMAL_36_5')}
              className="h-11 sm:h-12 rounded-xl bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 font-['Mali'] text-xs font-extrabold shadow-2xs active:scale-95 transition flex flex-col items-center justify-center cursor-pointer leading-tight"
              title="ค่าปกติ 36.5°C"
            >
              <span>36.5</span>
              <span className="text-[9px] font-normal text-emerald-600">ปกติ</span>
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('CLEAR')}
              className="h-11 sm:h-12 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 font-bold text-xs shadow-2xs active:scale-95 transition flex items-center justify-center cursor-pointer"
              title="ล้างทั้งหมด"
            >
              C
            </button>
          </div>
        </div>
      )}

      {/* Expandable Clinical Guidelines Table */}
      {showClinicalGuide && (
        <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50/95 p-3 text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
            <span className="font-bold text-[#2D3748] flex items-center gap-1.5">
              📋 เกณฑ์อุณหภูมิร่างกายทางการแพทย์ (WHO / กรมการแพทย์)
            </span>
            <button
              type="button"
              onClick={onToggleClinicalGuide}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
            {CLINICAL_TEMP_GUIDELINES.map((guide) => (
              <div
                key={guide.range}
                className="flex items-start gap-2 rounded-lg border bg-white p-2 text-[11px]"
              >
                <span
                  className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] shrink-0 border ${guide.color}`}
                >
                  {guide.range}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <strong className="text-slate-800">{guide.name}</strong>
                    <span className="text-[10px] text-slate-500 font-medium">({guide.status})</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">
                    {guide.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
