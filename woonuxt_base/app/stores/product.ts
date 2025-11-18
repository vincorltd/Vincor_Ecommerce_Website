/**
 * Product Store (Singular)
 * 
 * Manages individual product pages with intelligent caching:
 * - Fetches single product from WooCommerce REST API
 * - Caches products by slug with 5-minute TTL
 * - Handles product variations
 * - Auto-refreshes expired cache entries
 */

import { defineStore } from 'pinia';

// Cache TTL: 5 minutes (configurable)
const CACHE_TTL = 5 * 60 * 1000;

interface CachedProduct {
  product: Product;
  cachedAt: number;
}

interface ProductState {
  // Product cache by slug
  productCache: Map<string, CachedProduct>;
  
  // Currently viewed product
  currentProduct: Product | null;
  
  // Loading state
  isLoading: boolean;
  
  // Error state
  error: string | null;
}

export const useProductStore = defineStore('product', {
  state: (): ProductState => ({
    productCache: new Map(),
    currentProduct: null,
    isLoading: false,
    error: null,
  }),

  getters: {
    /**
     * Check if a specific product is cached and fresh
     */
    isProductCached(): (slug: string) => boolean {
      return (slug: string) => {
        const cached = this.productCache.get(slug);
        if (!cached) return false;
        
        const now = Date.now();
        return (now - cached.cachedAt) < CACHE_TTL;
      };
    },

    /**
     * Get cache age for a product (in seconds)
     */
    getCacheAge(): (slug: string) => number | null {
      return (slug: string) => {
        const cached = this.productCache.get(slug);
        if (!cached) return null;
        
        return Math.floor((Date.now() - cached.cachedAt) / 1000);
      };
    },

    /**
     * Total number of cached products
     */
    cachedProductCount(): number {
      return this.productCache.size;
    },
  },

  actions: {
    /**
     * Fetch a single product by slug (with caching and TTL)
     */
    async fetchProduct(slug: string, forceRefresh = false): Promise<Product | null> {
      // Check cache first
      const cached = this.productCache.get(slug);
      const now = Date.now();

      // Return cached if fresh and not forcing refresh
      if (!forceRefresh && cached && (now - cached.cachedAt < CACHE_TTL)) {
        console.log('[Product Store] ⚡ Using cached product:', slug, `(${Math.floor((now - cached.cachedAt) / 1000)}s old)`);
        this.currentProduct = cached.product;
        return cached.product;
      }

      console.log('[Product Store] 🔄 Fetching product from API:', slug);
      this.isLoading = true;
      this.error = null;

      try {
        // Get base URL from runtime config
        let config: any;
        try {
          config = useRuntimeConfig();
        } catch (e) {
          // During prerendering, useRuntimeConfig might not be available
          console.warn('[Product Store] ⚠️ useRuntimeConfig not available, using env vars directly');
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
        
        console.log('[Product Store] 🌐 Fetching from:', `${baseURL}/api/products/${slug}`, { isDev: process.dev, isServer: process.server });
        
        let response = await fetch(`${baseURL}/api/products/${slug}`);
        
        // If API route returns 404 during server-side rendering, fall back to WooCommerce REST API directly
        if (response.status === 404 && process.server && !process.dev) {
          console.log('[Product Store] 🔄 API route not available during prerender, calling WooCommerce REST API directly...');
          
          const consumerKey = config.wooConsumerKey || process.env.WOO_REST_API_CONS_KEY;
          const consumerSecret = config.wooConsumerSecret || process.env.WOO_REST_API_CONS_SEC;
          
          if (!consumerKey || !consumerSecret) {
            console.error('[Product Store] ❌ Missing WooCommerce API credentials for direct API call');
            console.error('[Product Store] ⚠️ WOO_REST_API_CONS_KEY and WOO_REST_API_CONS_SEC must be set');
            this.error = 'Product not found (missing API credentials)';
            this.isLoading = false;
            return null;
          }
          
          // Build WooCommerce REST API URL directly
          let wooBaseUrl = config.public.wooRestApiUrl || process.env.WOO_REST_API_URL || 'https://satchart.com/wp-json/wc/v3';
          wooBaseUrl = wooBaseUrl.replace(/\/wc\/v[0-9]+\/?$/, '');
          if (!wooBaseUrl.endsWith('/wp-json')) {
            wooBaseUrl = wooBaseUrl.replace(/\/?$/, '/wp-json');
          }
          
          // Check if it's a numeric ID or slug
          let wooUrl: string;
          if (isNaN(Number(slug))) {
            wooUrl = `${wooBaseUrl}/wc/v3/products?slug=${encodeURIComponent(slug)}&context=view&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
          } else {
            wooUrl = `${wooBaseUrl}/wc/v3/products/${slug}?context=view&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
          }
          
          console.log('[Product Store] 🌐 Calling WooCommerce REST API directly:', wooUrl.replace(/consumer_secret=[^&]+/, 'consumer_secret=***'));
          
          response = await fetch(wooUrl);
          
          if (response.status === 401 || response.status === 403) {
            console.error('[Product Store] ❌ WooCommerce API authentication failed');
            this.error = 'Product not found (authentication failed)';
            this.isLoading = false;
            return null;
          }
          
          if (response.status === 404) {
            console.warn(`[Product Store] ⚠️ Product ${slug} not found in WooCommerce`);
            this.error = 'Product not found';
            this.isLoading = false;
            return null;
          }
        } else if (response.status === 404) {
          // Regular 404 handling (not during prerender)
          console.warn(`[Product Store] ⚠️ Skipping product ${slug} (404).`);
          this.error = 'Product not found';
          this.isLoading = false;
          return null;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        let restProduct = await response.json();
        
        // If WooCommerce returned an array (when searching by slug), get first item
        if (Array.isArray(restProduct)) {
          restProduct = restProduct[0];
        }

        if (!restProduct) {
          console.error('[Product Store] ❌ Product not found:', slug);
          this.error = 'Product not found';
          return null;
        }

        console.log('[Product Store] ✅ Product fetched:', restProduct.name);
        console.log('[Product Store] 🎁 Add-ons:', restProduct.addons?.length || 0);

        // Transform to GraphQL structure (technical debt)
        const transformed = this.transformProductToGraphQL(restProduct);

        // Fetch variations if variable product
        if (restProduct.type === 'variable' && restProduct.variations?.length > 0) {
          console.log('[Product Store] 📦 Fetching variations:', restProduct.variations.length);
          
          try {
            // Try API route first, fall back to WooCommerce REST API if needed
            let variationsResponse = await fetch(`${baseURL}/api/products/${restProduct.id}/variations`);
            
            // If API route not available, call WooCommerce directly
            if (variationsResponse.status === 404 && process.server && !process.dev) {
              const consumerKey = config.wooConsumerKey || process.env.WOO_REST_API_CONS_KEY;
              const consumerSecret = config.wooConsumerSecret || process.env.WOO_REST_API_CONS_SEC;
              
              if (consumerKey && consumerSecret) {
                let wooBaseUrl = config.public.wooRestApiUrl || process.env.WOO_REST_API_URL || 'https://satchart.com/wp-json/wc/v3';
                wooBaseUrl = wooBaseUrl.replace(/\/wc\/v[0-9]+\/?$/, '');
                if (!wooBaseUrl.endsWith('/wp-json')) {
                  wooBaseUrl = wooBaseUrl.replace(/\/?$/, '/wp-json');
                }
                
                const wooVariationsUrl = `${wooBaseUrl}/wc/v3/products/${restProduct.id}/variations?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
                console.log('[Product Store] 🌐 Fetching variations from WooCommerce REST API directly');
                variationsResponse = await fetch(wooVariationsUrl);
              }
            }
            
            // Handle 404 gracefully for variations
            if (variationsResponse.status === 404) {
              console.warn(`[Product Store] ⚠️ Variations not found for product ${restProduct.id}, continuing without variations.`);
              transformed.variations = { nodes: [] };
            } else if (!variationsResponse.ok) {
              throw new Error(`Failed to fetch variations`);
            } else {
              const variations = await variationsResponse.json();
              transformed.variations = {
                nodes: (variations as any[]).map(v => this.transformVariationToGraphQL(v, restProduct))
              };
              console.log('[Product Store] ✅ Variations loaded:', variations.length);
            }
          } catch (e) {
            console.error('[Product Store] ⚠️ Error fetching variations:', e);
            // Continue without variations
          }
        }

        // Cache the product with timestamp
        this.productCache.set(slug, {
          product: transformed,
          cachedAt: now
        });

        this.currentProduct = transformed;
        console.log('[Product Store] 💾 Product cached:', slug);
        
        return transformed;
      } catch (error: any) {
        console.error('[Product Store] ❌ Error fetching product:', error);
        this.error = error.message || 'Failed to fetch product';
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Get product from cache (no API call)
     */
    getCachedProduct(slug: string): Product | null {
      const cached = this.productCache.get(slug);
      if (!cached) return null;

      const now = Date.now();
      if ((now - cached.cachedAt) >= CACHE_TTL) {
        console.log('[Product Store] ⏰ Cache expired for:', slug);
        return null;
      }

      return cached.product;
    },

    /**
     * Normalize WooCommerce stock status to GraphQL enum format
     */
    normalizeStockStatus(status: string | undefined): string {
      if (!status) return 'IN_STOCK';
      
      const normalized = status.toLowerCase();
      if (normalized === 'instock') return 'IN_STOCK';
      if (normalized === 'outofstock') return 'OUT_OF_STOCK';
      if (normalized === 'onbackorder') return 'ON_BACKORDER';
      
      return 'IN_STOCK'; // Default to in stock
    },

    /**
     * Pre-cache a product (useful for prefetching)
     */
    cacheProduct(slug: string, product: Product): void {
      this.productCache.set(slug, {
        product,
        cachedAt: Date.now()
      });
      console.log('[Product Store] 💾 Product pre-cached:', slug);
    },

    /**
     * Clear cache for a specific product
     */
    clearProduct(slug: string): void {
      this.productCache.delete(slug);
      if (this.currentProduct?.slug === slug) {
        this.currentProduct = null;
      }
      console.log('[Product Store] 🗑️ Cleared cache for:', slug);
    },

    /**
     * Clear all cached products
     */
    clearAllCache(): void {
      this.productCache.clear();
      this.currentProduct = null;
      console.log('[Product Store] 🗑️ All product cache cleared');
    },

    /**
     * Clear expired cache entries
     */
    clearExpiredCache(): void {
      const now = Date.now();
      let cleared = 0;

      for (const [slug, cached] of this.productCache.entries()) {
        if (now - cached.cachedAt > CACHE_TTL) {
          this.productCache.delete(slug);
          cleared++;
        }
      }

      if (cleared > 0) {
        console.log('[Product Store] 🧹 Cleared', cleared, 'expired product entries');
      }
    },

    /**
     * Format price as currency string
     */
    formatPrice(price: string | number): string {
      const numPrice = typeof price === 'string' ? parseFloat(price) : price;
      if (isNaN(numPrice)) return '$0.00';
      
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numPrice);
    },

    /**
     * Transform REST API product to GraphQL structure
     * TODO: Remove this when we refactor components to use REST directly
     */
    transformProductToGraphQL(restProduct: any): Product {
      // Get main image (first in images array)
      const mainImage = restProduct.images && restProduct.images.length > 0 ? restProduct.images[0] : null;
      
      return {
        ...restProduct,
        productCategories: {
          nodes: restProduct.categories || []
        },
        productTags: {
          nodes: restProduct.tags || []
        },
        productBrands: {
          nodes: restProduct.brands || []
        },
        // Main product image
        image: mainImage ? {
          sourceUrl: mainImage.src,
          producCardSourceUrl: mainImage.src,
          altText: mainImage.alt || restProduct.name,
          title: mainImage.name || restProduct.name
        } : null,
        // Gallery images (all images including main)
        galleryImages: {
          nodes: (restProduct.images || []).map((img: any) => ({
            sourceUrl: img.src,
            altText: img.alt || restProduct.name,
            title: img.name || restProduct.name
          }))
        },
        stockStatus: this.normalizeStockStatus(restProduct.stock_status),
        slug: restProduct.slug,
        databaseId: restProduct.id,
        addons: restProduct.addons || [],
        // Keep all other fields
        name: restProduct.name,
        description: restProduct.description,
        shortDescription: restProduct.short_description || restProduct.shortDescription,
        sku: restProduct.sku,
        // Price fields - formatted strings for display
        price: this.formatPrice(restProduct.price || 0),
        regularPrice: this.formatPrice(restProduct.regular_price || 0),
        salePrice: restProduct.sale_price ? this.formatPrice(restProduct.sale_price) : '',
        // Raw numeric prices for calculations (keep as strings to preserve original values)
        rawPrice: restProduct.price || '0',
        rawRegularPrice: restProduct.regular_price || '0',
        rawSalePrice: restProduct.sale_price || '0',
        onSale: restProduct.on_sale || restProduct.onSale,
        type: restProduct.type?.toUpperCase(),
        featured: restProduct.featured,
        averageRating: restProduct.average_rating || restProduct.averageRating,
        reviewCount: restProduct.review_count || restProduct.reviewCount,
        related: restProduct.related ? {
          nodes: restProduct.related
        } : null,
      } as Product;
    },

    /**
     * Transform REST API variation to GraphQL structure
     * TODO: Remove this when we refactor components to use REST directly
     */
    transformVariationToGraphQL(variation: any, parentProduct: any): any {
      return {
        ...variation,
        databaseId: variation.id,
        name: variation.name || parentProduct.name,
        stockStatus: this.normalizeStockStatus(variation.stock_status),
        // Formatted prices for display
        regularPrice: this.formatPrice(variation.regular_price || 0),
        salePrice: variation.sale_price ? this.formatPrice(variation.sale_price) : '',
        price: this.formatPrice(variation.price || 0),
        // Raw numeric prices for calculations
        rawRegularPrice: variation.regular_price || '0',
        rawPrice: variation.price || '0',
        rawSalePrice: variation.sale_price || '0',
        attributes: {
          nodes: variation.attributes || []
        }
      };
    }
  },
});


