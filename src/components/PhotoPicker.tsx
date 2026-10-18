import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  RefreshCw,
  X,
  AlertCircle,
  Smartphone,
  Image as ImageIcon,
  Check,
  Loader2,
} from 'lucide-react';
import { compressImage } from '../utils/image';

interface PhotoPickerProps {
  currentPhoto?: string;
  onPhotoChange: (dataUrl: string | undefined) => void;
  nicknameFallback?: string;
  bgColorFallback?: string;
}

type CameraPrepStage = 'idle' | 'requesting_permission' | 'initializing_sensor' | 'ready';
type PhotoSourceType = 'camera' | 'upload' | null;

export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  currentPhoto,
  onPhotoChange,
  nicknameFallback = 'สม',
  bgColorFallback = '#7EC8E3',
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStage, setCameraStage] = useState<CameraPrepStage>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [photoSource, setPhotoSource] = useState<PhotoSourceType>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const readyTimeoutRef = useRef<number | null>(null);

  const isCameraReady = cameraStage === 'ready';

  const stopCameraStream = useCallback(() => {
    if (readyTimeoutRef.current) {
      window.clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraStage('idle');
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Mark camera as ready only after actual video frames are flowing (prevents black screen flash)
  const markVideoStreamReady = useCallback(() => {
    if (readyTimeoutRef.current) {
      window.clearTimeout(readyTimeoutRef.current);
    }
    readyTimeoutRef.current = window.setTimeout(() => {
      setCameraStage('ready');
    }, 150);
  }, []);

  const attachStreamToVideo = useCallback(
    (videoEl: HTMLVideoElement | null) => {
      videoRef.current = videoEl;
      if (videoEl && streamRef.current) {
        if (videoEl.srcObject !== streamRef.current) {
          videoEl.srcObject = streamRef.current;
        }
        videoEl
          .play()
          .then(() => {
            if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
              markVideoStreamReady();
            }
          })
          .catch((e) => {
            console.warn('Video play warning:', e);
          });
      }
    },
    [markVideoStreamReady]
  );

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      attachStreamToVideo(videoRef.current);
    }
  }, [isCameraActive, attachStreamToVideo]);

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    setCameraStage('requesting_permission');

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsCameraActive(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        stopCameraStream();
        nativeCameraInputRef.current?.click();
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraStage('initializing_sensor');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
          markVideoStreamReady();
        }
      }
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      stopCameraStream();
      const errorMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      if (
        errorMsg.includes('NotAllowedError') ||
        errorMsg.includes('Permission') ||
        errorMsg.includes('Denied')
      ) {
        setCameraError('กรุณาอนุญาตการใช้กล้องในเบราว์เซอร์ หรือกดเลือกรูปจากเครื่องแทนค่ะ');
      } else {
        setCameraError('ไม่สามารถเปิดกล้องสดได้ สามารถเลือกรูปจากเครื่องหรือใช้กล้องมือถือแทนได้ค่ะ');
      }
    }
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      setIsProcessing(true);
      const vidW = video.videoWidth || 480;
      const vidH = video.videoHeight || 480;
      const size = Math.min(vidW, vidH);

      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 480;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const sx = (vidW - size) / 2;
      const sy = (vidH - size) / 2;

      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      setPhotoSource('camera');
      onPhotoChange(dataUrl);
      stopCameraStream();
    } catch (err) {
      console.error('Capture error:', err);
      setCameraError('เกิดข้อผิดพลาดในการบันทึกภาพ กรุณาลองใหม่อีกครั้งค่ะ');
    } finally {
      setIsProcessing(false);
    }
  };

  const processUploadedFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setCameraError('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)');
      return;
    }

    try {
      stopCameraStream();
      setIsProcessing(true);
      setCameraError(null);
      const compressedDataUrl = await compressImage(file, 480, 0.9);
      setPhotoSource('upload');
      onPhotoChange(compressedDataUrl);
    } catch (err) {
      console.error('Upload compress error:', err);
      setCameraError('ไม่สามารถอ่านไฟล์รูปภาพนี้ได้ กรุณาลองเลือกรูปอื่นค่ะ');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isCameraActive) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processUploadedFile(file);
    }
  };

  const toggleFacingMode = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const handleRemovePhoto = () => {
    setPhotoSource(null);
    onPhotoChange(undefined);
  };

  return (
    <div
      id="member-photo-picker"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-2xl border p-3.5 transition-all duration-200 ${
        isDraggingOver
          ? 'border-[#3A86FF] bg-sky-50/70 ring-2 ring-[#3A86FF]/20'
          : isCameraActive
          ? 'border-sky-200 bg-slate-50/90'
          : 'border-slate-200/90 bg-slate-50/60 hover:border-slate-300/90'
      }`}
    >
      {isCameraActive ? (
        /* MINIMAL LIVE CAMERA VIEW */
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
          {/* Live Camera Frame */}
          <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-sky-50 shadow-md ring-1 ring-slate-200">
            <video
              ref={attachStreamToVideo}
              playsInline
              autoPlay
              muted
              onLoadedData={(e) => {
                if (e.currentTarget.videoWidth > 0) markVideoStreamReady();
              }}
              onPlaying={(e) => {
                if (e.currentTarget.videoWidth > 0) markVideoStreamReady();
              }}
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                facingMode === 'user' ? '-scale-x-100' : ''
              } ${isCameraReady ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Clean Minimal Camera Loading State (Prevents Black Screen) */}
            {!isCameraReady && (
              <div
                id="camera-loading-indicator"
                className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-sky-50/95 to-white p-3 text-center"
              >
                <div className="relative mb-2 flex h-11 w-11 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-sky-100 border-t-[#3A86FF] animate-spin" />
                  <Camera className="h-4 w-4 text-[#3A86FF]" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                  {cameraStage === 'requesting_permission'
                    ? 'กำลังเชื่อมต่อกล้อง...'
                    : 'กำลังเปิดภาพสด...'}
                </span>
                <span className="mt-0.5 text-[10px] text-slate-400">รอสักครู่ค่ะ</span>
              </div>
            )}

            {/* Subtle Corner Flip Button when Ready */}
            {isCameraReady && (
              <button
                type="button"
                onClick={toggleFacingMode}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-xs hover:bg-black/70 transition cursor-pointer"
                title="สลับกล้องหน้า/หลัง"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Camera Controls */}
          <div className="flex flex-1 flex-col justify-center gap-2 text-center sm:text-left min-w-0 w-full">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isCameraReady ? 'bg-emerald-500 animate-pulse' : 'bg-sky-400 animate-ping'
                  }`}
                />
                <span className="text-xs font-bold text-slate-800">
                  {isCameraReady ? 'กล้องพร้อมถ่ายภาพ' : 'กำลังเตรียมกล้อง...'}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {isCameraReady
                  ? 'จัดใบหน้าให้อยู่กึ่งกลางกรอบ แล้วกดถ่ายภาพได้เลยค่ะ'
                  : 'หากเบราว์เซอร์ถามสิทธิ์การใช้กล้อง กรุณากดอนุญาต (Allow)'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={isProcessing || !isCameraReady}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#3A86FF] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#2563EB] active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>{isCameraReady ? 'ถ่ายภาพ' : 'รอสักครู่...'}</span>
              </button>

              <button
                type="button"
                onClick={toggleFacingMode}
                disabled={!isCameraReady}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>สลับกล้อง</span>
              </button>

              <button
                type="button"
                onClick={stopCameraStream}
                className="inline-flex items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-200/60 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>ยกเลิก</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* MINIMAL IDLE / PREVIEW STATE */
        <div className="flex items-center gap-3.5">
          {/* Left: Clean Avatar Preview (Click to Upload) */}
          <div className="relative shrink-0">
            {isProcessing ? (
              <div className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-2xs">
                <Loader2 className="h-5 w-5 animate-spin text-[#3A86FF]" />
                <span className="mt-1 text-[10px] font-medium text-slate-500">กำลังโหลด...</span>
              </div>
            ) : currentPhoto ? (
              <div className="group relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-white shadow-sm ring-1 ring-slate-200/80">
                <img
                  src={currentPhoto}
                  alt="รูปโปรไฟล์สมาชิก"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs hover:bg-red-600 transition cursor-pointer"
                  title="ลบรูปภาพ"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="คลิกเพื่อเลือกรูปภาพจากเครื่อง"
                className="group relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-white text-white shadow-sm ring-1 ring-slate-200/70 transition hover:opacity-95"
                style={{ backgroundColor: bgColorFallback }}
              >
                <span className="font-['Mali'] text-2xl font-bold tracking-tight drop-shadow-2xs">
                  {(nicknameFallback || 'สม').slice(0, 2)}
                </span>
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-2xs">
                  <Camera className="h-3 w-3" />
                </span>
              </button>
            )}
          </div>

          {/* Right: Clean Label + Minimal Action Buttons */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">รูปโปรไฟล์สมาชิก</span>
              {currentPhoto && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
                  <Check className="h-3 w-3" />
                  <span>{photoSource === 'camera' ? 'ถ่ายภาพแล้ว' : 'อัปโหลดแล้ว'}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              ถ่ายภาพสดจากกล้อง หรือเลือกรูปที่มีในเครื่อง
            </p>

            {/* Primary Minimal Action Row */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-open-live-camera"
                onClick={() => startCamera('user')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#3A86FF] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#2563EB] active:scale-98 transition cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>{currentPhoto ? 'ถ่ายใหม่' : 'ถ่ายรูป'}</span>
              </button>

              <button
                type="button"
                id="btn-upload-member-photo"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 active:scale-98 transition cursor-pointer"
              >
                <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                <span>{currentPhoto ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}</span>
              </button>

              {currentPhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>ลบ</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Notice with Fallback Options */}
      {cameraError && (
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-900">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span className="truncate">{cameraError}</span>
          </div>
          <button
            type="button"
            onClick={() => nativeCameraInputRef.current?.click()}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-white border border-amber-300 px-2 py-1 text-[10px] font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
          >
            <Smartphone className="h-3 w-3" />
            <span>กล้องมือถือ</span>
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        type="file"
        ref={nativeCameraInputRef}
        accept="image/*"
        capture="user"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};
