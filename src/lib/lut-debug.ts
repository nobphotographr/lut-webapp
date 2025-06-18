/**
 * LUT Debug and Validation Tools
 * PhotoshopとWebアプリのLUT処理を比較するためのデバッグツール
 */

import { LUTData } from './types';

export interface LUTDebugInfo {
  fileName: string;
  size: number;
  dataPoints: number;
  minValues: { r: number; g: number; b: number };
  maxValues: { r: number; g: number; b: number };
  sampleValues: number[];
  isValidRange: boolean;
  suspectedIssues: string[];
}

export function analyzeLUTData(lutData: LUTData, fileName: string): LUTDebugInfo {
  const { size, data } = lutData;
  const issues: string[] = [];
  
  // Calculate min/max values
  let minR = Infinity, minG = Infinity, minB = Infinity;
  let maxR = -Infinity, maxG = -Infinity, maxB = -Infinity;
  
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    minR = Math.min(minR, r);
    minG = Math.min(minG, g);
    minB = Math.min(minB, b);
    maxR = Math.max(maxR, r);
    maxG = Math.max(maxG, g);
    maxB = Math.max(maxB, b);
  }
  
  // Check for common issues
  if (minR < 0 || minG < 0 || minB < 0) {
    issues.push('Negative color values found');
  }
  
  if (maxR > 1 || maxG > 1 || maxB > 1) {
    issues.push('Color values exceed 1.0 (may need normalization)');
  }
  
  // Check for identity mapping at corners
  const firstR = data[0];
  const firstG = data[1];
  const firstB = data[2];
  
  if (firstR === 0 && firstG === 0 && firstB === 0) {
    console.log('[LUT Debug] Identity check: First point is (0,0,0) ✓');
  } else {
    issues.push(`First point should be (0,0,0) but is (${firstR}, ${firstG}, ${firstB})`);
  }
  
  // Check Blue Sierra specific issues
  if (fileName.includes('Blue sierra')) {
    // Blue Sierra should have blue enhancement
    if (maxB <= maxR && maxB <= maxG) {
      issues.push('Blue Sierra LUT does not show blue enhancement');
    }
    
    // Check if shadows are being pushed towards blue
    const shadowSample = data.slice(0, 30); // First 10 RGB triplets
    const avgBlueInShadows = shadowSample.filter((_, i) => i % 3 === 2).reduce((a, b) => a + b, 0) / 10;
    
    if (avgBlueInShadows < 0.1) {
      issues.push('Blue Sierra shadows do not show expected blue tint');
    }
  }
  
  const isValidRange = minR >= 0 && minG >= 0 && minB >= 0 && maxR <= 1 && maxG <= 1 && maxB <= 1;
  
  return {
    fileName,
    size,
    dataPoints: data.length / 3,
    minValues: { r: minR, g: minG, b: minB },
    maxValues: { r: maxR, g: maxG, b: maxB },
    sampleValues: Array.from(data.slice(0, 15)), // First 5 RGB triplets
    isValidRange,
    suspectedIssues: issues
  };
}

export function generateLUTReport(debugInfo: LUTDebugInfo): string {
  const { fileName, size, dataPoints, minValues, maxValues, sampleValues, isValidRange, suspectedIssues } = debugInfo;
  
  return `
## LUT Debug Report: ${fileName}

### Basic Info
- Size: ${size}x${size}x${size}
- Data Points: ${dataPoints}
- Valid Range: ${isValidRange ? '✓' : '✗'}

### Value Ranges
- Red: ${minValues.r.toFixed(6)} → ${maxValues.r.toFixed(6)}
- Green: ${minValues.g.toFixed(6)} → ${maxValues.g.toFixed(6)}
- Blue: ${minValues.b.toFixed(6)} → ${maxValues.b.toFixed(6)}

### Sample Values (first 5 triplets)
${formatSampleValues(sampleValues)}

### Potential Issues
${suspectedIssues.length > 0 ? suspectedIssues.map(issue => `- ${issue}`).join('\n') : '- No issues detected'}

### Recommendations
${generateRecommendations(debugInfo)}
  `.trim();
}

function formatSampleValues(values: number[]): string {
  const triplets = [];
  for (let i = 0; i < values.length; i += 3) {
    if (i + 2 < values.length) {
      triplets.push(`RGB(${values[i].toFixed(6)}, ${values[i + 1].toFixed(6)}, ${values[i + 2].toFixed(6)})`);
    }
  }
  return triplets.map((triplet, i) => `${i + 1}: ${triplet}`).join('\n');
}

function generateRecommendations(debugInfo: LUTDebugInfo): string {
  const recommendations: string[] = [];
  
  if (!debugInfo.isValidRange) {
    recommendations.push('Normalize color values to [0,1] range');
  }
  
  if (debugInfo.fileName.includes('Blue sierra') && debugInfo.suspectedIssues.length > 0) {
    recommendations.push('Verify Blue Sierra LUT is correctly parsed');
    recommendations.push('Check if color order mapping is correct (RGB vs BGR)');
    recommendations.push('Compare with known working Blue Sierra implementation');
  }
  
  if (debugInfo.size === 64) {
    recommendations.push('Consider texture size limitations (4096x64 may exceed device limits)');
    recommendations.push('Implement LUT downsampling for compatibility');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('LUT appears to be correctly formatted');
  }
  
  return recommendations.map(rec => `- ${rec}`).join('\n');
}

/**
 * Compare LUT color output at specific coordinates
 */
export function sampleLUTAtCoordinates(
  lutData: LUTData, 
  r: number, 
  g: number, 
  b: number
): { input: [number, number, number]; output: [number, number, number] } {
  const { size, data } = lutData;
  
  // Clamp input values
  r = Math.max(0, Math.min(1, r));
  g = Math.max(0, Math.min(1, g));
  b = Math.max(0, Math.min(1, b));
  
  // Convert to LUT coordinates
  const lutR = Math.round(r * (size - 1));
  const lutG = Math.round(g * (size - 1));
  const lutB = Math.round(b * (size - 1));
  
  // Calculate index (B-G-R nested loop order)
  const index = (lutB * size * size + lutG * size + lutR) * 3;
  
  const outputR = data[index];
  const outputG = data[index + 1];
  const outputB = data[index + 2];
  
  return {
    input: [r, g, b],
    output: [outputR, outputG, outputB]
  };
}

/**
 * Compare two LUTs to check if they're identical or similar
 */
export function compareLUTs(lut1: LUTData, lut2: LUTData, name1: string, name2: string): {
  areIdentical: boolean;
  maxDifference: number;
  averageDifference: number;
  differentPoints: number;
  comparison: string;
} {
  if (lut1.size !== lut2.size) {
    return {
      areIdentical: false,
      maxDifference: Infinity,
      averageDifference: Infinity,
      differentPoints: Infinity,
      comparison: `Different sizes: ${lut1.size} vs ${lut2.size}`
    };
  }
  
  let maxDiff = 0;
  let totalDiff = 0;
  let differentPoints = 0;
  const threshold = 0.001; // Very small threshold for "identical"
  
  for (let i = 0; i < lut1.data.length; i += 3) {
    const r1 = lut1.data[i];
    const g1 = lut1.data[i + 1];
    const b1 = lut1.data[i + 2];
    const r2 = lut2.data[i];
    const g2 = lut2.data[i + 1];
    const b2 = lut2.data[i + 2];
    
    const diffR = Math.abs(r1 - r2);
    const diffG = Math.abs(g1 - g2);
    const diffB = Math.abs(b1 - b2);
    const pointDiff = Math.max(diffR, diffG, diffB);
    
    if (pointDiff > threshold) {
      differentPoints++;
    }
    
    maxDiff = Math.max(maxDiff, pointDiff);
    totalDiff += pointDiff;
  }
  
  const totalPoints = lut1.data.length / 3;
  const avgDiff = totalDiff / totalPoints;
  const areIdentical = maxDiff < threshold;
  
  let comparison = `${name1} vs ${name2}:\n`;
  comparison += `- Identical: ${areIdentical}\n`;
  comparison += `- Max difference: ${maxDiff.toFixed(6)}\n`;
  comparison += `- Average difference: ${avgDiff.toFixed(6)}\n`;
  comparison += `- Different points: ${differentPoints}/${totalPoints} (${((differentPoints/totalPoints)*100).toFixed(1)}%)`;
  
  return {
    areIdentical,
    maxDifference: maxDiff,
    averageDifference: avgDiff,
    differentPoints,
    comparison
  };
}

/**
 * Generate test color samples for comparison with Photoshop
 */
export function generateTestColorSamples(lutData: LUTData): Array<{
  input: [number, number, number];
  output: [number, number, number];
  description: string;
}> {
  const samples = [
    { color: [0, 0, 0], desc: 'Pure Black' },
    { color: [1, 1, 1], desc: 'Pure White' },
    { color: [0.5, 0.5, 0.5], desc: 'Middle Gray' },
    { color: [1, 0, 0], desc: 'Pure Red' },
    { color: [0, 1, 0], desc: 'Pure Green' },
    { color: [0, 0, 1], desc: 'Pure Blue' },
    { color: [0.2, 0.2, 0.2], desc: 'Dark Gray' },
    { color: [0.8, 0.8, 0.8], desc: 'Light Gray' },
    { color: [0.5, 0.3, 0.7], desc: 'Purple Tone' },
    { color: [0.7, 0.5, 0.3], desc: 'Warm Tone' }
  ] as const;
  
  return samples.map(({ color, desc }) => {
    const result = sampleLUTAtCoordinates(lutData, color[0], color[1], color[2]);
    return {
      input: result.input,
      output: result.output,
      description: desc
    };
  });
}