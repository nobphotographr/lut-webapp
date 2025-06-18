'use client';

import { useEffect } from 'react';
import { initializeServiceWorker } from '@/lib/service-worker';

/**
 * Service Worker初期化コンポーネント
 * アプリケーション起動時にService Workerを登録し、オフラインキャッシュを有効化
 */
export function ServiceWorkerInitializer() {
  useEffect(() => {
    // ページ読み込み完了後にService Workerを初期化
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        initializeServiceWorker().catch(console.error);
      });
    }
  }, []);

  // このコンポーネントはレンダリングされない
  return null;
}