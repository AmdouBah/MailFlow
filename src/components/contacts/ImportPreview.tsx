'use client';

import { useState } from 'react';
import type { CsvRow } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImportPreviewProps {
  rows: CsvRow[];
}

const PAGE_SIZE = 10;

export function ImportPreview({ rows }: ImportPreviewProps) {
  const [page, setPage] = useState(0);
  if (!rows.length) return null;

  const allKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  // Colonnes standard en premier
  const standardOrder = ['email', 'firstName', 'lastName', 'phone', 'company'];
  const orderedKeys = [
    ...standardOrder.filter((k) => allKeys.includes(k)),
    ...allKeys.filter((k) => !standardOrder.includes(k)),
  ];

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const headerLabels: Record<string, string> = {
    email: 'Email',
    firstName: 'Prénom',
    lastName: 'Nom',
    phone: 'Téléphone',
    company: 'Entreprise',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Prévisualisation —{' '}
          <span className="text-primary font-semibold">{rows.length}</span> lignes détectées
        </p>
        {orderedKeys.length > 5 && (
          <span className="text-xs badge badge-blue">
            +{orderedKeys.length - 5} champs personnalisés
          </span>
        )}
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th className="w-8 text-center">#</th>
              {orderedKeys.slice(0, 8).map((key) => (
                <th key={key}>
                  {headerLabels[key] || key}
                  {!Object.keys(headerLabels).includes(key) && (
                    <span className="ml-1 badge badge-blue text-[10px] py-0">custom</span>
                  )}
                </th>
              ))}
              {orderedKeys.length > 8 && (
                <th className="text-muted-foreground">+{orderedKeys.length - 8} autres</th>
              )}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i}>
                <td className="text-center text-muted-foreground text-xs">
                  {page * PAGE_SIZE + i + 1}
                </td>
                {orderedKeys.slice(0, 8).map((key) => (
                  <td key={key} className="max-w-[160px] truncate">
                    {row[key] || (
                      <span className="text-muted-foreground/50 text-xs italic">—</span>
                    )}
                  </td>
                ))}
                {orderedKeys.length > 8 && <td />}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} sur {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
