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

function safeFormatDate(d: any, fmtStr: string): string {
  if (!d) return '—';
  try {
    const dateObj = typeof d?.toDate === 'function' ? d.toDate() : new Date(d);
    if (isNaN(dateObj.getTime())) return '—';
    return format(dateObj, fmtStr, { locale: fr });
  } catch {
    return '—';
  }
}

export default function CampaignDetailPage() {
  const params = useParams();
  const locale = useLocale();
  const id = params.id as string;
  const { campaign, loading } = useCampaignLive(id);
  const [emailRecords, setEmailRecords] = useState<EmailRecord[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  useEffect(() => {
    if (campaign?.status === 'sent' || campaign?.status === 'failed') {
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

  const stats = campaign.stats || { sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, replied: 0 };
  const sentCount = stats.sent || 0;
  const openedCount = stats.opened || 0;
  const clickedCount = stats.clicked || 0;

  const openRate = sentCount > 0 ? Math.round((openedCount / sentCount) * 100) : 0;
  const clickRate = sentCount > 0 ? Math.round((clickedCount / sentCount) * 100) : 0;

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

        {/* Banner d'erreur si la campagne a échoué */}
        {(campaign.status === 'failed' || campaign.errorMessage) && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-red-900 dark:text-red-200">
                Échec de l&apos;envoi de la campagne
              </h4>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                {campaign.errorMessage || "L'envoi des emails a échoué. Vérifiez vos identifiants SMTP (mot de passe d'application ou clé API) dans Paramètres > Configuration email."}
              </p>
              <div className="mt-2">
                <Link
                  href={`/${locale}/settings`}
                  className="text-xs font-semibold underline text-red-800 dark:text-red-300 hover:text-red-900"
                >
                  Aller vérifier mes paramètres SMTP →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Send progress (if sending/paused) */}
        {(campaign.status === 'sending' || campaign.status === 'paused') && (
          <SendProgress campaignId={id} />
        )}

        {/* Stats */}
        {(campaign.status === 'sent' || campaign.status === 'failed') && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Envoyés', value: sentCount, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Ouvertures', value: `${openRate}%`, sub: `${openedCount}`, icon: Eye, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Clics', value: `${clickRate}%`, sub: `${clickedCount}`, icon: MousePointer, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Bounces', value: stats.bounced || 0, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Désabonnés', value: stats.unsubscribed || 0, icon: UserMinus, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Réponses', value: stats.replied || 0, icon: Mail, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div key={label} className="card p-4">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                  <Icon size={16} className={color} />
                </div>
                <p className="text-xl font-bold">{value}</p>
                {sub !== undefined && <p className="text-xs text-muted-foreground">{sub} contacts</p>}
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Email records table */}
        {(campaign.status === 'sent' || campaign.status === 'failed') && (
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
                          {safeFormatDate(rec.sentAt, 'dd/MM HH:mm')}
                        </td>
                        <td>
                          {rec.openedAt ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle size={12} />
                              {safeFormatDate(rec.openedAt, 'HH:mm')}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td>
                          {rec.clickedAt ? (
                            <span className="flex items-center gap-1 text-xs text-blue-600">
                              <MousePointer size={12} />
                              {safeFormatDate(rec.clickedAt, 'HH:mm')}
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
                          ) : rec.status === 'failed' ? (
                            <div>
                              <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                                <XCircle size={12} /> Échec
                              </span>
                              {rec.errorMessage && (
                                <p className="text-[10px] text-red-500 max-w-xs mt-0.5">{rec.errorMessage}</p>
                              )}
                            </div>
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
              { label: 'Créée le', value: safeFormatDate(campaign.createdAt, 'dd/MM/yyyy HH:mm') },
              { label: 'Envoyée le', value: safeFormatDate(campaign.sentAt, 'dd/MM/yyyy HH:mm') },
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
