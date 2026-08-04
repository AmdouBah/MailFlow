'use client';

import type { CampaignStatus } from '@/types';

const STATUS_MAP: Record<CampaignStatus | 'failed', { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'badge-gray' },
  scheduled: { label: 'Planifiée', className: 'badge-blue' },
  sending: { label: 'En cours', className: 'badge-yellow' },
  sent: { label: 'Envoyée', className: 'badge-green' },
  paused: { label: 'En pause', className: 'badge-yellow' },
  cancelled: { label: 'Annulée', className: 'badge-red' },
  failed: { label: 'Échec', className: 'badge-red' },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus | 'failed' }) {
  const { label, className } = STATUS_MAP[status] || STATUS_MAP.draft;
  return (
    <span className={`badge ${className} whitespace-nowrap`}>
      {status === 'sending' && (
        <span className="mr-1 inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {label}
    </span>
  );
}
