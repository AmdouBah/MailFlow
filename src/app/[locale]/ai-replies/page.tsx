'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/layout/AppShell';
import { getAiReplies, updateAiReply } from '@/lib/firebase/firestore';
import type { AiReply } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bot, CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react';

const STATUS_MAP = {
  pending: { label: 'En attente', className: 'badge-yellow', icon: Clock },
  approved: { label: 'Approuvée', className: 'badge-blue', icon: CheckCircle },
  sent: { label: 'Envoyée', className: 'badge-green', icon: CheckCircle },
  rejected: { label: 'Rejetée', className: 'badge-red', icon: XCircle },
};

export default function AiRepliesPage() {
  const t = useTranslations('aiReplies');
  const [replies, setReplies] = useState<AiReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AiReply | null>(null);

  async function load() {
    setLoading(true);
    const data = await getAiReplies(50);
    setReplies(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(reply: AiReply) {
    await updateAiReply(reply.id, { status: 'approved' });
    // Envoyer via API
    await fetch('/api/ai/reply/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replyId: reply.id }),
    });
    load();
  }

  async function handleReject(reply: AiReply) {
    await updateAiReply(reply.id, { status: 'rejected' });
    load();
  }

  return (
    <AppShell title={t('title')}>
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="card p-5 skeleton h-24" />)}
          </div>
        ) : replies.length === 0 ? (
          <div className="card p-16 text-center">
            <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">{t('noReplies')}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Les réponses automatiques IA apparaîtront ici quand des contacts répondront à vos emails.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {replies.map((reply) => {
              const statusInfo = STATUS_MAP[reply.status];
              const StatusIcon = statusInfo.icon;
              return (
                <div key={reply.id} className="card p-5 space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{reply.contactEmail}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(reply.createdAt, 'dd MMM yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <span className={`badge ${statusInfo.className} flex items-center gap-1`}>
                      <StatusIcon size={10} />
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <MessageSquare size={10} /> Message reçu
                      </p>
                      <p className="text-xs text-foreground line-clamp-3">{reply.incomingMessage}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <p className="text-xs font-medium text-blue-600 mb-1 flex items-center gap-1">
                        <Bot size={10} /> Réponse IA
                      </p>
                      <p className="text-xs text-foreground line-clamp-3">{reply.aiResponse}</p>
                    </div>
                  </div>

                  {reply.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(reply)}
                        className="btn-primary flex-1 text-xs py-1.5"
                      >
                        <CheckCircle size={12} /> {t('approve')}
                      </button>
                      <button
                        onClick={() => handleReject(reply)}
                        className="btn-secondary flex-1 text-xs py-1.5 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle size={12} /> {t('reject')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
