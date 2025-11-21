# Edit Product Button Implementation

## Overview
The "Edit Product" button on product pages has been restored and upgraded to work with the REST API. The button now appears in WordPress admin when:
1. Running in **development mode** (localhost), OR
2. Logged in as an **administrator**

## Changes Made

### 1. Updated `WPAdminLink.vue` Component
**File**: `woonuxt_base/app/components/WPAdminLink.vue`

**Changes**:
- ✅ Removed dependency on old GraphQL config
- ✅ Now uses REST API config (`wooApiUrl`) to get WordPress base URL
- ✅ Added authentication check using `useAuth()` composable
- ✅ Checks if logged-in user has `administrator` role
- ✅ Shows button if either:
  - `process.dev` is true (development mode), OR
  - User is logged in with `administrator` role
- ✅ Updated tooltip text to indicate dev mode vs admin mode

**Key Code**:
```typescript
// Get WordPress base URL from REST API config
const wpBase = computed(() => {
  const wooApiUrl = runtimeConfig?.public?.wooApiUrl;
  if (!wooApiUrl) return null;
  return wooApiUrl.replace('/wp-json', '');
});

// Check if user is an administrator
const isAdmin = computed(() => {
  if (!viewer.value?.roles) return false;
  return viewer.value.roles.includes('administrator');
});

// Show link if in dev mode OR user is admin
const shouldShowLink = computed(() => isDev || isAdmin.value);
```

### 2. Updated Login Alt Endpoint
**File**: `woonuxt_base/server/api/auth/login-alt.post.ts`

**Changes**:
- ✅ Now fetches actual user roles from WordPress `/wp/v2/users/me` endpoint
- ✅ Removed hardcoded `roles: ['customer']`
- ✅ Returns real WordPress user roles in login response
- ✅ Falls back to `['customer']` if roles can't be fetched

**Key Addition**:
```typescript
// Get actual user roles from WordPress
let userRoles = ['customer']; // Default fallback
try {
  const userDataUrl = `${config.public.wooApiUrl}/wp/v2/users/me`;
  const userResponse = await fetch(userDataUrl, {
    headers: {
      'Cookie': cookieString,
      'Accept': 'application/json',
    },
  });

  if (userResponse.ok) {
    const userData = await userResponse.json();
    userRoles = userData.roles || ['customer'];
  }
} catch (error) {
  console.warn('[Auth Login Alt] ⚠️ Could not fetch user roles, using default');
}
```

### 3. Updated Auth "Me" Endpoint
**File**: `woonuxt_base/server/api/auth/me.get.ts`

**Changes**:
- ✅ Now fetches actual user roles from WordPress when checking session
- ✅ Removed hardcoded `roles: ['customer']`
- ✅ Uses request cookies to authenticate with WordPress API
- ✅ Returns real user roles for session validation

## How It Works

### Development Mode (Localhost)
1. Button appears on all product pages automatically
2. No login required
3. Click button to open WordPress admin edit page in new tab

### Production Mode (Live Site)
1. Button only appears if user is logged in as administrator
2. Login with admin credentials
3. Button appears on product pages
4. Click button to open WordPress admin edit page in new tab

### Authentication Flow
1. User logs in with username/password
2. Backend authenticates with WordPress
3. WordPress returns user data including roles
4. Roles are stored in viewer state via `useAuth()`
5. `WPAdminLink` component checks viewer.roles for 'administrator'
6. Button is shown/hidden based on role

## Usage

### On Product Page
The button appears next to the product name and SKU:

```vue
<WPAdminLink 
  :link="`/wp-admin/post.php?post=${product.databaseId}&action=edit`" 
  class="text-sm text-primary hover:text-primary-dark hover:underline ml-auto"
>
  Edit
</WPAdminLink>
```

### Button Location
- **Desktop**: Top right of product details section
- **Mobile**: Same position, responsive
- Opens in **new tab** when clicked

## Security

### Production Safety
- ✅ Button hidden from regular customers
- ✅ Only visible to administrators
- ✅ Roles fetched from WordPress (trusted source)
- ✅ No client-side role spoofing possible
- ✅ Server-side authentication required

### Dev Mode Safety
- ✅ Only active when `process.dev === true`
- ✅ Automatically disabled in production builds
- ✅ Clear tooltip indicates dev mode vs admin mode

## Testing

### Test as Admin
1. Login with admin credentials
2. Navigate to any product page
3. Verify "Edit" button appears
4. Click button → should open WordPress admin in new tab

### Test as Customer
1. Login with customer credentials
2. Navigate to any product page
3. Verify "Edit" button does NOT appear

### Test in Dev Mode (Localhost)
1. Run `npm run dev`
2. Navigate to any product page
3. Verify "Edit" button appears (no login required)
4. Click button → should open WordPress admin

## Additional Notes

### WordPress Roles Supported
- `administrator` - Full access, sees edit buttons
- `shop_manager` - Could be added if needed
- `customer` - No edit access
- `subscriber` - No edit access

### Extending to Other Roles
To allow shop managers to also see the button, update `WPAdminLink.vue`:

```typescript
const isAdmin = computed(() => {
  if (!viewer.value?.roles) return false;
  return viewer.value.roles.includes('administrator') || 
         viewer.value.roles.includes('shop_manager');
});
```

## Files Modified
1. ✅ `woonuxt_base/app/components/WPAdminLink.vue` - Main component
2. ✅ `woonuxt_base/server/api/auth/login-alt.post.ts` - Alt login with roles
3. ✅ `woonuxt_base/server/api/auth/me.get.ts` - Session check with roles
4. ✅ `woonuxt_base/app/pages/product/[slug].vue` - Already has WPAdminLink (no changes needed)

## Status
✅ **Implementation Complete**
- Edit button working in dev mode
- Edit button working for admin users in production
- User roles properly fetched from WordPress
- No linter errors
- Backwards compatible with existing auth flow

