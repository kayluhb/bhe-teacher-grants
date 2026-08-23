import {env} from 'cloudflare:workers';
import {requireAuth} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {userCanReadFile} from '~/lib/files';

export async function GET(request: Request) {
  const user = await requireAuth();
  const key = new URL(request.url).searchParams.get('key');
  if (!key) return Response.json({error: 'Missing key.'}, {status: 400});
  if (!(await userCanReadFile(getDb(), user, key))) {
    return Response.json({error: 'Not allowed.'}, {status: 403});
  }

  const object = await env.FILES_BUCKET.get(key);
  if (!object) return Response.json({error: 'File not found.'}, {status: 404});

  return new Response(object.body, {
    headers: {
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': 'attachment',
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
