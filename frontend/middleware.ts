import { NextResponse, type NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/server/auth';

const PROTECTED_PREFIXES = ['/dashboard', '/api'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('im_session')?.value;
  const secret = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET;

  if (!token || !secret) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const claims = await verifyJwt(token, secret);
  if (!claims) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const headers = new Headers(request.headers);
  headers.set('x-user-id', claims.sub);
  headers.set('x-user-role', claims.role);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
