/**
 * Color Analysis Tool for LUT Processing
 * Compares web app output with Photoshop reference images
 */

export interface ColorSample {
  position: { x: number; y: number };
  description: string;
  webApp: { r: number; g: number; b: number };
  photoshop: { r: number; g: number; b: number };
  difference: { r: number; g: number; b: number };
  colorCast: 'red' | 'green' | 'blue' | 'neutral';
}

export interface ColorAnalysisResult {
  samples: ColorSample[];
  averageDifference: { r: number; g: number; b: number };
  dominantCast: 'red' | 'green' | 'blue' | 'neutral';
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
}

/**
 * Extract color samples from canvas at specific positions
 */
export function extractColorSamples(canvas: HTMLCanvasElement, positions: Array<{x: number, y: number, description: string}>): Array<{position: {x: number, y: number}, description: string, color: {r: number, g: number, b: number}}> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const samples = [];
  
  for (const pos of positions) {
    const imageData = ctx.getImageData(pos.x, pos.y, 1, 1);
    const [r, g, b] = imageData.data;
    
    samples.push({
      position: pos,
      description: pos.description,
      color: {
        r: r / 255,
        g: g / 255,
        b: b / 255
      }
    });
  }
  
  return samples;
}

/**
 * Analyze color differences between web app and Photoshop
 */
export function analyzeColorDifferences(
  webAppSamples: Array<{position: {x: number, y: number}, description: string, color: {r: number, g: number, b: number}}>,
  photoshopSamples: Array<{position: {x: number, y: number}, description: string, color: {r: number, g: number, b: number}}>
): ColorAnalysisResult {
  const samples: ColorSample[] = [];
  let totalDiff = { r: 0, g: 0, b: 0 };
  
  for (let i = 0; i < Math.min(webAppSamples.length, photoshopSamples.length); i++) {
    const web = webAppSamples[i];
    const ps = photoshopSamples[i];
    
    const diff = {
      r: web.color.r - ps.color.r,
      g: web.color.g - ps.color.g,
      b: web.color.b - ps.color.b
    };
    
    // Determine dominant color cast
    const absDiff = { r: Math.abs(diff.r), g: Math.abs(diff.g), b: Math.abs(diff.b) };
    let colorCast: 'red' | 'green' | 'blue' | 'neutral' = 'neutral';
    
    if (absDiff.g > absDiff.r && absDiff.g > absDiff.b && absDiff.g > 0.02) {
      colorCast = 'green';
    } else if (absDiff.r > absDiff.g && absDiff.r > absDiff.b && absDiff.r > 0.02) {
      colorCast = 'red';
    } else if (absDiff.b > absDiff.r && absDiff.b > absDiff.g && absDiff.b > 0.02) {
      colorCast = 'blue';
    }
    
    samples.push({
      position: web.position,
      description: web.description,
      webApp: web.color,
      photoshop: ps.color,
      difference: diff,
      colorCast
    });
    
    totalDiff.r += diff.r;
    totalDiff.g += diff.g;
    totalDiff.b += diff.b;
  }
  
  const avgDiff = {
    r: totalDiff.r / samples.length,
    g: totalDiff.g / samples.length,
    b: totalDiff.b / samples.length
  };
  
  // Determine dominant cast
  const absAvgDiff = { r: Math.abs(avgDiff.r), g: Math.abs(avgDiff.g), b: Math.abs(avgDiff.b) };
  let dominantCast: 'red' | 'green' | 'blue' | 'neutral' = 'neutral';
  
  if (absAvgDiff.g > absAvgDiff.r && absAvgDiff.g > absAvgDiff.b) {
    dominantCast = 'green';
  } else if (absAvgDiff.r > absAvgDiff.g && absAvgDiff.r > absAvgDiff.b) {
    dominantCast = 'red';
  } else if (absAvgDiff.b > absAvgDiff.r && absAvgDiff.b > absAvgDiff.g) {
    dominantCast = 'blue';
  }
  
  // Determine severity
  const maxDiff = Math.max(absAvgDiff.r, absAvgDiff.g, absAvgDiff.b);
  let severity: 'low' | 'medium' | 'high' = 'low';
  if (maxDiff > 0.05) severity = 'high';
  else if (maxDiff > 0.02) severity = 'medium';
  
  // Generate recommendations
  const recommendations = [];
  if (dominantCast === 'green' && avgDiff.g > 0.02) {
    recommendations.push(`Reduce green channel by ${(avgDiff.g * 100).toFixed(1)}%`);
    recommendations.push(`Increase magenta (red+blue) by ${((avgDiff.r + avgDiff.b) * 50).toFixed(1)}%`);
  }
  if (dominantCast === 'red' && avgDiff.r > 0.02) {
    recommendations.push(`Reduce red channel by ${(avgDiff.r * 100).toFixed(1)}%`);
  }
  if (dominantCast === 'blue' && avgDiff.b > 0.02) {
    recommendations.push(`Reduce blue channel by ${(avgDiff.b * 100).toFixed(1)}%`);
  }
  
  return {
    samples,
    averageDifference: avgDiff,
    dominantCast,
    severity,
    recommendations
  };
}

/**
 * Generate color analysis report
 */
export function generateColorAnalysisReport(analysis: ColorAnalysisResult): string {
  const { samples, averageDifference, dominantCast, severity, recommendations } = analysis;
  
  let report = `## Color Analysis Report\n\n`;
  
  report += `### Summary\n`;
  report += `- **Dominant Color Cast**: ${dominantCast}\n`;
  report += `- **Severity**: ${severity}\n`;
  report += `- **Average Difference**: R:${(averageDifference.r * 100).toFixed(2)}% G:${(averageDifference.g * 100).toFixed(2)}% B:${(averageDifference.b * 100).toFixed(2)}%\n\n`;
  
  report += `### Sample Analysis\n`;
  samples.forEach((sample, index) => {
    report += `**${index + 1}. ${sample.description}**\n`;
    report += `- Web App: RGB(${(sample.webApp.r * 255).toFixed(0)}, ${(sample.webApp.g * 255).toFixed(0)}, ${(sample.webApp.b * 255).toFixed(0)})\n`;
    report += `- Photoshop: RGB(${(sample.photoshop.r * 255).toFixed(0)}, ${(sample.photoshop.g * 255).toFixed(0)}, ${(sample.photoshop.b * 255).toFixed(0)})\n`;
    report += `- Difference: RGB(${(sample.difference.r * 100).toFixed(1)}%, ${(sample.difference.g * 100).toFixed(1)}%, ${(sample.difference.b * 100).toFixed(1)}%)\n`;
    report += `- Cast: ${sample.colorCast}\n\n`;
  });
  
  report += `### Recommendations\n`;
  recommendations.forEach(rec => {
    report += `- ${rec}\n`;
  });
  
  return report;
}

/**
 * Predefined sample positions for testing
 */
export const STANDARD_SAMPLE_POSITIONS = [
  { x: 100, y: 100, description: 'Top Left - Sky' },
  { x: 300, y: 150, description: 'Top Center - Water' },
  { x: 500, y: 100, description: 'Top Right - Sky' },
  { x: 200, y: 250, description: 'Middle Left - Car' },
  { x: 400, y: 300, description: 'Center - Concrete' },
  { x: 600, y: 250, description: 'Middle Right - Water' },
  { x: 150, y: 400, description: 'Bottom Left - Road' },
  { x: 350, y: 450, description: 'Bottom Center - Railing' },
  { x: 550, y: 400, description: 'Bottom Right - Road' }
];