/**
 * MCP Server Implementation
 * 
 * This creates an MCP server that exposes WooCommerce, WordPress, and Nuxt tools
 * Following the Nuxt MCP integration pattern
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import tool implementations
import { woocommerceTools } from './tools/woocommerce.js';
import { wordpressTools } from './tools/wordpress.js';
import { nuxtTools } from './tools/nuxt.js';

// Combine all tools
const allTools = [
  ...woocommerceTools,
  ...wordpressTools,
  ...nuxtTools,
];

// Combine all resources
const allResources: any[] = [
  // Resources can be added here
];

/**
 * Create and configure the MCP server
 */
export function createMCPServer() {
  const server = new Server(
    {
      name: 'vincor-woocommerce-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools,
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Find the tool handler
    const tool = allTools.find((t) => t.name === name);
    
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Execute the tool handler
    if (tool.handler) {
      try {
        const result = await tool.handler(args || {});
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    throw new Error(`Tool ${name} has no handler`);
  });

  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: allResources,
    };
  });

  // Handle resource reads
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    
    // Find the resource
    const resource = allResources.find((r) => r.uri === uri);
    
    if (!resource) {
      throw new Error(`Unknown resource: ${uri}`);
    }

    // Return resource content
    if (resource.handler) {
      const content = await resource.handler();
      return {
        contents: [
          {
            uri,
            mimeType: resource.mimeType || 'application/json',
            text: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
          },
        ],
      };
    }

    throw new Error(`Resource ${uri} has no handler`);
  });

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startMCPServer() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  
  console.log('[MCP Server] ✅ Server started and ready');
  
  return server;
}







