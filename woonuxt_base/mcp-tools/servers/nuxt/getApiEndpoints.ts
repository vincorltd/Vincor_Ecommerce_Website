/**
 * Nuxt: Get API Endpoints
 * 
 * Retrieve available server API endpoints
 */

import { callMCPTool } from '../../../server/mcp/client.js';

interface GetApiEndpointsResponse {
  endpoints: string[];
  count: number;
  note?: string;
}

/**
 * Get available server API endpoints
 * 
 * @returns List of available API endpoints
 */
export async function getApiEndpoints(): Promise<GetApiEndpointsResponse> {
  return callMCPTool<GetApiEndpointsResponse>('nuxt__get_api_endpoints', {});
}







