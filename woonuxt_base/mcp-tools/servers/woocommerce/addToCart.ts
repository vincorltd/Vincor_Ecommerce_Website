/**
 * WooCommerce: Add to Cart
 * 
 * Add a product to the shopping cart
 */

import { callMCPTool } from '../../../server/mcp/client.js';

interface AddToCartInput {
  id: number;
  quantity?: number;
  variation?: Record<string, any>;
  addons?: Array<{
    id: string;
    name: string;
    value: any;
  }>;
}

interface CartItem {
  key: string;
  id: number;
  quantity: number;
  name: string;
  title: string;
  price: number;
  line_price: number;
  product_id: number;
  variation_id?: number;
}

interface AddToCartResponse {
  item: CartItem;
  cart: {
    items_count: number;
    totals: {
      total_price: string;
    };
  };
}

/**
 * Add a product to the shopping cart
 * 
 * @param input - Product details to add
 * @returns Added item and updated cart summary
 */
export async function addToCart(input: AddToCartInput): Promise<AddToCartResponse> {
  if (!input.id) {
    throw new Error('Product ID is required');
  }
  
  return callMCPTool<AddToCartResponse>('woocommerce__add_to_cart', input);
}

