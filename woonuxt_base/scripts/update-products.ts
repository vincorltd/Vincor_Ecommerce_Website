/**
 * Script to fetch products from WooCommerce REST API and save to static JSON file
 * Only fetches essential fields: name, price, image, slug
 * Run with: npm run update-products
 */

import { config } from 'dotenv';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

interface WooProduct {
  id: number;
  name: string;
  slug: string;
  price: string;
  regular_price: string;
  sale_price: string;
  images: Array<{
    src: string;
    alt: string;
    name: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  stock_status: string;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  regularPrice: string;
  salePrice: string;
  price: string;
  image: {
    sourceUrl: string;
    altText: string;
    title: string;
  } | null;
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  stockStatus: string;
}

async function fetchAllProducts(): Promise<WooProduct[]> {
  const consumerKey = process.env.WOO_REST_API_CONS_KEY;
  const consumerSecret = process.env.WOO_REST_API_CONS_SEC;
  const baseUrl = process.env.WOO_REST_API_URL || 'https://satchart.com/wp-json/wc/v3';

  if (!consumerKey || !consumerSecret) {
    throw new Error('Missing WooCommerce API credentials in environment variables');
  }

  const allProducts: WooProduct[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${baseUrl}/products?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}&per_page=100&page=${page}&status=publish`;
    
    console.log(`📡 Fetching products page ${page}...`);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as WooProduct[];
      
      if (data.length === 0) {
        hasMore = false;
      } else {
        allProducts.push(...data);
        console.log(`   ✅ Fetched ${data.length} products (Total: ${allProducts.length})`);
        page++;
      }
    } catch (error: any) {
      console.error(`❌ Error fetching products page ${page}:`, error.message);
      hasMore = false;
    }
  }

  return allProducts;
}

async function fetchAndSaveProducts() {
  console.log('🚀 Starting products update...\n');

  try {
    const rawProducts = await fetchAllProducts();
    console.log(`\n✅ Fetched total of ${rawProducts.length} products`);

    // Transform to simplified structure
    const products: Product[] = rawProducts.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      regularPrice: product.regular_price || product.price,
      salePrice: product.sale_price || '',
      price: product.price,
      image: product.images && product.images.length > 0 ? {
        sourceUrl: product.images[0].src,
        altText: product.images[0].alt || product.name,
        title: product.images[0].name || product.name,
      } : null,
      categories: product.categories || [],
      tags: product.tags || [],
      stockStatus: product.stock_status || 'instock',
    }));

    // Save to JSON file
    const dataDir = resolve(process.cwd(), 'woonuxt_base/app/data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const filePath = resolve(dataDir, 'products.json');
    writeFileSync(
      filePath,
      JSON.stringify({
        success: true,
        count: products.length,
        lastUpdated: new Date().toISOString(),
        products,
      }, null, 2)
    );

    console.log(`\n💾 Saved to: ${filePath}`);
    console.log('📊 Summary:');
    console.log(`   - Total products: ${products.length}`);
    console.log(`   - Last updated: ${new Date().toISOString()}`);
    console.log('\n✅ Products update complete!\n');
  } catch (error: any) {
    console.error('❌ Error fetching or saving products:', error.message);
    process.exit(1);
  }
}

fetchAndSaveProducts();

