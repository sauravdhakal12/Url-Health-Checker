'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center space-y-4">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <p className="text-gray-400">{error.message || 'Batch not found'}</p>
      <div className="space-x-4">
        <button
          className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          onClick={() => reset()}
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 inline-block"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
