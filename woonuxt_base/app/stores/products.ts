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
        const config = useRuntimeConfig();
        
        // Use localhost for dev server, siteUrl for production
        const baseURL = process.server 
          ? (process.dev ? 'http://localhost:3000' : config.public.siteUrl)
          : '';  // Client-side can use relative URLs
        
        console.log('[Products Store] 🌐 Fetching from:', `${baseURL}/api/products`, { isDev: process.dev, isServer: process.server });
        
        const response = await fetch(`${baseURL}/api/products`);
        
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

