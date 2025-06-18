import { LUTData } from './types';

export class LUTParser {
  static async parseCubeFile(file: ArrayBuffer): Promise<LUTData> {
    console.log('[LUTParser] 🔧 Starting cube file parsing...');
    
    try {
      const text = new TextDecoder().decode(file);
      const lines = text.split('\n');
      
      console.log(`[LUTParser] 📝 File has ${lines.length} total lines`);
      
      let lutSize = 17; // Default size
      const lutData: number[] = [];
      let processedLines = 0;
      let dataLines = 0;
      
      // Process lines with explicit loop (no recursion)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        processedLines++;
        
        // Skip empty lines
        if (line.length === 0) continue;
        
        // Skip comments
        if (line.startsWith('#') || line.startsWith('//')) {
          continue;
        }
        
        // Parse LUT_3D_SIZE
        if (line.startsWith('LUT_3D_SIZE')) {
          const sizeMatch = line.match(/LUT_3D_SIZE\s+(\d+)/);
          if (sizeMatch) {
            lutSize = parseInt(sizeMatch[1]);
            console.log(`[LUTParser] 📏 Found LUT size: ${lutSize}x${lutSize}x${lutSize}`);
          }
          continue;
        }
        
        // Skip other metadata lines
        if (line.includes('TITLE') || line.includes('DOMAIN_MIN') || line.includes('DOMAIN_MAX')) {
          continue;
        }
        
        // Parse RGB values (explicit parsing to avoid recursion)
        const values = line.split(/\s+/).filter(val => val.length > 0);
        if (values.length === 3) {
          try {
            const r = parseFloat(values[0]);
            const g = parseFloat(values[1]);
            const b = parseFloat(values[2]);
            
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
              lutData.push(r, g, b);
              dataLines++;
              
              // Progress logging for large files
              if (dataLines % 10000 === 0) {
                console.log(`[LUTParser] 📊 Processed ${dataLines} data lines...`);
              }
            } else {
              console.warn(`[LUTParser] ⚠️ Invalid RGB values on line ${i + 1}: ${values}`);
            }
          } catch (parseError) {
            console.warn(`[LUTParser] ⚠️ Parse error on line ${i + 1}: ${parseError}`);
            // Continue processing instead of throwing
            continue;
          }
        }
        
        // Safety check to prevent infinite loops
        if (processedLines > 1000000) {
          throw new Error('File too large - exceeded 1 million lines');
        }
      }
      
      console.log(`[LUTParser] ✅ Parsing complete: ${processedLines} lines processed, ${dataLines} data lines, ${lutData.length} values`);
      
      // Validate data
      const expectedEntries = lutSize * lutSize * lutSize * 3;
      if (lutData.length !== expectedEntries) {
        console.warn(`[LUTParser] ⚠️ LUT data mismatch: expected ${expectedEntries} values, got ${lutData.length}`);
        console.warn(`[LUTParser] Expected size: ${lutSize}x${lutSize}x${lutSize}, Actual data points: ${lutData.length / 3}`);
        
        // If we have more data than expected, truncate it
        if (lutData.length > expectedEntries) {
          console.warn(`[LUTParser] 🔧 Truncating excess data (${lutData.length - expectedEntries} values)`);
          lutData.splice(expectedEntries);
        } else {
          throw new Error(`Invalid LUT data: expected ${expectedEntries} values, got ${lutData.length}`);
        }
      }
      
      return {
        size: lutSize,
        data: new Float32Array(lutData)
      };
    } catch (error) {
      console.error('[LUTParser] ❌ Critical error in parseCubeFile:', error);
      throw error; // Re-throw to be handled by loadLUTFromURL
    }
  }
  
  static async loadLUTFromURL(url: string, retryCount: number = 0): Promise<LUTData> {
    const maxRetries = 2; // Limit retries to prevent infinite loops
    const lutName = url.split('/').pop()?.replace('.cube', '') || 'Unknown';
    
    console.log(`[LUTParser] 🔄 Loading LUT: ${lutName} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      console.log(`[LUTParser] 📁 Fetch response for ${lutName}:`, {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log(`[LUTParser] 📊 ${lutName} file size: ${arrayBuffer.byteLength} bytes`);
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('LUT file is empty');
      }
      
      // Quick validation of file content
      const text = new TextDecoder().decode(arrayBuffer);
      if (!text.includes('LUT_3D_SIZE') && !text.includes('0.') && !text.includes('1.')) {
        throw new Error('File does not appear to be a valid .cube LUT file');
      }
      
      // Log first few lines for verification
      const firstLines = text.split('\n').slice(0, 5).filter(line => line.trim().length > 0);
      console.log(`[LUTParser] 📝 ${lutName} first few lines:`, firstLines);
      
      // Parse the file (no recursion here)
      const lutData = await this.parseCubeFile(arrayBuffer);
      console.log(`[LUTParser] 🔧 ${lutName} parsed - Size: ${lutData.size}³, Data points: ${lutData.data.length}`);
      
      // Verification
      const first5Values = Array.from(lutData.data.slice(0, 15)).map(v => v.toFixed(6));
      console.log(`[LUTParser] 🎨 ${lutName} - First 5 RGB values:`, first5Values.join(', '));
      
      // Check if it's actually a valid LUT (not identity)
      const mid = Math.floor(lutData.data.length / 6) * 3;
      const isLikelyIdentity = Math.abs(lutData.data[0] - 0) < 0.001 && 
                              Math.abs(lutData.data[mid] - 0.5) < 0.001 &&
                              Math.abs(lutData.data[lutData.data.length - 3] - 1) < 0.001;
      
      if (isLikelyIdentity) {
        console.warn(`[LUTParser] ⚠️ ${lutName} appears to be an identity LUT`);
      } else {
        console.log(`[LUTParser] ✅ ${lutName} contains color transformations`);
      }
      
      return lutData;
      
    } catch (error) {
      console.error(`[LUTParser] ❌ Attempt ${retryCount + 1} failed for ${lutName}:`, error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error(`[LUTParser] Timeout loading ${lutName}`);
        } else if (error.message.includes('stack')) {
          console.error(`[LUTParser] Stack overflow detected for ${lutName} - aborting retries`);
          throw error; // Don't retry on stack overflow
        }
      }
      
      // Retry logic (non-recursive)
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 500; // 500ms, 1s, 2s
        console.log(`[LUTParser] 🔄 Retrying ${lutName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.loadLUTFromURL(url, retryCount + 1);
      }
      
      // All retries exhausted - throw error instead of returning identity LUT
      // This prevents all LUTs from becoming identical
      console.error(`[LUTParser] 💥 Failed to load ${lutName} after ${maxRetries + 1} attempts`);
      throw new Error(`Failed to load LUT ${lutName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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