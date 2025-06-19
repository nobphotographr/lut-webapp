'use client';

import { MARKETING_CONFIG } from '@/lib/constants';

export default function AnnouncementBanner() {
  return (
    <div 
      onClick={() => window.open(MARKETING_CONFIG.LINE_URL, '_blank')}
      className="bg-green-500 hover:bg-green-600 cursor-pointer transition-colors duration-200"
    >
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-center gap-2 text-center">
          <span className="text-lg">📱</span>
          <span className="text-white text-sm sm:text-base font-medium">
            公式LINE登録で<span className="font-bold underline">10%オフクーポン</span>配布中！
          </span>
          <span className="text-white text-xs sm:text-sm opacity-80">
            タップして友だち追加 →
          </span>
        </div>
      </div>
    </div>
  );
}