'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useCampaignLive } from '@/hooks/useCampaigns';
import { AppShell } from '@/components/layout/AppShell';
import { SendProgress } from '@/components/campaigns/SendProgress';
import { CampaignStatusBadge } from '@/components/campaigns/CampaignStatusBadge';
import { getCampaignEmails } from '@/lib/firebase/firestore';
import type { EmailRecord } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, Mail, Eye, MousePointer, AlertTriangle, UserMinus, CheckCircle, XCircle } from 'lucide-react';

export default function CampaignDetailPage() {
  const params = useParams();
  const locale = useLocale();
  const id = params.id as string;
  const { campaign, loading } = useCampaignLive(id);
  const [emailRecords, setEmailRecords] = useState<EmailRecord[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  useEffect(() => {
    if (campaign?.status === 'sent') {
      setLoadingEmails(true);
      getCampaignEmails(id).then((r) => {
        setEmailRecords(r);
        setLoadingEmails(false);
      });
    }
  }, [id, campaign?.status]);

  if (loading || !campaign) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  const openRate = campaign.stats.sent > 0
    ? Math.round((campaign.stats.opened / campaign.stats.sent) * 100) : 0;
  const clickRate = campaign.stats.sent > 0
    ? Math.round((campaign.stats.clicked / campaign.stats.sent) * 100) : 0;

  return (
    <AppShell title={campaign.name}>
      <div className="space-y-6">
        {/* Back + header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link
            href={`/${locale}/campaigns`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} /> Campagnes
          </Link>
          <div className="sm:ml-auto">
            <CampaignStatusBadge status={campaign.status} />
          </div>
        </div>

        {/* Send progress (if sending/paused) */}
        {(campaign.status === 'sending' || campaign.status === 'paused') && (
          <SendProgress campaignId={id} />
        )}

        {/* Stats */}
        {campaign.status === 'sent' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Envoyés', value: campaign.stats.sent, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Ouvertures', value: `${openRate}%`, sub: `${campaign.stats.opened}`, icon: Eye, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Clics', value: `${clickRate}%`, sub: `${campaign.stats.clicked}`, icon: MousePointer, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Bounces', value: campaign.stats.bounced, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Désabonnés', value: campaign.stats.unsubscribed, icon: UserMinus, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Réponses', value: campaign.stats.replied, icon: Mail, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div key={label} className="card p-4">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                  <Icon size={16} className={color} />
                </div>
                <p className="text-xl font-bold">{value}</p>
                {sub && <p className="text-xs text-muted-foreground">{sub} contacts</p>}
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Email records table */}
        {campaign.status === 'sent' && (
          <div className="card">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Détail par contact ({emailRecords.length})</h3>
            </div>
            {loadingEmails ? (
              <div className="p-8 text-center">
                <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Envoyé</th>
                      <th>Ouvert</th>
                      <th>Cliqué</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailRecords.slice(0, 50).map((rec) => (
                      <tr key={rec.id}>
                        <td className="font-mono text-xs">{rec.email}</td>
                        <td className="text-xs text-muted-foreground">
                          {rec.sentAt ? format(rec.sentAt, 'dd/MM HH:mm', { locale: fr }) : '—'}
                        </td>
                        <td>
                          {rec.openedAt ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle size={12} />
                              {format(rec.openedAt, 'HH:mm')}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td>
                          {rec.clickedAt ? (
                            <span className="flex items-center gap-1 text-xs text-blue-600">
                              <MousePointer size={12} />
                              {format(rec.clickedAt, 'HH:mm')}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td>
                          {rec.status === 'bounced' ? (
                            <span className="flex items-center gap-1 text-xs text-red-600">
                              <XCircle size={12} /> Bounced
                            </span>
                          ) : (
                            <span className={`badge ${
                              rec.status === 'clicked' ? 'badge-blue' :
                              rec.status === 'opened' ? 'badge-green' : 'badge-gray'
                            } text-[10px]`}>
                              {rec.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Campaign info */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Informations</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Objet', value: campaign.subject },
              { label: 'Expéditeur', value: `${campaign.fromName} <${campaign.fromEmail}>` },
              { label: 'Créée le', value: format(campaign.createdAt, 'dd/MM/yyyy HH:mm', { locale: fr }) },
              { label: 'Envoyée le', value: campaign.sentAt ? format(campaign.sentAt, 'dd/MM/yyyy HH:mm', { locale: fr }) : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </AppShell>
  );
}
