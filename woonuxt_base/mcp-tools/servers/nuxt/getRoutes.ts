/**
 * Nuxt: Get Routes
 * 
 * Retrieve available Nuxt routes from the pages directory
 */

import { callMCPTool } from '../../../server/mcp/client.js';

interface Route {
  path: string;
  name?: string;
}

interface GetRoutesResponse {
  routes: string[];
  count: number;
  note?: string;
}

/**
 * Get available Nuxt routes
 * 
 * @returns List of available routes
 */
export async function getRoutes(): Promise<GetRoutesResponse> {
  return callMCPTool<GetRoutesResponse>('nuxt__get_routes', {});
}





