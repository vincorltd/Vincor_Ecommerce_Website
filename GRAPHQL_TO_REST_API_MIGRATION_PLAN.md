# GraphQL to WooCommerce REST API Migration Plan

## Executive Summary

This document outlines a comprehensive plan to migrate the Vincor E-commerce Website from using WooCommerce GraphQL (WPGraphQL) to the native WooCommerce REST API. The application is a Request-for-Quote (RFQ) system built with Nuxt 3 and WooNuxt, where customers browse products, add them to cart, and request quotes rather than making direct payments.

---

## Current State Analysis

### Technology Stack
- **Framework**: Nuxt 3 (v3.13.0) with Vue 3
- **GraphQL Client**: `nuxt-graphql-client` (v0.2.36)
- **GraphQL Endpoint**: `https://satchart.com/graphql`
- **Backend**: WooCommerce with WPGraphQL plugin
- **Authentication**: Cookie-based sessions (`woocommerce-session`)
- **Styling**: TailwindCSS
- **Internationalization**: @nuxtjs/i18n with 6 languages

### Current Architecture Overview

```
┌─────────────────┐
│   Nuxt 3 App    │
│                 │
│  ┌──────────┐   │      ┌──────────────────┐
│  │  Pages   │───┼─────▶│  Composables     │
│  └──────────┘   │      │  - useCart       │
│                 │      │  - useAuth       │
│  ┌──────────┐   │      │  - useProducts   │
│  │Components│───┼─────▶│  - useCheckout   │
│  └──────────┘   │      │  - useCategories │
│                 │      │  - useSearch     │
└─────────────────┘      └─────┬────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ GraphQL      │
                         │ Queries      │
                         │ (.gql files) │
                         └──────┬───────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │ nuxt-graphql-client  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ WPGraphQL Endpoint   │
                    │ (satchart.com/graphql)│
                    └──────────────────────┘
```

---

## Key Components & Dependencies

### 1. GraphQL Queries (27 files in `woonuxt_base/app/queries/`)
#### Cart Operations
- `getCart.gql` - Fetch cart contents, customer, viewer, payment gateways
- `addToCart.gql` - Add items to cart
- `updateCartQuantity.gql` - Update item quantities
- `emptyCart.gql` - Clear cart
- `applyCoupon.gql` - Apply discount codes
- `removeCoupon.gql` - Remove discount codes
- `changeShippingMethod.gql` - Update shipping method
- `changeShippingLocation.gql` - Update shipping location

#### Product Operations
- `getProducts.gql` - Fetch product list with filtering
- `getProduct.gql` - Fetch single product with reviews, attributes, variations
- `searchProducts.gql` - Search products by name/SKU
- `getFeaturedProducts.gql` - Fetch featured products
- `getStockStatus.gql` - Check live stock status
- `writeReview.gql` - Submit product review

#### Category Operations
- `getProductCategories.gql` - Fetch category hierarchy with counts
- `getAllTerms.gql` - Fetch all taxonomy terms

#### Authentication Operations
- `login.gql` - User login with cookies
- `logout.gql` - User logout
- `registerCustomer.gql` - Customer registration
- `resetPasswordEmail.gql` - Send password reset email
- `resetPasswordKey.gql` - Reset password with key
- `updateCustomer.gql` - Update customer details
- `updatePassword.gql` - Change user password

#### Order Operations
- `checkout.gql` - Process checkout and create order
- `getOrder.gql` - Fetch single order details
- `getOrders.gql` - Fetch customer order history
- `getDownloads.gql` - Fetch downloadable items

#### Other
- `getPosts.gql` - Fetch blog posts
- `getAllowedCountries.gql` - Fetch allowed countries
- `getStates.gql` - Fetch states for country
- `getStripePaymentIntent.gql` - Stripe payment integration

### 2. Composables (13 files)
| Composable | Purpose | GraphQL Dependencies |
|------------|---------|---------------------|
| `useCart.ts` | Cart management | getCart, addToCart, updateCartQuantity, emptyCart, applyCoupon, removeCoupon, changeShippingMethod |
| `useAuth.ts` | Authentication & user management | login, logout, registerCustomer, resetPasswordEmail, resetPasswordKey, getOrders, getDownloads |
| `useProducts.ts` | Product state management | Indirect (uses data from pages) |
| `useCheckout.ts` | Checkout processing | checkout, updateCustomer |
| `useCategories.ts` | Category management | getProductCategories |
| `useSearch.ts` | Product search | searchProducts (indirect) |
| `useFiltering.ts` | Product filtering | None (client-side) |
| `useSorting.ts` | Product sorting | None (client-side) |
| `useHelpers.ts` | Utility functions | None |
| `useCountry.ts` | Country/state management | getAllowedCountries, getStates |
| `useWishlist.ts` | Wishlist management | None (localStorage) |
| `useConsent.ts` | Cookie consent | None |
| `useVisibilityChange.ts` | Page visibility tracking | None |

### 3. Key Pages
- `/checkout` - Checkout page with billing/shipping
- `/product/[slug]` - Single product page
- `/product-category/[slug]` - Category page
- `/products` - All products page
- `/order-summary/:orderId` - Order confirmation
- `/my-account` - Customer account management
- `/wishlist` - Product wishlist

### 4. GraphQL Fragments (10 files)
- `CartFragment.gql` - Cart data structure
- `CustomerFragment.gql` - Customer data structure
- `OrderFragment.gql` - Order data structure
- `SimpleProduct.gql` - Simple product fields
- `VariableProduct.gql` - Variable product fields
- `ExternalProduct.gql` - External product fields
- `ImageFragment.gql` - Image fields
- `ProductCategoriesFragment.gql` - Category fields
- `TermsFragment.gql` - Taxonomy term fields
- `DownloadableItems.gql` - Downloadable items

---

## WooCommerce REST API Endpoints Mapping

### Base Configuration
- **REST API Base URL**: `https://satchart.com/wp-json/wc/v3/`
- **Authentication Method**: 
  - OAuth 1.0a for server-side
  - Consumer Key/Secret for authenticated requests
  - Session cookies for cart operations (WooCommerce Session Handler)
- **Documentation**: https://woocommerce.github.io/woocommerce-rest-api-docs/

### Endpoint Mapping

#### Cart Operations (WooCommerce Store API - `/wp-json/wc/store/v1/`)
> **Note**: The Store API is the modern cart API for WooCommerce and handles sessions automatically

| GraphQL Query | REST API Endpoint | Method | Notes |
|--------------|-------------------|--------|-------|
| getCart | `/cart` | GET | Returns cart contents |
| addToCart | `/cart/add-item` | POST | Requires `id` (product_id), `quantity` |
| updateCartQuantity | `/cart/update-item` | POST | Requires `key` (item_key), `quantity` |
| emptyCart | `/cart/items` | DELETE | Removes all items |
| applyCoupon | `/cart/apply-coupon` | POST | Requires `code` |
| removeCoupon | `/cart/remove-coupon` | POST | Requires `code` |
| changeShippingMethod | `/cart/select-shipping-rate` | POST | Requires `rate_id` |
| N/A | `/cart/update-customer` | POST | Update billing/shipping address |

#### Products (`/wp-json/wc/v3/products`)
| GraphQL Query | REST API Endpoint | Method | Query Params |
|--------------|-------------------|--------|--------------|
| getProducts | `/products` | GET | `category`, `per_page`, `page`, `orderby`, `order`, `status=publish` |
| getProduct | `/products/<id>` or `/products?slug=<slug>` | GET | Use slug parameter to get by slug |
| searchProducts | `/products` | GET | `search=<query>`, `sku=<sku>` |
| getFeaturedProducts | `/products` | GET | `featured=true` |
| getStockStatus | `/products/<id>` | GET | Returns product with `stock_status`, `stock_quantity` |

#### Product Categories (`/wp-json/wc/v3/products/categories`)
| GraphQL Query | REST API Endpoint | Method | Query Params |
|--------------|-------------------|--------|--------------|
| getProductCategories | `/products/categories` | GET | `per_page=100`, `hide_empty=true`, `orderby=count`, `order=desc` |

#### Product Tags (`/wp-json/wc/v3/products/tags`)
| GraphQL Query | REST API Endpoint | Method | Query Params |
|--------------|-------------------|--------|--------------|
| getAllTerms | `/products/tags` | GET | `per_page=100` |

#### Authentication & Customers (`/wp-json/wc/v3/customers`)
> **Note**: Authentication in WooCommerce REST API requires a different approach
> - Login: Use WordPress REST API `/wp-json/wp/v2/users/me` with Basic Auth or JWT
> - Session management: Use WooCommerce Session Handler with cookies

| GraphQL Query | REST API Endpoint | Method | Notes |
|--------------|-------------------|--------|-------|
| login | Custom endpoint or JWT Auth plugin | POST | Requires JWT or session plugin |
| logout | Clear session cookie | POST | Client-side cookie clearing |
| registerCustomer | `/customers` | POST | Creates new customer |
| updateCustomer | `/customers/<id>` | PUT | Updates customer data |
| getOrders (customer) | `/orders?customer=<id>` | GET | Get customer's orders |
| updatePassword | WordPress REST API | POST | Requires additional plugin |
| resetPasswordEmail | WordPress REST API | POST | Requires additional plugin |

#### Orders (`/wp-json/wc/v3/orders`)
| GraphQL Query | REST API Endpoint | Method | Notes |
|--------------|-------------------|--------|-------|
| checkout | `/orders` | POST | Create order with line items, billing, shipping |
| getOrder | `/orders/<id>` | GET | Requires order key validation |
| getOrders | `/orders` | GET | Filter by `customer=<id>` |

#### Reviews (`/wp-json/wc/v3/products/reviews`)
| GraphQL Query | REST API Endpoint | Method | Notes |
|--------------|-------------------|--------|-------|
| writeReview | `/products/reviews` | POST | Requires `product_id`, `review`, `reviewer`, `reviewer_email`, `rating` |

#### System
| GraphQL Query | REST API Endpoint | Method | Notes |
|--------------|-------------------|--------|-------|
| getAllowedCountries | `/data/countries` | GET | Returns list of countries |
| getStates | `/data/countries/<country_code>` | GET | Returns states for country |
| getPaymentGateways | `/payment_gateways` | GET | Returns available payment methods |
| getShippingZones | `/shipping/zones` | GET | Returns shipping zones |

---

## Key Differences & Challenges

### 1. **Data Structure Differences**

#### GraphQL (Nested, Flexible)
```graphql
query getProduct {
  product(id: "shirt", idType: SLUG) {
    id
    name
    ... on SimpleProduct {
      price
      regularPrice
    }
    image {
      sourceUrl
      altText
    }
    productCategories {
      nodes {
        name
        slug
      }
    }
  }
}
```

#### REST API (Flat, Fixed)
```javascript
// GET /wp-json/wc/v3/products?slug=shirt
{
  id: 123,
  name: "Shirt",
  type: "simple",
  price: "29.99",
  regular_price: "29.99",
  images: [
    {
      src: "https://...",
      alt: "..."
    }
  ],
  categories: [
    {
      id: 5,
      name: "Clothing",
      slug: "clothing"
    }
  ]
}
```

### 2. **Session Management**

| Aspect | GraphQL (Current) | REST API (Target) |
|--------|------------------|------------------|
| Session Token | `woocommerce-session` cookie from GraphQL response | Same cookie but from WooCommerce Session Handler |
| Header | `woocommerce-session: Session <token>` | Same, but may need `X-WC-Store-API-Nonce` for Store API |
| Authentication | Via GraphQL mutations | Via REST API with Consumer Key/Secret or JWT |

### 3. **Authentication Flow Changes**

**Current (GraphQL)**:
1. Call `loginWithCookies` mutation
2. Receive session token in response
3. Store in cookie and GraphQL headers
4. Subsequent requests authenticated

**Target (REST API)**:
1. Implement JWT Authentication plugin OR WordPress Application Passwords
2. Login via JWT endpoint or Basic Auth
3. Store JWT token or use session cookies
4. Include token in `Authorization` header or use cookies

### 4. **Cart Operations**

**GraphQL**: Everything in one query/mutation
```graphql
query getCart {
  cart { ... }
  customer { ... }
  viewer { ... }
  paymentGateways { ... }
}
```

**REST API**: Multiple endpoints
```javascript
// Need separate calls:
GET /wc/store/v1/cart
GET /wc/v3/customers/<id>
GET /wc/v3/payment_gateways
```

### 5. **Checkout Process Differences**

**GraphQL checkout mutation**:
- Single mutation handles: validation, order creation, payment initiation
- Returns order with redirect URLs (PayPal, etc.)

**REST API checkout**:
- Must manually validate cart
- Create order via POST `/orders`
- Handle payment gateway redirects separately
- Update order status via PUT `/orders/<id>`

### 6. **Product Variations**

**GraphQL**: Nested within product query with attributes
```graphql
product {
  ... on VariableProduct {
    variations {
      nodes {
        id
        attributes {
          name
          value
        }
      }
    }
  }
}
```

**REST API**: Separate endpoint
```javascript
GET /products/<id>  // Parent variable product
GET /products/<id>/variations  // List all variations
GET /products/<id>/variations/<variation_id>  // Single variation
```

---

## Migration Strategy

### Phase 1: Foundation & Setup (High Priority)

#### 1.1 Create REST API Service Layer
**Location**: `woonuxt_base/app/services/`

**Files to create**:
```
services/
├── api/
│   ├── config.ts          # API configuration, base URL, auth
│   ├── client.ts          # HTTP client (fetch wrapper with error handling)
│   ├── interceptors.ts    # Request/response interceptors for auth
│   └── types.ts           # REST API response types
├── woocommerce/
│   ├── cart.service.ts    # Cart operations
│   ├── products.service.ts # Product operations
│   ├── orders.service.ts   # Order operations
│   ├── auth.service.ts     # Authentication
│   ├── customers.service.ts # Customer operations
│   ├── categories.service.ts # Category operations
│   └── index.ts           # Export all services
└── index.ts               # Main service export
```

**Key Features**:
- Centralized error handling
- Request/response transformation
- Session management
- Type-safe API calls
- Retry logic for failed requests

#### 1.2 Install Required Dependencies
```bash
# Remove GraphQL dependencies
npm uninstall nuxt-graphql-client

# Add REST API utilities (if needed)
npm install @woocommerce/woocommerce-rest-api
# OR use native fetch (recommended for Nuxt 3)
```

#### 1.3 Update Nuxt Configuration
**File**: `woonuxt_base/nuxt.config.ts`

**Changes**:
- Remove `nuxt-graphql-client` from modules
- Remove `'graphql-client'` configuration
- Add REST API configuration in `runtimeConfig`
- Add environment variables for API keys

#### 1.4 Create Type Definitions
**File**: `woonuxt_base/app/types/woocommerce-rest-api.d.ts`

Map all GraphQL types to REST API equivalents:
- Product types
- Cart types
- Order types
- Customer types
- Category types

---

### Phase 2: Cart Management (Critical Path)

#### 2.1 Update `useCart.ts` composable
**Current dependencies**: 8 GraphQL operations
**Target**: 7 REST API endpoints

**Migration tasks**:
1. Replace `GqlGetCart()` with `CartService.getCart()`
2. Replace `GqlAddToCart()` with `CartService.addItem()`
3. Replace `GqlUpDateCartQuantity()` with `CartService.updateItem()`
4. Replace `GqlEmptyCart()` with `CartService.clear()`
5. Replace `GqlChangeShippingMethod()` with `CartService.updateShipping()`
6. Replace `GqlApplyCoupon()` with `CartService.applyCoupon()`
7. Replace `GqlRemoveCoupons()` with `CartService.removeCoupon()`
8. Update session token handling for REST API
9. Update payment gateway fetching

**Testing checklist**:
- [ ] Add item to cart
- [ ] Update item quantity
- [ ] Remove item from cart
- [ ] Empty cart
- [ ] Apply coupon code
- [ ] Remove coupon code
- [ ] Change shipping method
- [ ] Cart persists across page refreshes
- [ ] Cart syncs between tabs

#### 2.2 Update Cart Components
**Files to update**:
- `components/cartElements/CartCard.vue`
- `components/cartElements/CartTrigger.vue`
- `components/cartElements/QuantityInput.vue`
- `components/shopElements/OrderSummary.vue`

**Changes**: Update data binding to match REST API response structure

---

### Phase 3: Product Management (High Priority)

#### 3.1 Update Product Pages
**Files**:
- `pages/product/[slug].vue` - Single product page
- `pages/products.vue` - Product listing
- `pages/product-category/[slug].vue` - Category page

**Migration tasks**:
1. Replace `useAsyncGql('getProduct')` with `ProductService.getBySlug()`
2. Replace `GqlGetStockStatus()` with `ProductService.getStockStatus()`
3. Handle product variations via separate endpoint
4. Update image URLs (if different)
5. Update price formatting
6. Handle product reviews via REST API

#### 3.2 Update `useProducts.ts` composable
**Changes**: Minimal - mostly uses data passed from pages

#### 3.3 Update Product Components
**Files to update** (~14 components in `components/productElements/`):
- `ProductCard.vue`
- `ProductGrid.vue`
- `ProductPrice.vue`
- `ProductImageGallery.vue`
- `AttributeSelections.vue`
- etc.

**Changes**: Update data binding for REST API structure

---

### Phase 4: Authentication & User Management (High Priority)

#### 4.1 Choose Authentication Method
**Options**:
1. **JWT Authentication for WP REST API** (Recommended)
   - Plugin: [JWT Authentication for WP REST API](https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/)
   - Pros: Standard, secure, stateless
   - Cons: Requires plugin installation

2. **WordPress Application Passwords** (Native WP 5.6+)
   - Built into WordPress
   - Pros: No plugin needed
   - Cons: Requires user generation of app passwords

3. **Cookie-based with WooCommerce Session Handler**
   - Use existing WooCommerce sessions
   - Pros: Minimal changes
   - Cons: May have CORS issues

**Recommendation**: Use JWT Authentication for clean separation

#### 4.2 Update `useAuth.ts` composable
**Current dependencies**: 7 GraphQL operations
**Target**: JWT endpoints + WooCommerce customer endpoints

**Migration tasks**:
1. Implement `loginUser()` with JWT authentication
2. Implement `logoutUser()` with token clearing
3. Replace `GqlRegisterCustomer()` with `CustomerService.register()`
4. Replace `GqlGetOrders()` with `OrderService.getCustomerOrders()`
5. Replace `GqlGetDownloads()` with `CustomerService.getDownloads()`
6. Update password reset flow
7. Update customer data management
8. Store JWT token securely (httpOnly cookie or secure storage)

#### 4.3 Update Auth Components
**Files**:
- `components/forms/LoginAndRegister.vue`
- `components/forms/ChangePassword.vue`
- `components/forms/ResetPassword.vue`
- `pages/my-account/index.vue`

---

### Phase 5: Checkout & Orders (Critical Path)

#### 5.1 Update `useCheckout.ts` composable
**Current dependencies**: 2 GraphQL operations
**Target**: REST API order creation + validation

**Migration tasks**:
1. Replace `GqlCheckout()` with `OrderService.create()`
2. Validate cart before checkout
3. Handle order creation with line items from cart
4. Implement payment gateway integration
5. Handle PayPal redirect flow
6. Update order status checking
7. Handle order confirmation

**Complex areas**:
- Order line items: Must be constructed from cart items
- Payment gateway integration: Different for each gateway
- Order key validation: Ensure security

#### 5.2 Update Checkout Page
**File**: `pages/checkout.vue`

**Changes**:
1. Update billing/shipping form submission
2. Handle payment method selection
3. Integrate with new checkout flow
4. Update error handling

#### 5.3 Update Order Summary Page
**File**: `pages/order-summary.vue`

**Migration tasks**:
1. Replace `GqlGetOrder()` with `OrderService.getById()`
2. Validate order key for security
3. Update order status display
4. Handle downloadable items

---

### Phase 6: Categories & Search (Medium Priority)

#### 6.1 Update `useCategories.ts` composable
**Current dependencies**: 1 GraphQL operation
**Target**: REST API categories endpoint

**Migration tasks**:
1. Replace `useAsyncGql('getProductCategories')` with `CategoryService.getAll()`
2. Transform REST API response to match current structure
3. Handle category hierarchy (parent/children)
4. Update category counts

#### 6.2 Update Category Pages
**File**: `pages/product-category/[slug].vue`

**Changes**: Update data fetching to use REST API

#### 6.3 Update Search Functionality
**File**: `composables/useSearch.ts`

**Migration tasks**:
1. Update product search to use REST API
2. Search by product name, SKU, description
3. Handle search results pagination

---

### Phase 7: Supporting Features (Low Priority)

#### 7.1 Update Filtering
**File**: `composables/useFiltering.ts`
**Status**: Mostly client-side, minimal changes needed

#### 7.2 Update Sorting
**File**: `composables/useSorting.ts`
**Status**: Client-side, no changes needed

#### 7.3 Update Country/State Management
**File**: `composables/useCountry.ts`

**Migration tasks**:
1. Replace GraphQL queries with REST API endpoints
2. Use `/data/countries` and `/data/countries/<code>`

#### 7.4 Update Wishlist
**File**: `composables/useWishlist.ts`
**Status**: localStorage-based, no changes needed

---

### Phase 8: Configuration & Cleanup (Final)

#### 8.1 Remove GraphQL Dependencies
**Tasks**:
1. Delete all `.gql` files from `queries/` folder
2. Remove `nuxt-graphql-client` from `package.json`
3. Remove GraphQL configuration from `nuxt.config.ts`
4. Remove GraphQL-related imports from all files

#### 8.2 Update Environment Variables
**File**: `.env`

**Add**:
```
# WooCommerce REST API
NUXT_PUBLIC_WC_API_URL=https://satchart.com/wp-json
NUXT_PUBLIC_WC_CONSUMER_KEY=<your_consumer_key>
NUXT_PUBLIC_WC_CONSUMER_SECRET=<your_consumer_secret>

# JWT Authentication
NUXT_PUBLIC_JWT_AUTH_URL=https://satchart.com/wp-json/jwt-auth/v1
```

**Remove**:
```
GQL_HOST  # No longer needed
```

#### 8.3 Update Type Definitions
**File**: `woonuxt_base/app/types/index.d.ts`

**Changes**:
1. Remove all `import('#gql')` references
2. Replace with REST API types
3. Update all type definitions to match REST API structure

#### 8.4 Update Plugin Initialization
**File**: `woonuxt_base/app/plugins/init.ts`

**Changes**:
1. Remove `useGqlHeaders()` and `useGqlError()`
2. Implement REST API session handling
3. Update cart refresh to use REST API
4. Handle JWT token refresh (if using JWT)

---

## Testing Strategy

### Unit Tests
For each service and composable:
- Mock REST API responses
- Test success scenarios
- Test error scenarios
- Test edge cases

### Integration Tests
- Cart flow: add → update → checkout
- Auth flow: register → login → logout
- Product flow: browse → view → add to cart

### End-to-End Tests
Recommended tool: Playwright or Cypress

**Critical user journeys**:
1. **Guest User - Request Quote**
   - Browse products
   - View product details
   - Add to cart
   - Update quantities
   - Apply coupon
   - Enter billing/shipping info
   - Submit request (checkout)
   - View order confirmation

2. **Registered User - Request Quote**
   - Login
   - Browse products
   - Add to cart
   - Checkout (use saved address)
   - View order history

3. **User Registration & Account Management**
   - Register new account
   - Login
   - Update profile
   - Change password
   - View order history

4. **Search & Filter**
   - Search products
   - Filter by category
   - Filter by price/attributes
   - Sort results

### Manual Testing Checklist
- [ ] All product types display correctly (simple, variable, external)
- [ ] Product images load correctly
- [ ] Cart operations work (add, update, remove)
- [ ] Coupon codes apply correctly
- [ ] Shipping methods display and update
- [ ] Checkout creates orders successfully
- [ ] Order confirmation emails sent
- [ ] Order history displays correctly
- [ ] Product search works
- [ ] Category filtering works
- [ ] Multi-language support works
- [ ] Mobile responsiveness maintained

---

## Risk Assessment & Mitigation

### High Risk Areas

#### 1. **Session Management**
**Risk**: Cart sessions may not persist correctly
**Mitigation**: 
- Implement robust session token handling
- Add detailed logging for debugging
- Test thoroughly across browsers

#### 2. **Authentication Flow**
**Risk**: Login/logout may break, user sessions lost
**Mitigation**:
- Choose proven authentication method (JWT recommended)
- Implement token refresh mechanism
- Add fallback to guest checkout

#### 3. **Checkout Process**
**Risk**: Order creation may fail, data loss
**Mitigation**:
- Implement comprehensive error handling
- Add order validation before submission
- Create order recovery mechanism
- Log all checkout attempts

#### 4. **Product Variations**
**Risk**: Complex variation handling may break
**Mitigation**:
- Create dedicated variation service
- Add extensive testing for variable products
- Implement client-side validation

#### 5. **Performance**
**Risk**: Multiple REST API calls may slow down pages
**Mitigation**:
- Implement request caching
- Use parallel requests where possible
- Add loading states
- Consider implementing service workers for offline support

### Medium Risk Areas

#### 6. **Type Safety**
**Risk**: Losing TypeScript type safety during migration
**Mitigation**:
- Create comprehensive type definitions first
- Use strict TypeScript mode
- Add runtime type validation where critical

#### 7. **Error Handling**
**Risk**: Different error formats from REST API
**Mitigation**:
- Create unified error handling service
- Map all REST API errors to user-friendly messages
- Add error logging/monitoring

#### 8. **CORS Issues**
**Risk**: REST API requests may be blocked by CORS
**Mitigation**:
- Configure CORS headers on WooCommerce server
- Use server-side API proxy if needed
- Test from multiple domains

---

## WordPress/WooCommerce Server Requirements

### Required Plugins
1. **WooCommerce REST API** (Built-in to WooCommerce)
   - Ensure enabled in WooCommerce settings

2. **JWT Authentication for WP REST API** (Recommended)
   - Install: https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/
   - Configure secret key in wp-config.php

3. **WooCommerce Store API** (Built-in to WooCommerce 4.6+)
   - Modern cart/checkout API
   - No configuration needed

### Server Configuration

#### 1. Generate API Keys
**WooCommerce → Settings → Advanced → REST API**
- Create API key for "Read/Write" access
- Save Consumer Key and Consumer Secret
- Use for authenticated requests

#### 2. Enable CORS
**Add to `.htaccess` or WordPress theme**:
```php
// In functions.php or custom plugin
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        header('Access-Control-Allow-Origin: https://vincor.com');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WC-Store-API-Nonce');
        return $value;
    });
});
```

#### 3. Configure Session Handling
Ensure WooCommerce sessions work with CORS:
```php
// In functions.php
add_filter('woocommerce_session_use_secure_cookie', '__return_true');
add_filter('woocommerce_cookie_samesite', function() {
    return 'None'; // Required for CORS
});
```

#### 4. Increase API Rate Limits (Optional)
If experiencing rate limiting:
```php
add_filter('woocommerce_rest_check_permissions', function($permission, $context, $object_id, $post_type) {
    return true; // Be careful with this
}, 10, 4);
```

---

## Performance Optimization

### 1. Caching Strategy
- **Product Data**: Cache for 1 hour (products don't change often)
- **Cart Data**: No caching (real-time)
- **Category Data**: Cache for 24 hours
- **Customer Data**: Cache for session duration

### 2. Request Optimization
- Batch requests where possible
- Use ETags for conditional requests
- Implement request deduplication
- Add request timeout handling

### 3. Response Optimization
- Only request needed fields (use `_fields` parameter)
- Limit pagination (`per_page`)
- Use sparse fieldsets

### 4. Client-Side Optimization
- Implement optimistic UI updates
- Use SWR (stale-while-revalidate) pattern
- Add skeleton loaders
- Prefetch likely next pages

---

## Rollback Plan

### If Migration Fails
1. **Keep GraphQL code in separate branch**
   - Create feature branch: `feature/rest-api-migration`
   - Don't delete GraphQL code until fully tested

2. **Environment Variables for Toggle**
   ```
   NUXT_PUBLIC_USE_REST_API=true  # Set to false to rollback
   ```

3. **Database Backups**
   - Backup WooCommerce database before testing
   - Document all configuration changes

4. **Monitoring**
   - Add error tracking (Sentry, etc.)
   - Monitor API response times
   - Track user behavior changes

---

## Timeline Estimate

### Assumptions
- 1 developer working full-time
- Access to staging environment for testing
- Backend/server configuration can be done quickly

### Detailed Timeline

| Phase | Tasks | Estimated Time | Dependencies |
|-------|-------|---------------|--------------|
| **Phase 1: Foundation** | Setup, services, types, config | 3-5 days | Server access, API keys |
| **Phase 2: Cart** | useCart composable, cart components | 3-4 days | Phase 1 |
| **Phase 3: Products** | Product pages, product components | 4-5 days | Phase 1 |
| **Phase 4: Auth** | useAuth composable, auth components | 3-4 days | Phase 1, JWT plugin |
| **Phase 5: Checkout** | useCheckout, checkout page, orders | 5-7 days | Phase 2, Phase 4 |
| **Phase 6: Categories & Search** | useCategories, useSearch | 2-3 days | Phase 1 |
| **Phase 7: Supporting Features** | Filtering, countries, etc. | 2-3 days | Phase 1 |
| **Phase 8: Cleanup & Testing** | Remove GraphQL, final tests | 3-4 days | All phases |
| **Buffer for Issues** | Bug fixes, edge cases | 5-7 days | - |

**Total Estimated Time: 30-45 working days (6-9 weeks)**

### Quick Win Approach (MVP)
If shorter timeline needed, focus on:
1. Cart operations (5 days)
2. Product display (3 days)
3. Checkout flow (5 days)
4. Basic auth (3 days)

**MVP Timeline: 15-20 working days (3-4 weeks)**

---

## Success Criteria

### Functional Requirements
- [ ] All current features work identically
- [ ] No user-facing breaking changes
- [ ] All product types supported
- [ ] Cart operations work flawlessly
- [ ] Checkout creates orders correctly
- [ ] Authentication works securely
- [ ] Order history displays correctly
- [ ] Search and filtering work

### Non-Functional Requirements
- [ ] Page load time ≤ current performance
- [ ] API response time < 500ms average
- [ ] No console errors
- [ ] TypeScript compilation with no errors
- [ ] All tests passing
- [ ] Mobile responsive
- [ ] Multi-language support works

### Quality Requirements
- [ ] Code documented
- [ ] Error handling comprehensive
- [ ] Logging implemented
- [ ] Type safety maintained
- [ ] Security best practices followed

---

## Additional Considerations

### 1. Data Migration
- No database migration needed (same WooCommerce backend)
- Session data should transition seamlessly

### 2. SEO Impact
- Ensure URLs don't change
- Maintain meta tags
- Keep structured data
- Monitor Google Search Console after deployment

### 3. Analytics
- Ensure tracking codes still fire
- Update event tracking if needed
- Monitor conversion funnel

### 4. Third-Party Integrations
- Verify Stripe integration still works
- Test PayPal redirect flow
- Check any other payment gateways

### 5. Internationalization
- Ensure REST API returns translated data
- Test all 6 languages
- Verify currency formatting

---

## Questions for Stakeholders

Before starting migration, clarify:

1. **Server Access & Permissions**
   - Do we have access to install WordPress plugins?
   - Can we modify server configuration (CORS)?
   - Is there a staging environment?

2. **Authentication Method**
   - Which authentication method is preferred?
   - Are there any security requirements?

3. **Timeline**
   - What's the target launch date?
   - Is phased rollout acceptable?
   - What's the tolerance for downtime?

4. **Testing**
   - Will there be UAT (User Acceptance Testing)?
   - Who will perform testing?
   - What's the acceptance criteria?

5. **Monitoring**
   - What monitoring tools are in place?
   - How should errors be tracked?

---

## Conclusion

This migration from GraphQL to WooCommerce REST API is substantial but achievable. The key to success is:

1. **Methodical Approach**: Follow phases in order
2. **Comprehensive Testing**: Test each phase thoroughly before moving on
3. **Incremental Changes**: Don't change everything at once
4. **Maintain Compatibility**: Keep user experience identical
5. **Robust Error Handling**: Plan for failures
6. **Documentation**: Document all changes and decisions

The migration will modernize the tech stack, reduce dependencies on WPGraphQL plugin, and provide more direct access to WooCommerce functionality.

---

## Next Steps

### Immediate Actions:
1. ✅ **Review this document** with the team
2. ⏸️ **Get server access** and verify API keys can be generated
3. ⏸️ **Setup staging environment** for safe testing
4. ⏸️ **Choose authentication method** (JWT recommended)
5. ⏸️ **Create project timeline** based on estimates
6. ⏸️ **Begin Phase 1** once approved

### Before Starting Development:
- [ ] Backup production database
- [ ] Setup version control strategy (feature branches)
- [ ] Configure error monitoring
- [ ] Create test plan document
- [ ] Setup staging environment identical to production
- [ ] Generate WooCommerce API keys

---

**Document Version**: 1.0  
**Last Updated**: November 6, 2025  
**Author**: AI Assistant  
**Status**: Pending Review

