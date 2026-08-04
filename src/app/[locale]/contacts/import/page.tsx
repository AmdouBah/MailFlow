'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { AppShell } from '@/components/layout/AppShell';
import { ImportDropzone } from '@/components/contacts/ImportDropzone';
import { ImportPreview } from '@/components/contacts/ImportPreview';
import { getLists, createList } from '@/lib/firebase/firestore';
import { useRouter } from 'next/navigation';
import type { CsvRow, ImportResult } from '@/types';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

export default function ImportPage() {
  const t = useTranslations('import');
  const locale = useLocale();
  const router = useRouter();

  const [rows, setRows] = useState<CsvRow[]>([]);
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [newListName, setNewListName] = useState('');
  const [showNewList, setShowNewList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function loadLists() {
    const l = await getLists();
    setLists(l.map((x) => ({ id: x.id, name: x.name })));
  }

  // Load lists on mount
  useState(() => { loadLists(); });

  async function handleImport() {
    if (!rows.length) return;
    setLoading(true);
    try {
      let listIds: string[] = [];

      // Créer nouvelle liste si demandé
      if (showNewList && newListName.trim()) {
        const newId = await createList(newListName.trim());
        listIds = [newId];
      } else if (selectedListId) {
        listIds = [selectedListId];
      }

      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, listIds }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ imported: 0, duplicates: 0, errors: rows.length, errorDetails: ['Erreur réseau'] });
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <AppShell title={t('title')}>
        <div className="max-w-lg mx-auto">
          <div className="card p-8 text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-4">Import terminé</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50">
                  <span className="text-sm text-emerald-800 flex items-center gap-2">
                    <CheckCircle size={16} /> Contacts importés
                  </span>
                  <span className="font-bold text-emerald-700">{result.imported}</span>
                </div>
                {result.duplicates > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50">
                    <span className="text-sm text-yellow-800 flex items-center gap-2">
                      <AlertCircle size={16} /> Doublons ignorés
                    </span>
                    <span className="font-bold text-yellow-700">{result.duplicates}</span>
                  </div>
                )}
                {result.errors > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                    <span className="text-sm text-red-800 flex items-center gap-2">
                      <XCircle size={16} /> Erreurs
                    </span>
                    <span className="font-bold text-red-700">{result.errors}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setResult(null)} className="btn-secondary flex-1">
                Nouvel import
              </button>
              <Link href={`/${locale}/contacts`} className="btn-primary flex-1 text-center">
                Voir les contacts
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t('title')}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back */}
        <Link
          href={`/${locale}/contacts`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> {t('back')}
        </Link>

        {/* Dropzone */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-foreground">1. Choisissez votre fichier CSV</h2>
          <ImportDropzone onParsed={setRows} />
        </div>

        {/* Preview */}
        {rows.length > 0 && (
          <div className="card p-6 space-y-4 animate-fade-in">
            <ImportPreview rows={rows} />
          </div>
        )}

        {/* List selection */}
        {rows.length > 0 && (
          <div className="card p-6 space-y-4 animate-fade-in">
            <h2 className="font-semibold text-foreground">2. Ajouter à une liste (optionnel)</h2>

            {!showNewList ? (
              <div className="flex gap-3">
                <select
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="input flex-1"
                >
                  <option value="">Aucune liste</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewList(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Plus size={16} /> Nouvelle liste
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Nom de la nouvelle liste..."
                  className="input flex-1"
                  autoFocus
                />
                <button onClick={() => setShowNewList(false)} className="btn-secondary">
                  Annuler
                </button>
              </div>
            )}
          </div>
        )}

        {/* Import button */}
        {rows.length > 0 && (
          <div className="flex justify-end animate-fade-in">
            <button
              onClick={handleImport}
              disabled={loading}
              className="btn-primary px-8 py-3 text-base"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Import en cours...
                </>
              ) : (
                `Importer ${rows.length} contacts`
              )}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
