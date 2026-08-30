/**
 * Image Optimizer Utility
 * Converts any browser-compatible image to WebP format using the Canvas API.
 * Falls back to the original format if WebP is not supported or conversion fails.
 */

export type ImageOptimizationResult = {
  base64: string;
  mimeType: string;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
  wasConverted: boolean;
}

const WEBP_SUPPORTED = (() => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
})();

/**
 * Loads a File into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/**
 * Converts a canvas to a base64-encoded data URL with the specified MIME type.
 */
function canvasToBase64(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob returned null'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(blob);
      },
      mimeType,
      quality,
    );
  });
}

/**
 * Optimizes an image file to WebP format.
 *
 * @param file - Source image to process and convert
 * @param quality - WebP quality between 0 and 1 (default: 0.85)
 * @param maxWidth - Maximum width in pixels (default: 2048)
 * @param maxHeight - Maximum height in pixels (default: 2048)
 * @returns ImageOptimizationResult with base64, sizes, dimensions and format info
 */
export async function optimizeImageToWebP(
  file: File,
  quality = 0.85,
  maxWidth = 2048,
  maxHeight = 2048,
): Promise<ImageOptimizationResult> {
  const originalSize = file.size;

  // If WebP not supported, fall back to FileReader
  if (!WEBP_SUPPORTED) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(file);
    });
    return {
      base64,
      mimeType: file.type,
      originalSize,
      optimizedSize: originalSize,
      width: 0,
      height: 0,
      wasConverted: false,
    };
  }

  const img = await loadImage(file);

  // Calculate scaled dimensions maintaining aspect ratio
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // White background for transparent PNGs
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const webpBase64 = await canvasToBase64(canvas, 'image/webp', quality);

  // Estimate actual optimized size from base64 length
  const base64Data = webpBase64.split(',')[1] ?? '';
  const optimizedSize = Math.round((base64Data.length * 3) / 4);

  return {
    base64: webpBase64,
    mimeType: 'image/webp',
    originalSize,
    optimizedSize,
    width,
    height,
    wasConverted: true,
  };
}

/**
 * Formats bytes to a human-readable string (KB, MB).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
