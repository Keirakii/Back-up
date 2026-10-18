import React, { useState } from 'react';
import { Home, Plus, X, Edit3, Trash2, Check, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';

interface CareGroupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu?: () => void;
  careGroups: string[];
  currentCareGroup: string;
  onSaveCareGroups: (groups: string[]) => void;
  onSelectCareGroup: (group: string) => void;
  onShowToast: (msg: string) => void;
}

export const CareGroupManagerModal: React.FC<CareGroupManagerModalProps> = ({
  isOpen,
  onClose,
  onBackToMenu,
  careGroups,
  currentCareGroup,
  onSaveCareGroups,
  onSelectCareGroup,
  onShowToast,
}) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      alert('กรุณากรอกชื่อกลุ่มแคร์');
      return;
    }
    if (careGroups.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
      alert('มีกลุ่มแคร์ชื่อนี้ในระบบแล้ว');
      return;
    }

    const updated = [...careGroups, trimmed];
    onSaveCareGroups(updated);
    onSelectCareGroup(trimmed);
    setNewGroupName('');
    onShowToast(`✓ บันทึกกลุ่มแคร์ "${trimmed}" เรียบร้อยแล้ว ✨`);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingName(careGroups[index]);
    setDeleteConfirmIndex(null);
  };

  const handleSaveEdit = (index: number) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      alert('กรุณากรอกชื่อกลุ่มแคร์');
      return;
    }
    const oldName = careGroups[index];
    if (
      careGroups.some(
        (g, i) => i !== index && g.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      alert('มีกลุ่มแคร์ชื่อนี้ในระบบแล้ว');
      return;
    }

    const updated = [...careGroups];
    updated[index] = trimmed;
    onSaveCareGroups(updated);

    // If current selected group was renamed, update selection
    if (currentCareGroup === oldName) {
      onSelectCareGroup(trimmed);
    }

    setEditingIndex(null);
    setEditingName('');
    onShowToast(`✓ แก้ไขชื่อกลุ่มแคร์เป็น "${trimmed}" สำเร็จแล้ว ✨`);
  };

  const handleDelete = (index: number) => {
    const targetName = careGroups[index];
    const updated = careGroups.filter((_, i) => i !== index);
    onSaveCareGroups(updated);

    if (currentCareGroup === targetName) {
      onSelectCareGroup(updated.length > 0 ? updated[0] : '');
    }

    setDeleteConfirmIndex(null);
    onShowToast(`ลบกลุ่มแคร์ "${targetName}" เรียบร้อยแล้ว`);
  };

  const handleClearAll = () => {
    if (window.confirm('คุณต้องการลบชื่อกลุ่มแคร์ทั้งหมดใช่หรือไม่? ข้อมูลจะถูกรีเซ็ตเป็นค่าว่าง')) {
      onSaveCareGroups([]);
      onSelectCareGroup('');
      setEditingIndex(null);
      setDeleteConfirmIndex(null);
      onShowToast('ล้างชื่อกลุ่มแคร์ทั้งหมดเรียบร้อยแล้ว');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="care-group-manager-modal"
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-3xl border-3 border-[#D6EEFC] bg-white shadow-2xl overflow-hidden font-kanit"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-gradient-to-r from-[#F0F8FF] via-white to-[#F0F8FF] px-5 py-4">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E6FFFA] text-[#059669] shadow-xs shrink-0">
              <Home className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-['Mali'] text-base sm:text-lg font-bold text-[#2D3748] truncate">
                จัดการ & แก้ไขชื่อกลุ่มแคร์ 🏡
              </h3>
              <p className="text-xs text-[#718096] truncate">
                พิมพ์ชื่อ บันทึก แก้ไข หรือลบชื่อกลุ่มแคร์
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

        {/* Form to Add New Care Group */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] bg-[#FAFDFE]">
          <form onSubmit={handleAddNew} className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2D3748]">
              <Plus className="h-3.5 w-3.5 text-[#06D6A0]" />
              พิมพ์ชื่อกลุ่มแคร์ใหม่:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="เช่น แคร์บ้านสุขใจ, แคร์วัยรุ่น, แคร์มิตรภาพ..."
                className="flex-1 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#2D3748] focus:border-[#06D6A0] focus:ring-2 focus:ring-[#06D6A0]/20 focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#06D6A0] to-[#059669] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:opacity-95 active:scale-98 transition shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>บันทึกชื่อ</span>
              </button>
            </div>
            <p className="text-[11px] text-[#A0AEC0]">
              * พิมพ์ชื่อแล้วกดปุ่มบันทึก ระบบจะจำชื่อไว้ในเครื่องและเลือกให้ทันทีค่ะ
            </p>
          </form>
        </div>

        {/* List of Saved Care Groups */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 max-h-[360px]">
          <div className="flex items-center justify-between text-xs font-medium text-[#718096] mb-1">
            <span>รายชื่อกลุ่มแคร์ที่บันทึกไว้ ({careGroups.length})</span>
            {careGroups.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-red-500 hover:underline"
              >
                ล้างทั้งหมด
              </button>
            )}
          </div>

          {careGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#CBD5E1] p-6 text-center text-[#718096]">
              <Home className="h-8 w-8 text-[#A0AEC0] mb-2" />
              <p className="text-xs font-medium text-[#4A5568]">
                ยังไม่มีข้อมูลชื่อกลุ่มแคร์ในระบบ
              </p>
              <p className="text-[11px] text-[#A0AEC0] mt-0.5">
                กรุณาพิมพ์ชื่อกลุ่มแคร์ในช่องด้านบน แล้วกดปุ่ม &quot;บันทึกชื่อ&quot; ค่ะ
              </p>
            </div>
          ) : (
            careGroups.map((group, index) => {
              const isSelected = currentCareGroup === group;
              const isEditingThis = editingIndex === index;
              const isDeletingThis = deleteConfirmIndex === index;

              if (isEditingThis) {
                return (
                  <div
                    key={`edit-${index}`}
                    className="flex items-center gap-2 rounded-2xl border border-[#06D6A0] bg-[#E6FFFA] p-2.5 shadow-2xs"
                  >
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEdit(index);
                        } else if (e.key === 'Escape') {
                          setEditingIndex(null);
                        }
                      }}
                      autoFocus
                      className="flex-1 rounded-xl border border-[#06D6A0] bg-white px-2.5 py-1.5 text-xs text-[#2D3748] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(index)}
                      className="flex items-center gap-1 rounded-lg bg-[#06D6A0] px-2.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#059669]"
                      title="บันทึกการแก้ไข"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>ตกลง</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingIndex(null)}
                      className="rounded-lg bg-white border border-[#CBD5E1] px-2 py-1.5 text-xs text-[#718096] hover:bg-slate-100"
                    >
                      ยกเลิก
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={group}
                  className={`flex items-center justify-between rounded-2xl border p-2.5 sm:p-3 transition-all ${
                    isSelected
                      ? 'border-[#06D6A0] bg-[#F0FDF4] shadow-xs'
                      : 'border-[#E2E8F0] bg-white hover:border-[#BEE3F8] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#E6FFFA] text-[#059669] text-xs shrink-0">
                      🏡
                    </span>
                    <span className="text-xs font-semibold text-[#2D3748] truncate">
                      {group}
                    </span>
                    {isSelected && (
                      <span className="rounded-full bg-[#06D6A0] px-2 py-0.5 text-[10px] font-bold text-white shrink-0">
                        ใช้งานอยู่
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isSelected && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCareGroup(group);
                          onShowToast(`เลือกกลุ่ม "${group}" เป็นกลุ่มแคร์ปัจจุบันแล้ว ✨`);
                        }}
                        className="rounded-lg border border-[#BEE3F8] bg-[#EBF8FF] px-2 py-1 text-[11px] font-medium text-[#2B6CB0] hover:bg-[#BEE3F8] transition"
                      >
                        เลือกใช้
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleStartEdit(index)}
                      className="rounded-lg p-1.5 text-[#718096] hover:bg-[#E2E8F0] hover:text-[#2D3748] transition"
                      title="แก้ไขชื่อกลุ่มแคร์"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    {isDeletingThis ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(index)}
                          className="rounded-lg bg-red-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-700"
                        >
                          ลบจริง
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmIndex(null)}
                          className="rounded-lg bg-slate-200 px-1.5 py-1 text-[10px] text-slate-700"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmIndex(index)}
                        className="rounded-lg p-1.5 text-[#A0AEC0] hover:bg-red-50 hover:text-red-600 transition"
                        title="ลบกลุ่มแคร์นี้"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F7FAFC] px-5 py-3 text-xs">
          {onBackToMenu ? (
            <button
              type="button"
              onClick={onBackToMenu}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>กลับไปเมนู & จัดการ</span>
            </button>
          ) : (
            <span className="text-[11px] text-[#718096] flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-[#D69E2E]" />
              บันทึกข้อมูลถาวรในอุปกรณ์
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#2D3748] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1A202C] transition cursor-pointer"
          >
            ปิดหน้าต่าง (หน้าหลัก)
          </button>
        </div>
      </div>
    </div>
  );
};
