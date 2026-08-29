/**
 * File Upload Security & Validation Module
 * Validates file type, size, and binary magic byte signatures to prevent malicious payload uploads.
 */

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB Max File Size

/**
 * Validates image binary magic bytes signature to ensure content matches image format.
 */
export async function validateImageMagicBytes(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      if (!e.target?.result) return resolve(false);
      const arr = new Uint8Array(e.target.result as ArrayBuffer);
      if (arr.length < 4) return resolve(false);

      // Convert first bytes to hex string for inspection
      let header = '';
      for (let i = 0; i < Math.min(arr.length, 12); i++) {
        header += arr[i].toString(16).padStart(2, '0').toUpperCase();
      }

      // Check known magic byte binary headers:
      // JPEG: FF D8 FF
      if (header.startsWith('FFD8FF')) return resolve(true);

      // PNG: 89 50 4E 47 0D 0A 1A 0A
      if (header.startsWith('89504E47')) return resolve(true);

      // GIF: 47 49 46 38 ('GIF8')
      if (header.startsWith('47494638')) return resolve(true);

      // WEBP: 52 49 46 46 (RIFF)
      if (header.startsWith('52494646')) return resolve(true);

      resolve(false);
    };

    reader.onerror = () => resolve(false);

    // Read first 16 bytes for magic byte verification
    const slice = file.slice(0, 16);
    reader.readAsArrayBuffer(slice);
  });
}

export async function validateImageUpload(file: File): Promise<{ valid: boolean; error?: string }> {
  // 1. File Size Validation
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File '${file.name}' exceeds maximum allowed size of 5 MB.`,
    };
  }

  // 2. MIME Type Validation
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `File '${file.name}' has an unsupported file type (${file.type || 'unknown'}). Only JPEG, PNG, WEBP, and GIF images are allowed.`,
    };
  }

  // 3. Binary Magic Byte Content Signature Inspection
  const hasValidMagicBytes = await validateImageMagicBytes(file);
  if (!hasValidMagicBytes) {
    return {
      valid: false,
      error: `File '${file.name}' failed content verification. The binary content does not match a valid image format.`,
    };
  }

  return { valid: true };
}

/**
 * Resizes and compresses an uploaded image file using HTML5 Canvas
 * downscaling to a maximum dimension (default 1200px) and JPEG compression.
 */
export async function compressAndResizeImage(
  file: File,
  maxDimension = 1200,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) {
        return reject(new Error('Failed to read image file.'));
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target.result as string);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.onerror = () => reject(new Error('Failed to load image element for compression.'));
      img.src = e.target.result as string;
    };

    reader.onerror = () => reject(new Error('File reader error during image compression.'));
    reader.readAsDataURL(file);
  });
}
