/**
 * Products Pinia Store (Plural)
 * 
 * Manages products listing page with intelligent caching:
 * - Fetches all products from WooCommerce REST API
 * - Caches products list with 5-minute TTL
 * - Auto-refreshes expired cache
 * - Transforms REST API data to GraphQL structure (for now, until we refactor components)
 * 
 * Note: For individual product pages, use the `product` store (singular)
 */

import { defineStore } from 'pinia';

// Cache TTL: 5 minutes (configurable)
const CACHE_TTL = 5 * 60 * 1000;

interface ProductsState {
  // All products for listing page
  allProducts: Product[];
  
  // Loading state
  isLoading: boolean;
  
  // Error state
  error: string | null;
  
  // Last fetch time for products list
  lastFetched: number | null;
}

export const useProductsStore = defineStore('products', {
  state: (): ProductsState => ({
    allProducts: [],
    isLoading: false,
    error: null,
    lastFetched: null,
  }),

  getters: {
    /**
     * Check if products list cache is still valid
     */
    isCacheFresh(): boolean {
      if (!this.lastFetched) return false;
      return Date.now() - this.lastFetched < CACHE_TTL;
    },

    /**
     * Get cache age in seconds
     */
    cacheAge(): number | null {
      if (!this.lastFetched) return null;
      return Math.floor((Date.now() - this.lastFetched) / 1000);
    },

    /**
     * Total number of products
     */
    productCount(): number {
      return this.allProducts.length;
    },
  },

  actions: {
    /**
     * Fetch all products from API (with caching)
     */
    async fetchAll(forceRefresh = false): Promise<Product[]> {
      // Return cached if fresh and not forcing refresh
      if (!forceRefresh && this.isCacheFresh && this.allProducts.length > 0) {
        const age = this.cacheAge;
        console.log('[Products Store] ⚡ Using cached products list', `(${age}s old)`);
        return this.allProducts;
      }

      console.log('[Products Store] 🔄 Fetching all products from API...');
      this.isLoading = true;
      this.error = null;

      try {
        // Get base URL from runtime config
        let config: any;
        try {
          config = useRuntimeConfig();
        } catch (e) {
          // During prerendering, useRuntimeConfig might not be available
          console.warn('[Products Store] ⚠️ useRuntimeConfig not available, using env vars directly');
          config = {
            public: {
              wooRestApiUrl: process.env.WOO_REST_API_URL || process.env.WOO_API_URL || 'https://satchart.com/wp-json/wc/v3',
              siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://vincor.com',
            },
            wooConsumerKey: process.env.WOO_REST_API_CONS_KEY || '',
            wooConsumerSecret: process.env.WOO_REST_API_CONS_SEC || '',
          };
        }
        
        // Use localhost for dev server, siteUrl for production
        const baseURL = process.server 
          ? (process.dev ? 'http://localhost:3000' : config.public.siteUrl)
          : '';  // Client-side can use relative URLs
        
        console.log('[Products Store] 🌐 Fetching from:', `${baseURL}/api/products`, { isDev: process.dev, isServer: process.server });
        
        let response = await fetch(`${baseURL}/api/products`);
        
        // If API route returns 404 during server-side rendering, fall back to WooCommerce REST API directly
        if (response.status === 404 && process.server && !process.dev) {
          console.log('[Products Store] 🔄 API route not available during prerender, calling WooCommerce REST API directly...');
          
          const consumerKey = config.wooConsumerKey || process.env.WOO_REST_API_CONS_KEY;
          const consumerSecret = config.wooConsumerSecret || process.env.WOO_REST_API_CONS_SEC;
          
          if (!consumerKey || !consumerSecret) {
            console.error('[Products Store] ❌ Missing WooCommerce API credentials for direct API call');
            console.error('[Products Store] ⚠️ WOO_REST_API_CONS_KEY and WOO_REST_API_CONS_SEC must be set');
            this.error = 'Failed to fetch products (missing API credentials)';
            this.isLoading = false;
            return [];
          }
          
          // Build WooCommerce REST API URL directly
          let wooBaseUrl = config.public.wooRestApiUrl || process.env.WOO_REST_API_URL || 'https://satchart.com/wp-json/wc/v3';
          wooBaseUrl = wooBaseUrl.replace(/\/wc\/v[0-9]+\/?$/, '');
          if (!wooBaseUrl.endsWith('/wp-json')) {
            wooBaseUrl = wooBaseUrl.replace(/\/?$/, '/wp-json');
          }
          
          // Fetch all products (with pagination if needed)
          const wooUrl = `${wooBaseUrl}/wc/v3/products?per_page=100&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
          
          console.log('[Products Store] 🌐 Calling WooCommerce REST API directly:', wooUrl.replace(/consumer_secret=[^&]+/, 'consumer_secret=***'));
          
          response = await fetch(wooUrl);
          
          if (response.status === 401 || response.status === 403) {
            console.error('[Products Store] ❌ WooCommerce API authentication failed');
            this.error = 'Failed to fetch products (authentication failed)';
            this.isLoading = false;
            return [];
          }
          
          if (!response.ok) {
            console.warn(`[Products Store] ⚠️ WooCommerce API returned status ${response.status}`);
            this.error = `Failed to fetch products: ${response.status}`;
            this.isLoading = false;
            return [];
          }
        } else if (response.status === 404) {
          // Regular 404 handling (not during prerender)
          console.warn(`[Products Store] ⚠️ Products endpoint not found (404). Returning empty array.`);
          this.isLoading = false;
          return [];
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const products = await response.json() as any[];

        // Transform REST to GraphQL structure (technical debt)
        const transformed = this.transformProducts(products);

        this.allProducts = transformed;
        this.lastFetched = Date.now();

        console.log('[Products Store] ✅ Loaded', transformed.length, 'products');
        return transformed;
      } catch (error: any) {
        console.error('[Products Store] ❌ Error fetching products:', error);
        this.error = error.message || 'Failed to fetch products';
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Clear the products cache
     */
    clearCache(): void {
      this.allProducts = [];
      this.lastFetched = null;
      console.log('[Products Store] 🗑️ Products cache cleared');
    },

    /**
     * Transform REST API products array to GraphQL structure
     * TODO: Remove this when we refactor components to use REST directly
     */
    transformProducts(products: any[]): Product[] {
      return products.map((product: any) => {
        // Get main image (first in images array)
        const mainImage = product.images && product.images.length > 0 ? product.images[0] : null;
        
        return {
          ...product,
          productCategories: {
            nodes: product.categories || []
          },
          productTags: {
            nodes: product.tags || []
          },
          productBrands: {
            nodes: product.brands || []
          },
          // Main product image
          image: mainImage ? {
            sourceUrl: mainImage.src,
            producCardSourceUrl: mainImage.src,
            altText: mainImage.alt || product.name,
            title: mainImage.name || product.name
          } : null,
          // Gallery images (all images including main)
          galleryImages: {
            nodes: (product.images || []).map((img: any) => ({
              sourceUrl: img.src,
              altText: img.alt || product.name,
              title: img.name || product.name
            }))
          },
          stockStatus: product.stock_status?.toUpperCase() || 'INSTOCK',
          slug: product.slug,
          databaseId: product.id,
          addons: product.addons || []
        };
      });
    }
  },
});

