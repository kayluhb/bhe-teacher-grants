import {env} from 'cloudflare:workers';
import {requireAuth} from '~/lib/auth';
import {ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, validateUploadBytes} from '~/lib/sanitize';

const KINDS = new Set(['quotes', 'receipts', 'delivery']);

const extensionFor = (type: string) => {
  if (type === 'application/pdf') return 'pdf';
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  return 'webp';
};

export async function POST(request: Request) {
  await requireAuth();

  const formData = await request.formData();
  const file = formData.get('file');
  const kind = String(formData.get('kind') || '');
  const grantId = String(formData.get('grant_id') || 'draft');
  const itemId = String(formData.get('item_id') || '');

  if (!(file instanceof File) || file.size === 0) {
    return Response.json({error: 'No file provided.'}, {status: 400});
  }
  if (!KINDS.has(kind)) {
    return Response.json({error: 'Unknown upload kind.'}, {status: 400});
  }
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return Response.json({error: 'Use a PDF, JPEG, PNG, or WebP file.'}, {status: 400});
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({error: 'File too large. Maximum 10MB.'}, {status: 400});
  }
  if (!(await validateUploadBytes(file))) {
    return Response.json({error: 'File does not match its declared type.'}, {status: 400});
  }

  const ext = extensionFor(file.type);
  const stamp = Date.now();
  const key =
    kind === 'quotes'
      ? `quotes/${grantId}/${itemId || 'item'}-${stamp}.${ext}`
      : `${kind}/${grantId}-${stamp}.${ext}`;

  await env.FILES_BUCKET.put(key, file.stream(), {
    httpMetadata: {contentType: file.type},
  });

  return Response.json({key});
}
