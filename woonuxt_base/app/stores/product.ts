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
        const config = useRuntimeConfig();
        
        // Use localhost for dev server, siteUrl for production
        const baseURL = process.server 
          ? (process.dev ? 'http://localhost:3000' : config.public.siteUrl)
          : '';  // Client-side can use relative URLs
        
        console.log('[Product Store] 🌐 Fetching from:', `${baseURL}/api/products/${slug}`, { isDev: process.dev, isServer: process.server });
        
        const response = await fetch(`${baseURL}/api/products/${slug}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const restProduct = await response.json();

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
            // Use same baseURL logic for variations
            const variationsResponse = await fetch(`${baseURL}/api/products/${restProduct.id}/variations`);
            
            if (!variationsResponse.ok) {
              throw new Error(`Failed to fetch variations`);
            }
            
            const variations = await variationsResponse.json();
            transformed.variations = {
              nodes: (variations as any[]).map(v => this.transformVariationToGraphQL(v, restProduct))
            };
            console.log('[Product Store] ✅ Variations loaded:', variations.length);
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
        stockStatus: restProduct.stock_status?.toUpperCase() || 'INSTOCK',
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
        stockStatus: variation.stock_status?.toUpperCase() || 'INSTOCK',
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


