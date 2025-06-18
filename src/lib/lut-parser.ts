import { LUTData } from './types';

export class LUTParser {
  static async parseCubeFile(file: ArrayBuffer): Promise<LUTData> {
    const text = new TextDecoder().decode(file);
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let lutSize = 17; // Default size
    const lutData: number[] = [];
    
    for (const line of lines) {
      // Skip comments
      if (line.startsWith('#') || line.startsWith('//')) continue;
      
      // Parse LUT_3D_SIZE
      if (line.startsWith('LUT_3D_SIZE')) {
        const sizeMatch = line.match(/LUT_3D_SIZE\s+(\d+)/);
        if (sizeMatch) {
          lutSize = parseInt(sizeMatch[1]);
        }
        continue;
      }
      
      // Skip other metadata lines
      if (line.includes('TITLE') || line.includes('DOMAIN_MIN') || line.includes('DOMAIN_MAX')) {
        continue;
      }
      
      // Parse RGB values
      const values = line.split(/\s+/).filter(val => val.length > 0);
      if (values.length === 3) {
        const r = parseFloat(values[0]);
        const g = parseFloat(values[1]);
        const b = parseFloat(values[2]);
        
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          lutData.push(r, g, b);
        }
      }
    }
    
    // Validate data
    const expectedEntries = lutSize * lutSize * lutSize * 3;
    if (lutData.length !== expectedEntries) {
      console.warn(`[LUTParser] LUT data mismatch: expected ${expectedEntries} values, got ${lutData.length}`);
      console.warn(`[LUTParser] Expected size: ${lutSize}x${lutSize}x${lutSize}, Actual data points: ${lutData.length / 3}`);
      
      // If we have more data than expected, truncate it
      if (lutData.length > expectedEntries) {
        console.warn(`[LUTParser] Truncating excess data (${lutData.length - expectedEntries} values)`);
        lutData.splice(expectedEntries);
      } else {
        throw new Error(`Invalid LUT data: expected ${expectedEntries} values, got ${lutData.length}`);
      }
    }
    
    return {
      size: lutSize,
      data: new Float32Array(lutData)
    };
  }
  
  static async loadLUTFromURL(url: string): Promise<LUTData> {
    try {
      console.log(`[LUTParser] Loading LUT from: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load LUT: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log(`[LUTParser] LUT file size: ${arrayBuffer.byteLength} bytes`);
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('LUT file is empty');
      }
      
      const lutData = await this.parseCubeFile(arrayBuffer);
      console.log(`[LUTParser] Parsed LUT - Size: ${lutData.size}x${lutData.size}x${lutData.size}, Data points: ${lutData.data.length}`);
      
      // Enhanced debugging for all LUTs
      console.log(`[LUTParser] ✅ Successfully parsed LUT: ${url.split('/').pop()}`);
      console.log(`[LUTParser] LUT Details:`, {
        size: lutData.size,
        totalDataPoints: lutData.data.length,
        expectedPoints: lutData.size * lutData.size * lutData.size * 3,
        dataType: lutData.data.constructor.name
      });
      
      // Log first 10 RGB triplets for comparison
      const lutName = url.split('/').pop()?.replace('.cube', '') || 'Unknown';
      const first10Triplets = [];
      for (let i = 0; i < Math.min(30, lutData.data.length); i += 3) {
        first10Triplets.push([
          lutData.data[i].toFixed(6),
          lutData.data[i + 1].toFixed(6), 
          lutData.data[i + 2].toFixed(6)
        ]);
      }
      console.log(`[LUTParser] ${lutName} - First 10 RGB triplets:`, first10Triplets);
      
      // Log last RGB triplet
      const lastIndex = lutData.data.length - 3;
      console.log(`[LUTParser] ${lutName} - Last RGB triplet:`, [
        lutData.data[lastIndex].toFixed(6),
        lutData.data[lastIndex + 1].toFixed(6),
        lutData.data[lastIndex + 2].toFixed(6)
      ]);
      
      // Calculate basic statistics for verification
      const rValues = [];
      const gValues = [];
      const bValues = [];
      for (let i = 0; i < lutData.data.length; i += 3) {
        rValues.push(lutData.data[i]);
        gValues.push(lutData.data[i + 1]);
        bValues.push(lutData.data[i + 2]);
      }
      
      console.log(`[LUTParser] ${lutName} - Data ranges:`, {
        red: { min: Math.min(...rValues).toFixed(6), max: Math.max(...rValues).toFixed(6) },
        green: { min: Math.min(...gValues).toFixed(6), max: Math.max(...gValues).toFixed(6) },
        blue: { min: Math.min(...bValues).toFixed(6), max: Math.max(...bValues).toFixed(6) }
      });
      
      return lutData;
    } catch (error) {
      console.error(`[LUTParser] ❌ Error loading LUT from ${url}:`, error);
      
      // Log the specific error details
      if (error instanceof TypeError) {
        console.error('[LUTParser] Network error - check if file exists and is accessible');
      } else if (error instanceof Error) {
        console.error('[LUTParser] Error details:', error.message);
      }
      
      // Return identity LUT as fallback with clear warning
      console.warn(`[LUTParser] ⚠️ Falling back to identity LUT for ${url.split('/').pop()}`);
      const identityLUT = this.createIdentityLUT(64); // Use 64 instead of 17 for consistency
      console.log(`[LUTParser] Created identity LUT with size: ${identityLUT.size}`);
      return identityLUT;
    }
  }
  
  static createIdentityLUT(size: number): LUTData {
    const data = new Float32Array(size * size * size * 3);
    let index = 0;
    
    for (let b = 0; b < size; b++) {
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          data[index++] = r / (size - 1);
          data[index++] = g / (size - 1);
          data[index++] = b / (size - 1);
        }
      }
    }
    
    return { size, data };
  }
  
  static validateLUTData(lutData: LUTData): boolean {
    const { size, data } = lutData;
    const expectedLength = size * size * size * 3;
    
    if (data.length !== expectedLength) {
      return false;
    }
    
    // Check if all values are in valid range [0, 1]
    for (let i = 0; i < data.length; i++) {
      if (data[i] < 0 || data[i] > 1 || isNaN(data[i])) {
        return false;
      }
    }
    
    return true;
  }
}