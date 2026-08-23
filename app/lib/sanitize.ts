export const sanitizeHttpUrl = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
};

const MAGIC: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

export const ALLOWED_UPLOAD_TYPES = new Set(Object.keys(MAGIC));
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const validateUploadBytes = async (file: File): Promise<boolean> => {
  const signatures = MAGIC[file.type];
  if (!signatures) return false;
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return signatures.some((sig) => sig.every((value, index) => bytes[index] === value));
};
