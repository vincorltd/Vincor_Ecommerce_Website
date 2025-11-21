/**
 * WooCommerce: Get Orders
 * 
 * Retrieve a list of orders from WooCommerce
 */

import { callMCPTool } from '../../../server/mcp/client.js';

interface GetOrdersInput {
  per_page?: number;
  page?: number;
  status?: string;
  customer?: number;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  currency: string;
  date_created: string;
  date_modified: string;
  total: string;
  total_tax: string;
  customer_id: number;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    price: string;
    total: string;
  }>;
}

interface GetOrdersResponse {
  orders: Order[];
  total: number;
  totalPages: number;
}

/**
 * Get a list of orders from WooCommerce
 * 
 * @param input - Query parameters for filtering orders
 * @returns List of orders with pagination info
 */
export async function getOrders(input: GetOrdersInput = {}): Promise<GetOrdersResponse> {
  return callMCPTool<GetOrdersResponse>('woocommerce__get_orders', input);
}

