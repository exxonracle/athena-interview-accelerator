const COOKIE = 'athena_session';

function cookieValue(request: Request) {
  const cookies = request.headers.get('cookie') ?? '';
  return cookies.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function getOwner(request: Request) {
  const current = cookieValue(request);
  const token = current || crypto.randomUUID();
  return { token, ownerHash: await hash(token), isNew: !current };
}

export function withOwnerCookie(response: Response, token: string, shouldSet: boolean) {
  if (shouldSet) response.headers.append('Set-Cookie', `${COOKIE}=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure`);
  return response;
}
