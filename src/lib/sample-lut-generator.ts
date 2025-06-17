export function generateSampleLUT(
  name: string,
  redCurve: (x: number) => number,
  greenCurve: (x: number) => number,
  blueCurve: (x: number) => number,
  size: number = 17
): string {
  let cubeData = `# ${name}\n`;
  cubeData += `# Generated sample LUT for demo\n`;
  cubeData += `LUT_3D_SIZE ${size}\n\n`;

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rNorm = r / (size - 1);
        const gNorm = g / (size - 1);
        const bNorm = b / (size - 1);

        const rOut = Math.max(0, Math.min(1, redCurve(rNorm)));
        const gOut = Math.max(0, Math.min(1, greenCurve(gNorm)));
        const bOut = Math.max(0, Math.min(1, blueCurve(bNorm)));

        cubeData += `${rOut.toFixed(6)} ${gOut.toFixed(6)} ${bOut.toFixed(6)}\n`;
      }
    }
  }

  return cubeData;
}

export const SAMPLE_LUTS = {
  cinematic: generateSampleLUT(
    'Cinematic',
    (x) => Math.pow(x, 1.1) * 0.95 + 0.02,
    (x) => Math.pow(x, 1.05) * 0.9 + 0.05,
    (x) => Math.pow(x, 0.95) * 1.1
  ),
  
  vintage: generateSampleLUT(
    'Vintage',
    (x) => Math.pow(x, 0.9) * 1.1 + 0.1,
    (x) => Math.pow(x, 1.0) * 0.95 + 0.05,
    (x) => Math.pow(x, 1.2) * 0.8 + 0.1
  ),
  
  dramatic: generateSampleLUT(
    'Dramatic',
    (x) => x < 0.5 ? Math.pow(x * 2, 1.5) / 2 : 1 - Math.pow((1 - x) * 2, 1.5) / 2,
    (x) => x < 0.5 ? Math.pow(x * 2, 1.3) / 2 : 1 - Math.pow((1 - x) * 2, 1.3) / 2,
    (x) => x < 0.5 ? Math.pow(x * 2, 1.7) / 2 : 1 - Math.pow((1 - x) * 2, 1.7) / 2
  ),
  
  warm: generateSampleLUT(
    'Warm Tone',
    (x) => Math.min(1, x * 1.15 + 0.1),
    (x) => Math.min(1, x * 1.05 + 0.05),
    (x) => Math.max(0, x * 0.9 - 0.05)
  ),
  
  cool: generateSampleLUT(
    'Cool Tone',
    (x) => Math.max(0, x * 0.9 - 0.05),
    (x) => Math.min(1, x * 1.05 + 0.02),
    (x) => Math.min(1, x * 1.15 + 0.1)
  )
};