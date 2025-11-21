/**
 * MCP Client Wrapper
 * 
 * This module provides a client for calling MCP tools.
 * Following Anthropic's code execution method, tools are presented as code APIs
 * rather than direct tool calls to reduce token consumption.
 */

/**
 * Call an MCP tool by name with input parameters
 * This is the underlying function that all tool files will use
 * 
 * In the code execution method, agents write code that calls these functions,
 * which then route to the MCP server. This reduces token consumption by
 * allowing agents to load only the tool definitions they need.
 */
export async function callMCPTool<T = any>(
  toolName: string,
  input: Record<string, any>
): Promise<T> {
  // Call the MCP server via HTTP endpoint
  try {
    const response = await $fetch<{
      jsonrpc: string;
      id: string | number;
      result?: T;
      error?: {
        code: number;
        message: string;
        data?: any;
      };
    }>('/api/mcp', {
      method: 'POST',
      body: {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: input,
        },
        id: Date.now().toString(),
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'MCP tool call failed');
    }

    if (response.result) {
      // The result from MCP is wrapped in content array
      const content = (response.result as any)?.content?.[0];
      if (content?.text) {
        try {
          return JSON.parse(content.text) as T;
        } catch {
          return content.text as T;
        }
      }
      return response.result as T;
    }

    throw new Error('No result from MCP tool call');
  } catch (error: any) {
    console.error(`[MCP Client] Error calling tool ${toolName}:`, error);
    throw error;
  }
}

