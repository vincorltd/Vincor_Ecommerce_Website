# WordPress Plugin Dependencies

## ✅ Can Be SAFELY DISABLED

The following WordPress plugins can now be safely disabled without breaking the frontend:

### GraphQL Plugins (NOT NEEDED)
- ✅ **WPGraphQL** - Completely removed, no longer used
- ✅ **WPGraphQL for WooCommerce (WooGraphQL)** - Completely removed, no longer used
- ✅ **WPGraphQL CORS** - No longer needed without WPGraphQL
- ✅ **Any WPGraphQL extensions** - All GraphQL functionality removed

### WooNuxt Specific Plugins (NOT NEEDED)
- ✅ **WooNuxt Settings** - Replaced with custom configuration
- ✅ **Any WooNuxt-specific plugins** - Framework no longer used

## ✅ MUST KEEP ENABLED

The following plugins are REQUIRED for the frontend to work:

### Core WooCommerce
- ✅ **WooCommerce** - Required for all product/cart/checkout functionality
- ✅ **WooCommerce REST API** - Used by frontend for all data fetching

### Product Add-ons
- ✅ **WooCommerce Product Add-Ons** - Required for product customization
  - Make sure REST API endpoint is accessible: `/wp-json/wc/v3/products/{id}`
  - Frontend uses Store API for add-ons in cart

### Custom Plugin
- ✅ **Product Tabs (Custom)** - Required for product specifications/downloads
  - Provides `/wp-json/vincor/v1/product-tabs/{sku}` endpoint
  - See: `WORDPRESS_PRODUCT_TABS_PLUGIN.md` for details

### WordPress Core
- ✅ **REST API** - Must be enabled in WordPress settings
- ✅ **Permalinks** - Must use "Post name" or similar structure

## ⚠️ OPTIONAL (Recommended to Keep)

### Performance & Caching
- **WP Super Cache / W3 Total Cache** - Improves WordPress performance
- **Redis Object Cache** - Speeds up WooCommerce queries

### Security
- **Wordfence / Sucuri** - Security scanning
- **SSL Certificate** - HTTPS required for production

## API Endpoints Currently Used

The frontend ONLY uses these WordPress endpoints:

### WooCommerce REST API (v3)
```
/wp-json/wc/v3/products
/wp-json/wc/v3/products/{id}
/wp-json/wc/v3/products/categories
/wp-json/wc/v3/orders
/wp-json/wc/v3/orders/{id}
```

### WooCommerce Store API (v1)
```
/wp-json/wc/store/v1/cart
/wp-json/wc/store/v1/cart/add-item
/wp-json/wc/store/v1/cart/items
/wp-json/wc/store/v1/cart/update-item
/wp-json/wc/store/v1/cart/remove-item
/wp-json/wc/store/v1/checkout
```

### Custom Endpoints
```
/wp-json/vincor/v1/product-tabs/{sku}
/wp-json/vincor/v1/brands
```

## How to Test After Disabling

1. **Disable WPGraphQL and WooGraphQL plugins**
2. **Clear all caches** (WordPress, CDN, browser)
3. **Test these pages**:
   - ✅ Home page
   - ✅ Products listing page
   - ✅ Individual product pages
   - ✅ Add to cart functionality
   - ✅ Cart page
   - ✅ Checkout process
   - ✅ Category pages
   - ✅ Search functionality

4. **Check browser console** - Should see no errors
5. **Check Network tab** - Should see no GraphQL requests

## Verification Commands

### Test REST API Access
```bash
# Test products endpoint
curl https://satchart.com/wp-json/wc/v3/products?per_page=1

# Test Store API (cart)
curl https://satchart.com/wp-json/wc/store/v1/cart

# Test custom tabs endpoint
curl https://satchart.com/wp-json/vincor/v1/product-tabs/YOUR-SKU
```

### Check WordPress REST API Status
1. Go to: `https://satchart.com/wp-json/`
2. Should see JSON response with available endpoints
3. Look for `wc/v3` and `wc/store/v1` namespaces

## Authentication Setup

The frontend uses WooCommerce REST API authentication:

```env
WOO_REST_API_CONS_KEY=ck_xxxxxxxxxxxxx
WOO_REST_API_CONS_SEC=cs_xxxxxxxxxxxxx
```

These are generated in: **WordPress Admin → WooCommerce → Settings → Advanced → REST API**

## Performance Impact

### Before (with GraphQL)
- WPGraphQL plugin overhead
- GraphQL query parsing
- Additional plugin memory usage

### After (REST API only)
- ✅ Lighter WordPress installation
- ✅ Fewer plugins to update
- ✅ Less memory usage
- ✅ Simpler debugging

## Migration Status

✅ **GraphQL → REST API migration: 100% COMPLETE**
- All product data fetching uses REST API
- All cart operations use Store API
- All checkout uses Store API
- All category/taxonomy data uses REST API
- No GraphQL queries remain in codebase

## Summary

You can now safely:
1. ✅ Disable WPGraphQL plugin
2. ✅ Disable WPGraphQL for WooCommerce plugin
3. ✅ Disable any WPGraphQL extensions
4. ✅ Disable WooNuxt-specific plugins

The frontend will continue to work perfectly using only the WooCommerce REST API and Store API.

