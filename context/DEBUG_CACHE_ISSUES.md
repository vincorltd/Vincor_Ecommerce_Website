# Debug Guide: Cache Issues - Product Updates Not Showing

## What I've Added

### 1. **Comprehensive Debug Logging**

Added detailed console logs at every cache check point:

- `[Product Store] 🔍 fetchProduct called` - Shows when fetchProduct is called with parameters
- `[Product Store] 🔍 Cache check` - Shows cache state (found, age, TTL, isFresh)
- `[Product Page] 🔍 Cache check` - Shows cache state in the page component
- `[Product Page] 🔍 getCachedData cache check` - Shows what getCachedData finds
- `[Product Page] 🔍 Force refresh detected` - Shows when refresh param is detected

### 2. **Reduced Cache TTL in Dev**

Changed from 30 seconds to **10 seconds** in development mode for faster testing.

### 3. **Dev Helper Function**

Added a global function you can call from the browser console:

```javascript
clearProductCache()
```

This will:
- Clear the cache for the current product
- Refresh the page data
- Force a fresh fetch

## How to Debug

### Step 1: Check Console Logs

Open browser console and look for these logs when loading a product:

```
[Product Store] 🎯 Cache TTL set to: 10s (development mode)
[Product Page] 🔍 Force refresh detected in query params
[Product Store] 🔍 fetchProduct called: { slug: '...', forceRefresh: true/false, ... }
[Product Store] 🔍 Cache check: { found: true/false, age: 'Xs', isFresh: true/false, ... }
```

### Step 2: Test Force Refresh

Add `?refresh=true` to the URL:
```
http://localhost:3000/product/your-product-slug?refresh=true
```

You should see:
```
[Product Page] 🔄 Forcing refresh (bypassing getCachedData)
[Product Store] 🔄 Force refresh requested, bypassing cache
[Product Store] 🔄 Fetching product from API: your-product-slug
```

### Step 3: Check Cache Age

Look for logs showing cache age:
```
[Product Page] 🔍 Cache check: { age: '5s', ttl: '10s (dev)', expired: false }
```

If age >= 10s, cache should expire and fetch fresh.

### Step 4: Use Dev Helper

In browser console, type:
```javascript
clearProductCache()
```

This will clear cache and refresh immediately.

## Common Issues

### Issue 1: Cache Not Clearing

**Symptoms:**
- Logs show `found: true, isFresh: true` even after updates
- Age is less than TTL

**Solution:**
1. Use `?refresh=true` in URL
2. Or call `clearProductCache()` in console
3. Or wait 10 seconds for cache to expire

### Issue 2: Force Refresh Not Working

**Symptoms:**
- Adding `?refresh=true` but still seeing cached data
- Logs show `forceRefresh: false`

**Check:**
- Make sure you're in development mode (`process.dev === true`)
- Check logs for `[Product Page] 🔍 Force refresh detected in query params`
- Verify the query param is actually in the URL

### Issue 3: Cache Expiring Too Fast

**Symptoms:**
- Products always fetching fresh (no cache hits)
- Logs show `expired: true` even for new cache

**Check:**
- Verify `CACHE_TTL` is set correctly (should be 10s in dev)
- Check logs for `[Product Store] 🎯 Cache TTL set to: 10s`

### Issue 4: Updates Not Showing

**Symptoms:**
- Updated product in WordPress
- Changes not appearing even with `?refresh=true`

**Debug Steps:**
1. Check if API is returning fresh data:
   - Open Network tab
   - Look for `/api/products/[slug]` request
   - Check response - does it have the updated data?

2. Check if cache is being bypassed:
   - Look for `[Product Store] 🔄 Force refresh requested`
   - Look for `[Product Store] 🔄 Fetching product from API`

3. Check if data is being transformed correctly:
   - Look for `[Product Page] 📦 Product received from store`
   - Verify the data matches what you expect

## Expected Behavior

### First Load (No Cache)
```
[Product Store] 📭 No cache found
[Product Store] 🔄 Fetching product from API
[Product Store] ✅ Product fetched
[Product Store] 💾 Product cached
```

### Cached Load (Within 10s)
```
[Product Store] 🔍 Cache check: { found: true, isFresh: true, age: '3s' }
[Product Store] ⚡ Using cached product
```

### Expired Cache (After 10s)
```
[Product Store] 🔍 Cache check: { found: true, isFresh: false, age: '15s' }
[Product Store] ⏰ Cache expired, fetching fresh
[Product Store] 🔄 Fetching product from API
```

### Force Refresh
```
[Product Page] 🔄 Forcing refresh (bypassing getCachedData)
[Product Store] 🔄 Force refresh requested, bypassing cache
[Product Store] 🔄 Fetching product from API
```

## Next Steps

1. **Open browser console** and load a product page
2. **Look for the debug logs** - they'll tell you exactly what's happening
3. **Try `?refresh=true`** - should bypass all caches
4. **Try `clearProductCache()`** - dev helper function
5. **Check Network tab** - verify API is returning fresh data

## Files Modified

1. `woonuxt_base/app/stores/product.ts` - Added debug logs, reduced TTL to 10s
2. `woonuxt_base/app/stores/products.ts` - Added debug logs, reduced TTL to 10s
3. `woonuxt_base/app/pages/product/[slug].vue` - Added comprehensive debug logs, dev helper

## Summary

✅ **10-second cache TTL** in dev (was 30s)  
✅ **Comprehensive debug logging** at every cache check  
✅ **Dev helper function** `clearProductCache()`  
✅ **Better force refresh** detection and handling  

**Now you can see exactly what's happening with the cache!** 🔍



