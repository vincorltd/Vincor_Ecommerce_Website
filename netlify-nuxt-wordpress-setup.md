# Netlify On-Demand Regeneration: Conceptual Guide for Nuxt 4 + WordPress

## The Problem You're Solving

**Current State**: 
- Pre-rendering all 300 products at build time means any change requires a full site redeploy
- Client-side rendering solves updates but loses SEO benefits and has slow initial load
- Server-side rendering everything causes caching issues and hydration mismatches

**Desired State**:
- Pages are pre-rendered (fast, SEO-friendly)
- Content updates automatically without full rebuilds
- Client doesn't need to touch Netlify
- No hydration issues or cache mismatches

---

## How the Solution Works (Conceptual Flow)

### The Three-Tier System

```
WordPress (Source of Truth)
    ↓
    Webhook triggers on content change
    ↓
Netlify/Nuxt (Frontend)
    ↓
    Rebuilds ONLY affected pages
    ↓
CDN (Delivery)
    ↓
    Serves cached pages, updates selectively
```

### The Data Flow

1. **Initial Build**: Generate all 300 product pages as static HTML
2. **User Updates Product**: Client edits product in WordPress admin
3. **WordPress Sends Signal**: Webhook fires with product identifier
4. **Selective Rebuild**: Only that specific product page regenerates
5. **Cache Updated**: CDN serves new version, old pages stay cached
6. **User Sees Changes**: Within 30-60 seconds, changes are live

---

## What Your Nuxt Frontend Needs to Do

### 1. Configure Build Behavior

**Concept**: Tell Nuxt which pages to pre-render and which to handle dynamically

Your Nuxt config needs to specify:
- **Static pages**: Never change (homepage, about, contact) → pre-render once
- **Semi-dynamic pages**: Change occasionally (product pages) → use ISR (Incremental Static Regeneration)
- **Always dynamic**: Change constantly (cart, user account) → never cache

**What to configure**:
- Set Netlify as your deployment target/preset
- Define which routes should be pre-rendered at build time
- Define which routes should use ISR (regenerate on-demand)
- Define which routes should never be cached

### 2. Create a Revalidation Endpoint

**Concept**: An API route that receives signals from WordPress and triggers page regeneration

**What this endpoint does**:
- Accepts POST requests with a product identifier (slug, ID, path)
- Validates the request using a secret token (prevents unauthorized triggers)
- Tells Netlify "regenerate this specific page"
- Returns success/failure response

**What you need**:
- A server-side route (not a page, an API endpoint)
- Logic to validate incoming requests
- Logic to identify which page needs regeneration
- A way to trigger Netlify's build system for that specific page

### 3. Set Up Data Fetching Strategy

**Concept**: Fetch product data in a way that works for both pre-rendering and dynamic updates

**Key principles**:
- Fetch data during build time for initial static generation
- Fetch data on-demand when pages regenerate
- Set appropriate cache headers so CDN knows how long to serve cached versions
- Use the same data source (WordPress API) consistently

**What you need**:
- Server-side data fetching (not client-side)
- Proper HTTP cache headers on responses
- Error handling for when WordPress API is unavailable

### 4. Handle the Rendering Pipeline

**Concept**: Separate what renders on server vs. client to avoid mismatches

**Server-rendered** (same for everyone, SEO-important):
- Product title, description, images
- Pricing, specifications
- Static content

**Client-rendered** (user-specific, interactive):
- Add to cart functionality
- User reviews/ratings
- Dynamic inventory status
- Personalized recommendations

**What you need**:
- A way to wrap client-only components so they don't render on server
- Proper data hydration so server HTML matches client JavaScript
- Loading states for client-rendered content

---

## What WordPress Needs to Do

### 1. Detect Content Changes

**Concept**: Know when a product has been updated

**What WordPress needs**:
- A hook/listener on product save events
- Logic to determine if it's a new product or an update
- Ability to extract the product identifier (slug/ID)

### 2. Send Notification to Netlify

**Concept**: Tell your Nuxt site "this product changed, please update it"

**What the notification includes**:
- The product identifier (slug, ID, or full path)
- A secret token for validation
- Optionally, what changed (price, description, etc.)

**How it sends the notification**:
- HTTP POST request to your Nuxt revalidation endpoint
- Includes JSON payload with the necessary data
- Handles success/failure responses

**Where this code lives**:
- WordPress theme functions file, OR
- Custom WordPress plugin, OR
- WordPress webhook plugin configuration

---

## What Netlify Needs to Do

### 1. Environment Configuration

**Concept**: Store sensitive credentials and configuration

**What needs to be configured**:
- Secret token for validating WordPress webhooks
- WordPress API URL and credentials
- Build hook URLs (for full site rebuilds if ever needed)

### 2. Build Process

**Concept**: Support both full builds and incremental updates

**What Netlify does automatically**:
- Full initial build generates all 300 product pages
- Incremental builds regenerate only specified pages
- CDN cache invalidation for updated pages
- Deployment rollback if builds fail

**What you configure**:
- Build command (probably `npm run generate`)
- Publish directory (probably `dist` or `.output/public`)
- Environment variables
- Build hooks (optional, for manual triggers)

---

## The Cache Strategy (Critical Concept)

### Three Layers of Caching

**1. Build-Time (Static Generation)**
- Products are generated as HTML files during deploy
- Fastest possible delivery
- No database queries

**2. CDN Cache (Netlify's Edge Network)**
- Serves static files from closest server to user
- Can be invalidated/purged when content changes
- Stale-while-revalidate: serve old version while generating new one

**3. Browser Cache (User's Device)**
- Short cache duration for product pages (e.g., 1 hour)
- Longer cache for static assets (images, CSS, JS)
- Headers tell browser when to fetch fresh content

### Cache Headers You Need to Set

Your server responses need to include HTTP headers that tell both CDN and browsers:
- How long to cache the response
- When it's okay to serve stale content
- When to revalidate

**Example strategy**:
- Product pages: Cache for 1 hour, serve stale for 24 hours while revalidating
- Static pages: Cache for 1 week
- User-specific content: Don't cache at all

---

## Implementation Sequence

### Phase 1: Configure Nuxt for ISR
1. Set Netlify as deployment target in your config
2. Define route rules (which pages use ISR)
3. Ensure data fetching happens server-side
4. Test local builds

### Phase 2: Create Revalidation Endpoint
1. Create a server API route in Nuxt
2. Add validation logic (check secret token)
3. Add logic to identify which page needs regeneration
4. Test manually with cURL or Postman

### Phase 3: Set Up WordPress Webhooks
1. Add code to WordPress that detects product updates
2. Send HTTP POST to your Nuxt revalidation endpoint
3. Include product identifier and secret token
4. Test by updating a product in WordPress admin

### Phase 4: Deploy and Test
1. Deploy to Netlify
2. Set environment variables
3. Update a product in WordPress
4. Verify product page updates on live site
5. Check Netlify logs to see if revalidation triggered

---

## Troubleshooting Concepts

### Issue: Pages Not Updating

**Possible causes**:
- Webhook not firing from WordPress
- Secret token mismatch
- CDN cache not being invalidated
- ISR not properly configured

**How to diagnose**:
- Check WordPress logs for webhook attempts
- Check Netlify function logs for incoming requests
- Manually test revalidation endpoint
- Verify cache headers in browser dev tools

### Issue: Hydration Mismatches

**Possible causes**:
- Server HTML differs from client JavaScript
- Async data not resolved before render
- Timestamps or random IDs generated on both server and client

**How to diagnose**:
- Check browser console for hydration errors
- Compare server-rendered HTML to client-rendered HTML
- Verify data is fetched before rendering, not after

### Issue: Slow Performance

**Possible causes**:
- Too many pages regenerating simultaneously
- WordPress API is slow
- CDN cache not being used effectively
- Client-side fetching instead of server-side

**How to diagnose**:
- Check Netlify build times
- Test WordPress API response times
- Verify cache headers are set correctly
- Use browser Network tab to see what's being fetched client-side

---

## Key Metrics to Monitor

### Build Performance
- Initial build time (should be 5-10 min for 300 products)
- Incremental build time (should be 30-60 sec per product)
- Build success rate

### Content Freshness
- Time from WordPress save to live site update (target: <60 seconds)
- Number of successful webhooks vs. failed
- Cache hit rate on CDN

### User Experience
- Time to First Byte (TTFB) - should be <500ms
- Largest Contentful Paint (LCP) - should be <2.5s
- Hydration errors in production

---

## Decision Points

### Should you pre-render all 300 products?

**Yes, if**:
- You want best SEO
- You want fastest possible page loads
- Your build times are acceptable (<10 minutes)

**No, if**:
- Build times are too long
- Products change very frequently (multiple times per hour)
- You have limited build minutes on Netlify

**Alternative**: Pre-render only top 50 products, generate others on first visit

### Should you use time-based or on-demand revalidation?

**Time-based** (e.g., regenerate every hour):
- Simpler to set up (no WordPress webhooks needed)
- Good for content that changes predictably
- Less precise (content might be stale for up to an hour)

**On-demand** (regenerate when WordPress signals):
- More complex (requires webhook setup)
- Instant updates (within 30-60 seconds)
- Only rebuilds when actually needed

**Recommendation**: On-demand for product pages, time-based for listing pages

### Should you use Netlify's ISR or build hooks?

**ISR (Incremental Static Regeneration)**:
- Built into Nuxt/Nitro
- Handles individual page updates
- Better for frequent, small changes
- More granular control

**Build Hooks**:
- Triggers full site rebuild
- Better for major content changes
- Simpler setup
- Less efficient for single-page updates

**Recommendation**: Use ISR for product updates, build hooks only for design/layout changes

---

## Summary: What Each System Does

### WordPress
- Detects when products are updated
- Sends webhook with product identifier to Nuxt
- Remains the source of truth for all product data

### Nuxt Frontend
- Pre-renders product pages at build time
- Exposes revalidation endpoint for WordPress to call
- Fetches fresh data from WordPress API when regenerating
- Serves pre-rendered HTML for fast delivery

### Netlify
- Hosts the static site on CDN
- Executes builds (full and incremental)
- Manages cache and cache invalidation
- Provides build hooks and environment variables

### User's Browser
- Receives pre-rendered HTML (fast initial load)
- Hydrates interactive components client-side
- Caches pages based on HTTP headers
- Requests fresh content when cache expires

The client edits products in WordPress and sees changes on the live site within a minute—no Netlify knowledge required.
