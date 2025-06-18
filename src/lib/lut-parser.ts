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
      throw new Error(`Invalid LUT data: expected ${expectedEntries} values, got ${lutData.length}`);
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
        throw new Error(`Failed to load LUT: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log(`[LUTParser] LUT file size: ${arrayBuffer.byteLength} bytes`);
      
      const lutData = await this.parseCubeFile(arrayBuffer);
      console.log(`[LUTParser] Parsed LUT - Size: ${lutData.size}x${lutData.size}x${lutData.size}, Data points: ${lutData.data.length}`);
      
      // Validate critical LUTs
      if (url.includes('Blue sierra')) {
        console.log(`[LUTParser] Blue Sierra validation - Expected size: 64, Actual size: ${lutData.size}`);
        console.log(`[LUTParser] Blue Sierra sample data:`, lutData.data.slice(0, 15));
      }
      
      return lutData;
    } catch (error) {
      console.error('Error loading LUT:', error);
      // Return identity LUT as fallback
      return this.createIdentityLUT(17);
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