'use client';

import { MARKETING_CONFIG } from '@/lib/constants';

export default function Header() {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold text-white">
              3D LUT Editor
            </div>
            <div className="text-sm text-gray-300">
              Professional Color Grading Demo
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-yellow-400">
              Demo Version
            </div>
            <button
              onClick={() => window.open(MARKETING_CONFIG.PLUGIN_PURCHASE_URL, '_blank')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              Get Full Plugin
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}