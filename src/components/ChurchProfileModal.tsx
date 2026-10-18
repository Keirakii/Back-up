import React, { useState, useRef } from 'react';
import { X, Upload, RotateCcw, Check, Sparkles, Building, Camera, ArrowLeft, MessageSquareHeart } from 'lucide-react';
import { ChurchLogo } from './ChurchLogo';

interface ChurchProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu?: () => void;
  churchName: string;
  onUpdateChurchName: (name: string) => void;
  churchSlogan: string;
  onUpdateChurchSlogan: (slogan: string) => void;
  churchLogoUrl: string | null;
  onUpdateChurchLogo: (url: string | null) => void;
  welcomeMessage: string;
  onUpdateWelcomeMessage: (msg: string) => void;
  footerMessage: string;
  onUpdateFooterMessage: (msg: string) => void;
}

const DEFAULT_WELCOME_MSG = 'ยินดีต้อนรับสู่อ้อมกอดแห่งความรักค่ะ 💙';
const DEFAULT_FOOTER_MSG = 'ขอความรักและสันติสุขขององค์พระเยซูคริสต์อยู่กับท่าน 🕊️';

export const ChurchProfileModal: React.FC<ChurchProfileModalProps> = ({
  isOpen,
  onClose,
  onBackToMenu,
  churchName,
  onUpdateChurchName,
  churchSlogan,
  onUpdateChurchSlogan,
  churchLogoUrl,
  onUpdateChurchLogo,
  welcomeMessage,
  onUpdateWelcomeMessage,
  footerMessage,
  onUpdateFooterMessage,
}) => {
  const [tempName, setTempName] = useState(churchName);
  const [tempSlogan, setTempSlogan] = useState(churchSlogan);
  const [tempWelcome, setTempWelcome] = useState(welcomeMessage);
  const [tempFooter, setTempFooter] = useState(footerMessage);
  const [previewLogo, setPreviewLogo] = useState<string | null>(churchLogoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when opening
  React.useEffect(() => {
    if (isOpen) {
      setTempName(churchName);
      setTempSlogan(churchSlogan);
      setTempWelcome(welcomeMessage);
      setTempFooter(footerMessage);
      setPreviewLogo(churchLogoUrl);
    }
  }, [isOpen, churchName, churchSlogan, churchLogoUrl, welcomeMessage, footerMessage]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('กรุณาเลือกไฟล์ภาพขนาดไม่เกิน 5MB ค่ะ');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const trimmedName = tempName.trim() || 'คริสตจักรฟ้าใส';
    const trimmedSlogan = tempSlogan.trim() || 'ระบบเช็คอินอัจฉริยะ';
    const trimmedWelcome = tempWelcome.trim() || DEFAULT_WELCOME_MSG;
    const trimmedFooter = tempFooter.trim() || DEFAULT_FOOTER_MSG;

    onUpdateChurchName(trimmedName);
    onUpdateChurchSlogan(trimmedSlogan);
    onUpdateWelcomeMessage(trimmedWelcome);
    onUpdateFooterMessage(trimmedFooter);
    onUpdateChurchLogo(previewLogo);

    if (onBackToMenu) {
      onBackToMenu();
    } else {
      onClose();
    }
  };

  const handleResetToDefault = () => {
    setPreviewLogo(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[28px] border-3 border-[#7EC8E3] bg-white p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 font-kanit"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-['Mali'] text-lg font-bold text-slate-800">
                ข้อมูลคริสตจักร & โลโก้
              </h3>
              <p className="text-[11px] text-slate-500">
                ปรับแต่งโลโก้ ชื่อคริสตจักร และข้อความต้อนรับบนหน้าเช็คอิน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Logo Upload Section */}
        <div className="mt-4 flex flex-col items-center">
          <label className="block text-xs font-bold text-slate-700 mb-2 self-start">
            รูปโลโก้คริสตจักร:
          </label>

          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <ChurchLogo
              size="lg"
              customLogoUrl={previewLogo}
              className="h-20 w-20 rounded-[22px] ring-4 ring-sky-100 group-hover:ring-sky-200 transition shadow-md"
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-[22px] bg-black/40 opacity-0 group-hover:opacity-100 transition text-white">
              <Camera className="h-6 w-6" />
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition shadow-2xs cursor-pointer active:scale-95"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{previewLogo ? 'เปลี่ยนรูปโลโก้' : 'อัปโหลดโลโก้'}</span>
            </button>

            {previewLogo && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                title="ใช้โลโก้มาตรฐานของระบบ"
              >
                <RotateCcw className="h-3 w-3" />
                <span>ใช้โลโก้เริ่มต้น</span>
              </button>
            )}
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            แนะนำรูปสี่เหลี่ยมจัตุรัส 1:1 (PNG, JPG ขนาดไม่เกิน 5MB)
          </span>
        </div>

        {/* Church Name & Slogan Fields */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อคริสตจักร:
            </label>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="เช่น คริสตจักรฟ้าใส"
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-[#3A86FF] focus:bg-white focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              คำขวัญ / คำบรรยายสั้น (มุมซ้ายบน):
            </label>
            <input
              type="text"
              value={tempSlogan}
              onChange={(e) => setTempSlogan(e.target.value)}
              placeholder="เช่น ระบบเช็คอินอัจฉริยะ"
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#3A86FF] focus:bg-white focus:outline-none transition"
            />
          </div>

          {/* Custom Welcome & Footer Messages Section */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2B6CB0] flex items-center gap-1.5">
                <MessageSquareHeart className="h-3.5 w-3.5 text-[#3A86FF]" />
                <span>ข้อความต้อนรับ & ข้อความท้ายหน้า</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setTempWelcome(DEFAULT_WELCOME_MSG);
                  setTempFooter(DEFAULT_FOOTER_MSG);
                }}
                className="text-[11px] font-semibold text-slate-400 hover:text-[#3A86FF] transition cursor-pointer"
              >
                คืนค่าข้อความเริ่มต้น
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ข้อความต้อนรับ (ใต้หัวข้อเช็คอิน):
              </label>
              <input
                type="text"
                value={tempWelcome}
                onChange={(e) => setTempWelcome(e.target.value)}
                placeholder={DEFAULT_WELCOME_MSG}
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#3A86FF] focus:bg-white focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ข้อความอวยพรด้านล่างสุดของหน้า (Footer):
              </label>
              <input
                type="text"
                value={tempFooter}
                onChange={(e) => setTempFooter(e.target.value)}
                placeholder={DEFAULT_FOOTER_MSG}
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#3A86FF] focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="mt-4 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50/50 border border-sky-100 p-3 space-y-2">
          <div className="text-[10.5px] font-semibold text-slate-500 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-sky-500" />
            <span>ตัวอย่างการแสดงผล:</span>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl p-2 border border-slate-100 shadow-2xs">
            <ChurchLogo size="md" customLogoUrl={previewLogo} />
            <div className="min-w-0">
              <span className="font-['Mali'] text-[14px] font-bold text-[#2D3748] tracking-tight block truncate">
                {tempName.trim() || 'คริสตจักรฟ้าใส'}
              </span>
              <p className="text-[10px] text-[#A0AEC0] -mt-0.5 font-medium truncate">
                {tempSlogan.trim() || 'ระบบเช็คอินอัจฉริยะ'}
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-white/90 border border-slate-100 p-2 text-center space-y-1">
            <p className="text-[11px] font-medium text-slate-600 truncate">
              {tempWelcome.trim() || DEFAULT_WELCOME_MSG}
            </p>
            <p className="text-[10px] text-slate-400 truncate border-t border-slate-100 pt-1">
              {tempFooter.trim() || DEFAULT_FOOTER_MSG}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onBackToMenu || onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            {onBackToMenu ? '← กลับไปเมนู' : 'ยกเลิก'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#3A86FF] to-[#0096C7] py-2.5 text-xs font-bold text-white shadow-xs hover:shadow transition active:scale-98 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>บันทึกการเปลี่ยนแปลง</span>
          </button>
        </div>
      </div>
    </div>
  );
};
