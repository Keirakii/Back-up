export type MedicalTempCategory =
  | 'hypothermia'
  | 'subnormal'
  | 'normal'
  | 'low_fever'
  | 'high_fever'
  | 'severe_fever';

export interface MedicalTempStatus {
  category: MedicalTempCategory;
  title: string;
  badgeText: string;
  badgeClass: string;
  containerClass: string;
  inputBorderClass: string;
  cardClass: string;
  iconBgClass: string;
  iconColorClass: string;
  summary: string;
  detail: string;
  recommendation: string;
  isAlert: boolean; // triggers haptic/audio alert (fever or hypothermia)
  isWarning: boolean; // shows warning/caution banner
}

export interface TempPreset {
  temp: number;
  label: string;
  note: string;
  shortNote?: string;
  category: MedicalTempCategory;
  badgeClass: string;
}

/**
 * 6 Presets spanning 35.0°C to 38.2°C, spaced out cleanly without visual clutter.
 */
export const MEDICAL_TEMP_PRESETS: TempPreset[] = [
  {
    temp: 35.0,
    label: '35.0°C',
    note: 'ตัวเย็น/Hypothermia 🥶',
    shortNote: 'ตัวเย็น 🥶',
    category: 'hypothermia',
    badgeClass: 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
  },
  {
    temp: 36.0,
    label: '36.0°C',
    note: 'ปกติช่วงต่ำ ❄️',
    shortNote: 'ปกติช่วงต่ำ ❄️',
    category: 'normal',
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100',
  },
  {
    temp: 36.5,
    label: '36.5°C',
    note: 'ค่าปกติสมบูรณ์ ✨',
    shortNote: 'ปกติสมบูรณ์ ✨',
    category: 'normal',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  },
  {
    temp: 37.2,
    label: '37.2°C',
    note: 'ปกติช่วงอุ่น',
    shortNote: 'ปกติช่วงอุ่น 🌤️',
    category: 'normal',
    badgeClass: 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100',
  },
  {
    temp: 37.6,
    label: '37.6°C',
    note: 'มีไข้ต่ำ / สังเกต ⚠️',
    shortNote: 'มีไข้ต่ำ ⚠️',
    category: 'low_fever',
    badgeClass: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
  },
  {
    temp: 38.2,
    label: '38.2°C',
    note: 'มีไข้สูง / พบแพทย์ 🚨',
    shortNote: 'มีไข้สูง 🚨',
    category: 'high_fever',
    badgeClass: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
  },
];

/**
 * Clinical Reference Guidelines for body temperature (Celsius)
 * Based on WHO / Thai Ministry of Public Health standards.
 */
export const CLINICAL_TEMP_GUIDELINES = [
  {
    range: '< 35.0°C',
    name: 'ภาวะอุณหภูมิกายต่ำ (Hypothermia)',
    status: 'อันตราย',
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    description: 'ร่างกายสูญเสียความร้อนรวดเร็ว ควรรีบสร้างความอบอุ่น ห่มผ้า จิบน้ำอุ่น หากซึมควรพบแพทย์',
  },
  {
    range: '35.0 - 35.9°C',
    name: 'อุณหภูมิต่ำกว่าเกณฑ์ปกติ (Subnormal)',
    status: 'เฝ้าระวัง',
    color: 'text-sky-700 bg-sky-50 border-sky-200',
    description: 'พบบ่อยหลังโดนแอร์เย็นจัดหรือผิวหน้าผากเย็น นั่งพักในอุณหภูมิปกติ จิบน้ำอุ่น แล้ววัดซ้ำ',
  },
  {
    range: '36.0 - 37.4°C',
    name: 'อุณหภูมิปกติ (Normal Range)',
    status: 'ปกติสมบูรณ์',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    description: 'ร่างกายแข็งแรงสมบูรณ์ ไม่มีไข้ พร้อมเข้าร่วมกิจกรรมรอบนมัสการตามปกติ',
  },
  {
    range: '37.5 - 38.0°C',
    name: 'มีไข้ต่ำ / สังเกตอาการ (Low-grade Fever)',
    status: 'สังเกตอาการ',
    color: 'text-amber-800 bg-amber-50 border-amber-300',
    description: 'เริ่มมีไข้ต่ำ แนะนำสวมหน้ากากอนามัย นั่งในจุดที่มีอากาศถ่ายเทสะดวก จิบน้ำมากๆ',
  },
  {
    range: '38.1 - 38.9°C',
    name: 'มีไข้สูง (High Fever)',
    status: 'ควรพบแพทย์',
    color: 'text-rose-700 bg-rose-50 border-rose-300',
    description: 'มีไข้สูงชัดเจน ควรเช็ดตัวลดไข้ รับประทานยาลดไข้ตามคำแนะนำ และควรพบแพทย์',
  },
  {
    range: '≥ 39.0°C',
    name: 'ไข้สูงมาก / ภาวะฉุกเฉิน (Hyperpyrexia)',
    status: 'พบแพทย์ด่วน',
    color: 'text-red-800 bg-red-100 border-red-400',
    description: 'ไข้สูงมากอันตราย เสี่ยงต่อภาวะชักหรือแทรกซ้อน ควรรีบนำส่งสถานพยาบาลทันที',
  },
];

/**
 * Returns medical evaluation, colors, messages, and actionable recommendations.
 */
export function getMedicalTempStatus(temp: number): MedicalTempStatus {
  // 1. Hypothermia (< 35.0°C)
  if (temp < 35.0) {
    return {
      category: 'hypothermia',
      title: 'ภาวะอุณหภูมิกายต่ำ (Hypothermia)',
      badgeText: '🥶 อุณหภูมิต่ำวิกฤต',
      badgeClass: 'bg-indigo-600 text-white shadow-2xs font-semibold',
      containerClass: 'animate-haptic-vibrate border border-indigo-300 bg-indigo-50/40 p-3.5 shadow-2xs',
      inputBorderClass: 'border-indigo-400 text-indigo-900 focus:border-indigo-600 focus:shadow-[0_0_10px_rgba(99,102,241,0.3)]',
      cardClass: 'border-indigo-300 bg-indigo-50/95 text-indigo-950',
      iconBgClass: 'bg-indigo-100 text-indigo-700',
      iconColorClass: 'text-indigo-600',
      summary: `อุณหภูมิ ${temp.toFixed(1)}°C ต่ำกว่า 35.0°C เข้าข่ายภาวะตัวเย็นเกิน (Hypothermia)`,
      detail: 'ร่างกายสูญเสียความร้อนเร็วกว่าที่สร้างได้ อาจทำให้ระบบหัวใจและการไหลเวียนเลือดทำงานช้าลง',
      recommendation: 'ควรรีบพาเข้าที่อบอุ่น ห่มผ้าหรือสวมเสื้อกันหนาว จิบน้ำอุ่น ไม่ควรเปิดแอร์เป่าตรง หากมีอาการตัวสั่นรุนแรง ซึม สับสน ควรรีบพบแพทย์ทันที',
      isAlert: true,
      isWarning: true,
    };
  }

  // 2. Subnormal (35.0 - 35.9°C)
  if (temp >= 35.0 && temp < 36.0) {
    return {
      category: 'subnormal',
      title: 'อุณหภูมิต่ำกว่าเกณฑ์ปกติ (Subnormal Temperature)',
      badgeText: '❄️ ต่ำกว่าปกติ',
      badgeClass: 'bg-sky-100 text-sky-800 border border-sky-300 font-semibold',
      containerClass: 'border border-sky-200 bg-sky-50/40 p-3.5 rounded-2xl',
      inputBorderClass: 'border-sky-300 text-sky-900 focus:border-sky-500 focus:shadow-[0_0_8px_rgba(56,189,248,0.25)]',
      cardClass: 'border-sky-200 bg-sky-50/90 text-sky-950',
      iconBgClass: 'bg-sky-100 text-sky-700',
      iconColorClass: 'text-sky-600',
      summary: `อุณหภูมิ ${temp.toFixed(1)}°C ต่ำกว่าเกณฑ์ปกติเล็กน้อย`,
      detail: 'มักพบเมื่อเดินผ่านเครื่องปรับอากาศเย็นจัด หรือผิวหน้าผากภายนอกเย็นขณะสแกน',
      recommendation: 'แนะนำให้นั่งพักในอุณหภูมิห้องปกติ ดื่มน้ำอุ่นสักครู่ แล้วตรวจวัดซ้ำอีกครั้ง',
      isAlert: false,
      isWarning: true,
    };
  }

  // 3. Normal (36.0 - 37.4°C)
  if (temp >= 36.0 && temp <= 37.4) {
    return {
      category: 'normal',
      title: 'อุณหภูมิปกติ (Normal Body Temperature)',
      badgeText: '✨ สบายดีปกติ',
      badgeClass: 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200',
      containerClass: 'border border-slate-200/90 bg-slate-50/50 p-3.5',
      inputBorderClass: 'border-[#D6EEFC] text-[#2D3748] focus:border-[#3A86FF] focus:shadow-[0_0_10px_rgba(58,134,255,0.2)]',
      cardClass: 'border-emerald-200 bg-emerald-50/80 text-emerald-950',
      iconBgClass: 'bg-emerald-100 text-emerald-700',
      iconColorClass: 'text-emerald-600',
      summary: `อุณหภูมิ ${temp.toFixed(1)}°C อยู่ในเกณฑ์ปกติสมบูรณ์`,
      detail: 'อุณหภูมิร่างกายปกติ ร่างกายแข็งแรง ไม่พบภาวะไข้',
      recommendation: 'สุขภาพพร้อมเข้าร่วมกิจกรรมรอบนมัสการและสามัคคีธรรม',
      isAlert: false,
      isWarning: false,
    };
  }

  // 4. Low-grade Fever (37.5 - 38.0°C)
  if (temp >= 37.5 && temp <= 38.0) {
    return {
      category: 'low_fever',
      title: 'มีไข้ต่ำ / สังเกตอาการ (Low-Grade Fever)',
      badgeText: '⚠️ มีไข้ต่ำ',
      badgeClass: 'bg-amber-500 text-white shadow-2xs animate-alert-badge font-semibold',
      containerClass: 'animate-haptic-vibrate border border-amber-300 bg-amber-50/50 p-3.5 shadow-2xs',
      inputBorderClass: 'border-amber-400 text-amber-950 font-semibold focus:border-amber-600 focus:shadow-[0_0_10px_rgba(245,158,11,0.3)]',
      cardClass: 'border-amber-300 bg-amber-50/95 text-amber-950',
      iconBgClass: 'bg-amber-100 text-amber-800',
      iconColorClass: 'text-amber-600',
      summary: `อุณหภูมิ ${temp.toFixed(1)}°C มีไข้ต่ำ (Low-grade fever)`,
      detail: 'อุณหภูมิสูงกว่าปกติเล็กน้อย ร่างกายอาจเริ่มมีปฏิกิริยาต่อต้านเชื้อโรคหรืออ่อนเพลีย',
      recommendation: 'แนะนำให้สวมหน้ากากอนามัย นั่งในจุดที่มีอากาศถ่ายเทสะดวก จิบน้ำสะอาดบ่อยๆ และสังเกตอาการใกล้ชิด',
      isAlert: true,
      isWarning: true,
    };
  }

  // 5. High Fever (38.1 - 38.9°C)
  if (temp > 38.0 && temp < 39.0) {
    return {
      category: 'high_fever',
      title: 'มีไข้สูง ควรพบแพทย์ (High Fever)',
      badgeText: '🚨 มีไข้สูง',
      badgeClass: 'bg-red-600 text-white shadow-2xs shadow-red-300 animate-alert-badge font-bold',
      containerClass: 'animate-haptic-vibrate border border-red-400 bg-red-50/60 p-3.5 shadow-2xs',
      inputBorderClass: 'border-red-500 text-red-700 font-semibold animate-warning-pulse focus:border-red-600 focus:shadow-[0_0_12px_rgba(239,68,68,0.4)]',
      cardClass: 'border-red-300 bg-white/95 text-red-950',
      iconBgClass: 'bg-red-100 text-red-600',
      iconColorClass: 'text-red-600',
      summary: `อุณหภูมิ ${temp.toFixed(1)}°C มีไข้สูงชัดเจน (≥ 38.1°C)`,
      detail: 'ร่างกายกำลังมีไข้สูงจากการติดเชื้อหรือการอักเสบ ควรได้รับการดูแลอย่างถูกต้อง',
      recommendation: 'ควรแยกพักผ่อนในห้องพยาบาล เช็ดตัวลดไข้ด้วยน้ำอุณหภูมิห้อง รับประทานยาลดไข้ และแนะนำให้พบแพทย์',
      isAlert: true,
      isWarning: true,
    };
  }

  // 6. Severe Fever (≥ 39.0°C)
  return {
    category: 'severe_fever',
    title: 'ไข้สูงมาก ควรพบแพทย์ด่วน (Hyperpyrexia)',
    badgeText: '🛑 ไข้สูงวิกฤต',
    badgeClass: 'bg-rose-700 text-white shadow-xs shadow-rose-400 animate-pulse font-black',
    containerClass: 'animate-haptic-vibrate border border-rose-500 bg-rose-50/70 p-3.5 shadow-xs',
    inputBorderClass: 'border-rose-600 text-rose-800 font-bold animate-warning-pulse focus:border-rose-700 focus:shadow-[0_0_14px_rgba(225,29,72,0.5)]',
    cardClass: 'border-rose-400 bg-rose-50/95 text-rose-950',
    iconBgClass: 'bg-rose-100 text-rose-700',
    iconColorClass: 'text-rose-700',
    summary: `อุณหภูมิ ${temp.toFixed(1)}°C ไข้สูงมากอันตราย (Severe Fever)`,
    detail: 'ระดับอุณหภูมิสูงเสี่ยงต่ออาการชัก ภาวะขาดน้ำ หรือภาวะแทรกซ้อนรุนแรง',
    recommendation: 'ควรรีบเช็ดตัวลดไข้ทันที และนำส่งสถานพยาบาลหรือโรงพยาบาลใกล้เคียงอย่างเร่งด่วน',
    isAlert: true,
    isWarning: true,
  };
}
