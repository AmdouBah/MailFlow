'use client';

import { useCampaignLive } from '@/hooks/useCampaigns';
import { Pause, Play, X } from 'lucide-react';

interface SendProgressProps {
  campaignId: string;
}

export function SendProgress({ campaignId }: SendProgressProps) {
  const { campaign } = useCampaignLive(campaignId);

  if (!campaign || !campaign.batchProgress) return null;

  const { total, sent, failed, currentBatch } = campaign.batchProgress;
  const totalBatches = Math.ceil(total / 50);
  const progress = total > 0 ? Math.round((sent / total) * 100) : 0;

  async function handlePause() {
    await fetch('/api/campaigns/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, action: campaign?.status === 'paused' ? 'resume' : 'pause' }),
    });
  }

  const isSending = campaign.status === 'sending';
  const isPaused = campaign.status === 'paused';

  return (
    <div className="card p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">
            {isPaused ? '⏸ Envoi en pause' : '📤 Envoi en cours...'}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Batch {currentBatch} / {totalBatches} — 50 emails/batch
          </p>
        </div>
        {(isSending || isPaused) && (
          <button
            onClick={handlePause}
            className={`btn-secondary flex items-center gap-2 text-sm py-1.5 ${
              isPaused ? 'text-emerald-600 border-emerald-200' : ''
            }`}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            {isPaused ? 'Reprendre' : 'Pause'}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {sent.toLocaleString('fr-FR')} / {total.toLocaleString('fr-FR')} emails
          </span>
          <span className="font-semibold text-foreground">{progress}%</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isPaused ? 'bg-yellow-400' : 'bg-primary'
            } ${isSending ? 'animate-pulse-slow' : ''}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 rounded-lg bg-emerald-50">
          <p className="text-lg font-bold text-emerald-700">{sent}</p>
          <p className="text-xs text-emerald-600">Envoyés</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-red-50">
          <p className="text-lg font-bold text-red-700">{failed}</p>
          <p className="text-xs text-red-600">Échoués</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-slate-50">
          <p className="text-lg font-bold text-slate-700">{total - sent - failed}</p>
          <p className="text-xs text-slate-600">En attente</p>
        </div>
      </div>
    </div>
  );
}
