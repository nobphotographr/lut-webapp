// Identity LUT Generator - for debugging fundamental LUT processing
// Creates a LUT where input RGB exactly equals output RGB

function generateIdentityLUT(size = 17) {
  let output = `#Generated for debugging
TITLE "Identity"
LUT_3D_SIZE ${size}

`;
  
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        // Identity: input = output
        const rVal = (r / (size - 1)).toFixed(6);
        const gVal = (g / (size - 1)).toFixed(6);
        const bVal = (b / (size - 1)).toFixed(6);
        
        output += `${rVal} ${gVal} ${bVal}\n`;
      }
    }
  }
  
  return output;
}

// Test: Generate identity LUT
console.log('=== IDENTITY LUT (first 10 lines) ===');
const identityLUT = generateIdentityLUT(17);
console.log(identityLUT.split('\n').slice(0, 15).join('\n'));

// Test: Compare with actual LUT file structure
console.log('\n=== CHECKING ACTUAL LUT STRUCTURE ===');
// This should be run in browser console with fetch access