import {env} from 'cloudflare:workers';
import {requireAuth} from '~/lib/auth';

export async function GET(request: Request) {
  await requireAuth();
  const key = new URL(request.url).searchParams.get('key');
  if (!key) return Response.json({error: 'Missing key.'}, {status: 400});

  const object = await env.FILES_BUCKET.get(key);
  if (!object) return Response.json({error: 'File not found.'}, {status: 404});

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
