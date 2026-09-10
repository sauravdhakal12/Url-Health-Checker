'use client';

import { useEffect, useState } from 'react';
import type { BatchWithChecks, BatchLiveEvent } from 'shared';
import { cancelBatch, retryFailed } from '@/lib/api-client';

export function BatchLiveView({ initialBatch }: { initialBatch: BatchWithChecks }) {
  const [batch, setBatch] = useState(initialBatch);
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const source = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/batches/${initialBatch.id}/events`);

    const syncState = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/batches/${initialBatch.id}`);
        if (res.ok) {
          const fresh: BatchWithChecks = await res.json();
          setBatch(fresh);
        }
      } catch (err) {
        console.error('Failed to sync state', err);
      }
    };

    source.onopen = syncState;

    source.onerror = () => {
      console.warn('SSE connection dropped. Browser will attempt to reconnect.');
    };

    source.onmessage = (event) => {
      const payload: BatchLiveEvent = JSON.parse(event.data);

      if ('urlCheckId' in payload) {
        setBatch((prev) => ({
          ...prev,
          urlChecks: prev.urlChecks.map((uc) =>
            uc.id === payload.urlCheckId ? { ...uc, ...payload } : uc,
          ),
        }));
      } else if (payload.type === 'batch_cancelled') {
        setBatch((prev) => ({ ...prev, status: 'cancelled' }));
      } else if (payload.type === 'batch_completed') {
        setBatch((prev) => ({ ...prev, status: 'completed' }));
      } else if (payload.type === 'batch_retried') {
        syncState();
      }
    };

    return () => source.close();
  }, [initialBatch.id]);

  const doneCount = batch.urlChecks.filter((u) => u.status === 'done' || u.status === 'failed').length;
  const progress = Math.round((doneCount / batch.urlChecks.length) * 100) || 0;

  const handleCancel = async () => {
    setCancelling(true);
    await cancelBatch(batch.id).catch(console.error);
    setCancelling(false);
  };

  const handleRetry = async () => {
    setRetrying(true);
    await retryFailed(batch.id).catch(console.error);
    setRetrying(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'cancelled': return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
      case 'in_progress': return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20 animate-pulse';
      default: return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900 p-6 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white mb-2 font-mono flex items-center gap-3">
            Batch
            <span className="text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-lg text-sm">{batch.id.split('-')[0]}</span>
          </h2>
          <div className="flex items-center gap-3 text-sm">
            <span className={`px-3 py-1 rounded-full border ${getStatusColor(batch.status)} font-medium uppercase tracking-wider text-xs`}>
              {batch.status}
            </span>
            <span className="text-zinc-400 font-medium">
              {doneCount} / {batch.urlChecks.length} completed
            </span>
          </div>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          {batch.status !== 'completed' && batch.status !== 'cancelled' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-red-500/20 hover:text-red-400 border border-white/5 hover:border-red-500/30 transition-all font-medium text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          {batch.urlChecks.some(u => u.status === 'failed') && (
            <button
              onClick={handleRetry}
              disabled={retrying || batch.status === 'cancelled'}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all font-medium text-sm disabled:opacity-50"
            >
              Retry Failed
            </button>
          )}
        </div>
      </div>

      <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="bg-zinc-900 rounded-2xl border border-white/5 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-950/50 text-zinc-400 border-b border-white/5 font-medium">
              <tr>
                <th className="px-6 py-4 rounded-tl-2xl">URL</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">HTTP</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4 rounded-tr-2xl">Title</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {batch.urlChecks.map((uc) => (
                <tr key={uc.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 text-zinc-300 font-mono text-xs max-w-[250px] truncate" title={uc.url}>
                    {uc.url}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md border ${getStatusColor(uc.status)} text-[11px] font-semibold tracking-wide uppercase inline-block`}>
                      {uc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 font-mono">
                    {uc.httpStatus ? (
                      <span className={uc.httpStatus >= 400 ? 'text-red-400' : 'text-emerald-400'}>
                        {uc.httpStatus}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-zinc-400 font-mono">
                    {uc.responseMs ? `${uc.responseMs}ms` : '—'}
                  </td>
                  <td className="px-6 py-4 text-zinc-400 max-w-[300px] truncate" title={uc.pageTitle || ''}>
                    {uc.pageTitle || (uc.errorMessage ? <span className="text-red-400 text-xs truncate block">{uc.errorMessage}</span> : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
