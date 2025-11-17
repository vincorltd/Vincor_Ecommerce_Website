/**
 * Master script to update all static JSON data files
 * Runs: categories, products, and brands updates
 * Run with: npm run update-all
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { spawn } from 'child_process';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

interface ScriptResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
}

function runScript(scriptPath: string, name: string): Promise<ScriptResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Starting: ${name}`);
    console.log(`${'='.repeat(60)}\n`);

    const child = spawn('tsx', [scriptPath], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const success = code === 0;

      if (success) {
        console.log(`\n✅ ${name} completed in ${(duration / 1000).toFixed(2)}s`);
      } else {
        console.log(`\n❌ ${name} failed with code ${code}`);
      }

      resolve({
        name,
        success,
        duration,
        error: success ? undefined : `Exit code: ${code}`,
      });
    });

    child.on('error', (error) => {
      const duration = Date.now() - startTime;
      console.log(`\n❌ ${name} failed: ${error.message}`);
      
      resolve({
        name,
        success: false,
        duration,
        error: error.message,
      });
    });
  });
}

async function updateAll() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║        🔄  UPDATING ALL STATIC JSON DATA FILES 🔄        ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  const startTime = Date.now();
  const results: ScriptResult[] = [];

  // Run each script sequentially
  const scripts = [
    { path: 'woonuxt_base/scripts/update-categories.ts', name: 'Categories' },
    { path: 'woonuxt_base/scripts/update-products.ts', name: 'Products' },
    { path: 'woonuxt_base/scripts/update-brands.ts', name: 'Brands' },
  ];

  for (const script of scripts) {
    const result = await runScript(script.path, script.name);
    results.push(result);

    // If a script fails, continue with the rest but track the failure
    if (!result.success) {
      console.log(`\n⚠️  ${script.name} failed, but continuing with remaining updates...\n`);
    }
  }

  // Print summary
  const totalDuration = Date.now() - startTime;
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║                    📊  SUMMARY                            ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const duration = (result.duration / 1000).toFixed(2);
    console.log(`${status} ${result.name.padEnd(20)} ${duration}s`);
    if (result.error) {
      console.log(`   └─ Error: ${result.error}`);
    }
  });

  console.log('\n' + '─'.repeat(60));
  console.log(`Total time: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Success: ${successCount}/${results.length}`);
  
  if (failCount > 0) {
    console.log(`Failed: ${failCount}/${results.length}`);
    console.log('\n❌ Some updates failed. Please check the errors above.\n');
    process.exit(1);
  } else {
    console.log('\n✅ All data files updated successfully!\n');
    console.log('📁 Updated files:');
    console.log('   - woonuxt_base/app/data/categories.json');
    console.log('   - woonuxt_base/app/data/products.json');
    console.log('   - woonuxt_base/app/data/brands.json');
    console.log('\n🎉 You can now run your dev server with: npm run dev\n');
  }
}

updateAll();


