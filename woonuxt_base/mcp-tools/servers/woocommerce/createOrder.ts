/**
 * WooCommerce: Create Order
 * 
 * Create a new order in WooCommerce
 */

import { callMCPTool } from '../../../server/mcp/client.js';

interface LineItem {
  product_id: number;
  quantity: number;
  variation_id?: number;
  meta_data?: Array<{
    key: string;
    value: any;
  }>;
}

interface CreateOrderInput {
  payment_method: string;
  payment_method_title: string;
  set_paid?: boolean;
  billing: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone?: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: LineItem[];
  shipping_lines?: Array<{
    method_id: string;
    method_title: string;
    total: string;
  }>;
  meta_data?: Array<{
    key: string;
    value: any;
  }>;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  currency: string;
  date_created: string;
  total: string;
  billing: CreateOrderInput['billing'];
  shipping: CreateOrderInput['shipping'];
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    price: string;
    total: string;
  }>;
}

/**
 * Create a new order in WooCommerce
 * 
 * @param input - Order data
 * @returns Created order
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  return callMCPTool<Order>('woocommerce__create_order', { order: input });
}








