export type BatchStatus = 'pending' | 'running' | 'completed' | 'cancelled';
export type UrlCheckStatus = 'pending' | 'in_progress' | 'done' | 'failed' | 'cancelled';

export interface Batch {
  id: string;
  status: BatchStatus;
  totalUrls: number;
  createdAt: string; // ISO string over the wire
  updatedAt: string;
}

export interface UrlCheck {
  id: string;
  batchId: string;
  url: string;
  status: UrlCheckStatus;
  httpStatus: number | null;
  responseMs: number | null;
  pageTitle: string | null;
  attemptCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BatchWithChecks extends Batch {
  urlChecks: UrlCheck[];
}

export interface CreateBatchRequest {
  urls: string[];
}
export interface CreateBatchResponse {
  batchId: string;
  totalUrls: number;
}

export type BatchLiveEvent =
  | {
      urlCheckId: string;
      status: 'done';
      httpStatus: number;
      responseMs: number;
      pageTitle: string | null;
    }
  | { urlCheckId: string; status: 'failed'; errorMessage: string }
  | { urlCheckId: string; status: 'cancelled' }
  | { type: 'batch_cancelled' }
  | { type: 'batch_completed' }
  | { type: 'batch_retried' };
