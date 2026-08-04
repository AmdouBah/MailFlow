'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useContacts } from '@/hooks/useContacts';
import { AppShell } from '@/components/layout/AppShell';
import { deleteContact, updateContact } from '@/lib/firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Upload, Search, ChevronLeft, ChevronRight, Trash2,
  MoreHorizontal, Filter, Users, RefreshCw,
} from 'lucide-react';
import type { ContactStatus } from '@/types';

const STATUS_COLORS: Record<ContactStatus, string> = {
  active: 'badge-green',
  unsubscribed: 'badge-gray',
  bounced: 'badge-red',
  invalid: 'badge-yellow',
};

const STATUS_LABELS: Record<ContactStatus, string> = {
  active: 'Actif',
  unsubscribed: 'Désabonné',
  bounced: 'Bounced',
  invalid: 'Invalide',
};

export default function ContactsPage() {
  const locale = useLocale();
  const t = useTranslations('contacts');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [listFilter, setListFilter] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const { contacts, lists, loading, error, refresh } = useContacts({
    status: statusFilter || undefined,
    listId: listFilter || undefined,
  });

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.email.includes(q) ||
      c.firstName?.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageContacts = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce contact ?')) return;
    await deleteContact(id);
    refresh();
  }

  return (
    <AppShell title={t('title')}>
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder={t('search')}
              className="input pl-9 pr-4"
            />
          </div>

          {/* Filters */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="input w-auto min-w-[140px]"
          >
            <option value="">{t('allStatuses')}</option>
            <option value="active">{t('statusActive')}</option>
            <option value="unsubscribed">{t('statusUnsubscribed')}</option>
            <option value="bounced">{t('statusBounced')}</option>
            <option value="invalid">{t('statusInvalid')}</option>
          </select>

          <select
            value={listFilter}
            onChange={(e) => { setListFilter(e.target.value); setPage(0); }}
            className="input w-auto min-w-[140px]"
          >
            <option value="">{t('allLists')}</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 sm:ml-auto">
            <button onClick={refresh} className="btn-secondary p-2" title="Actualiser">
              <RefreshCw size={16} />
            </button>
            <Link href={`/${locale}/contacts/import`} className="btn-primary flex items-center gap-2">
              <Upload size={16} />
              <span>{t('import')}</span>
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users size={14} />
          <span>
            <strong className="text-foreground">{filtered.length}</strong> {t('total')}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  {['Email', 'Prénom', 'Nom', 'Entreprise', 'Statut', 'Créé le'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {[1,2,3,4,5].map((i) => (
                  <tr key={i}>
                    {[1,2,3,4,5,6,7].map((j) => (
                      <td key={j}><div className="skeleton h-4 w-full max-w-[120px]" /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div className="card p-8 text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={refresh} className="btn-secondary mt-3 mx-auto">Réessayer</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('noContacts')}</p>
            <Link href={`/${locale}/contacts/import`} className="btn-primary mt-4 inline-flex">
              <Upload size={16} /> {t('import')}
            </Link>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('email')}</th>
                    <th>{t('firstName')}</th>
                    <th>{t('lastName')}</th>
                    <th>{t('company')}</th>
                    <th>{t('status')}</th>
                    <th>{t('lists')}</th>
                    <th>{t('createdAt')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pageContacts.map((contact) => (
                    <tr key={contact.id}>
                      <td className="font-medium text-foreground max-w-[180px] truncate">
                        {contact.email}
                      </td>
                      <td>{contact.firstName || '—'}</td>
                      <td>{contact.lastName || '—'}</td>
                      <td className="max-w-[120px] truncate">{contact.company || '—'}</td>
                      <td>
                        <span className={STATUS_COLORS[contact.status]}>
                          {STATUS_LABELS[contact.status]}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {contact.lists.slice(0, 2).map((listId) => {
                            const list = lists.find((l) => l.id === listId);
                            return list ? (
                              <span key={listId} className="badge badge-blue text-[10px]">
                                {list.name}
                              </span>
                            ) : null;
                          })}
                          {contact.lists.length > 2 && (
                            <span className="badge badge-gray text-[10px]">
                              +{contact.lists.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-muted-foreground text-xs">
                        {format(contact.createdAt, 'dd/MM/yyyy', { locale: locale === 'fr' ? fr : undefined })}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} sur {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-2">{page + 1} / {totalPages}</span>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page === totalPages - 1}
                    className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
