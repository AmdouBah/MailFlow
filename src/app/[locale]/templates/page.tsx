'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/layout/AppShell';
import { getTemplates, createTemplate, deleteTemplate } from '@/lib/firebase/firestore';
import { EmailEditor } from '@/components/campaigns/EmailEditor';
import type { EmailTemplate } from '@/types';
import { Plus, Trash2, FileText, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TemplatesPage() {
  const t = useTranslations('templates');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('<p>Bonjour {{prénom}},</p><br/><p>Cordialement</p>');
  const [preview, setPreview] = useState<EmailTemplate | null>(null);

  async function load() {
    setLoading(true);
    const data = await getTemplates();
    setTemplates(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newName.trim() || !newContent) return;
    await createTemplate(newName.trim(), newContent);
    setCreating(false);
    setNewName('');
    setNewContent('<p>Bonjour {{prénom}},</p><br/><p>Cordialement</p>');
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce template ?')) return;
    await deleteTemplate(id);
    load();
  }

  if (creating) {
    return (
      <AppShell title={t('title')}>
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="flex items-center gap-4">
            <button onClick={() => setCreating(false)} className="btn-secondary flex items-center gap-2">
              <X size={16} /> Annuler
            </button>
            <h2 className="font-semibold">Nouveau template</h2>
          </div>
          <div className="card p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="label">{t('name')}</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="input" placeholder="Newsletter standard" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="label">Contenu</label>
              <EmailEditor
                content={newContent}
                onChange={setNewContent}
                availableVariables={['prénom', 'nom', 'email', 'entreprise', 'unsubscribe_link']}
              />
            </div>
            <div className="flex justify-end">
              <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
                <Check size={16} /> Sauvegarder
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t('title')}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
          <button onClick={() => setCreating(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> {t('create')}
          </button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3].map((i) => <div key={i} className="card p-5 skeleton h-40" />)}
          </div>
        ) : templates.length === 0 ? (
          <div className="card p-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">{t('noTemplates')}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div key={tpl.id} className="card overflow-hidden hover:shadow-md transition-shadow group">
                {/* Preview */}
                <div
                  className="h-40 p-4 text-xs overflow-hidden bg-slate-50 border-b border-border pointer-events-none"
                  dangerouslySetInnerHTML={{ __html: tpl.htmlContent }}
                />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{tpl.name}</p>
                    <button onClick={() => handleDelete(tpl.id)} className="p-1 hover:bg-red-50 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(tpl.createdAt, 'dd/MM/yyyy', { locale: fr })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
