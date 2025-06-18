// GLAZE LUT WebApp Service Worker
// キャッシュバージョン
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `glaze-lut-cache-${CACHE_VERSION}`;

// キャッシュするリソース
const STATIC_RESOURCES = [
  '/',
  '/static/css/app.css',
  '/static/js/app.js',
  '/manifest.json'
];

// LUTデータのキャッシュ（容量制限あり）
const LUT_CACHE_NAME = `glaze-lut-data-${CACHE_VERSION}`;
const MAX_LUT_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

// インストール時の処理
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('[SW] Static resources cached');
        return self.skipWaiting();
      })
  );
});

// アクティベート時の処理
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName.startsWith('glaze-lut-cache-') && 
              cacheName !== CACHE_NAME
            )
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// フェッチ処理
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 静的リソースのキャッシュ戦略
  if (STATIC_RESOURCES.includes(url.pathname)) {
    event.respondWith(
      cacheFirst(request, CACHE_NAME)
    );
    return;
  }
  
  // LUTデータのキャッシュ戦略
  if (url.pathname.includes('/api/lut') || url.pathname.includes('.cube')) {
    event.respondWith(
      networkFirst(request, LUT_CACHE_NAME)
    );
    return;
  }
  
  // その他のリクエストはネットワーク優先
  event.respondWith(
    networkFirst(request, CACHE_NAME)
  );
});

// キャッシュ優先戦略
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Cache hit:', request.url);
      return cachedResponse;
    }
    
    console.log('[SW] Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    return new Response('Network error', { status: 503 });
  }
}

// ネットワーク優先戦略
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      
      // キャッシュサイズ制限チェック（LUTキャッシュのみ）
      if (cacheName === LUT_CACHE_NAME) {
        await manageCacheSize(cache, MAX_LUT_CACHE_SIZE);
      }
      
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Resource not available', { status: 503 });
  }
}

// キャッシュサイズ管理
async function manageCacheSize(cache, maxSize) {
  const requests = await cache.keys();
  let totalSize = 0;
  
  // 概算サイズ計算
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const blob = await response.blob();
      totalSize += blob.size;
    }
  }
  
  // サイズ超過時は古いものから削除
  if (totalSize > maxSize) {
    console.log('[SW] Cache size exceeded, cleaning up');
    
    // 簡易的にリクエストの半分を削除
    const requestsToDelete = requests.slice(0, Math.floor(requests.length / 2));
    
    for (const request of requestsToDelete) {
      await cache.delete(request);
    }
  }
}

// メッセージ処理
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'CACHE_LUT':
      // LUTデータの事前キャッシュ
      if (payload && payload.url) {
        caches.open(LUT_CACHE_NAME).then(cache => {
          return cache.add(payload.url);
        }).then(() => {
          event.ports[0].postMessage({ success: true });
        }).catch(error => {
          event.ports[0].postMessage({ success: false, error: error.message });
        });
      }
      break;
  }
});