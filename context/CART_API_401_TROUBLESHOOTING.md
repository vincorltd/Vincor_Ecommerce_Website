# Cart API 401 Unauthorized Error - Troubleshooting Guide

## Problem
Getting `401 Unauthorized` error when trying to add items to cart via `/api/cart/add-item`.

## Root Cause
The WooCommerce Store API (`/wp-json/wc/store/v1/cart/add-item`) is returning 401 Unauthorized. This typically happens when:

1. **Application Passwords Plugin**: WordPress Application Passwords or similar auth plugins are requiring authentication for ALL API requests
2. **Security Plugins**: Security plugins (Wordfence, iThemes Security, etc.) are blocking unauthenticated API requests
3. **Custom Auth Requirements**: Site has custom authentication requirements
4. **CORS Issues**: Although handled server-side, there might be intermediate proxy issues

## Solutions

### Solution 1: Check WordPress Plugins (RECOMMENDED)
1. Go to your WordPress admin: `https://satchart.com/wp-admin/plugins.php`
2. Temporarily disable these plugins (one at a time):
   - Application Passwords
   - Wordfence Security
   - iThemes Security
   - Any custom authentication plugins
3. Test cart functionality after each disable
4. Once you find the culprit, configure it to allow Store API requests

### Solution 2: Whitelist Store API Endpoints
If using a security plugin, whitelist these endpoints:
- `/wp-json/wc/store/v1/cart`
- `/wp-json/wc/store/v1/cart/add-item`
- `/wp-json/wc/store/v1/cart/update-item`
- `/wp-json/wc/store/v1/cart/remove-item`
- `/wp-json/wc/store/v1/cart/*`

### Solution 3: Use WooCommerce Session Handler
The Store API should automatically create sessions for guest users. Verify:
1. WooCommerce > Settings > Advanced > REST API
2. Ensure "Enable the REST API" is checked
3. Check WooCommerce > Status > Logs for any session-related errors

### Solution 4: Check .htaccess Rules
If your `.htaccess` has custom authentication rules, add exception for Store API:
```apache
<IfModule mod_rewrite.c>
RewriteEngine On
# Allow Store API without auth
RewriteCond %{REQUEST_URI} ^/wp-json/wc/store/
RewriteRule .* - [E=noauth:1]
</IfModule>
```

### Solution 5: Alternative - Use REST API v3 (Requires Auth)
If Store API continues to have issues, we can switch to WooCommerce REST API v3 with server-side auth. This requires creating a cart session manually.

**File to modify**: `woonuxt_base/server/api/cart/add-item.post.ts`

## Testing
1. Test Store API directly from browser console:
```javascript
fetch('https://satchart.com/wp-json/wc/store/v1/cart', {
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

2. Test add-item:
```javascript
fetch('https://satchart.com/wp-json/wc/store/v1/cart/add-item', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 12345, quantity: 1 })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## Current Implementation Status
- ✅ Server-side proxy implemented (`/api/cart/add-item`)
- ✅ Cookie forwarding implemented
- ✅ Add-ons support added
- ❌ Getting 401 from WordPress/WooCommerce

## Next Steps
1. Check WordPress admin for authentication/security plugins
2. Review WooCommerce logs
3. If issue persists, implement alternative cart handling strategy

##Need Help?
Contact the WordPress site admin to check:
- WooCommerce Store API settings
- Active security plugins
- Server-level authentication rules

