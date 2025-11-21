# Cache Fix for Development - Product Updates Not Reflecting

## Problem

When updating products in WordPress (prices, descriptions, tabs, datasheets), changes weren't showing up on the frontend even after clearing browser cache. This was due to multiple layers of caching:

1. **Pinia Stores**: 5-minute TTL cache in memory
2. **useAsyncData**: Nuxt's built-in caching by key
3. **SSR/SSG**: Pre-rendered HTML with cached data
4. **Tabs/Datasheet**: Separate API calls that were also cached

## Solution

Implemented a comprehensive cache invalidation system with development-friendly defaults:

### 1. **Reduced Cache TTL in Development**

- **Production**: 5 minutes (unchanged)
- **Development**: 30 seconds (much faster updates)

**Files Changed:**
- `woonuxt_base/app/stores/product.ts`
- `woonuxt_base/app/stores/products.ts`

```typescript
// Before
const CACHE_TTL = 5 * 60 * 1000; // Always 5 minutes

// After
const CACHE_TTL = process.dev ? (30 * 1000) : (5 * 60 * 1000);
// Dev: 30 seconds, Prod: 5 minutes
```

### 2. **Cache-Busting Query Parameter**

Add `?refresh=true` to any product URL to force a fresh fetch, bypassing all caches:

**Examples:**
- `/product/my-product?refresh=true`
- `/products?refresh=true`
- `/product-category/cables?refresh=true`

**How it works:**
- Checks for `?refresh=true` query parameter
- Bypasses Pinia cache
- Bypasses `useAsyncData` cache
- Forces fresh API calls for tabs and datasheet

**Files Changed:**
- `woonuxt_base/app/pages/product/[slug].vue`
- `woonuxt_base/app/pages/products.vue`
- `woonuxt_base/app/components/productElements/ProductTabsNew.vue`
- `woonuxt_base/app/components/productElements/DatasheetTab.vue`

### 3. **Automatic Refresh on Product Changes**

Tabs and datasheet components now watch for product changes and automatically refresh:

**Files Changed:**
- `woonuxt_base/app/components/productElements/ProductTabsNew.vue`
- `woonuxt_base/app/components/productElements/DatasheetTab.vue`

```typescript
// Watch for product changes and refresh tabs
watch(() => props.product?.databaseId, () => {
  if (props.product?.databaseId) {
    console.log('[ProductTabs] 🔄 Product changed, refreshing tabs...');
    loading.value = true;
    fetchTabs();
  }
});
```

### 4. **Development Mode Cache Bypass**

In development mode, `useAsyncData` uses a timestamp-based key to prevent caching:

```typescript
// Dev mode: always fetch fresh (bypass useAsyncData cache)
...(process.dev ? { 
  key: `product-${slug.value}-${Date.now()}` 
} : {}),
```

## Usage

### For Development

**Option 1: Wait 30 seconds**
- Cache automatically expires after 30 seconds in dev mode
- Just refresh the page after making changes

**Option 2: Use `?refresh=true` query parameter**
- Add `?refresh=true` to the URL
- Example: `http://localhost:3000/product/my-product?refresh=true`
- Forces immediate refresh, bypassing all caches

**Option 3: Hard refresh in browser**
- `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Clears browser cache and forces fresh fetch

### For Production

- Cache TTL remains 5 minutes (good for performance)
- Use `?refresh=true` if you need immediate updates after WordPress changes
- Or wait 5 minutes for automatic refresh

## Technical Details

### Cache Layers (Before Fix)

```
WordPress Update
  ↓
WooCommerce REST API (fresh data)
  ↓
Server API Endpoint (/api/products/[slug])
  ↓
Pinia Store (5 min cache) ← STALE DATA HERE
  ↓
useAsyncData (Nuxt cache) ← STALE DATA HERE
  ↓
SSR/SSG (pre-rendered HTML) ← STALE DATA HERE
  ↓
Browser Cache ← STALE DATA HERE
  ↓
User sees old data ❌
```

### Cache Layers (After Fix)

```
WordPress Update
  ↓
WooCommerce REST API (fresh data)
  ↓
Server API Endpoint (/api/products/[slug])
  ↓
Pinia Store (30s cache in dev, 5min in prod)
  ↓
useAsyncData (bypassed in dev with timestamp key)
  ↓
Fresh data fetched ✅
  ↓
User sees new data ✅
```

## Console Logs

You'll see helpful console messages:

**Cache Hit:**
```
[Product Page] ⚡ Using Pinia cached product (client navigation): my-product
```

**Cache Miss (Fresh Fetch):**
```
[Product Page] 🔄 Loading product: my-product
[Product Store] 🔄 Fetching product from API: my-product
[Product Store] ✅ Product fetched: My Product Name
```

**Force Refresh:**
```
[Product Page] 🔄 Dev mode: forcing refresh (bypassing cache)
[Product Store] 🔄 Fetching product from API: my-product
```

## Testing

1. **Update a product in WordPress** (price, description, tabs, etc.)
2. **Wait 30 seconds** (dev mode) or **add `?refresh=true`** to URL
3. **Refresh the page**
4. **Verify changes appear**

## Future Improvements

- [ ] Add a "Clear Cache" button in development mode
- [ ] Implement webhook-based cache invalidation from WordPress
- [ ] Add cache versioning based on product modification date
- [ ] Create a dev toolbar with cache controls

## Files Modified

1. `woonuxt_base/app/stores/product.ts` - Reduced dev cache TTL
2. `woonuxt_base/app/stores/products.ts` - Reduced dev cache TTL
3. `woonuxt_base/app/pages/product/[slug].vue` - Added refresh param support
4. `woonuxt_base/app/pages/products.vue` - Added refresh param support
5. `woonuxt_base/app/components/productElements/ProductTabsNew.vue` - Added refresh param + watch
6. `woonuxt_base/app/components/productElements/DatasheetTab.vue` - Added refresh param + watch

## Summary

✅ **Development**: 30-second cache (fast updates)  
✅ **Production**: 5-minute cache (good performance)  
✅ **Manual Refresh**: Add `?refresh=true` to URL  
✅ **Auto Refresh**: Tabs/datasheet refresh when product changes  
✅ **Console Logs**: Clear visibility into cache behavior  

Your product updates should now appear much faster during development! 🎉



