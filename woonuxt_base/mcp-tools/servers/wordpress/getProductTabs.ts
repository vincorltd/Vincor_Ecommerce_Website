/**
 * WordPress: Get Product Tabs
 * 
 * Retrieve product tabs from Vincor custom endpoint
 */

import { callMCPTool } from '../../../server/mcp/client.js';

interface GetProductTabsInput {
  identifier: string; // Product ID or SKU
}

interface ProductTab {
  id: string;
  title: string;
  content: string;
  priority: number;
}

interface GetProductTabsResponse {
  product_id: number;
  tabs: ProductTab[];
}

/**
 * Get product tabs for a product (Vincor custom endpoint)
 * 
 * @param input - Product identifier (ID or SKU)
 * @returns Product tabs data
 */
export async function getProductTabs(input: GetProductTabsInput): Promise<GetProductTabsResponse> {
  if (!input.identifier) {
    throw new Error('Product ID or SKU is required');
  }
  
  return callMCPTool<GetProductTabsResponse>('wordpress__get_product_tabs', input);
}

