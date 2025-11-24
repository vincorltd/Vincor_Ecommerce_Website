# MCP Tools - Code Execution Method

This directory contains MCP tools organized following Anthropic's code execution method. Instead of loading all tool definitions upfront, agents can discover tools by exploring the filesystem and loading only what they need.

## Structure

```
mcp-tools/
├── servers/
│   ├── woocommerce/
│   │   ├── getProducts.ts
│   │   ├── getProduct.ts
│   │   ├── getOrders.ts
│   │   ├── createOrder.ts
│   │   ├── getCart.ts
│   │   ├── addToCart.ts
│   │   └── index.ts
│   ├── wordpress/
│   │   ├── getPosts.ts
│   │   ├── getPost.ts
│   │   ├── getProductTabs.ts
│   │   └── index.ts
│   └── nuxt/
│       ├── getRoutes.ts
│       ├── getApiEndpoints.ts
│       └── index.ts
└── README.md
```

## Usage

Agents can import and use tools like regular TypeScript modules:

```typescript
// Import WooCommerce tools
import * as woocommerce from './servers/woocommerce';

// Get products
const products = await woocommerce.getProducts({ per_page: 10 });

// Get a single product
const product = await woocommerce.getProduct({ slug: 'my-product' });

// Import WordPress tools
import * as wordpress from './servers/wordpress';

// Get product tabs
const tabs = await wordpress.getProductTabs({ identifier: 'PROD-123' });
```

## Benefits

1. **Progressive Disclosure**: Agents load only the tools they need
2. **Context Efficiency**: Tool definitions are loaded on-demand
3. **Familiar Patterns**: Uses standard TypeScript imports
4. **Type Safety**: Full TypeScript support with interfaces
5. **Reduced Tokens**: Only relevant tool definitions in context

## Adding New Tools

1. Create a new TypeScript file in the appropriate server directory
2. Define the input/output interfaces
3. Export a function that calls `callMCPTool`
4. Add the export to the server's `index.ts`
5. Register the tool in `server/mcp/tools/[server].ts`





