'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { getLists, createList, deleteList, updateList } from '@/lib/firebase/firestore';
import type { ContactList } from '@/types';
import { Plus, Trash2, Edit2, List, Users, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ListsPage() {
  const t = useTranslations('lists');
  const locale = useLocale();
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  async function load() {
    setLoading(true);
    const data = await getLists();
    setLists(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    await createList(newName.trim(), newDesc.trim());
    setCreating(false);
    setNewName('');
    setNewDesc('');
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(t('deleteConfirm'))) return;
    await deleteList(id);
    load();
  }

  async function handleEdit(id: string) {
    if (!editName.trim()) return;
    await updateList(id, { name: editName.trim() });
    setEditId(null);
    load();
  }

  return (
    <AppShell title={t('title')}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{lists.length} liste{lists.length !== 1 ? 's' : ''}</p>
          <button onClick={() => setCreating(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> {t('create')}
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <div className="card p-5 space-y-3 animate-fade-in border-primary/30">
            <h3 className="font-medium">Nouvelle liste</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('name')}
              className="input"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder={t('description') + ' (optionnel)'}
              className="input"
            />
            <div className="flex gap-2">
              <button onClick={handleCreate} className="btn-primary">Créer</button>
              <button onClick={() => setCreating(false)} className="btn-secondary">Annuler</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3].map((i) => <div key={i} className="card p-5 skeleton h-28" />)}
          </div>
        ) : lists.length === 0 ? (
          <div className="card p-16 text-center">
            <List className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold">{t('noLists')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('createFirst')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {lists.map((list) => (
              <div key={list.id} className="card p-5 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  {editId === list.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input flex-1 h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleEdit(list.id)}
                      />
                      <button onClick={() => handleEdit(list.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditId(null)} className="p-1 text-muted-foreground hover:bg-secondary rounded">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <h3 className="font-medium text-foreground">{list.name}</h3>
                  )}
                  {editId !== list.id && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditId(list.id); setEditName(list.name); }} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                        <Edit2 size={13} className="text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(list.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                  )}
                </div>

                {list.description && (
                  <p className="text-xs text-muted-foreground">{list.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <Link
                    href={`/${locale}/contacts?list=${list.id}`}
                    className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                    title="Voir les contacts de cette liste"
                  >
                    <Users size={14} className="text-primary" />
                    {list.contactCount.toLocaleString('fr-FR')} {t('contacts')}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {format(list.createdAt, 'dd/MM/yyyy', { locale: locale === 'fr' ? fr : undefined })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
