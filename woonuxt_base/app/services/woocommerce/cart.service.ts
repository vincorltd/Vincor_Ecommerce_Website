/**
 * Cart Service
 * 
 * Handles all cart operations using WooCommerce Store API
 * Documentation: https://github.com/woocommerce/woocommerce/tree/trunk/plugins/woocommerce/src/StoreApi
 */

import { getApiClient } from '../api/client';
import type { WooCart, WooCartItem } from '../api/types';

export interface AddToCartPayload {
  id: number;
  quantity: number;
  variation?: Array<{
    attribute: string;
    value: string;
  }>;
  item_data?: Array<{
    key: string;
    value: string;
  }>;
  // Product Add-ons configuration
  // Documentation: https://woocommerce.com/document/product-add-ons-rest-api-reference/
  addons_configuration?: {
    [addonId: string]: 
      | number              // For multiple_choice (option index, starting from 0)
      | number[]            // For checkbox (array of option indexes, starting from 0)
      | string              // For custom_text, custom_textarea, datepicker (ISO8601 format), file_upload (complete URL)
      | number;             // For custom_price, input_multiplier
  };
}

export interface UpdateCartItemPayload {
  key: string;
  quantity: number;
}

export interface UpdateCustomerPayload {
  billing_address?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    email?: string;
    phone?: string;
  };
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    phone?: string;
  };
}

export class CartService {
  private client = getApiClient();
  
  /**
   * Get the current cart
   */
  async getCart(): Promise<WooCart> {
    return this.client.get<WooCart>('/cart', undefined, {
      useStoreApi: true,
    });
  }
  
  /**
   * Add item to cart
   */
  async addItem(payload: AddToCartPayload): Promise<WooCart> {
    return this.client.post<WooCart>('/cart/add-item', payload, {
      useStoreApi: true,
    });
  }
  
  /**
   * Update cart item quantity
   */
  async updateItem(payload: UpdateCartItemPayload): Promise<WooCart> {
    return this.client.post<WooCart>('/cart/update-item', payload, {
      useStoreApi: true,
    });
  }
  
  /**
   * Remove item from cart
   */
  async removeItem(key: string): Promise<WooCart> {
    return this.client.post<WooCart>('/cart/remove-item', { key }, {
      useStoreApi: true,
    });
  }
  
  /**
   * Clear the cart (remove all items)
   */
  async clearCart(): Promise<WooCart> {
    const cart = await this.getCart();
    
    // Remove each item individually
    for (const item of cart.items) {
      await this.removeItem(item.key);
    }
    
    // Return the empty cart
    return this.getCart();
  }
  
  /**
   * Apply coupon code
   */
  async applyCoupon(code: string): Promise<WooCart> {
    return this.client.post<WooCart>('/cart/apply-coupon', { code }, {
      useStoreApi: true,
    });
  }
  
  /**
   * Remove coupon code
   */
  async removeCoupon(code: string): Promise<WooCart> {
    return this.client.post<WooCart>('/cart/remove-coupon', { code }, {
      useStoreApi: true,
    });
  }
  
  /**
   * Select shipping rate
   */
  async selectShippingRate(
    packageId: number,
    rateId: string
  ): Promise<WooCart> {
    return this.client.post<WooCart>(
      '/cart/select-shipping-rate',
      {
        package_id: packageId,
        rate_id: rateId,
      },
      {
        useStoreApi: true,
      }
    );
  }
  
  /**
   * Update customer address
   */
  async updateCustomer(payload: UpdateCustomerPayload): Promise<WooCart> {
    return this.client.post<WooCart>('/cart/update-customer', payload, {
      useStoreApi: true,
    });
  }
  
  /**
   * Get cart item count
   */
  async getItemCount(): Promise<number> {
    const cart = await this.getCart();
    return cart.items_count;
  }
  
  /**
   * Check if cart is empty
   */
  async isEmpty(): Promise<boolean> {
    const cart = await this.getCart();
    return cart.items.length === 0;
  }
}

// Export singleton instance
let cartServiceInstance: CartService | null = null;

export function getCartService(): CartService {
  if (!cartServiceInstance) {
    cartServiceInstance = new CartService();
  }
  return cartServiceInstance;
}

// Export default instance for convenient usage
export const cartService = new CartService();

