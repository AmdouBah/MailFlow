'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Mail,
  Bot,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const mobileNavItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'contacts', icon: Users, path: '/contacts' },
  { key: 'campaigns', icon: Mail, path: '/campaigns' },
  { key: 'aiReplies', icon: Bot, path: '/ai-replies' },
  { key: 'settings', icon: Settings, path: '/settings' },
] as const;

export function MobileNav() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();

  function isActive(path: string) {
    const fullPath = `/${locale}${path}`;
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {mobileNavItems.map(({ key, icon: Icon, path }) => {
          const active = isActive(path);
          return (
            <Link
              key={key}
              href={`/${locale}${path}`}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-150',
                active
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{t(key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
