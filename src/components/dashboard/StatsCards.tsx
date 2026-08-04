'use client';

import { useTranslations } from 'next-intl';
import { Users, Mail, TrendingUp, Send } from 'lucide-react';
import type { GlobalStats } from '@/types';

interface StatsCardsProps {
  stats: GlobalStats | null;
  loading: boolean;
}

const cards = [
  {
    key: 'totalContacts',
    icon: Users,
    color: 'blue',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    trend: null,
  },
  {
    key: 'activeCampaigns',
    icon: Send,
    color: 'purple',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    trend: null,
  },
  {
    key: 'emailsSentThisMonth',
    icon: Mail,
    color: 'green',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    trend: null,
  },
  {
    key: 'avgOpenRate',
    icon: TrendingUp,
    color: 'orange',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    isPercent: true,
    trend: null,
  },
] as const;

export function StatsCards({ stats, loading }: StatsCardsProps) {
  const t = useTranslations('dashboard');

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center justify-between">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton w-10 h-10 rounded-xl" />
            </div>
            <div className="skeleton h-8 w-20 mt-2" />
            <div className="skeleton h-3 w-24 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  const values: Record<string, number> = {
    totalContacts: stats?.totalContacts ?? 0,
    activeCampaigns: stats?.activeCampaigns ?? 0,
    emailsSentThisMonth: stats?.emailsSentThisMonth ?? 0,
    avgOpenRate: stats?.avgOpenRate ?? 0,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map(({ key, icon: Icon, iconBg, iconColor, isPercent }) => (
        <div key={key} className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{t(key)}</span>
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
              <Icon size={18} className={iconColor} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-bold text-foreground">
              {isPercent
                ? `${values[key]}%`
                : values[key].toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
