'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBatch } from '@/lib/api-client';

export function NewBatchForm() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const urls = input.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);
      if (!urls.length) throw new Error('Please enter at least one URL');

      const { batchId } = await createBatch(urls);
      router.push(`/batches/${batchId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit batch');
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setInput((prev) => (prev ? prev + '\n' + text : text));
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative group">
      <div className="absolute -inset-1 rounded-2xl"></div>
      <form onSubmit={handleSubmit} className="relative p-8 bg-zinc-900 rounded-2xl ring-1 ring-white/10 shadow-2xl flex flex-col gap-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="urls" className="block text-sm font-medium text-zinc-300">
              Enter URLs
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors underline hover:cursor-pointer"
            >
              Upload CSV
            </button>
            <input
              type="file"
              accept=".csv, .txt"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>
          <textarea
            id="urls"
            rows={5}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600 resize-none font-mono text-sm"
            placeholder="https://google.com, https://github.com"
          />
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl border border-red-400/20">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-indigo-500/30 transition-all duration-200 flex justify-center items-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Check URLs'
          )}
        </button>
      </form>
    </div>
  );
}
