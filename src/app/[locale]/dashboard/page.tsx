'use client';

import { useTranslations } from 'next-intl';
import { useStats } from '@/hooks/useStats';
import { useCampaigns } from '@/hooks/useCampaigns';
import { AppShell } from '@/components/layout/AppShell';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { OpeningsChart } from '@/components/dashboard/OpeningsChart';
import { CampaignStatusBadge } from '@/components/campaigns/CampaignStatusBadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowRight, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tCamp = useTranslations('campaigns');
  const locale = useLocale();
  const { stats, chartData, loading: statsLoading } = useStats();
  const { campaigns, loading: campLoading } = useCampaigns();

  const recentCampaigns = campaigns.slice(0, 5);

  return (
    <AppShell title={t('title')}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <StatsCards stats={stats} loading={statsLoading} />

        {/* Chart + Recent Campaigns */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="xl:col-span-2 card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-foreground">Activité emails</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t('last30Days')}</p>
              </div>
            </div>
            <OpeningsChart data={chartData} loading={statsLoading} />
          </div>

          {/* Recent Campaigns */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">{t('recentCampaigns')}</h3>
              <Link
                href={`/${locale}/campaigns`}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Tout voir <ArrowRight size={12} />
              </Link>
            </div>

            {campLoading ? (
              <div className="space-y-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="skeleton h-4 flex-1" />
                    <div className="skeleton h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : recentCampaigns.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">{t('noData')}</p>
                <Link
                  href={`/${locale}/campaigns/new`}
                  className="btn-primary mt-3 text-xs py-1.5 px-3"
                >
                  Créer une campagne
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/${locale}/campaigns/${campaign.id}`}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {campaign.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {campaign.sentAt
                          ? format(campaign.sentAt, 'dd MMM yyyy', { locale: locale === 'fr' ? fr : undefined })
                          : format(campaign.createdAt, 'dd MMM yyyy', { locale: locale === 'fr' ? fr : undefined })
                        }
                      </p>
                      {campaign.status === 'sent' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {(campaign.stats?.sent || 0)} envoyés · {(campaign.stats?.sent || 0) > 0
                            ? Math.round(((campaign.stats?.opened || 0) / (campaign.stats?.sent || 1)) * 100)
                            : 0}% ouverture
                        </p>
                      )}
                    </div>
                    <CampaignStatusBadge status={campaign.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href={`/${locale}/campaigns/new`}
            className="card p-5 hover:shadow-md transition-all duration-200 hover:border-primary/30 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <span className="text-xl">📧</span>
              </div>
              <div>
                <p className="font-medium text-sm">Nouvelle campagne</p>
                <p className="text-xs text-muted-foreground">Créer et envoyer</p>
              </div>
            </div>
          </Link>
          <Link
            href={`/${locale}/contacts/import`}
            className="card p-5 hover:shadow-md transition-all duration-200 hover:border-primary/30 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <span className="text-xl">📋</span>
              </div>
              <div>
                <p className="font-medium text-sm">Importer contacts</p>
                <p className="text-xs text-muted-foreground">Import CSV</p>
              </div>
            </div>
          </Link>
          <Link
            href={`/${locale}/settings`}
            className="card p-5 hover:shadow-md transition-all duration-200 hover:border-primary/30 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                <span className="text-xl">⚙️</span>
              </div>
              <div>
                <p className="font-medium text-sm">Configurer SMTP</p>
                <p className="text-xs text-muted-foreground">Provider email</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
