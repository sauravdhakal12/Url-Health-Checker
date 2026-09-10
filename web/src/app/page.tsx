import type { Batch } from 'shared';
import { NewBatchForm } from '@/components/new-batch-form';
import Link from 'next/link';

async function getBatches(): Promise<Batch[]> {
  const res = await fetch(`${process.env.API_URL}/batches`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export default async function BatchListPage() {
  const batches = await getBatches();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <header className="mb-16 text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500">
            Bulk URL Health Checker
          </h1>
        </header>

        <section className="mb-20">
          <NewBatchForm />
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-8 text-white flex items-center gap-3">
            Recent Batches
          </h2>

          {batches.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-white/5 border-dashed">
              <p className="text-zinc-500">No batches created yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {batches.map((b) => (
                <Link key={b.id} href={`/batches/${b.id}`} className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
                  <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-zinc-900 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all">
                    <div className="mb-4 sm:mb-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-white font-mono text-sm">{b.id.split('-')[0]}</span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${b.status === 'completed' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
                          b.status === 'cancelled' ? 'text-zinc-400 bg-zinc-800 border-zinc-700' :
                            'text-indigo-400 bg-indigo-400/10 border-indigo-400/20'
                          }`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {new Date(b.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-2xl font-light text-zinc-300">{b.totalUrls}</div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest">URLs</div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
