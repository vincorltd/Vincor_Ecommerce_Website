# Checkout API Authentication Fix

## Issue
When clicking "Checkout" button, the following error occurred:
```
Checkout Error: Consumer key and secret are required for authenticated requests
```

## Root Cause
The orders service was attempting to make direct authenticated requests to WooCommerce REST API from the **client-side**, which is not secure and doesn't work because:

1. **Security Risk**: Consumer key and secret should never be exposed to the client
2. **CORS Issues**: Direct browser requests to WooCommerce REST API with OAuth authentication don't work
3. **Architecture Problem**: Authenticated WooCommerce REST API endpoints must be called from server-side only

## Solution
Created **server-side API proxy endpoints** that handle authentication securely:

### 1. Created `/api/orders/create` (POST)
**File**: `woonuxt_base/server/api/orders/create.post.ts`

- Receives order data from client
- Adds WooCommerce API credentials (consumer key & secret) server-side
- Makes authenticated request to WooCommerce REST API
- Returns the created order

**Features**:
- ✅ Secure authentication (credentials stay on server)
- ✅ Proper error handling
- ✅ Full add-ons support in order line items
- ✅ Debug logging for troubleshooting

### 2. Created `/api/orders/[id]` (GET)
**File**: `woonuxt_base/server/api/orders/[id].get.ts`

- Fetches order by ID with authentication
- Supports optional `order_key` query parameter for security
- Used for order confirmation page

### 3. Updated Orders Service
**File**: `woonuxt_base/app/services/woocommerce/orders.service.ts`

Changed from:
```typescript
// ❌ Direct authenticated request from client (doesn't work)
return this.client.post<WooOrder>('/orders', orderData, {
  authenticated: true,
});
```

To:
```typescript
// ✅ Routes through server API proxy
const order = await $fetch<WooOrder>('/api/orders/create', {
  method: 'POST',
  body: orderData,
});
```

## Architecture

### Before (Broken)
```
Client Browser
    ↓ (attempts authenticated request)
    ❌ WooCommerce REST API (blocked - no credentials)
```

### After (Working)
```
Client Browser
    ↓ (unauthenticated request)
Server API Proxy (/api/orders/create)
    ↓ (authenticated with credentials)
    ✅ WooCommerce REST API
```

## Files Modified

1. **`server/api/orders/create.post.ts`** - NEW
   - Server endpoint for creating orders
   - Handles OAuth authentication

2. **`server/api/orders/[id].get.ts`** - NEW
   - Server endpoint for fetching orders
   - Supports order_key validation

3. **`app/services/woocommerce/orders.service.ts`** - MODIFIED
   - `create()` method now uses server API
   - `getById()` method now uses server API

## Features Preserved

✅ **Add-ons Support**: Order line items include full add-on metadata
✅ **Variable Products**: Variation IDs are properly included
✅ **Shipping Methods**: Selected shipping methods are included
✅ **Customer Notes**: Quote notes are preserved
✅ **Account Creation**: Support for creating accounts during checkout (if enabled)
✅ **Billing/Shipping**: Different shipping address support
✅ **Error Handling**: Proper error messages displayed to user

## Configuration Required

Ensure these environment variables are set in `.env`:

```bash
# WooCommerce REST API Credentials (required for authenticated endpoints)
WOO_REST_API_CONS_KEY=ck_xxxxxxxxxxxxxxxxxxxxx
WOO_REST_API_CONS_SEC=cs_xxxxxxxxxxxxxxxxxxxxx

# WooCommerce REST API URL
WOO_REST_API_URL=https://satchart.com/wp-json/wc/v3
```

These are already configured in `nuxt.config.ts`:
```typescript
runtimeConfig: {
  // Private keys (server-side only)
  wooConsumerKey: process.env.WOO_REST_API_CONS_KEY || '',
  wooConsumerSecret: process.env.WOO_REST_API_CONS_SEC || '',
  
  // Public keys (exposed to client)
  public: {
    wooRestApiUrl: process.env.WOO_REST_API_URL || 'https://satchart.com/wp-json/wc/v3',
  }
}
```

## Testing Checklist

- [x] Click "Checkout" button with items in cart
- [x] Order is created successfully
- [x] Order includes add-ons in line items
- [x] Redirected to order confirmation page
- [x] Order confirmation page displays correctly
- [x] Cart is emptied after successful order

## Debugging

To debug order creation, check server logs for:

```
[Orders API] 📝 Creating order...
[Orders API] 📦 Order data: { billing, lineItemsCount, paymentMethod, hasAddons }
[Orders API] ✅ Order created successfully: { orderId, orderKey, total, status }
[Orders API] 🎁 Line item 1 has X add-ons: [...]
```

If errors occur:
```
[Orders API] ❌ WooCommerce error: { status, error }
```

## Security Notes

🔒 **Consumer Key & Secret**:
- NEVER exposed to client-side code
- Only available in `useRuntimeConfig()` server-side
- Transmitted only in server-to-server requests

🔒 **Order Key Validation**:
- Order confirmation pages use `order_key` parameter
- Prevents unauthorized access to order details

## Additional Notes

### Why OAuth Instead of Basic Auth?

WooCommerce REST API supports two authentication methods:
1. **Basic Auth over HTTPS** - Simple but requires auth header on every request
2. **OAuth 1.0a** - More secure, uses consumer key/secret as query params

We use OAuth 1.0a by appending credentials as query parameters:
```
/wp-json/wc/v3/orders?consumer_key=xxx&consumer_secret=xxx
```

This is the recommended approach for server-to-server communication.

### Future Improvements

If you need additional order operations:
1. Create new server API endpoint in `server/api/orders/`
2. Update orders service to use new endpoint
3. Follow same pattern as `create.post.ts`

Example endpoints that might be needed:
- `PUT /api/orders/[id]` - Update order
- `GET /api/orders` - List orders (for My Account page)
- `POST /api/orders/[id]/notes` - Add order note

These can be added as needed.




















