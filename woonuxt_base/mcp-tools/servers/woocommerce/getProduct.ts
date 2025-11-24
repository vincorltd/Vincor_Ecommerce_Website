/**
 * WooCommerce: Get Product
 * 
 * Retrieve a single product by ID or slug
 */

import { callMCPTool } from '../../../server/mcp/client.js';

interface GetProductInput {
  id?: number;
  slug?: string;
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
  attributes: Array<{
    id: number;
    name: string;
    options: string[];
  }>;
  variations: number[];
  meta_data: Array<{
    id: number;
    key: string;
    value: any;
  }>;
}

/**
 * Get a single product by ID or slug
 * 
 * @param input - Product identifier (id or slug)
 * @returns Product details
 */
export async function getProduct(input: GetProductInput): Promise<Product> {
  if (!input.id && !input.slug) {
    throw new Error('Either id or slug is required');
  }
  
  return callMCPTool<Product>('woocommerce__get_product', input);
}







