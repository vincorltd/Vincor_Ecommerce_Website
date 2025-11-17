/**
 * Script to fetch product tags (brands) from WooCommerce REST API and save to static JSON file
 * Run with: npm run update-brands
 */

import { config } from 'dotenv';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

interface WooTag {
  id: number;
  name: string;
  slug: string;
  count: number;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
  displayName: string;
  count: number;
}

// Brand name mapping with proper display names
const brandDisplayNames: Record<string, string> = {
  'adl': 'ADL',
  'ai': 'AI',
  'andrew': 'Andrew',
  'ast': 'AST',
  'atci': 'ATCI',
  'avcom': 'Avcom',
  'belden': 'Belden',
  'blondertongue': 'Blonder Tongue',
  'clearsat': 'ClearSat',
  'commscope': 'CommScope',
  'comtech': 'Comtech',
  'cytex': 'Cytex',
  'dh': 'DH',
  'digisat': 'DigiSat',
  'eti': 'ETI',
  'kratos': 'Kratos',
  'norsat': 'Norsat',
  'polyphaser': 'PolyPhaser',
  'prodelin': 'Prodelin',
  'quintech': 'Quintech',
  'rci': 'RCI',
  'seavey': 'Seavey',
  'thompson': 'Thompson',
  'thor': 'Thor',
  'times': 'Times',
  'venture': 'Venture',
  'vincor': 'Vincor',
  'walton': 'Walton'
};

async function fetchAllTags(): Promise<WooTag[]> {
  const consumerKey = process.env.WOO_REST_API_CONS_KEY;
  const consumerSecret = process.env.WOO_REST_API_CONS_SEC;
  const baseUrl = process.env.WOO_REST_API_URL || 'https://satchart.com/wp-json/wc/v3';

  if (!consumerKey || !consumerSecret) {
    throw new Error('Missing WooCommerce API credentials in environment variables');
  }

  const allTags: WooTag[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${baseUrl}/products/tags?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}&per_page=100&page=${page}&hide_empty=true`;
    
    console.log(`📡 Fetching tags page ${page}...`);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as WooTag[];
      
      if (data.length === 0) {
        hasMore = false;
      } else {
        allTags.push(...data);
        console.log(`   ✅ Fetched ${data.length} tags (Total: ${allTags.length})`);
        page++;
      }
    } catch (error: any) {
      console.error(`❌ Error fetching tags page ${page}:`, error.message);
      hasMore = false;
    }
  }

  return allTags;
}

async function fetchAndSaveBrands() {
  console.log('🚀 Starting brands update...\n');

  try {
    const rawTags = await fetchAllTags();
    console.log(`\n✅ Fetched total of ${rawTags.length} tags`);

    // Filter to only brand tags (single word, alphabetic)
    const brands: Brand[] = rawTags
      .filter(tag => /^[a-zA-Z]+$/.test(tag.name))
      .map(tag => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug.toLowerCase(),
        displayName: brandDisplayNames[tag.slug.toLowerCase()] || tag.name,
        count: tag.count,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    // Save to JSON file
    const dataDir = resolve(process.cwd(), 'woonuxt_base/app/data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const filePath = resolve(dataDir, 'brands.json');
    writeFileSync(
      filePath,
      JSON.stringify({
        success: true,
        count: brands.length,
        lastUpdated: new Date().toISOString(),
        brands,
      }, null, 2)
    );

    console.log(`\n💾 Saved to: ${filePath}`);
    console.log('📊 Summary:');
    console.log(`   - Total brands: ${brands.length}`);
    console.log(`   - Last updated: ${new Date().toISOString()}`);
    console.log('\n✅ Brands update complete!\n');
  } catch (error: any) {
    console.error('❌ Error fetching or saving brands:', error.message);
    process.exit(1);
  }
}

fetchAndSaveBrands();

