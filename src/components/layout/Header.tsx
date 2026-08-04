'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Globe, Menu, Zap } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { signOut } from '@/lib/firebase/auth';
import { cn } from '@/lib/utils/cn';
import {
  LayoutDashboard, Users, Mail, Bot, FileText, Settings, List, LogOut
} from 'lucide-react';

const mobileNavItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'contacts', icon: Users, path: '/contacts' },
  { key: 'lists', icon: List, path: '/lists' },
  { key: 'campaigns', icon: Mail, path: '/campaigns' },
  { key: 'aiReplies', icon: Bot, path: '/ai-replies' },
  { key: 'templates', icon: FileText, path: '/templates' },
  { key: 'settings', icon: Settings, path: '/settings' },
] as const;

export function Header({ title }: { title?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const tNav = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const [mobileOpen, setMobileOpen] = useState(false);

  const otherLocale = locale === 'fr' ? 'en' : 'fr';

  function switchLocale() {
    // Remplace le locale dans le pathname
    const newPath = pathname.replace(`/${locale}`, `/${otherLocale}`);
    router.push(newPath);
  }

  async function handleLogout() {
    await signOut();
    router.push(`/${locale}/login`);
  }

  function isActive(path: string) {
    const fullPath = `/${locale}${path}`;
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-4 bg-white/90 backdrop-blur-sm border-b border-border px-4 lg:px-6 h-14">
        {/* Mobile menu button */}
        <button
          className="lg:hidden p-1.5 rounded-lg hover:bg-secondary transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Menu size={20} />
        </button>

        {/* Logo (mobile only) */}
        <div className="lg:hidden flex items-center gap-2 flex-1">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-semibold text-sm">{process.env.NEXT_PUBLIC_APP_NAME || 'MailFlow'}</span>
        </div>

        {/* Title (desktop) */}
        {title && (
          <h1 className="hidden lg:block text-base font-semibold flex-1">{title}</h1>
        )}
        {!title && <div className="hidden lg:block flex-1" />}

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Locale switcher */}
          <button
            onClick={switchLocale}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Globe size={14} />
            {otherLocale.toUpperCase()}
          </button>
        </div>
      </header>

      {/* Mobile slide menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="relative flex flex-col w-64 bg-white shadow-xl animate-slide-in">
            <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary">
                <Zap className="w-5 h-5 text-white" fill="white" />
              </div>
              <span className="font-bold">{process.env.NEXT_PUBLIC_APP_NAME || 'MailFlow'}</span>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {mobileNavItems.map(({ key, icon: Icon, path }) => {
                const active = isActive(path);
                return (
                  <Link
                    key={key}
                    href={`/${locale}${path}`}
                    onClick={() => setMobileOpen(false)}
                    className={cn(active ? 'nav-item-active' : 'nav-item')}
                  >
                    <Icon size={18} />
                    <span>{tNav(key)}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-border">
              <button
                onClick={handleLogout}
                className="nav-item w-full text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut size={18} />
                <span>{tAuth('logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
