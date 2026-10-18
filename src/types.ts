export type SessionType = 'CHURCH' | 'CARE_GROUP';
export type AgeGroup = 'ADULT' | 'CHILD';
export type Gender = 'MALE' | 'FEMALE';

export interface Member {
  id: string; // e.g. 'F001'
  fullName: string; // e.g. 'นภัสสร รุ่งเรืองฟ้าใส'
  nickname: string; // e.g. 'พี่ฟ้า'
  role: string; // e.g. 'ผู้นำนมัสการ 🎶'
  nfcCardId: string; // e.g. 'NFC-F001'
  ageGroup?: AgeGroup; // 'ADULT' (ผู้ใหญ่) | 'CHILD' (เด็ก) - ใช้แยกเด็ก/ผู้ใหญ่ได้แม้ไม่ระบุวันเกิด
  gender?: Gender; // 'MALE' (ชาย) | 'FEMALE' (หญิง)
  phone?: string; // e.g. '081-234-5678'
  birthday?: string; // e.g. '1995-04-12'
  address?: string; // e.g. '123/45 ซอยสุขใจ ถ.ฟ้าใส'
  careGroup?: string; // e.g. 'แคร์คนรุ่นใหม่', 'แคร์ฟ้าใส 1', 'แคร์ครอบครัว'
  avatarUrl?: string; // base64 or URL
  avatarBgColor?: string;
  isVisitor?: boolean;
  notes?: string;
  invitedBy?: string; // ชื่อคนที่พามา / มากับใคร
  firstVisitDate?: string; // วันที่มาครั้งแรก (YYYY-MM-DD)
  visitorStatus?: 'FIRST_TIME' | 'RETURNING' | 'CONVERTED';
  isBaptized?: boolean; // รับบัพติศมาแล้ว (true) หรือ ยังไม่ได้รับ (false)
  baptismDate?: string; // วันที่รับบัพติศมา (YYYY-MM-DD)
}

export interface CheckInRecord {
  id: string;
  memberId: string;
  memberName: string;
  nickname: string;
  role: string;
  temperature: number;
  checkInTime: string; // e.g. '09:15 น.'
  date: string; // e.g. '2026-09-20' (YYYY-MM-DD)
  sessionType: SessionType; // 'CHURCH' or 'CARE_GROUP'
  careGroupName?: string; // e.g. 'แคร์คนรุ่นใหม่'
  method: 'NFC' | 'SEARCH' | 'MANUAL';
  verse: BibleVerse;
  avatarUrl?: string;
  isBirthday?: boolean;
  isVisitor?: boolean;
  isBaptized?: boolean; // รับบัพติศมาแล้ว (true) หรือ ยังไม่ได้รับ (false)
  invitedBy?: string; // ชื่อคนที่พามา / มากับใคร
  isRetroactive?: boolean; // บันทึกย้อนหลังกรณีลืมเช็คอิน
  retroactiveReason?: string; // เหตุผลหรือบันทึกเพิ่มเติม
}

export interface BibleVerse {
  passage: string;
  reference: string;
}
