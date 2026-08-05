'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useCampaigns } from '@/hooks/useCampaigns';
import { AppShell } from '@/components/layout/AppShell';
import { CampaignStatusBadge } from '@/components/campaigns/CampaignStatusBadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Mail, BarChart2, ArrowRight } from 'lucide-react';

export default function CampaignsPage() {
  const t = useTranslations('campaigns');
  const locale = useLocale();
  const { campaigns, loading } = useCampaigns();

  return (
    <AppShell title={t('title')}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {campaigns.length} campagne{campaigns.length !== 1 ? 's' : ''}
          </p>
          <Link href={`/${locale}/campaigns/new`} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> {t('create')}
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="card p-5 flex items-center gap-4">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-48" />
                  <div className="skeleton h-3 w-32" />
                </div>
                <div className="skeleton h-6 w-20" />
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="card p-16 text-center">
            <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">{t('noCampaigns')}</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Créez votre première campagne email pour commencer.
            </p>
            <Link href={`/${locale}/campaigns/new`} className="btn-primary inline-flex">
              <Plus size={16} /> {t('create')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/${locale}/campaigns/${campaign.id}`}
                className="card p-5 flex items-center gap-4 hover:shadow-md transition-all duration-200 hover:border-primary/20 group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {campaign.name}
                    </p>
                    <CampaignStatusBadge status={campaign.status} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{campaign.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {campaign.sentAt
                      ? `Envoyée le ${format(campaign.sentAt, 'dd MMM yyyy', { locale: locale === 'fr' ? fr : undefined })}`
                      : `Créée le ${format(campaign.createdAt, 'dd MMM yyyy', { locale: locale === 'fr' ? fr : undefined })}`
                    }
                  </p>
                </div>

                {/* Stats */}
                {campaign.status === 'sent' && (
                  <div className="hidden sm:flex items-center gap-6 text-center">
                    <div>
                      <p className="text-sm font-semibold">{(campaign.stats?.sent || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Envoyés</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-600">
                        {(campaign.stats?.sent || 0) > 0
                          ? `${Math.round(((campaign.stats?.opened || 0) / (campaign.stats?.sent || 1)) * 100)}%`
                          : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">Ouverture</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-600">
                        {(campaign.stats?.sent || 0) > 0
                          ? `${Math.round(((campaign.stats?.clicked || 0) / (campaign.stats?.sent || 1)) * 100)}%`
                          : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">Clics</p>
                    </div>
                  </div>
                )}

                <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
