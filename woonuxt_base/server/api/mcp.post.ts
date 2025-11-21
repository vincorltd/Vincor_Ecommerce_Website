/**
 * MCP HTTP Transport Endpoint
 * 
 * This endpoint provides HTTP transport for the MCP server
 * Following Nuxt's pattern for MCP integration
 */

import { createMCPServer } from '../mcp/server.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Create a singleton MCP server instance
let mcpServer: ReturnType<typeof createMCPServer> | null = null;

export default defineEventHandler(async (event) => {
  // Initialize server on first request
  if (!mcpServer) {
    mcpServer = createMCPServer();
  }

  const method = getMethod(event);
  const body = await readBody(event).catch(() => ({}));

  // Handle MCP protocol requests
  // The MCP protocol uses JSON-RPC 2.0
  if (method === 'POST') {
    try {
      const { jsonrpc, method: rpcMethod, params, id } = body;

      if (jsonrpc !== '2.0') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid JSON-RPC version',
        });
      }

      // Route to appropriate handler based on method
      let result: any;

      switch (rpcMethod) {
        case 'tools/list': {
          // Create a mock request object for the handler
          const mockRequest = {
            params: {},
          };
          const handler = (mcpServer as any)._requestHandlers?.get('tools/list');
          if (handler) {
            result = await handler(mockRequest);
          } else {
            // Fallback: get tools directly
            const { woocommerceTools } = await import('../mcp/tools/woocommerce.js');
            const { wordpressTools } = await import('../mcp/tools/wordpress.js');
            const { nuxtTools } = await import('../mcp/tools/nuxt.js');
            result = {
              tools: [...woocommerceTools, ...wordpressTools, ...nuxtTools],
            };
          }
          break;
        }

        case 'tools/call': {
          if (!params?.name) {
            throw createError({
              statusCode: 400,
              statusMessage: 'Tool name is required',
            });
          }
          // Import tools and find the handler
          const { woocommerceTools } = await import('../mcp/tools/woocommerce.js');
          const { wordpressTools } = await import('../mcp/tools/wordpress.js');
          const { nuxtTools } = await import('../mcp/tools/nuxt.js');
          const allTools = [...woocommerceTools, ...wordpressTools, ...nuxtTools];
          const tool = allTools.find((t) => t.name === params.name);
          
          if (!tool || !tool.handler) {
            throw createError({
              statusCode: 404,
              statusMessage: `Tool not found: ${params.name}`,
            });
          }
          
          const toolResult = await tool.handler(params.arguments || {});
          result = {
            content: [
              {
                type: 'text',
                text: JSON.stringify(toolResult, null, 2),
              },
            ],
          };
          break;
        }

        case 'resources/list': {
          result = {
            resources: [],
          };
          break;
        }

        case 'resources/read': {
          if (!params?.uri) {
            throw createError({
              statusCode: 400,
              statusMessage: 'Resource URI is required',
            });
          }
          throw createError({
            statusCode: 404,
            statusMessage: 'Resources not implemented',
          });
        }

        default:
          throw createError({
            statusCode: 404,
            statusMessage: `Unknown method: ${rpcMethod}`,
          });
      }

      return {
        jsonrpc: '2.0',
        id,
        result,
      };
    } catch (error: any) {
      return {
        jsonrpc: '2.0',
        id: body.id,
        error: {
          code: error.statusCode || -32603,
          message: error.message || 'Internal error',
          data: error.data,
        },
      };
    }
  }

  // GET request - return server info
  if (method === 'GET') {
    return {
      name: 'vincor-woocommerce-mcp',
      version: '1.0.0',
      protocol: 'mcp',
      capabilities: {
        tools: {},
        resources: {},
      },
    };
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed',
  });
});

