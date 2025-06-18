'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function WebGLTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [webglSupported, setWebglSupported] = useState(false);
  const [processorInitialized, setProcessorInitialized] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  // Type guard for WebGL contexts
  const isWebGLContext = (ctx: RenderingContext | null): ctx is WebGLRenderingContext | WebGL2RenderingContext => {
    return ctx instanceof WebGLRenderingContext || ctx instanceof WebGL2RenderingContext;
  };

  useEffect(() => {
    const runTests = async () => {
      addResult('🔧 Starting WebGL initialization tests...');

      // Test 1: Basic WebGL capability
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 512;
      testCanvas.height = 512;
      
      const gl = testCanvas.getContext('webgl2') || 
                 testCanvas.getContext('webgl') ||
                 testCanvas.getContext('experimental-webgl2') ||
                 testCanvas.getContext('experimental-webgl');

      if (gl && isWebGLContext(gl)) {
        setWebglSupported(true);
        addResult('✅ WebGL context creation successful');
        addResult(`📊 WebGL version: ${gl instanceof WebGL2RenderingContext ? 'WebGL2' : 'WebGL1'}`);
        addResult(`📏 Max texture size: ${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`);
        addResult(`🎮 Renderer: ${gl.getParameter(gl.RENDERER)}`);
      } else {
        addResult('❌ WebGL not available in browser');
        return;
      }

      // Test 2: WebGL fallback function
      try {
        const { getOptimalWebGLContext } = await import('@/lib/webgl-fallback');
        const result = getOptimalWebGLContext(testCanvas);
        
        if (result.gl) {
          addResult('✅ WebGL fallback function works correctly');
          addResult(`📊 WebGL2 support: ${result.isWebGL2 ? 'Yes' : 'No'}`);
        } else {
          addResult(`❌ WebGL fallback failed: ${result.capabilities.error}`);
        }
      } catch (error) {
        addResult(`❌ Error loading WebGL fallback: ${error}`);
      }

      // Test 3: LUTProcessor initialization
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        
        const { LUTProcessor } = await import('@/lib/lutProcessor');
        new LUTProcessor(canvas); // Initialize processor (logs to console)
        
        // Give it time to initialize
        setTimeout(() => {
          setProcessorInitialized(true);
          addResult('✅ LUTProcessor initialized successfully');
          addResult('📋 Check browser console for detailed initialization logs');
        }, 500);
        
      } catch (error) {
        addResult(`❌ LUTProcessor initialization failed: ${error}`);
      }

      // Test 4: LUT file accessibility
      try {
        const response = await fetch('/luts/F-PRO400H.cube');
        if (response.ok) {
          const lutData = await response.text();
          if (lutData.includes('LUT_3D_SIZE')) {
            addResult('✅ F-PRO400H.cube LUT file accessible and valid');
          } else {
            addResult('⚠️ F-PRO400H.cube file format unclear');
          }
        } else {
          addResult(`❌ Cannot access F-PRO400H.cube: HTTP ${response.status}`);
        }
      } catch (error) {
        addResult(`❌ LUT file test failed: ${error}`);
      }

      // Test 5: Blue Sierra LUT
      try {
        const response = await fetch('/luts/Blue sierra.cube');
        if (response.ok) {
          const lutData = await response.text();
          if (lutData.includes('LUT_3D_SIZE')) {
            addResult('✅ Blue sierra.cube LUT file accessible and valid');
          } else {
            addResult('⚠️ Blue sierra.cube file format unclear');
          }
        } else {
          addResult(`❌ Cannot access Blue sierra.cube: HTTP ${response.status}`);
        }
      } catch (error) {
        addResult(`❌ Blue Sierra LUT test failed: ${error}`);
      }
    };

    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          WebGL Initialization Test Results
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`p-4 rounded-lg ${webglSupported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <h3 className="font-semibold">WebGL Support</h3>
            <p>{webglSupported ? '✅ Available' : '❌ Not Available'}</p>
          </div>
          
          <div className={`p-4 rounded-lg ${processorInitialized ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            <h3 className="font-semibold">LUT Processor</h3>
            <p>{processorInitialized ? '✅ Initialized' : '⏳ Initializing...'}</p>
          </div>
          
          <div className="p-4 rounded-lg bg-blue-100 text-blue-800">
            <h3 className="font-semibold">Test Progress</h3>
            <p>{testResults.length} checks completed</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Detailed Test Results
          </h2>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div 
                key={index}
                className={`p-3 rounded text-sm font-mono ${
                  result.includes('✅') ? 'bg-green-50 text-green-800' :
                  result.includes('❌') ? 'bg-red-50 text-red-800' :
                  result.includes('⚠️') ? 'bg-yellow-50 text-yellow-800' :
                  'bg-gray-50 text-gray-700'
                }`}
              >
                {result}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link 
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            ← Back to Main Application
          </Link>
        </div>
      </div>
    </div>
  );
}