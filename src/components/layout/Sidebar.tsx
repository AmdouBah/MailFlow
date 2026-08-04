'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Mail,
  Bot,
  FileText,
  Settings,
  List,
  Zap,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { signOut } from '@/lib/firebase/auth';
import { cn } from '@/lib/utils/cn';

const navItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'contacts', icon: Users, path: '/contacts' },
  { key: 'lists', icon: List, path: '/lists' },
  { key: 'campaigns', icon: Mail, path: '/campaigns' },
  { key: 'aiReplies', icon: Bot, path: '/ai-replies' },
  { key: 'templates', icon: FileText, path: '/templates' },
  { key: 'settings', icon: Settings, path: '/settings' },
] as const;

export function Sidebar() {
  const t = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push(`/${locale}/login`);
  }

  function isActive(path: string) {
    const fullPath = `/${locale}${path}`;
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary shadow-sm shadow-primary/30">
          <Zap className="w-5 h-5 text-white" fill="white" />
        </div>
        <div>
          <span className="font-bold text-foreground text-base">
            {process.env.NEXT_PUBLIC_APP_NAME || 'MailFlow'}
          </span>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Email Automation</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ key, icon: Icon, path }) => {
          const active = isActive(path);
          return (
            <Link
              key={key}
              href={`/${locale}${path}`}
              className={cn(active ? 'nav-item-active' : 'nav-item')}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              <span className="flex-1">{t(key)}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="nav-item w-full text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut size={18} />
          <span>{tAuth('logout')}</span>
        </button>
      </div>
    </aside>
  );
}
