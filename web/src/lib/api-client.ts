import type { CreateBatchRequest, CreateBatchResponse } from 'shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function createBatch(urls: string[]): Promise<CreateBatchResponse> {
  const res = await fetch(`${API_URL}/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls } satisfies CreateBatchRequest),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create batch');
  }

  return res.json();
}

export async function cancelBatch(id: string): Promise<void> {
  await fetch(`${API_URL}/batches/${id}/cancel`, { method: 'POST' });
}

export async function retryFailed(id: string): Promise<void> {
  await fetch(`${API_URL}/batches/${id}/retry-failed`, { method: 'POST' });
}
