/**
 * Nuxt MCP Tools
 * 
 * Tools for interacting with Nuxt-specific functionality
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Get available Nuxt routes
 */
async function getRoutes(args: Record<string, any>) {
  // In Nuxt, routes are defined in the pages directory
  // We can list available routes by examining the pages structure
  try {
    const pagesDir = join(process.cwd(), 'woonuxt_base', 'app', 'pages');
    const routes: string[] = [];
    
    async function scanDirectory(dir: string, prefix: string = '') {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await scanDirectory(
            join(dir, entry.name),
            `${prefix}/${entry.name}`
          );
        } else if (entry.name.endsWith('.vue')) {
          const routeName = entry.name.replace('.vue', '');
          if (routeName === 'index') {
            routes.push(prefix || '/');
          } else {
            routes.push(`${prefix}/${routeName}`);
          }
        }
      }
    }
    
    await scanDirectory(pagesDir);
    
    return {
      routes,
      count: routes.length,
    };
  } catch (error: any) {
    // Fallback: return common routes
    return {
      routes: [
        '/',
        '/products',
        '/product/:slug',
        '/product-category/:slug',
        '/cart',
        '/checkout',
        '/my-account',
        '/order-summary/:orderId',
      ],
      count: 8,
      note: 'Fallback routes (filesystem scan failed)',
    };
  }
}

/**
 * Get Nuxt configuration
 */
async function getConfig(args: Record<string, any>) {
  const config = useRuntimeConfig();
  
  return {
    public: {
      wooApiUrl: config.public.wooApiUrl,
      wooStoreApiUrl: config.public.wooStoreApiUrl,
      wooRestApiUrl: config.public.wooRestApiUrl,
      siteUrl: config.public.siteUrl,
    },
    hasCredentials: !!(
      config.wooConsumerKey && config.wooConsumerSecret
    ),
  };
}

/**
 * Get server API endpoints
 */
async function getApiEndpoints(args: Record<string, any>) {
  try {
    const apiDir = join(process.cwd(), 'woonuxt_base', 'server', 'api');
    const endpoints: string[] = [];
    
    async function scanDirectory(dir: string, prefix: string = '/api') {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await scanDirectory(
            join(dir, entry.name),
            `${prefix}/${entry.name}`
          );
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.get.ts') || entry.name.endsWith('.post.ts')) {
          const endpoint = entry.name
            .replace('.get.ts', '')
            .replace('.post.ts', '')
            .replace('.put.ts', '')
            .replace('.delete.ts', '')
            .replace('.ts', '');
          
          if (endpoint === 'index') {
            endpoints.push(prefix);
          } else if (endpoint.startsWith('[') && endpoint.endsWith(']')) {
            // Dynamic route
            endpoints.push(`${prefix}/:${endpoint.slice(1, -1)}`);
          } else {
            endpoints.push(`${prefix}/${endpoint}`);
          }
        }
      }
    }
    
    await scanDirectory(apiDir);
    
    return {
      endpoints,
      count: endpoints.length,
    };
  } catch (error: any) {
    // Fallback: return known endpoints
    return {
      endpoints: [
        '/api/products',
        '/api/products/:slug',
        '/api/cart',
        '/api/cart/add-item',
        '/api/orders',
        '/api/orders/:id',
        '/api/orders/create',
        '/api/product-tabs/:identifier',
        '/api/categories',
      ],
      count: 9,
      note: 'Fallback endpoints (filesystem scan failed)',
    };
  }
}

export const nuxtTools: Tool[] = [
  {
    name: 'nuxt__get_routes',
    description: 'Get available Nuxt routes from the pages directory',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: getRoutes,
  },
  {
    name: 'nuxt__get_config',
    description: 'Get Nuxt runtime configuration (public values only)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: getConfig,
  },
  {
    name: 'nuxt__get_api_endpoints',
    description: 'Get available server API endpoints',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: getApiEndpoints,
  },
];

