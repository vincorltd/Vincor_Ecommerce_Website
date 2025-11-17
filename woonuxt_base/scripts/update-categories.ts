/**
 * Script to fetch categories from WooCommerce REST API and save to static JSON file
 * Run with: npm run update-categories
 */

import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

interface WooCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  count: number;
  children: Category[];
}

async function fetchCategories(): Promise<WooCategory[]> {
  const apiUrl = process.env.WOO_REST_API_URL || 'https://satchart.com/wp-json/wc/v3';
  const consumerKey = process.env.WOO_REST_API_CONS_KEY || '';
  const consumerSecret = process.env.WOO_REST_API_CONS_SEC || '';
  
  if (!consumerKey || !consumerSecret) {
    throw new Error('Missing WooCommerce API credentials in environment variables');
  }
  
  const url = `${apiUrl}/products/categories?per_page=100&hide_empty=true`;
  const authString = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  
  console.log('📡 Fetching categories from WooCommerce...');
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
  }
  
  const categories = await response.json() as WooCategory[];
  console.log(`✅ Fetched ${categories.length} categories`);
  
  return categories;
}

function buildHierarchy(flatCategories: WooCategory[]): Category[] {
  const categoryMap = new Map<string, Category>();
  
  // Step 1: Create all category objects (only with products)
  flatCategories.forEach(cat => {
    if (cat.count > 0) {
      categoryMap.set(cat.id.toString(), {
        id: cat.id.toString(),
        name: cat.name,
        slug: cat.slug,
        count: cat.count,
        children: [],
      });
    }
  });
  
  // Step 2: Build parent-child relationships
  const topLevel: Category[] = [];
  
  flatCategories.forEach(cat => {
    const category = categoryMap.get(cat.id.toString());
    if (!category) return;
    
    if (cat.parent === 0) {
      // Top-level category
      topLevel.push(category);
    } else {
      // Child category - add to parent's children array
      const parent = categoryMap.get(cat.parent.toString());
      if (parent) {
        parent.children.push(category);
      } else {
        // Parent doesn't exist or has no products, treat as top-level
        topLevel.push(category);
      }
    }
  });
  
  // Step 3: Sort alphabetically (recursive)
  const sortCategories = (cats: Category[]): Category[] => {
    return cats.sort((a, b) => a.name.localeCompare(b.name)).map(cat => ({
      ...cat,
      children: sortCategories(cat.children),
    }));
  };
  
  return sortCategories(topLevel);
}

async function main() {
  try {
    console.log('🚀 Starting category update...\n');
    
    // Fetch categories from WooCommerce
    const rawCategories = await fetchCategories();
    
    // Build hierarchy
    console.log('🔨 Building category hierarchy...');
    const hierarchy = buildHierarchy(rawCategories);
    console.log(`✅ Built hierarchy with ${hierarchy.length} top-level categories\n`);
    
    // Create output data
    const output = {
      lastUpdated: new Date().toISOString(),
      totalCategories: rawCategories.filter(c => c.count > 0).length,
      topLevelCategories: hierarchy.length,
      categories: hierarchy,
    };
    
    // Write to file
    const filePath = resolve(process.cwd(), 'woonuxt_base/app/data/categories.json');
    writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf-8');
    
    console.log('💾 Saved to:', filePath);
    console.log('📊 Summary:');
    console.log(`   - Total categories: ${output.totalCategories}`);
    console.log(`   - Top-level: ${output.topLevelCategories}`);
    console.log(`   - Last updated: ${output.lastUpdated}\n`);
    console.log('✅ Category update complete!\n');
    
  } catch (error: any) {
    console.error('❌ Error updating categories:', error.message);
    process.exit(1);
  }
}

main();

