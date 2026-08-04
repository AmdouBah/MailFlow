import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const locales = ['fr', 'en'];
const defaultLocale = 'fr';

// Routes publiques (pas d'auth requise)
const publicRoutes = ['/login', '/unsubscribe'];
// Routes API publiques (tracking, unsubscribe)
const publicApiRoutes = ['/api/track/', '/api/unsubscribe'];

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Laisser passer toutes les routes API
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Laisser passer les ressources statiques
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Vérifier si la route est publique (avec ou sans locale)
  const isPublicRoute = publicRoutes.some((r) =>
    pathname === r || pathname === `/fr${r}` || pathname === `/en${r}`
  );

  // Récupérer le token Firebase depuis le cookie
  const firebaseToken = request.cookies.get('firebase-token')?.value;

  // Si route protégée et pas de token → rediriger vers login
  if (!isPublicRoute && !firebaseToken) {
    const locale = pathname.startsWith('/en') ? 'en' : 'fr';
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si page login et token présent → rediriger vers dashboard
  if (isPublicRoute && firebaseToken && pathname.includes('/login')) {
    const locale = pathname.startsWith('/en') ? 'en' : 'fr';
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
