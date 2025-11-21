/**
 * WordPress REST API MCP Tools
 * 
 * Tools for interacting with WordPress REST API
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Get WordPress posts
 */
async function getPosts(args: Record<string, any>) {
  const { per_page = 100, page = 1, search, categories, tags } = args;
  
  const config = useRuntimeConfig();
  const baseUrl = config.public.wooApiUrl || 'https://satchart.com/wp-json';
  
  const params = new URLSearchParams({
    per_page: String(per_page),
    page: String(page),
  });
  
  if (search) params.append('search', String(search));
  if (categories) params.append('categories', String(categories));
  if (tags) params.append('tags', String(tags));
  
  const url = `${baseUrl}/wp/v2/posts?${params.toString()}`;
  const response = await $fetch(url);
  return response;
}

/**
 * Get a single WordPress post
 */
async function getPost(args: Record<string, any>) {
  const { id } = args;
  
  if (!id) {
    throw new Error('Post ID is required');
  }
  
  const config = useRuntimeConfig();
  const baseUrl = config.public.wooApiUrl || 'https://satchart.com/wp-json';
  
  const url = `${baseUrl}/wp/v2/posts/${id}`;
  const response = await $fetch(url);
  return response;
}

/**
 * Get WordPress pages
 */
async function getPages(args: Record<string, any>) {
  const { per_page = 100, page = 1, search, parent } = args;
  
  const config = useRuntimeConfig();
  const baseUrl = config.public.wooApiUrl || 'https://satchart.com/wp-json';
  
  const params = new URLSearchParams({
    per_page: String(per_page),
    page: String(page),
  });
  
  if (search) params.append('search', String(search));
  if (parent) params.append('parent', String(parent));
  
  const url = `${baseUrl}/wp/v2/pages?${params.toString()}`;
  const response = await $fetch(url);
  return response;
}

/**
 * Get WordPress categories
 */
async function getCategories(args: Record<string, any>) {
  const { per_page = 100, page = 1, search, parent } = args;
  
  const config = useRuntimeConfig();
  const baseUrl = config.public.wooApiUrl || 'https://satchart.com/wp-json';
  
  const params = new URLSearchParams({
    per_page: String(per_page),
    page: String(page),
  });
  
  if (search) params.append('search', String(search));
  if (parent) params.append('parent', String(parent));
  
  const url = `${baseUrl}/wp/v2/categories?${params.toString()}`;
  const response = await $fetch(url);
  return response;
}

/**
 * Get product tabs (custom Vincor endpoint)
 */
async function getProductTabs(args: Record<string, any>) {
  const { identifier } = args;
  
  if (!identifier) {
    throw new Error('Product ID or SKU is required');
  }
  
  // Use our existing API endpoint
  return await $fetch(`/api/product-tabs/${identifier}`);
}

export const wordpressTools: Tool[] = [
  {
    name: 'wordpress__get_posts',
    description: 'Get WordPress posts',
    inputSchema: {
      type: 'object',
      properties: {
        per_page: {
          type: 'number',
          description: 'Number of posts per page (default: 100)',
        },
        page: {
          type: 'number',
          description: 'Page number (default: 1)',
        },
        search: {
          type: 'string',
          description: 'Search query',
        },
        categories: {
          type: 'number',
          description: 'Category ID to filter by',
        },
        tags: {
          type: 'number',
          description: 'Tag ID to filter by',
        },
      },
    },
    handler: getPosts,
  },
  {
    name: 'wordpress__get_post',
    description: 'Get a single WordPress post by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Post ID',
          required: true,
        },
      },
      required: ['id'],
    },
    handler: getPost,
  },
  {
    name: 'wordpress__get_pages',
    description: 'Get WordPress pages',
    inputSchema: {
      type: 'object',
      properties: {
        per_page: {
          type: 'number',
          description: 'Number of pages per page (default: 100)',
        },
        page: {
          type: 'number',
          description: 'Page number (default: 1)',
        },
        search: {
          type: 'string',
          description: 'Search query',
        },
        parent: {
          type: 'number',
          description: 'Parent page ID',
        },
      },
    },
    handler: getPages,
  },
  {
    name: 'wordpress__get_categories',
    description: 'Get WordPress categories',
    inputSchema: {
      type: 'object',
      properties: {
        per_page: {
          type: 'number',
          description: 'Number of categories per page (default: 100)',
        },
        page: {
          type: 'number',
          description: 'Page number (default: 1)',
        },
        search: {
          type: 'string',
          description: 'Search query',
        },
        parent: {
          type: 'number',
          description: 'Parent category ID',
        },
      },
    },
    handler: getCategories,
  },
  {
    name: 'wordpress__get_product_tabs',
    description: 'Get product tabs for a product (Vincor custom endpoint)',
    inputSchema: {
      type: 'object',
      properties: {
        identifier: {
          type: 'string',
          description: 'Product ID or SKU',
          required: true,
        },
      },
      required: ['identifier'],
    },
    handler: getProductTabs,
  },
];

