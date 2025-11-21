/**
 * WooCommerce: Get Cart
 * 
 * Retrieve the current shopping cart
 */

import { callMCPTool } from '../../../server/mcp/client.js';

interface CartItem {
  key: string;
  id: number;
  quantity: number;
  name: string;
  title: string;
  price: number;
  line_price: number;
  line_subtotal: number;
  line_total: number;
  product_id: number;
  variation_id?: number;
  image?: {
    id: number;
    src: string;
    alt: string;
  };
  meta_data?: Array<{
    key: string;
    value: any;
  }>;
}

interface Cart {
  items: CartItem[];
  items_count: number;
  items_weight: number;
  needs_payment: boolean;
  needs_shipping: boolean;
  totals: {
    total_items: string;
    total_items_tax: string;
    total_fees: string;
    total_fees_tax: string;
    total_discount: string;
    total_discount_tax: string;
    total_shipping: string;
    total_shipping_tax: string;
    total_price: string;
    total_tax: string;
    tax_lines: Array<{
      name: string;
      price: string;
      rate: string;
    }>;
  };
  currency: {
    currency_code: string;
    currency_symbol: string;
    currency_minor_unit: number;
    currency_decimal_separator: string;
    currency_thousand_separator: string;
    currency_prefix: string;
    currency_suffix: string;
  };
}

/**
 * Get the current shopping cart
 * 
 * @returns Cart data with items and totals
 */
export async function getCart(): Promise<Cart> {
  return callMCPTool<Cart>('woocommerce__get_cart', {});
}

