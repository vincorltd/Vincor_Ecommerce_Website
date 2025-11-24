# 🔧 Product Add-ons Plugin Not Working - Troubleshooting

## Current Issue

The WooCommerce Product Add-ons plugin v8.1.1 is installed, but the REST API fields (`addons` and `exclude_global_add_ons`) are **NOT being returned** by `/wc/v3/products`.

### What We're Getting:
```javascript
{
  id: 6738,
  name: "ELEMENT 12W Ka-Band BUC",
  addons: undefined,  // ❌ Should be an array
  exclude_global_add_ons: undefined  // ❌ Should be a boolean
}
```

### What We Should Get (per [WooCommerce docs](https://woocommerce.com/document/product-add-ons-rest-api-reference/)):
```javascript
{
  id: 6738,
  name: "ELEMENT 12W Ka-Band BUC",
  addons: [...],  // ✅ Array of add-ons
  exclude_global_add_ons: false  // ✅ Boolean
}
```

---

## Possible Causes & Fixes

### 1. Plugin Needs Reactivation

Sometimes plugins don't register REST API hooks properly until reactivated.

**Try this:**
1. Go to: **WP Admin → Plugins**
2. Find: **WooCommerce Product Add-Ons**
3. Click: **Deactivate**
4. Click: **Activate**
5. Test the product page again

---

### 2. Permalinks Need Flushing

WordPress REST API routes need to be flushed after plugin updates.

**Try this:**
1. Go to: **WP Admin → Settings → Permalinks**
2. Don't change anything
3. Click: **Save Changes**
4. This flushes the rewrite rules
5. Test the product page again

---

### 3. REST API Cache Issue

WordPress or server caching might be serving old REST API responses.

**Try this:**
1. **Clear WordPress Object Cache** (if you have Redis/Memcached)
2. **Clear Server Cache** (if using Cloudflare, WP Rocket, etc.)
3. **Hard refresh** your product page (Ctrl+Shift+R)
4. Test again

---

### 4. Plugin Hook Priority Issue

The plugin might not be hooking into the REST API early enough.

**Check this:**
1. Go to: **WP Admin → Plugins**
2. Make sure **WooCommerce Product Add-Ons** is listed **AFTER** **WooCommerce**
3. If not, try deactivating and reactivating to change load order

---

### 5. REST API Endpoint Registration

Verify the plugin is actually registering the endpoint extension.

**Test this:**

Go to: `https://satchart.com/wp-json/`

Search the response for `wc-product-add-ons`. You should see:
```json
{
  "namespaces": [
    "wc-product-add-ons/v1",
    "wc-product-add-ons/v2"
  ]
}
```

If you DON'T see these namespaces, the plugin isn't loading properly.

---

### 6. PHP Version Compatibility

**Check PHP version:**
1. Go to: **WP Admin → Tools → Site Health → Info → Server**
2. Check PHP version
3. Product Add-ons v8.1.1 requires **PHP 7.4+**

---

### 7. Conflicting Plugins

Another plugin might be interfering with REST API.

**Try this:**
1. **Temporarily** deactivate all plugins EXCEPT:
   - WooCommerce
   - WooCommerce Product Add-Ons
2. Test the product page
3. If it works, reactivate plugins one by one to find the culprit

---

### 8. Check WooCommerce Settings

**Verify REST API is enabled:**
1. Go to: **WP Admin → WooCommerce → Settings → Advanced → REST API**
2. Make sure REST API is **enabled**
3. Check that your API keys have **Read/Write** permissions

---

### 9. Server-Level REST API Block

Some hosting providers block certain REST API endpoints.

**Test this:**

Open this in your browser:
```
https://satchart.com/wp-json/wc/v3/products/6738?consumer_key=YOUR_KEY&consumer_secret=YOUR_SECRET&context=view
```

If you get **403 Forbidden** or **blocked**, contact your hosting provider.

---

### 10. Plugin File Corruption

The plugin files might be corrupted during upload/update.

**Try this:**
1. Go to: **WP Admin → Plugins**
2. Delete: **WooCommerce Product Add-Ons** (your add-ons configuration will be safe)
3. Go to: **Plugins → Add New**
4. Search: "WooCommerce Product Add-Ons"
5. Click: **Install Now → Activate**
6. Test again

---

## Verification Tests

### Test 1: Check if add-ons exist in WordPress Admin

1. Edit product: "ELEMENT 12W Ka-Band BUC"
2. Scroll to: "Product Add-Ons" metabox
3. **Screenshot what you see**

If you see **Model, Connector, Frequency Band** fields there, the add-ons exist in the database.

---

### Test 2: GraphQL Still Works?

Since GraphQL is working, let's verify:

1. Go to: `https://satchart.com/graphql`
2. Run this query:
```graphql
{
  product(id: "element-12w-ka-band-buc", idType: SLUG) {
    name
    addons {
      name
      type
    }
  }
}
```

If this returns add-ons, then:
- ✅ Add-ons exist in database
- ✅ GraphQL plugin working
- ❌ REST API extension not working

---

### Test 3: Direct REST API Test

Run this command in PowerShell (from your project directory):

```powershell
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("ck_3b58b0d451fbc1cef230dd9481be7dca2645357f:cs_039715817648b06f3339b5b077f70a4357b52807"))
Invoke-RestMethod -Uri "https://satchart.com/wp-json/wc/v3/products/6738?context=view" -Headers @{Authorization="Basic $auth"} | ConvertTo-Json -Depth 10 | Select-String -Pattern "addons|exclude_global"
```

**Expected**: Should show `"addons": [...]`  
**Actual**: Shows nothing (field missing)

---

## WordPress Debug Mode

Enable WordPress debug to see if there are any errors:

1. Edit: `wp-config.php`
2. Add before `/* That's all, stop editing! */`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```
3. Check: `wp-content/debug.log` for errors related to Product Add-ons

---

## Nuclear Option: Contact WooCommerce Support

If nothing works, contact WooCommerce support:

1. Go to: https://woocommerce.com/my-account/create-a-ticket/
2. Subject: "Product Add-ons v8.1.1 REST API fields not appearing"
3. Include:
   - WordPress version
   - WooCommerce version
   - PHP version
   - Link to this troubleshooting document
   - Screenshot of plugin version
   - Results of Test 2 and Test 3 above

---

## What We Know For Sure

✅ **Plugin is installed**: v8.1.1  
✅ **Add-ons exist**: They work in GraphQL  
✅ **Product exists**: REST API returns product data  
✅ **Authentication works**: Server proxy successfully calls API  
❌ **REST API extension not working**: `addons` and `exclude_global_add_ons` fields missing  

The issue is **100% on the WordPress/plugin side**, not your Nuxt code.

---

## Current Code Status

Your `[slug].vue` is correctly configured for REST API:
- ✅ Uses REST API server proxy
- ✅ Properly transforms data
- ✅ Handles add-ons when they arrive
- ✅ No GraphQL dependencies

Once the WordPress plugin is fixed, add-ons will appear automatically. No code changes needed!

---

**Last Updated**: November 14, 2024  
**Status**: ⚠️ WordPress Plugin Configuration Issue




