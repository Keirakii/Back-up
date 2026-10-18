import { Member } from '../types';

/**
 * Normalizes an NFC card identifier or serial number
 * Removes colons, hyphens, spaces, and trims to lowercase for flexible matching.
 * e.g. "04:A2:3B:5C" -> "04a23b5c"
 * e.g. "04 a2 3b 5c" -> "04a23b5c"
 * e.g. "NFC-F001"    -> "nfcf001"
 */
export const normalizeNfcId = (id: string | null | undefined): string => {
  if (!id) return '';
  return id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
};

/**
 * Checks if the browser supports Web NFC (NDEFReader)
 */
export const isWebNfcSupported = (): boolean => {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
};

/**
 * Detects client environment to explain NFC capabilities
 */
export const getDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return { isIos: false, isAndroid: false, isChrome: false, hasWebNfc: false };
  }

  const ua = navigator.userAgent || '';
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua) && !/Edge|Edg|OPR/i.test(ua);
  const hasWebNfc = 'NDEFReader' in window;

  return { isIos, isAndroid, isChrome, hasWebNfc };
};

/**
 * Generates the full check-in URL for a member
 */
export const getCheckInUrl = (memberId: string): string => {
  if (typeof window === 'undefined') return `?checkin=${encodeURIComponent(memberId)}`;
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?checkin=${encodeURIComponent(memberId)}`;
};

/**
 * Generates a compact check-in URL for small NFC tags (e.g. NTAG213 with 144 bytes)
 */
export const getCompactCheckInUrl = (memberId: string): string => {
  if (typeof window === 'undefined') return `?c=${encodeURIComponent(memberId)}`;
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?c=${encodeURIComponent(memberId)}`;
};

/**
 * Extracts target member ID from a raw URL or text payload
 */
export const extractTargetFromPayload = (payload: string): string | null => {
  if (!payload) return null;
  const trimmed = payload.trim();

  // Check if it's a URL
  if (
    trimmed.includes('checkin=') ||
    trimmed.includes('memberId=') ||
    trimmed.includes('nfc=') ||
    trimmed.includes('c=')
  ) {
    try {
      const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const target =
        urlObj.searchParams.get('checkin') ||
        urlObj.searchParams.get('c') ||
        urlObj.searchParams.get('memberId') ||
        urlObj.searchParams.get('nfc');
      if (target) return target.trim();
    } catch {
      // Fallback regex if URL parsing fails
      const match = trimmed.match(/[?&](checkin|c|memberId|nfc)=([^&]+)/i);
      if (match && match[2]) {
        return decodeURIComponent(match[2]).trim();
      }
    }
  }

  // If plain text (not a URL)
  return trimmed;
};

/**
 * Finds a matching member based on NFC serial number and/or decoded payload
 */
export const findMemberByNfc = (
  members: Member[],
  serialNumber?: string,
  payload?: string
): Member | undefined => {
  const cleanSerial = normalizeNfcId(serialNumber);
  const rawSerialLower = (serialNumber || '').trim().toLowerCase();

  // 1. Try Hardware UID match
  if (cleanSerial) {
    const matchedBySerial = members.find((m) => {
      // Direct raw match
      if (m.nfcCardId && m.nfcCardId.trim().toLowerCase() === rawSerialLower) return true;
      if (m.id.toLowerCase() === rawSerialLower) return true;

      // Normalized match
      const mNfcNorm = normalizeNfcId(m.nfcCardId);
      const mIdNorm = normalizeNfcId(m.id);

      if (mNfcNorm && (mNfcNorm === cleanSerial || cleanSerial.endsWith(mNfcNorm) || mNfcNorm.endsWith(cleanSerial))) {
        return true;
      }
      if (mIdNorm && mIdNorm === cleanSerial) {
        return true;
      }
      return false;
    });

    if (matchedBySerial) return matchedBySerial;
  }

  // 2. Try Decoded Payload match (URL param or plain Text)
  if (payload) {
    const target = extractTargetFromPayload(payload);
    if (target) {
      const targetLower = target.toLowerCase();
      const targetNorm = normalizeNfcId(target);

      const matchedByPayload = members.find((m) => {
        if (m.id.toLowerCase() === targetLower) return true;
        if (m.nickname.toLowerCase() === targetLower) return true;
        if (m.nfcCardId && m.nfcCardId.toLowerCase() === targetLower) return true;

        const mNfcNorm = normalizeNfcId(m.nfcCardId);
        const mIdNorm = normalizeNfcId(m.id);
        if (mIdNorm && mIdNorm === targetNorm) return true;
        if (mNfcNorm && mNfcNorm === targetNorm) return true;

        return false;
      });

      if (matchedByPayload) return matchedByPayload;
    }
  }

  return undefined;
};
