/**
 * LUT診断ツール - 根本的な問題を特定
 */

export interface LUTDiagnosticResult {
  dataIntegrity: boolean;
  expectedFirstPoint: { r: number; g: number; b: number };
  actualFirstPoint: { r: number; g: number; b: number };
  expectedLastPoint: { r: number; g: number; b: number };
  actualLastPoint: { r: number; g: number; b: number };
  expectedMidPoint: { r: number; g: number; b: number };
  actualMidPoint: { r: number; g: number; b: number };
  coordinateMapping: string;
  suspectedIssues: string[];
}

/**
 * LUTデータの根本的な整合性をチェック
 */
export function diagnoseLUTData(lutData: Float32Array, size: number): LUTDiagnosticResult {
  const suspectedIssues: string[] = [];
  
  // Expected values for a proper LUT
  const expectedFirst = { r: 0, g: 0, b: 0 }; // Black point should be (0,0,0) -> some dark value
  const expectedLast = { r: 1, g: 1, b: 1 };  // White point should be (1,1,1) -> some bright value
  const expectedMid = { r: 0.5, g: 0.5, b: 0.5 }; // Mid gray point
  
  // Actual values from LUT
  const actualFirst = {
    r: lutData[0],
    g: lutData[1], 
    b: lutData[2]
  };
  
  const lastIndex = (size * size * size - 1) * 3;
  const actualLast = {
    r: lutData[lastIndex],
    g: lutData[lastIndex + 1],
    b: lutData[lastIndex + 2]
  };
  
  // Calculate middle point index (approximate center of LUT cube)
  const midIndex = Math.floor(size * size * size / 2) * 3;
  const actualMid = {
    r: lutData[midIndex],
    g: lutData[midIndex + 1],
    b: lutData[midIndex + 2]
  };
  
  // Check for suspicious patterns
  
  // 1. First point should NOT be (0,0,0) for most creative LUTs
  if (actualFirst.r === 0 && actualFirst.g === 0 && actualFirst.b === 0) {
    suspectedIssues.push('First point is pure black - unusual for creative LUTs');
  }
  
  // 2. Last point should NOT be (1,1,1) for most creative LUTs  
  if (actualLast.r === 1 && actualLast.g === 1 && actualLast.b === 1) {
    suspectedIssues.push('Last point is pure white - unusual for creative LUTs');
  }
  
  // 3. Check for identity-like behavior
  const identityDeviation = Math.abs(actualMid.r - 0.5) + Math.abs(actualMid.g - 0.5) + Math.abs(actualMid.b - 0.5);
  if (identityDeviation < 0.01) {
    suspectedIssues.push('LUT appears identity-like - may not be loading correctly');
  }
  
  // 4. Check for extreme values
  if (actualFirst.r > 0.9 || actualFirst.g > 0.9 || actualFirst.b > 0.9) {
    suspectedIssues.push('First point has unexpectedly high values');
  }
  
  // 5. Check for BGR vs RGB confusion
  if (actualFirst.b < actualFirst.r && actualFirst.b < actualFirst.g) {
    suspectedIssues.push('Possible BGR/RGB channel order confusion');
  }
  
  // 6. Check for unrealistic color ranges
  const hasValidRange = (
    (actualLast.r > actualFirst.r) &&
    (actualLast.g > actualFirst.g) &&
    (actualLast.b > actualFirst.b)
  );
  
  if (!hasValidRange) {
    suspectedIssues.push('Color progression doesn\'t follow expected dark->bright pattern');
  }
  
  return {
    dataIntegrity: suspectedIssues.length === 0,
    expectedFirstPoint: expectedFirst,
    actualFirstPoint: actualFirst,
    expectedLastPoint: expectedLast,
    actualLastPoint: actualLast,
    expectedMidPoint: expectedMid,
    actualMidPoint: actualMid,
    coordinateMapping: `Size: ${size}³, Total points: ${size * size * size}`,
    suspectedIssues
  };
}

/**
 * Generate diagnostic report
 */
export function generateDiagnosticReport(result: LUTDiagnosticResult): string {
  let report = `## LUT Diagnostic Report\n\n`;
  
  report += `### Data Integrity: ${result.dataIntegrity ? '✅ PASS' : '❌ ISSUES DETECTED'}\n\n`;
  
  report += `### Key Points Analysis\n`;
  report += `**First Point (Black):**\n`;
  report += `- Expected: ~(0.0, 0.0, 0.0) input mapping\n`;
  report += `- Actual: (${result.actualFirstPoint.r.toFixed(6)}, ${result.actualFirstPoint.g.toFixed(6)}, ${result.actualFirstPoint.b.toFixed(6)})\n\n`;
  
  report += `**Last Point (White):**\n`;
  report += `- Expected: ~(1.0, 1.0, 1.0) input mapping\n`;
  report += `- Actual: (${result.actualLastPoint.r.toFixed(6)}, ${result.actualLastPoint.g.toFixed(6)}, ${result.actualLastPoint.b.toFixed(6)})\n\n`;
  
  report += `**Mid Point (Gray):**\n`;
  report += `- Expected: ~(0.5, 0.5, 0.5) input mapping\n`;
  report += `- Actual: (${result.actualMidPoint.r.toFixed(6)}, ${result.actualMidPoint.g.toFixed(6)}, ${result.actualMidPoint.b.toFixed(6)})\n\n`;
  
  if (result.suspectedIssues.length > 0) {
    report += `### 🚨 Suspected Issues\n`;
    result.suspectedIssues.forEach((issue, index) => {
      report += `${index + 1}. ${issue}\n`;
    });
    report += '\n';
  }
  
  report += `### Coordinate Mapping\n`;
  report += `${result.coordinateMapping}\n\n`;
  
  return report;
}