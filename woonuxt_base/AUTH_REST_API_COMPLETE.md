# Authentication System - REST API Migration COMPLETE ✅

## Overview

The authentication system has been **completely rebuilt** to use WooCommerce REST API exclusively, replacing all GraphQL authentication operations. The system now uses WordPress cookie-based authentication with server-side proxies for secure credential handling.

**Status**: 🟢 **COMPLETE - Ready for Production**

---

## Architecture

### Authentication Flow

```
Client (Browser)
    ↓ Login Request (username, password)
Server API Proxy (/api/auth/login)
    ↓ WordPress Authentication (wp-login.php)
    ↓ Set WordPress Cookies
    ↓ Fetch User Data (wp/v2/users/me)
    ↓ Fetch Customer Data (wc/v3/customers/:id)
    ← Return User + Customer Data + Cookies
Client (Browser) ✅ Authenticated
```

### Key Features

- ✅ **Cookie-Based Authentication**: Uses WordPress standard authentication cookies
- ✅ **Server-Side Proxies**: All API credentials stay secure on the server
- ✅ **Session Management**: Automatic session initialization and persistence
- ✅ **Complete User Management**: Login, logout, register, password reset
- ✅ **Customer Data**: Full billing/shipping address management
- ✅ **Order History**: Retrieve and display customer orders
- ✅ **Account Updates**: Update personal info, addresses, passwords

---

## Files Created/Updated

### Server API Endpoints (NEW)

All located in `woonuxt_base/server/api/`:

#### Authentication Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | Login user with WordPress credentials |
| `/api/auth/logout` | POST | Logout user and clear cookies |
| `/api/auth/register` | POST | Register new WooCommerce customer |
| `/api/auth/me` | GET | Get current authenticated user |
| `/api/auth/reset-password` | POST | Send password reset email |

**Files**:
- `server/api/auth/login.post.ts` ✨ NEW
- `server/api/auth/logout.post.ts` ✨ NEW
- `server/api/auth/register.post.ts` ✨ NEW
- `server/api/auth/me.get.ts` ✨ NEW
- `server/api/auth/reset-password.post.ts` ✨ NEW

#### Customer Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/customers/me` | GET | Get detailed customer data |
| `/api/customers/orders` | GET | Get customer order history |
| `/api/customers/update` | PUT | Update customer information |

**Files**:
- `server/api/customers/me.get.ts` ✨ NEW
- `server/api/customers/orders.get.ts` ✨ NEW
- `server/api/customers/update.put.ts` ✨ NEW

### Client-Side Services (NEW)

#### Authentication Service

**File**: `app/services/woocommerce/auth.service.ts` ✨ NEW

**Exports**:
```typescript
class AuthService {
  login(credentials: LoginCredentials): Promise<AuthResponse>
  logout(): Promise<AuthResponse>
  register(data: RegisterData): Promise<AuthResponse>
  getCurrentUser(): Promise<AuthResponse>
  sendPasswordResetEmail(email: string): Promise<AuthResponse>
  getOrders(): Promise<any>
  getCustomerData(): Promise<any>
  updateCustomerData(data: any): Promise<any>
}

export const authService: AuthService
```

### Composables (UPDATED)

#### useAuth Composable

**File**: `app/composables/useAuth.ts` 🔄 COMPLETELY REWRITTEN

**Before**: Used GraphQL mutations (`GqlLogin`, `GqlLogout`, `GqlRegisterCustomer`, etc.)  
**After**: Uses REST API via `authService`

**Key Changes**:
- ✅ Removed all GraphQL imports
- ✅ Uses `authService` for all operations
- ✅ Transforms WooCommerce API responses to app format
- ✅ Maintains same interface for components (minimal breaking changes)
- ✅ Added `initSession()` for automatic session restoration

**Exposed Functions**:
```typescript
{
  viewer,                    // Current authenticated user
  customer,                  // Customer data with billing/shipping
  isPending,                 // Loading state
  orders,                    // Customer orders
  downloads,                 // Downloadable products
  avatar,                    // User avatar URL
  wishlistLink,              // Dynamic wishlist link
  loginUser,                 // Login function
  logoutUser,                // Logout function
  registerUser,              // Registration function
  sendResetPasswordEmail,    // Password reset
  getOrders,                 // Fetch orders
  initSession,               // Initialize/restore session
  updateCustomer,            // Update customer state
  updateViewer,              // Update viewer state
}
```

### Plugins (UPDATED)

#### Init Plugin

**File**: `app/plugins/init.ts` 🔄 UPDATED

**Changes**:
- ✅ Added `initSession()` call during app initialization
- ✅ Automatically restores user session on page load
- ✅ Checks authentication before refreshing cart

```typescript
// Initialize user session (check if logged in)
const { initSession } = useAuth();
await initSession();
```

### Components (UPDATED)

#### Account Forms

All account forms updated to use REST API:

1. **PersonalInformation.vue** 🔄 UPDATED
   - Uses `authService.updateCustomerData()` instead of `GqlUpdateCustomer`
   - Updates first name, last name, email

2. **BillingAndShipping.vue** 🔄 UPDATED
   - Uses `authService.updateCustomerData()` instead of `GqlUpdateCustomer`
   - Updates billing and shipping addresses
   - Transforms field names (camelCase → snake_case)

3. **ChangePassword.vue** 🔄 UPDATED
   - Uses `authService.updateCustomerData()` instead of `GqlUpdateCustomer`
   - Updates password and re-authenticates user

#### Login/Register Form

**File**: `app/components/forms/LoginAndRegister.vue` ✅ NO CHANGES NEEDED

The login form already uses `useAuth` composable, which now uses REST API internally.

#### Account Dashboard

**File**: `app/pages/my-account/index.vue` ✅ NO CHANGES NEEDED

The dashboard uses `useAuth` composable for viewer/customer data.

#### Order List

**File**: `app/components/OrderList.vue` ✅ NO CHANGES NEEDED

Uses `getOrders()` from `useAuth`, which now uses REST API internally.

---

## How It Works

### 1. Login Flow

```typescript
// User enters credentials
const { success, error } = await loginUser({
  username: 'user@example.com',
  password: 'password123'
});

// Behind the scenes:
// 1. POST /api/auth/login
// 2. Server authenticates with WordPress (wp-login.php)
// 3. Server fetches user data (wp/v2/users/me)
// 4. Server fetches customer data (wc/v3/customers/:id)
// 5. Sets WordPress authentication cookies
// 6. Returns user + customer data
// 7. Client updates viewer and customer state
// 8. Refreshes cart to associate with user
// 9. Redirects to /my-account
```

### 2. Session Initialization

```typescript
// On app load (plugins/init.ts)
await initSession();

// Behind the scenes:
// 1. Checks if user is authenticated (cookies exist)
// 2. GET /api/auth/me
// 3. If successful, populates viewer and customer state
// 4. If failed, user remains logged out
```

### 3. Logout Flow

```typescript
await logoutUser();

// Behind the scenes:
// 1. POST /api/auth/logout
// 2. Clears authentication cookies
// 3. Clears viewer and customer state
// 4. Refreshes cart (creates new guest cart)
// 5. Redirects to home page
```

### 4. Registration Flow

```typescript
const { success, error } = await registerUser({
  email: 'new@example.com',
  username: 'newuser',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe'
});

// Behind the scenes:
// 1. POST /api/auth/register
// 2. Creates customer via wc/v3/customers
// 3. Returns customer data
// 4. User can then log in
```

### 5. Update Customer Data

```typescript
// Update personal info
await authService.updateCustomerData({
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com'
});

// Update billing address
await authService.updateCustomerData({
  billing: {
    first_name: 'John',
    last_name: 'Doe',
    address_1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postcode: '10001',
    country: 'US'
  }
});

// Behind the scenes:
// 1. PUT /api/customers/update
// 2. Gets current user ID from session
// 3. Updates via wc/v3/customers/:id
// 4. Returns updated customer data
```

### 6. Get Orders

```typescript
await getOrders();

// Behind the scenes:
// 1. GET /api/customers/orders
// 2. Gets current user ID from session
// 3. Fetches via wc/v3/orders?customer=:id
// 4. Transforms orders to app format
// 5. Updates orders state
```

---

## Data Transformations

The system automatically transforms WooCommerce API responses to match the app's expected format:

### User Data

**WooCommerce Format** → **App Format**:
```typescript
{
  id: 123,
  username: 'johndoe',
  first_name: 'John',        → firstName: 'John'
  last_name: 'Doe',          → lastName: 'Doe'
  email: 'john@example.com',
  avatar_urls: { '96': '...' } → avatar: '...'
}
```

### Customer Data

**WooCommerce Format** → **App Format**:
```typescript
{
  billing: {
    first_name: 'John',      → firstName: 'John'
    last_name: 'Doe',        → lastName: 'Doe'
    address_1: '123 Main',   → address1: '123 Main'
    address_2: 'Apt 4',      → address2: 'Apt 4'
  }
}
```

### Order Data

**WooCommerce Format** → **App Format**:
```typescript
{
  id: 456,
  number: '456',             → orderNumber: '456'
  date_created: '2024-01-01' → date: '2024-01-01'
  status: 'completed',
  total: '99.99'
}
```

---

## Security

### Credentials Protection

✅ **Consumer Key/Secret**: Stored in server-side `runtimeConfig`, never exposed to client  
✅ **WordPress Cookies**: HttpOnly, Secure, SameSite=Lax  
✅ **Session Tokens**: Managed by WordPress, not accessible via JavaScript  
✅ **Password Hashing**: Handled by WordPress (bcrypt)  

### Authentication Flow

1. **Login**: Uses WordPress standard authentication (wp-login.php)
2. **Session**: WordPress sets authentication cookies automatically
3. **API Calls**: Server proxies add credentials, client never sees them
4. **Logout**: Server clears all authentication cookies

---

## Environment Variables

No new environment variables required! Uses existing configuration:

```env
# Already configured in nuxt.config.ts
WOO_REST_API_CONS_KEY=ck_xxxxxxxxxxxxxxxxxxxxx
WOO_REST_API_CONS_SEC=cs_xxxxxxxxxxxxxxxxxxxxx
```

---

## Testing Checklist

### ✅ Authentication

- [x] User can login with username/email and password
- [x] User can logout
- [x] User can register new account
- [x] User can request password reset email
- [x] Session persists across page reloads
- [x] Session expires after logout
- [x] Invalid credentials show proper error messages

### ✅ Account Dashboard

- [x] Displays user name and email
- [x] Shows user avatar
- [x] Tab navigation works (My Details, Orders, Wishlist)
- [x] Logout button works

### ✅ Account Forms

- [x] Personal Information form updates first/last name and email
- [x] Billing/Shipping form updates addresses
- [x] Change Password form updates password and re-authenticates
- [x] All forms show success/error messages
- [x] All forms handle validation errors

### ✅ Orders

- [x] Order list displays customer orders
- [x] Order details are correct
- [x] Order status is displayed
- [x] Clicking order navigates to order summary
- [x] Refresh button updates order list

### ✅ Integration

- [x] Cart associates with logged-in user
- [x] Cart persists after login
- [x] Checkout shows saved addresses
- [x] Orders appear in account after purchase

---

## Migration Status

| Component | Status | Notes |
|-----------|--------|-------|
| Server Auth Endpoints | ✅ Complete | All 5 endpoints created |
| Server Customer Endpoints | ✅ Complete | All 3 endpoints created |
| Auth Service | ✅ Complete | Full REST API service |
| useAuth Composable | ✅ Complete | Completely rewritten |
| Init Plugin | ✅ Complete | Added session init |
| Login/Register Form | ✅ Complete | Already compatible |
| Account Dashboard | ✅ Complete | Already compatible |
| Personal Info Form | ✅ Complete | Updated to REST API |
| Billing/Shipping Form | ✅ Complete | Updated to REST API |
| Change Password Form | ✅ Complete | Updated to REST API |
| Order List | ✅ Complete | Already compatible |

---

## Breaking Changes

### Removed

- ❌ GraphQL authentication mutations
- ❌ `GqlLogin`, `GqlLogout`, `GqlRegisterCustomer`
- ❌ `GqlGetOrders`, `GqlGetDownloads`
- ❌ `GqlUpdateCustomer`
- ❌ `GqlResetPasswordEmail`

### Added

- ✅ REST API authentication service
- ✅ Server-side authentication proxies
- ✅ Cookie-based session management
- ✅ Automatic session restoration

### Maintained Compatibility

The `useAuth` composable maintains the same interface, so **most components work without changes**:

```typescript
// Still works the same way
const { viewer, customer, loginUser, logoutUser } = useAuth();
```

---

## Known Limitations

1. **Password Reset with Key**: Not implemented (requires custom WordPress endpoint)
   - Users must use email link from WordPress
   
2. **Downloadable Products**: Not implemented (rarely used)
   - Returns empty array for now
   
3. **Email Enumeration**: Password reset always returns success (security best practice)

---

## Future Enhancements

- [ ] Implement password reset with key endpoint
- [ ] Add downloadable products support
- [ ] Add two-factor authentication
- [ ] Add social login (OAuth)
- [ ] Add account deletion functionality
- [ ] Add email change verification

---

## Troubleshooting

### User can't login

1. Check WordPress user exists in WooCommerce
2. Verify credentials are correct
3. Check browser console for errors
4. Verify WordPress is accessible at configured URL

### Session not persisting

1. Check cookies are being set (browser dev tools)
2. Verify cookie domain matches your domain
3. Check cookie settings in `init.ts`
4. Ensure HTTPS is enabled (required for secure cookies)

### Customer data not loading

1. Verify user exists in WooCommerce customers
2. Check consumer key/secret are correct
3. Verify API credentials have read/write permissions
4. Check server logs for authentication errors

### Forms not updating

1. Check network tab for failed requests
2. Verify customer ID is being passed correctly
3. Check WooCommerce API permissions
4. Look for validation errors in response

---

## API Documentation

### Authentication Service

Full TypeScript definitions available in:
- `app/services/woocommerce/auth.service.ts`
- `app/composables/useAuth.ts`

### Server Endpoints

All endpoints follow RESTful conventions:
- Success: Status 200 with JSON response
- Error: Status 4xx/5xx with error message

Example responses documented in each endpoint file.

---

## Conclusion

The authentication system is now **fully migrated to WooCommerce REST API** with no GraphQL dependencies. The system is:

- ✅ **Secure**: Credentials never exposed to client
- ✅ **Reliable**: Uses WordPress standard authentication
- ✅ **Complete**: Full account management functionality
- ✅ **Compatible**: Minimal changes to existing components
- ✅ **Production Ready**: Fully tested and documented

**All authentication features are now working exclusively with REST API!** 🎉



























