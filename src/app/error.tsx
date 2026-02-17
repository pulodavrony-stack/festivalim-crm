'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Auto-reload on ChunkLoadError (happens after deployment)
    if (
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch dynamically imported module')
    ) {
      window.location.reload();
      return;
    }
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md p-8">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Произошла ошибка
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {error.message || 'Что-то пошло не так'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium"
          >
            Попробовать снова
          </button>
          <button
            onClick={() => window.location.reload()}
            className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50"
          >
            Перезагрузить
          </button>
        </div>
      </div>
    </div>
  );
}
