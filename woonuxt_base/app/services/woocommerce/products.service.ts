/**
 * Products Service
 * 
 * Handles all product operations using WooCommerce REST API
 * Documentation: https://woocommerce.github.io/woocommerce-rest-api-docs/#products
 */

import { getApiClient } from '../api/client';
import type { WooProduct, WooProductVariation } from '../api/types';

export interface GetProductsParams {
  page?: number;
  per_page?: number;
  search?: string;
  after?: string;
  before?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: 'asc' | 'desc';
  orderby?: 'date' | 'id' | 'include' | 'title' | 'slug' | 'price' | 'popularity' | 'rating';
  parent?: number[];
  parent_exclude?: number[];
  slug?: string;
  status?: 'any' | 'draft' | 'pending' | 'private' | 'publish';
  type?: 'simple' | 'grouped' | 'external' | 'variable';
  sku?: string;
  featured?: boolean;
  category?: string;
  tag?: string;
  on_sale?: boolean;
  min_price?: string;
  max_price?: string;
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
}

export interface GetVariationsParams {
  page?: number;
  per_page?: number;
  search?: string;
  after?: string;
  before?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: 'asc' | 'desc';
  orderby?: 'date' | 'id' | 'include' | 'title' | 'slug';
  parent?: number[];
  parent_exclude?: number[];
  slug?: string;
  status?: 'any' | 'draft' | 'pending' | 'private' | 'publish';
  sku?: string;
  on_sale?: boolean;
  min_price?: string;
  max_price?: string;
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
}

export class ProductsService {
  private client = getApiClient();
  
  /**
   * Get all products
   */
  async getProducts(params: GetProductsParams = {}): Promise<WooProduct[]> {
    return this.client.get<WooProduct[]>('/products', params, {
      authenticated: true,
    });
  }
  
  /**
   * Get a single product by ID
   */
  async getProduct(id: number): Promise<WooProduct> {
    return this.client.get<WooProduct>(`/products/${id}`, undefined, {
      authenticated: true,
    });
  }
  
  /**
   * Get a single product by slug
   */
  async getProductBySlug(slug: string): Promise<WooProduct | null> {
    const products = await this.getProducts({ slug, per_page: 1 });
    return products.length > 0 ? products[0] : null;
  }
  
  /**
   * Search products
   */
  async searchProducts(query: string, params: GetProductsParams = {}): Promise<WooProduct[]> {
    return this.getProducts({
      ...params,
      search: query,
    });
  }
  
  /**
   * Get featured products
   */
  async getFeaturedProducts(params: GetProductsParams = {}): Promise<WooProduct[]> {
    return this.getProducts({
      ...params,
      featured: true,
    });
  }
  
  /**
   * Get products by category
   */
  async getProductsByCategory(categorySlug: string, params: GetProductsParams = {}): Promise<WooProduct[]> {
    return this.getProducts({
      ...params,
      category: categorySlug,
    });
  }
  
  /**
   * Get products by tag
   */
  async getProductsByTag(tagSlug: string, params: GetProductsParams = {}): Promise<WooProduct[]> {
    return this.getProducts({
      ...params,
      tag: tagSlug,
    });
  }
  
  /**
   * Get on sale products
   */
  async getOnSaleProducts(params: GetProductsParams = {}): Promise<WooProduct[]> {
    return this.getProducts({
      ...params,
      on_sale: true,
    });
  }
  
  /**
   * Get product variations
   */
  async getVariations(
    productId: number,
    params: GetVariationsParams = {}
  ): Promise<WooProductVariation[]> {
    return this.client.get<WooProductVariation[]>(
      `/products/${productId}/variations`,
      params,
      {
        authenticated: true,
      }
    );
  }
  
  /**
   * Get a single variation
   */
  async getVariation(
    productId: number,
    variationId: number
  ): Promise<WooProductVariation> {
    return this.client.get<WooProductVariation>(
      `/products/${productId}/variations/${variationId}`,
      undefined,
      {
        authenticated: true,
      }
    );
  }
  
  /**
   * Get stock status for a product
   */
  async getStockStatus(productId: number): Promise<{
    stock_status: string;
    stock_quantity: number | null;
    manage_stock: boolean;
  }> {
    const product = await this.getProduct(productId);
    return {
      stock_status: product.stock_status,
      stock_quantity: product.stock_quantity,
      manage_stock: product.manage_stock,
    };
  }
  
  /**
   * Get related products
   */
  async getRelatedProducts(productId: number): Promise<WooProduct[]> {
    const product = await this.getProduct(productId);
    
    if (!product.related_ids || product.related_ids.length === 0) {
      return [];
    }
    
    return this.getProducts({
      include: product.related_ids,
      per_page: 5,
    });
  }
}

// Export singleton instance
let productsServiceInstance: ProductsService | null = null;

export function getProductsService(): ProductsService {
  if (!productsServiceInstance) {
    productsServiceInstance = new ProductsService();
  }
  return productsServiceInstance;
}

// Export default instance for convenient usage
export const productsService = new ProductsService();

