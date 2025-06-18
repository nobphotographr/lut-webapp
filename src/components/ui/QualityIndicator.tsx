'use client';

import { useState, useEffect } from 'react';
import { ImageQualityDetector, ProcessingQuality, TonalAnalyzer, QualityMetrics } from '@/lib/lut-validator';

interface QualityIndicatorProps {
  uploadedFile: File | null;
  imageData: ImageData | null;
  processedImageData: ImageData | null;
  currentOpacity: number;
  isProcessing: boolean;
}

interface QualityGuidance {
  fileFormat: string;
  bitDepth: number;
  recommendation: string;
  upgradeMessage: string;
  opacityRange: { min: number; max: number; optimal: number };
}

export default function QualityIndicator({ 
  uploadedFile, 
  imageData, 
  processedImageData, 
  currentOpacity, 
  isProcessing 
}: QualityIndicatorProps) {
  const [qualityGuidance, setQualityGuidance] = useState<QualityGuidance | null>(null);
  const [processingQuality, setProcessingQuality] = useState<ProcessingQuality | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<QualityMetrics | null>(null);

  // ファイルアップロード時の初期品質分析
  useEffect(() => {
    if (uploadedFile && imageData) {
      const quality = ImageQualityDetector.analyzeImageQuality(uploadedFile, imageData);
      setProcessingQuality(quality);
      
      const guidance = createGuidanceMessage(uploadedFile, quality);
      setQualityGuidance(guidance);
    }
  }, [uploadedFile, imageData]);

  // Suppress processingQuality unused warning - it's used for guidance creation
  if (processingQuality) {
    // Quality data is used for guidance messages
  }

  // リアルタイム品質評価
  useEffect(() => {
    if (imageData && processedImageData && !isProcessing) {
      const metrics = TonalAnalyzer.analyzeBeforeAfter(imageData, processedImageData, currentOpacity);
      setRealTimeMetrics(metrics);
    }
  }, [imageData, processedImageData, currentOpacity, isProcessing]);

  const createGuidanceMessage = (file: File, quality: ProcessingQuality): QualityGuidance => {
    const isJpeg = file.type === 'image/jpeg';
    const isLargeFile = file.size > 5 * 1024 * 1024;
    
    if (isJpeg) {
      const compressionText = {
        high: '高品質',
        medium: '標準品質', 
        low: '高圧縮'
      }[quality.compression];
      
      return {
        fileFormat: 'JPEG',
        bitDepth: 8,
        recommendation: isLargeFile 
          ? '💡 ファイルが大きめです。処理速度向上のため5MB以下を推奨'
          : `💡 JPEG（${compressionText}）での処理です。不透明度${Math.round(quality.recommendedOpacity.min * 100)}-${Math.round(quality.recommendedOpacity.max * 100)}%を推奨`,
        upgradeMessage: '🎨 プラグイン版なら RAW→16bit処理で階調豊かな仕上がりに',
        opacityRange: quality.recommendedOpacity
      };
    }
    
    return {
      fileFormat: 'PNG',
      bitDepth: 8,
      recommendation: '✨ PNG形式です。JPEGより高品質な処理が期待できます',
      upgradeMessage: '🎨 プラグイン版なら RAW→16bit処理でさらに高品質に',
      opacityRange: { min: 0.2, max: 0.6, optimal: 0.4 }
    };
  };

  const getQualityLevelColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'good': return 'text-glaze-accent bg-glaze-accent/10 border-glaze-accent/30';
      case 'fair': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'poor': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-glaze-text-muted bg-glaze-bg-button/50 border-glaze-border';
    }
  };

  const getQualityLevelText = (level: string) => {
    switch (level) {
      case 'excellent': return '優秀';
      case 'good': return '良好';
      case 'fair': return '普通';
      case 'poor': return '要改善';
      default: return '分析中';
    }
  };

  if (!qualityGuidance) return null;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ファイル品質情報 */}
      <div className="bg-glaze-bg-button border border-glaze-border rounded-md p-3 sm:p-4">
        <h4 className="text-sm sm:text-base font-medium text-glaze-text-primary mb-2 sm:mb-3">
          📊 画像品質情報
        </h4>
        
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
            <span className="text-xs sm:text-sm text-glaze-text-secondary">形式:</span>
            <span className="text-xs sm:text-sm text-glaze-text-primary font-medium">
              {qualityGuidance.fileFormat} ({qualityGuidance.bitDepth}bit)
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
            <span className="text-xs sm:text-sm text-glaze-text-secondary">推奨不透明度:</span>
            <span className="text-xs sm:text-sm text-glaze-accent font-medium">
              {Math.round(qualityGuidance.opacityRange.min * 100)}%-{Math.round(qualityGuidance.opacityRange.max * 100)}% 
              (最適: {Math.round(qualityGuidance.opacityRange.optimal * 100)}%)
            </span>
          </div>
        </div>
        
        <div className="mt-3 p-2 sm:p-3 bg-glaze-accent/10 border border-glaze-accent/30 rounded-md">
          <p className="text-xs sm:text-sm text-glaze-accent-light break-words leading-relaxed">
            {qualityGuidance.recommendation}
          </p>
        </div>
      </div>

      {/* リアルタイム品質評価 */}
      {realTimeMetrics && (
        <div className={`border rounded-md p-3 sm:p-4 ${getQualityLevelColor(realTimeMetrics.level)}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h4 className="text-sm sm:text-base font-medium">
              🎯 処理品質: {getQualityLevelText(realTimeMetrics.level)}
            </h4>
            <div className="text-xs sm:text-sm font-medium">
              スコア: {Math.round(realTimeMetrics.score)}/100
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
            <div className="text-center">
              <div className="text-xs sm:text-sm text-glaze-text-secondary">階調範囲</div>
              <div className="text-sm sm:text-base font-medium">
                {Math.round(realTimeMetrics.tonalRange * 100)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs sm:text-sm text-glaze-text-secondary">滑らかさ</div>
              <div className="text-sm sm:text-base font-medium">
                {Math.round(realTimeMetrics.smoothness * 100)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs sm:text-sm text-glaze-text-secondary">アーティファクト</div>
              <div className="text-sm sm:text-base font-medium">
                {realTimeMetrics.artifacts.toFixed(1)}
              </div>
            </div>
          </div>
          
          {realTimeMetrics.suggestions.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-medium">💡 改善提案:</div>
              <ul className="text-xs sm:text-sm space-y-1">
                {realTimeMetrics.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="flex-shrink-0">•</span>
                    <span className="break-words">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 8bit制約の説明とアップグレード案内 */}
      <div className="bg-glaze-accent/10 border border-glaze-accent/30 rounded-md p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="text-glaze-accent text-lg flex-shrink-0">📈</div>
          <div className="min-w-0 flex-1">
            <h4 className="text-glaze-accent-light font-medium mb-2 text-sm sm:text-base">
              8bit制約について
            </h4>
            <p className="text-xs sm:text-sm text-glaze-accent-light break-words leading-relaxed mb-3">
              Webブラウザでは8bit(256階調)画像のみ対応のため、16bit RAW処理と比べて階調が限られます。
              よりプロフェッショナルな結果には専用プラグインをご利用ください。
            </p>
            <p className="text-xs sm:text-sm text-glaze-accent-light break-words leading-relaxed">
              {qualityGuidance.upgradeMessage}
            </p>
          </div>
        </div>
      </div>

      {/* 処理中インジケーター */}
      {isProcessing && (
        <div className="bg-glaze-bg-button border border-glaze-border rounded-md p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-glaze-accent border-t-transparent rounded-full"></div>
            <span className="text-sm text-glaze-text-secondary">画像を処理中...</span>
          </div>
        </div>
      )}
    </div>
  );
}