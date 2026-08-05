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
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('prospect@example.com');
  const [testName, setTestName] = useState('Jean Dupont');
  const [testMessage, setTestMessage] = useState('Bonjour, je suis intéressé par votre solution. Quel est votre tarif ?');
  const [sendingTest, setSendingTest] = useState(false);

  async function load() {
    setLoading(true);
    const data = await getAiReplies(50);
    setReplies(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSendTestReply(e: React.FormEvent) {
    e.preventDefault();
    setSendingTest(true);
    try {
      const res = await fetch('/api/ai/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: 'test_contact',
          contactEmail: testEmail,
          contactName: testName,
          incomingMessage: testMessage,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(`Erreur : ${errData.error || 'Impossible de générer la réponse IA. Vérifiez votre clé API dans Paramètres > Configuration IA.'}`);
      } else {
        setShowTestModal(false);
        setTestMessage('');
        load();
      }
    } catch (err) {
      alert('Erreur réseau ou serveur lors de la simulation.');
    } finally {
      setSendingTest(false);
    }
  }

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
              Les réponses automatiques IA apparaîtront ici quand des contacts répondront.
            </p>
            <button
              onClick={() => setShowTestModal(true)}
              className="btn-primary text-xs mt-4 mx-auto flex items-center gap-2"
            >
              <Bot size={14} /> Simuler une réponse de test
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowTestModal(true)}
                className="btn-secondary text-xs flex items-center gap-2"
              >
                <Bot size={14} /> Simuler une réponse de test
              </button>
            </div>
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
        </div>
      )}

        {/* Modal Simuler une réponse de test */}
        {showTestModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" /> Simuler une réponse prospect
                </h3>
                <button
                  onClick={() => setShowTestModal(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendTestReply} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Nom du contact (ex: Jean Dupont)
                  </label>
                  <input
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    className="input w-full text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Email du contact
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="input w-full text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Message reçu par le prospect
                  </label>
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="input w-full text-xs h-24"
                    placeholder="Tapez un message de test..."
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTestModal(false)}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={sendingTest}
                    className="btn-primary text-xs px-4 py-1.5 flex items-center gap-2"
                  >
                    {sendingTest ? 'Génération IA en cours...' : 'Tester l’IA'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
