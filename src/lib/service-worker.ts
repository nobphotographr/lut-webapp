/**
 * Service Worker Registration and Management
 * パフォーマンス向上のためのオフラインキャッシュ機能
 */

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  /**
   * Service Workerの登録
   */
  async register(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[SW] Service Worker not supported');
      return false;
    }

    try {
      console.log('[SW] Registering service worker');
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('[SW] Service worker registered:', this.registration.scope);

      // 更新チェック
      this.registration.addEventListener('updatefound', () => {
        console.log('[SW] Service worker update found');
        this.handleUpdate();
      });

      // アクティベート時の処理
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Service worker controller changed');
        if (this.shouldReload()) {
          window.location.reload();
        }
      });

      return true;
    } catch (error) {
      console.error('[SW] Service worker registration failed:', error);
      return false;
    }
  }

  /**
   * Service Workerの更新処理
   */
  private handleUpdate(): void {
    if (!this.registration || !this.registration.installing) return;

    const installingWorker = this.registration.installing;
    
    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('[SW] New service worker installed, ready to activate');
        this.showUpdateNotification();
      }
    });
  }

  /**
   * 更新通知の表示
   */
  private showUpdateNotification(): void {
    // ユーザーに更新を通知
    const shouldUpdate = confirm(
      'アプリケーションの新しいバージョンが利用可能です。更新しますか？'
    );

    if (shouldUpdate) {
      this.skipWaitingAndReload();
    }
  }

  /**
   * 即座に新しいService Workerをアクティベート
   */
  private async skipWaitingAndReload(): Promise<void> {
    if (!this.registration || !this.registration.waiting) return;

    // 新しいService Workerにスキップを指示
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  /**
   * リロードが必要かチェック
   */
  private shouldReload(): boolean {
    // 開発環境では自動リロード、本番環境では慎重に
    return process.env.NODE_ENV === 'development';
  }

  /**
   * キャッシュクリア
   */
  async clearCache(): Promise<boolean> {
    if (!navigator.serviceWorker.controller) {
      console.log('[SW] No active service worker');
      return false;
    }

    try {
      const messageChannel = new MessageChannel();
      
      const promise = new Promise<boolean>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success);
        };
      });

      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );

      const result = await promise;
      console.log('[SW] Cache cleared:', result);
      return result;
    } catch (error) {
      console.error('[SW] Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * LUTデータの事前キャッシュ
   */
  async cacheLUT(url: string): Promise<boolean> {
    if (!navigator.serviceWorker.controller) {
      console.log('[SW] No active service worker');
      return false;
    }

    try {
      const messageChannel = new MessageChannel();
      
      const promise = new Promise<boolean>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success);
        };
      });

      navigator.serviceWorker.controller.postMessage(
        { type: 'CACHE_LUT', payload: { url } },
        [messageChannel.port2]
      );

      const result = await promise;
      console.log('[SW] LUT cached:', url, result);
      return result;
    } catch (error) {
      console.error('[SW] Failed to cache LUT:', error);
      return false;
    }
  }

  /**
   * Service Workerの状態取得
   */
  getStatus(): {
    supported: boolean;
    registered: boolean;
    active: boolean;
    waiting: boolean;
  } {
    return {
      supported: 'serviceWorker' in navigator,
      registered: !!this.registration,
      active: !!navigator.serviceWorker.controller,
      waiting: !!(this.registration && this.registration.waiting)
    };
  }
}

/**
 * アプリケーション初期化時にService Workerを登録
 */
export async function initializeServiceWorker(): Promise<void> {
  // 本番環境のみでService Workerを有効化
  if (process.env.NODE_ENV === 'production') {
    const swManager = ServiceWorkerManager.getInstance();
    const registered = await swManager.register();
    
    if (registered) {
      console.log('[SW] Service worker initialization completed');
    }
  } else {
    console.log('[SW] Service worker disabled in development mode');
  }
}