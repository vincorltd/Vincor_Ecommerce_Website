/**
 * Categories Service
 * 
 * Handles all product category operations using WooCommerce REST API
 * Documentation: https://woocommerce.github.io/woocommerce-rest-api-docs/#product-categories
 */

import { getApiClient } from '../api/client';
import type { WooCategory } from '../api/types';

export interface GetCategoriesParams {
  page?: number;
  per_page?: number;
  search?: string;
  exclude?: number[];
  include?: number[];
  order?: 'asc' | 'desc';
  orderby?: 'id' | 'include' | 'name' | 'slug' | 'term_group' | 'description' | 'count';
  hide_empty?: boolean;
  parent?: number;
  product?: number;
  slug?: string;
}

export class CategoriesService {
  /**
   * Get all product categories via server proxy
   * Uses Nuxt server API to handle authentication securely
   */
  async getCategories(params: GetCategoriesParams = {}): Promise<WooCategory[]> {
    console.log('[CategoriesService] 🔄 Fetching via server API proxy...');
    try {
      const response = await $fetch<WooCategory[]>('/api/categories', {
        method: 'GET',
      });
      console.log('[CategoriesService] ✅ Received from server:', response.length, 'categories');
      return response;
    } catch (error: any) {
      console.error('[CategoriesService] ❌ Server API error:', error);
      throw error;
    }
  }
  
  /**
   * Get a single category by ID
   * Note: Categories are public and don't require authentication
   */
  async getCategory(id: number): Promise<WooCategory> {
    return this.client.get<WooCategory>(`/products/categories/${id}`, undefined, {
      authenticated: false,
    });
  }
  
  /**
   * Get a category by slug
   */
  async getCategoryBySlug(slug: string): Promise<WooCategory | null> {
    const categories = await this.getCategories({ slug, per_page: 1 });
    return categories.length > 0 ? categories[0] : null;
  }
  
  /**
   * Get top-level categories (no parent)
   */
  async getTopLevelCategories(params: GetCategoriesParams = {}): Promise<WooCategory[]> {
    return this.getCategories({
      ...params,
      parent: 0,
    });
  }
  
  /**
   * Get child categories of a parent
   */
  async getChildCategories(parentId: number, params: GetCategoriesParams = {}): Promise<WooCategory[]> {
    return this.getCategories({
      ...params,
      parent: parentId,
    });
  }
  
  /**
   * Get category hierarchy (parent with children)
   */
  async getCategoryHierarchy(): Promise<Array<WooCategory & { children?: WooCategory[] }>> {
    console.log('[CategoriesService] 🌳 Building category hierarchy...');
    
    // Get all categories (already fetched via server API)
    const allCategories = await this.getCategories();
    
    console.log('[CategoriesService] 📊 Processing', allCategories.length, 'categories');
    
    // Build hierarchy
    const topLevel = allCategories.filter(cat => cat.parent === 0);
    console.log('[CategoriesService] 🏗️ Found', topLevel.length, 'top-level categories');
    
    // Add children to each parent
    const hierarchy = topLevel.map(parent => {
      const children = allCategories.filter(cat => cat.parent === parent.id);
      return {
        ...parent,
        children: children.length > 0 ? children : undefined,
      };
    });
    
    console.log('[CategoriesService] ✅ Hierarchy complete:', {
      parents: hierarchy.length,
      withChildren: hierarchy.filter(h => h.children).length,
    });
    
    return hierarchy;
  }
  
  /**
   * Search categories
   */
  async searchCategories(query: string, params: GetCategoriesParams = {}): Promise<WooCategory[]> {
    return this.getCategories({
      ...params,
      search: query,
    });
  }
}

// Export singleton instance
let categoriesServiceInstance: CategoriesService | null = null;

export function getCategoriesService(): CategoriesService {
  if (!categoriesServiceInstance) {
    categoriesServiceInstance = new CategoriesService();
  }
  return categoriesServiceInstance;
}

// Export default instance for convenient usage
export const categoriesService = new CategoriesService();

