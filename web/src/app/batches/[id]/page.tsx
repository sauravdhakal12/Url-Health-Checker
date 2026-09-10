import type { BatchWithChecks } from 'shared';
import { BatchLiveView } from '@/components/batch-live-view';
import Link from 'next/link';

async function getBatch(id: string): Promise<BatchWithChecks> {
  const res = await fetch(`${process.env.API_URL}/batches/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Batch not found');
  return res.json();
}

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initialBatch = await getBatch(id);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
            <svg className="group-hover:-translate-x-1 transition-transform" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Dashboard
          </Link>
        </div>

        <BatchLiveView initialBatch={initialBatch} />
      </div>
    </div>
  );
}
