export const LUT_PRESETS = [
  { id: 'none', name: 'None', file: null },
  { id: 'anderson', name: 'Anderson', file: '/luts/Anderson.cube' },
  { id: 'blue-sierra', name: 'Blue Sierra', file: '/luts/Blue sierra.cube' },
  { id: 'f-pro400h', name: 'F-PRO400H', file: '/luts/F-PRO400H.cube' },
  { id: 'k-ektar', name: 'K-Ektar', file: '/luts/k-ektar.cube' },
  { id: 'pastel-light', name: 'Pastel Light', file: '/luts/pastel-light.cube' }
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_DIMENSION = 4096;
export const SUPPORTED_FORMATS = ['image/jpeg', 'image/png'];

export const WEBGL_CONFIG = {
  LUT_SIZE: 17,
  MAX_TEXTURE_SIZE: 2048,
  WATERMARK_OPACITY: 0.3,
  WATERMARK_SIZE_RATIO: 0.1
};

export const UI_CONFIG = {
  LAYER_COUNT: 3,
  OPACITY_STEP: 0.01,
  PROCESSING_DEBOUNCE: 300,
  DEFAULT_OPACITY: 0.35,
  RECOMMENDED_OPACITY: 0.25,
  PHOTOSHOP_STANDARD_OPACITY: 0.75
};

export const MARKETING_CONFIG = {
  PLUGIN_PURCHASE_URL: 'https://example.com/plugin',
  WATERMARK_TEXT: 'GLAZE デモ版',
  DEMO_LIMITATIONS: [
    '処理済み画像にはウォーターマークが追加されます',
    'ダウンロード機能は利用できません',
    'プレビュー表示のみに制限されています',
    '完全版では全てのプロLUTコレクションとバッチ処理が利用可能です'
  ]
};