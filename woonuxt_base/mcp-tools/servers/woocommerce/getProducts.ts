/**
 * WooCommerce: Get Products
 * 
 * Retrieve a list of products from WooCommerce
 */

import { callMCPTool } from '../../../server/mcp/client.js';

interface GetProductsInput {
  per_page?: number;
  page?: number;
  search?: string;
  category?: number;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  stock_status: string;
  stock_quantity: number | null;
  images: Array<{
    id: number;
    src: string;
    name: string;
    alt: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

interface GetProductsResponse {
  products: Product[];
  total: number;
  totalPages: number;
}

/**
 * Get a list of products from WooCommerce
 * 
 * @param input - Query parameters for filtering products
 * @returns List of products with pagination info
 */
export async function getProducts(input: GetProductsInput = {}): Promise<GetProductsResponse> {
  return callMCPTool<GetProductsResponse>('woocommerce__get_products', input);
}

