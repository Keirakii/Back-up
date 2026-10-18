/**
 * Resizes an image file or base64 data to max 480x480 and compresses as JPEG
 * to ensure fast local storage and optimal performance without black backgrounds on transparent PNGs.
 */
export function compressImage(file: File | Blob, maxSize = 480, quality = 0.9): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = img.width || 480;
        const height = img.height || 480;

        // Crop to square from center
        const minDim = Math.min(width, height);
        const startX = (width - minDim) / 2;
        const startY = (height - minDim) / 2;

        const targetDim = Math.min(minDim, maxSize) || maxSize;
        canvas.width = targetDim;
        canvas.height = targetDim;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Fill white background first so transparent PNGs never turn black when exported as JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetDim, targetDim);

        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetDim, targetDim);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
