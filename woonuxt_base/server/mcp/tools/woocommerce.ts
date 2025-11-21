/**
 * WooCommerce MCP Tools
 * 
 * Tools for interacting with WooCommerce REST API
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Get all products
 */
async function getProducts(args: Record<string, any>) {
  const { per_page = 100, page = 1, search, category } = args;
  
  // Use our existing API endpoint
  const config = useRuntimeConfig();
  const baseUrl = config.public.wooRestApiUrl || 'https://satchart.com/wp-json/wc/v3';
  
  const params = new URLSearchParams({
    per_page: String(per_page),
    page: String(page),
  });
  
  if (search) params.append('search', String(search));
  if (category) params.append('category', String(category));
  
  const url = `${baseUrl}/products?${params.toString()}`;
  
  if (config.wooConsumerKey && config.wooConsumerSecret) {
    params.append('consumer_key', config.wooConsumerKey);
    params.append('consumer_secret', config.wooConsumerSecret);
  }
  
  const response = await $fetch(url);
  return response;
}

/**
 * Get a single product by ID or slug
 */
async function getProduct(args: Record<string, any>) {
  const { id, slug } = args;
  
  if (!id && !slug) {
    throw new Error('Either id or slug is required');
  }
  
  // Use our existing API endpoint
  if (slug) {
    return await $fetch(`/api/products/${slug}`);
  }
  
  const config = useRuntimeConfig();
  const baseUrl = config.public.wooRestApiUrl || 'https://satchart.com/wp-json/wc/v3';
  
  const params = new URLSearchParams();
  if (config.wooConsumerKey && config.wooConsumerSecret) {
    params.append('consumer_key', config.wooConsumerKey);
    params.append('consumer_secret', config.wooConsumerSecret);
  }
  
  const url = `${baseUrl}/products/${id}?${params.toString()}`;
  const response = await $fetch(url);
  return response;
}

/**
 * Get orders
 */
async function getOrders(args: Record<string, any>) {
  const { per_page = 100, page = 1, status, customer } = args;
  
  const config = useRuntimeConfig();
  const baseUrl = config.public.wooRestApiUrl || 'https://satchart.com/wp-json/wc/v3';
  
  const params = new URLSearchParams({
    per_page: String(per_page),
    page: String(page),
  });
  
  if (status) params.append('status', String(status));
  if (customer) params.append('customer', String(customer));
  
  if (config.wooConsumerKey && config.wooConsumerSecret) {
    params.append('consumer_key', config.wooConsumerKey);
    params.append('consumer_secret', config.wooConsumerSecret);
  }
  
  const url = `${baseUrl}/orders?${params.toString()}`;
  const response = await $fetch(url);
  return response;
}

/**
 * Create an order
 */
async function createOrder(args: Record<string, any>) {
  const orderData = args.order || args;
  
  // Use our existing API endpoint
  return await $fetch('/api/orders/create', {
    method: 'POST',
    body: orderData,
  });
}

/**
 * Get cart
 */
async function getCart(args: Record<string, any>) {
  return await $fetch('/api/cart');
}

/**
 * Add item to cart
 */
async function addToCart(args: Record<string, any>) {
  const { id, quantity = 1, variation, addons } = args;
  
  if (!id) {
    throw new Error('Product ID is required');
  }
  
  return await $fetch('/api/cart/add-item', {
    method: 'POST',
    body: {
      id,
      quantity,
      variation,
      addons,
    },
  });
}

export const woocommerceTools: Tool[] = [
  {
    name: 'woocommerce__get_products',
    description: 'Get a list of products from WooCommerce',
    inputSchema: {
      type: 'object',
      properties: {
        per_page: {
          type: 'number',
          description: 'Number of products per page (default: 100)',
        },
        page: {
          type: 'number',
          description: 'Page number (default: 1)',
        },
        search: {
          type: 'string',
          description: 'Search query',
        },
        category: {
          type: 'number',
          description: 'Category ID to filter by',
        },
      },
    },
    handler: getProducts,
  },
  {
    name: 'woocommerce__get_product',
    description: 'Get a single product by ID or slug',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Product ID',
        },
        slug: {
          type: 'string',
          description: 'Product slug',
        },
      },
    },
    handler: getProduct,
  },
  {
    name: 'woocommerce__get_orders',
    description: 'Get a list of orders from WooCommerce',
    inputSchema: {
      type: 'object',
      properties: {
        per_page: {
          type: 'number',
          description: 'Number of orders per page (default: 100)',
        },
        page: {
          type: 'number',
          description: 'Page number (default: 1)',
        },
        status: {
          type: 'string',
          description: 'Order status filter',
        },
        customer: {
          type: 'number',
          description: 'Customer ID to filter by',
        },
      },
    },
    handler: getOrders,
  },
  {
    name: 'woocommerce__create_order',
    description: 'Create a new order in WooCommerce',
    inputSchema: {
      type: 'object',
      properties: {
        order: {
          type: 'object',
          description: 'Order data',
        },
      },
    },
    handler: createOrder,
  },
  {
    name: 'woocommerce__get_cart',
    description: 'Get the current shopping cart',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: getCart,
  },
  {
    name: 'woocommerce__add_to_cart',
    description: 'Add a product to the shopping cart',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Product ID',
          required: true,
        },
        quantity: {
          type: 'number',
          description: 'Quantity to add (default: 1)',
        },
        variation: {
          type: 'object',
          description: 'Product variation data',
        },
        addons: {
          type: 'array',
          description: 'Product add-ons',
        },
      },
      required: ['id'],
    },
    handler: addToCart,
  },
];

