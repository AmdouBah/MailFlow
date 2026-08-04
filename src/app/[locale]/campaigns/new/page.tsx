'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { AppShell } from '@/components/layout/AppShell';
import { EmailEditor } from '@/components/campaigns/EmailEditor';
import { getLists, createCampaign, getTemplates } from '@/lib/firebase/firestore';
import { getAvailableVariables } from '@/lib/email/templates';
import type { ContactList, EmailTemplate } from '@/types';
import {
  CheckCircle, ChevronRight, Send, Calendar, Monitor, Smartphone,
  Save, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const STEPS = [
  { id: 1, label: 'Paramètres' },
  { id: 2, label: 'Contenu' },
  { id: 3, label: 'Envoi' },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const locale = useLocale();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [preview, setPreview] = useState<'desktop' | 'mobile'>('desktop');
  const [showConfirm, setShowConfirm] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [contactCount, setContactCount] = useState(0);

  const [form, setForm] = useState({
    name: '',
    subject: '',
    fromName: '',
    fromEmail: '',
    listId: '',
    htmlContent: '<p>Bonjour {{prénom}},</p><p><br/></p><p>Cordialement</p>',
  });

  useEffect(() => {
    Promise.all([getLists(), getTemplates()]).then(([l, t]) => {
      setLists(l);
      setTemplates(t);
    });
  }, []);

  useEffect(() => {
    if (form.listId) {
      // Récupérer le nombre de contacts de cette liste
      const list = lists.find((l) => l.id === form.listId);
      setContactCount(list?.contactCount || 0);
    }
  }, [form.listId, lists]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function applyTemplate(t: EmailTemplate) {
    setForm((prev) => ({ ...prev, htmlContent: t.htmlContent }));
  }

  async function saveDraft() {
    setSaving(true);
    try {
      const id = await createCampaign({
        ...form,
        status: 'draft',
        fromName: form.fromName,
        fromEmail: form.fromEmail,
      } as any);
      router.push(`/${locale}/campaigns/${id}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    setSaving(true);
    try {
      const id = await createCampaign({
        ...form,
        status: 'draft',
        fromName: form.fromName,
        fromEmail: form.fromEmail,
      } as any);

      if (scheduleMode && scheduledAt) {
        await fetch('/api/campaigns/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: id, scheduledAt }),
        });
      } else {
        await fetch('/api/campaigns/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: id }),
        });
      }

      router.push(`/${locale}/campaigns/${id}`);
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  }

  const canProceed = {
    1: form.name && form.subject && form.fromName && form.fromEmail && form.listId,
    2: form.htmlContent.length > 20,
    3: true,
  };

  return (
    <AppShell title="Nouvelle campagne">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => s.id < step && setStep(s.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  step === s.id
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : step > s.id
                    ? 'text-primary hover:bg-primary/10 cursor-pointer'
                    : 'text-muted-foreground cursor-default'
                )}
              >
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  step === s.id ? 'bg-white/20' : step > s.id ? 'bg-primary/20' : 'bg-secondary'
                )}>
                  {step > s.id ? <CheckCircle size={14} /> : s.id}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="text-border mx-1" size={16} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Settings */}
        {step === 1 && (
          <div className="card p-6 space-y-5 animate-fade-in">
            <h2 className="font-semibold text-lg">Paramètres de la campagne</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="label">Nom de la campagne *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  className="input"
                  placeholder="Ex: Newsletter Juillet 2025"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="label">
                  Objet de l'email *
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    (variables supportées : {'{{prénom}}'}, etc.)
                  </span>
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => update('subject', e.target.value)}
                  className="input"
                  placeholder="Bonjour {{prénom}}, voici votre offre du mois"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label">Nom expéditeur *</label>
                <input
                  type="text"
                  value={form.fromName}
                  onChange={(e) => update('fromName', e.target.value)}
                  className="input"
                  placeholder="Mon Entreprise"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label">Email expéditeur *</label>
                <input
                  type="email"
                  value={form.fromEmail}
                  onChange={(e) => update('fromEmail', e.target.value)}
                  className="input"
                  placeholder="contact@monentreprise.com"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="label">Liste cible *</label>
                <select
                  value={form.listId}
                  onChange={(e) => update('listId', e.target.value)}
                  className="input"
                >
                  <option value="">Sélectionner une liste...</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.contactCount} contacts)
                    </option>
                  ))}
                </select>
                {form.listId && (
                  <p className="text-xs text-muted-foreground">
                    {contactCount} contacts actifs recevront cet email
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Editor */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            {/* Templates */}
            {templates.length > 0 && (
              <div className="card p-4">
                <p className="text-sm font-medium mb-3">Templates disponibles</p>
                <div className="flex gap-2 flex-wrap">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Contenu de l'email</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreview('desktop')}
                    className={cn('p-1.5 rounded', preview === 'desktop' ? 'bg-secondary' : 'hover:bg-secondary')}
                    title="Aperçu desktop"
                  ><Monitor size={16} /></button>
                  <button
                    onClick={() => setPreview('mobile')}
                    className={cn('p-1.5 rounded', preview === 'mobile' ? 'bg-secondary' : 'hover:bg-secondary')}
                    title="Aperçu mobile"
                  ><Smartphone size={16} /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div>
                  <EmailEditor
                    content={form.htmlContent}
                    onChange={(html) => update('htmlContent', html)}
                    availableVariables={['prénom', 'nom', 'email', 'entreprise', 'unsubscribe_link']}
                  />
                </div>
                {/* Preview */}
                <div className="hidden xl:block">
                  <div className={cn(
                    'border border-border rounded-lg overflow-hidden mx-auto',
                    preview === 'mobile' ? 'max-w-[380px]' : 'w-full'
                  )}>
                    <div className="bg-secondary/50 px-4 py-2 text-xs text-muted-foreground border-b border-border">
                      {preview === 'mobile' ? '📱 Mobile' : '🖥️ Desktop'} — Aperçu
                    </div>
                    <div
                      className="p-4 min-h-[300px] text-sm"
                      dangerouslySetInnerHTML={{ __html: form.htmlContent }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Send */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-lg">Récapitulatif avant envoi</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-secondary/50 space-y-1">
                  <p className="text-xs text-muted-foreground">Campagne</p>
                  <p className="font-medium">{form.name}</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/50 space-y-1">
                  <p className="text-xs text-muted-foreground">Objet</p>
                  <p className="font-medium">{form.subject}</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/50 space-y-1">
                  <p className="text-xs text-muted-foreground">Expéditeur</p>
                  <p className="font-medium">{form.fromName} &lt;{form.fromEmail}&gt;</p>
                </div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                  <p className="text-xs text-primary/70">Destinataires</p>
                  <p className="text-xl font-bold text-primary">{contactCount.toLocaleString('fr-FR')}</p>
                  <p className="text-xs text-primary/70">contacts actifs</p>
                </div>
              </div>

              <div className="border border-border rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setScheduleMode(false)}
                    className={cn(
                      'flex-1 p-3 rounded-lg border-2 transition-all text-sm font-medium',
                      !scheduleMode ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Send size={16} className="mx-auto mb-1" />
                    Envoyer maintenant
                  </button>
                  <button
                    onClick={() => setScheduleMode(true)}
                    className={cn(
                      'flex-1 p-3 rounded-lg border-2 transition-all text-sm font-medium',
                      scheduleMode ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Calendar size={16} className="mx-auto mb-1" />
                    Planifier
                  </button>
                </div>

                {scheduleMode && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="label">Date et heure d'envoi</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="input"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Confirm modal */}
            {showConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirm(false)} />
                <div className="relative card p-6 max-w-sm w-full space-y-4 shadow-2xl">
                  <h3 className="font-semibold text-lg">Confirmer l'envoi</h3>
                  <p className="text-sm text-muted-foreground">
                    Vous allez envoyer cet email à{' '}
                    <strong className="text-foreground">{contactCount} contacts</strong>.
                    Cette action est irréversible.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1">
                      Annuler
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={saving}
                      className="btn-primary flex-1"
                    >
                      {saving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : scheduleMode ? 'Planifier' : 'Envoyer'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : router.push(`/${locale}/campaigns`)}
            className="btn-secondary"
          >
            Retour
          </button>

          <div className="flex items-center gap-3">
            {step === 2 && (
              <button onClick={saveDraft} disabled={saving} className="btn-secondary flex items-center gap-2">
                <Save size={14} /> Sauvegarder brouillon
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed[step as 1 | 2 | 3]}
                className="btn-primary"
              >
                Suivant <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={saving || (scheduleMode && !scheduledAt)}
                className="btn-primary flex items-center gap-2 px-6"
              >
                {scheduleMode ? <Calendar size={16} /> : <Send size={16} />}
                {scheduleMode ? 'Planifier' : 'Envoyer maintenant'}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
