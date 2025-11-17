/**
 * Product Add-ons Service
 * 
 * Handles product add-ons operations using WooCommerce Product Add-ons REST API
 * Documentation: https://woocommerce.com/document/product-add-ons-rest-api-reference/
 */

import { getApiClient } from '../api/client';
import type { ProductAddon, WooGlobalAddonGroup } from '../api/types';

export interface GetGlobalAddonsParams {
  page?: number;
  per_page?: number;
}

export interface CreateGlobalAddonGroupPayload {
  name: string;
  priority?: number;
  restrict_to_categories?: number[];
  fields: ProductAddon[];
}

export interface UpdateGlobalAddonGroupPayload {
  name?: string;
  priority?: number;
  restrict_to_categories?: number[];
  fields?: ProductAddon[];
}

export class AddonsService {
  private client = getApiClient();
  
  // ============================================================================
  // Global Add-ons
  // ============================================================================
  
  /**
   * Get all global add-on groups
   */
  async getGlobalAddonGroups(params: GetGlobalAddonsParams = {}): Promise<WooGlobalAddonGroup[]> {
    return this.client.get<WooGlobalAddonGroup[]>(
      '/global-add-ons',
      params,
      {
        authenticated: true,
        // Note: This uses the Product Add-ons API endpoint
        // Full path would be: /wp-json/wc-product-add-ons/v2/global-add-ons
      }
    );
  }
  
  /**
   * Get a single global add-on group
   */
  async getGlobalAddonGroup(groupId: number): Promise<WooGlobalAddonGroup> {
    return this.client.get<WooGlobalAddonGroup>(
      `/global-add-ons/${groupId}`,
      undefined,
      {
        authenticated: true,
      }
    );
  }
  
  /**
   * Create a new global add-on group
   */
  async createGlobalAddonGroup(payload: CreateGlobalAddonGroupPayload): Promise<WooGlobalAddonGroup> {
    return this.client.post<WooGlobalAddonGroup>(
      '/global-add-ons',
      payload,
      {
        authenticated: true,
      }
    );
  }
  
  /**
   * Update a global add-on group
   */
  async updateGlobalAddonGroup(
    groupId: number,
    payload: UpdateGlobalAddonGroupPayload
  ): Promise<WooGlobalAddonGroup> {
    return this.client.put<WooGlobalAddonGroup>(
      `/global-add-ons/${groupId}`,
      payload,
      {
        authenticated: true,
      }
    );
  }
  
  /**
   * Delete a global add-on group
   */
  async deleteGlobalAddonGroup(groupId: number): Promise<void> {
    return this.client.delete<void>(
      `/global-add-ons/${groupId}`,
      {
        authenticated: true,
      }
    );
  }
  
  // ============================================================================
  // Product-specific Add-ons
  // Note: These are handled through the regular products endpoint
  // ============================================================================
  
  /**
   * Get add-ons for a specific product
   * @param productId - Product ID
   * @param includeGlobal - If true, includes global add-ons (GET with context=view)
   *                        If false, only product-specific add-ons (GET with context=edit)
   */
  async getProductAddons(productId: number, includeGlobal: boolean = false): Promise<ProductAddon[]> {
    const product = await this.client.get<any>(
      `/products/${productId}`,
      { context: includeGlobal ? 'view' : 'edit' },
      {
        authenticated: true,
      }
    );
    
    return product.addons || [];
  }
  
  /**
   * Update product add-ons
   * This will replace all existing product-specific add-ons
   */
  async updateProductAddons(
    productId: number,
    addons: ProductAddon[]
  ): Promise<void> {
    await this.client.put<any>(
      `/products/${productId}`,
      { addons },
      {
        authenticated: true,
      }
    );
  }
  
  /**
   * Add a single add-on to a product
   */
  async addProductAddon(
    productId: number,
    addon: ProductAddon
  ): Promise<void> {
    // First, get existing add-ons
    const existingAddons = await this.getProductAddons(productId, false);
    
    // Add the new one
    const updatedAddons = [...existingAddons, addon];
    
    // Update the product
    await this.updateProductAddons(productId, updatedAddons);
  }
  
  /**
   * Remove an add-on from a product by ID
   */
  async removeProductAddon(
    productId: number,
    addonId: number
  ): Promise<void> {
    // Get existing add-ons
    const existingAddons = await this.getProductAddons(productId, false);
    
    // Filter out the one to remove
    const updatedAddons = existingAddons.filter(addon => addon.id !== addonId);
    
    // Update the product
    await this.updateProductAddons(productId, updatedAddons);
  }
  
  /**
   * Enable/disable global add-ons for a product
   */
  async setGlobalAddonsExclusion(
    productId: number,
    exclude: boolean
  ): Promise<void> {
    await this.client.put<any>(
      `/products/${productId}`,
      { exclude_global_add_ons: exclude },
      {
        authenticated: true,
      }
    );
  }
  
  // ============================================================================
  // Utility Methods
  // ============================================================================
  
  /**
   * Get all add-ons for a product (global + product-specific)
   * This is what you'd see on the single product page
   */
  async getAllProductAddons(productId: number): Promise<ProductAddon[]> {
    return this.getProductAddons(productId, true);
  }
  
  /**
   * Format add-ons configuration for cart
   * Helper to convert form data to the format expected by Store API
   */
  formatAddonsForCart(
    addons: Array<{ id: number | string; value: any }>
  ): Record<string, any> {
    const config: Record<string, any> = {};
    
    addons.forEach(addon => {
      config[addon.id.toString()] = addon.value;
    });
    
    return config;
  }
}

// Export singleton instance
let addonsServiceInstance: AddonsService | null = null;

export function getAddonsService(): AddonsService {
  if (!addonsServiceInstance) {
    addonsServiceInstance = new AddonsService();
  }
  return addonsServiceInstance;
}

// Export default instance for convenient usage
export const addonsService = new AddonsService();

