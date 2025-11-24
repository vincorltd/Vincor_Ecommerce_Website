# On-Demand Revalidation Implementation Plan

## Current State Analysis

### ✅ What We Already Have
1. **ISR Configured**: Product pages use `isr: 300` (5-minute time-based revalidation)
2. **Netlify Preset**: `preset: 'netlify_edge'` is configured
3. **Server-Side Data Fetching**: All product pages fetch data server-side
4. **API Endpoints**: `/api/products/[slug]` and related endpoints exist
5. **No-Cache Headers**: API endpoints have proper cache headers

### ❌ What We Need to Build
1. **Revalidation Endpoint**: `/api/revalidate` to trigger page regeneration
2. **WordPress Webhook Integration**: Code to send webhooks from WordPress
3. **Environment Variables**: Secret token for webhook validation
4. **Netlify Configuration**: Ensure ISR supports on-demand revalidation
5. **Testing Infrastructure**: Manual testing and monitoring

---

## Implementation Plan

### Phase 1: Create Revalidation Endpoint ⚙️

**Goal**: Build an API endpoint that WordPress can call to trigger page regeneration

**What to Build**:
- Endpoint: `POST /api/revalidate`
- Accepts: Product ID, slug, or path
- Validates: Secret token from environment variable
- Triggers: Nuxt ISR revalidation for specific pages
- Returns: Success/failure response

**Technical Details**:
- Use Nuxt's `invalidateCache()` or Nitro's cache invalidation API
- Support multiple page types: product pages, product listing, category pages
- Handle batch revalidation (multiple products at once)
- Log all revalidation attempts for debugging

**Files to Create**:
- `woonuxt_base/server/api/revalidate.post.ts`

**Environment Variables Needed**:
- `REVALIDATION_SECRET` - Secret token for webhook validation

**Testing**:
- Manual test with cURL/Postman
- Test with valid token
- Test with invalid token (should fail)
- Test with missing product (should handle gracefully)

---

### Phase 2: Configure Nuxt for On-Demand ISR 🔧

**Goal**: Ensure Nuxt ISR supports on-demand revalidation (not just time-based)

**What to Check/Update**:
- Verify `isr: 300` supports on-demand invalidation
- Add route rules for revalidation endpoint (no cache, no prerender)
- Ensure product pages can be invalidated individually
- Test that invalidation triggers regeneration

**Files to Update**:
- `woonuxt_base/nuxt.config.ts` - Add route rule for revalidation endpoint
- Verify ISR configuration supports manual invalidation

**Nuxt/Nitro API**:
- Research: `useNitroApp().cache` or `invalidateCache()` API
- Alternative: Use Netlify's cache purge API if Nuxt doesn't support direct invalidation

**Testing**:
- Test manual cache invalidation
- Verify pages regenerate after invalidation
- Check Netlify logs for regeneration events

---

### Phase 3: WordPress Webhook Integration 🔗

**Goal**: WordPress sends webhook when products are updated

**What to Build**:
- WordPress hook: `save_post` or `woocommerce_update_product`
- Extract product identifier (ID, slug)
- Send HTTP POST to revalidation endpoint
- Include secret token in request
- Handle errors and retries

**Implementation Options**:

**Option A: WordPress Plugin (Recommended)**
- Create simple custom plugin
- Easy to enable/disable
- Can be version controlled
- Doesn't require theme modifications

**Option B: Theme Functions**
- Add to `functions.php`
- Simpler but tied to theme
- Harder to maintain if theme changes

**Option C: Existing Plugin**
- Use webhook plugin (WP Webhooks, etc.)
- Less control but faster setup

**What WordPress Code Needs**:
```php
// Hook into product save
add_action('woocommerce_update_product', 'trigger_netlify_revalidation', 10, 1);

function trigger_netlify_revalidation($product_id) {
    // Get product slug
    $product = wc_get_product($product_id);
    $slug = $product->get_slug();
    
    // Send webhook
    wp_remote_post('https://vincor.com/api/revalidate', [
        'body' => json_encode([
            'secret' => 'your-secret-token',
            'type' => 'product',
            'id' => $product_id,
            'slug' => $slug,
            'path' => "/product/{$slug}"
        ]),
        'headers' => ['Content-Type' => 'application/json'],
        'timeout' => 5
    ]);
}
```

**Files to Create**:
- WordPress plugin: `netlify-revalidation.php` (or add to theme functions)

**Testing**:
- Update product in WordPress admin
- Check WordPress logs for webhook attempts
- Verify revalidation endpoint receives request
- Confirm page regenerates on Netlify

---

### Phase 4: Environment Configuration 🔐

**Goal**: Set up secure environment variables and configuration

**What to Configure**:

**Netlify Environment Variables**:
- `REVALIDATION_SECRET` - Secret token (generate strong random string)
- `WOO_REST_API_CONS_KEY` - Already exists
- `WOO_REST_API_CONS_SEC` - Already exists

**WordPress Configuration**:
- Store revalidation endpoint URL
- Store secret token (use WordPress options or constants)
- Configure timeout and retry settings

**Security Considerations**:
- Use strong, random secret token (32+ characters)
- Never commit secrets to Git
- Use Netlify's environment variable UI
- Consider IP whitelisting (optional, for extra security)

**Files to Update**:
- `.env.example` - Add `REVALIDATION_SECRET` (without actual value)
- Documentation - How to set up environment variables

---

### Phase 5: Enhanced Features (Optional) 🚀

**Goal**: Add advanced features for better UX and reliability

**Features to Consider**:

1. **Batch Revalidation**
   - Support multiple products in one request
   - Useful when bulk updating products

2. **Revalidation Queue**
   - Queue revalidation requests if Netlify is busy
   - Retry failed revalidations

3. **Revalidation Status Endpoint**
   - `GET /api/revalidate/status`
   - Check if page was recently regenerated
   - Useful for debugging

4. **Webhook Logging**
   - Log all webhook attempts
   - Track success/failure rates
   - Monitor revalidation performance

5. **Selective Revalidation**
   - Revalidate product page + listing page + category pages
   - Smart invalidation based on what changed

6. **Health Check**
   - Endpoint to verify webhook connectivity
   - Test from WordPress admin

---

### Phase 6: Testing & Validation ✅

**Goal**: Comprehensive testing of the entire flow

**Test Scenarios**:

1. **Happy Path**
   - Update product in WordPress
   - Verify webhook sent
   - Verify revalidation endpoint called
   - Verify page regenerates
   - Verify changes appear on live site within 60 seconds

2. **Error Handling**
   - Invalid secret token (should fail gracefully)
   - Missing product (should handle gracefully)
   - Netlify API down (should retry or queue)
   - WordPress webhook fails (should log error)

3. **Edge Cases**
   - Bulk product update (multiple products)
   - Product deleted (should handle gracefully)
   - Product slug changed (should revalidate old and new)
   - Category update (should revalidate category pages)

4. **Performance**
   - Measure time from WordPress save to live site update
   - Monitor Netlify build times
   - Check for rate limiting issues

**Testing Tools**:
- cURL/Postman for manual endpoint testing
- WordPress admin for product updates
- Netlify logs for regeneration events
- Browser dev tools for cache verification

---

### Phase 7: Documentation & Rollout 📚

**Goal**: Document the system and prepare for production

**Documentation Needed**:

1. **Setup Guide**
   - How to configure environment variables
   - How to install WordPress plugin
   - How to test the system

2. **Troubleshooting Guide**
   - Common issues and solutions
   - How to check webhook logs
   - How to manually trigger revalidation

3. **Monitoring Guide**
   - What to monitor
   - How to check if revalidation is working
   - Alert thresholds

4. **User Guide** (for content editors)
   - How product updates work
   - Expected time for changes to appear
   - What to do if changes don't appear

**Rollout Strategy**:

1. **Development Environment**
   - Set up on dev/staging first
   - Test thoroughly
   - Fix any issues

2. **Production Deployment**
   - Deploy revalidation endpoint
   - Set environment variables
   - Install WordPress plugin
   - Test with one product update

3. **Monitoring**
   - Monitor for first 24 hours
   - Check logs regularly
   - Verify all updates trigger revalidation

4. **Optimization**
   - Fine-tune based on real usage
   - Optimize revalidation times
   - Adjust retry logic if needed

---

## Implementation Order

### Week 1: Foundation
- [ ] Phase 1: Create revalidation endpoint
- [ ] Phase 2: Configure Nuxt for on-demand ISR
- [ ] Phase 4: Set up environment variables
- [ ] Test manually with cURL/Postman

### Week 2: Integration
- [ ] Phase 3: WordPress webhook integration
- [ ] Test end-to-end flow
- [ ] Fix any issues

### Week 3: Polish
- [ ] Phase 5: Enhanced features (if needed)
- [ ] Phase 6: Comprehensive testing
- [ ] Phase 7: Documentation

### Week 4: Rollout
- [ ] Deploy to staging
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor and optimize

---

## Technical Decisions Needed

### 1. Revalidation Method ⚠️ CRITICAL
**Question**: How does Nuxt/Nitro handle on-demand ISR invalidation?

**Current Understanding**:
- Nuxt 4 uses Nitro with `isr: 300` (time-based revalidation) ✅
- No direct `invalidateCache()` API found in Nuxt/Nitro documentation
- Netlify supports build hooks for full rebuilds
- Netlify may support cache purge API for CDN invalidation

**Options** (in order of preference):

**Option A: Netlify Cache Purge API** (Recommended if available)
- Use Netlify's API to purge specific page from CDN cache
- Page regenerates on next request (ISR kicks in)
- Most efficient - only purges cache, doesn't rebuild
- **Research**: Check Netlify API docs for cache purge endpoint

**Option B: Netlify Build Hook** (Fallback)
- Trigger Netlify build hook for specific page
- Netlify regenerates that page
- Less efficient but guaranteed to work
- **Note**: May trigger full rebuild if not configured correctly

**Option C: Nuxt/Nitro Internal API** (If discovered)
- Use Nitro's internal cache invalidation
- Most direct approach
- **Research**: Check Nitro source code or experimental features

**Option D: Hybrid Approach**
- Purge CDN cache + trigger ISR regeneration
- Most reliable but more complex

**Action Required**: 
1. Research Netlify API documentation for cache purge
2. Test if ISR pages regenerate after cache purge
3. Fallback to build hooks if cache purge doesn't work

### 2. WordPress Integration Method
**Question**: Plugin vs. theme functions vs. existing plugin?

**Recommendation**: Custom plugin (Option A)
- Most maintainable
- Easy to enable/disable
- Can be version controlled
- Doesn't break if theme changes

### 3. Batch Revalidation
**Question**: Support multiple products in one request?

**Recommendation**: Yes, but start simple
- Start with single product revalidation
- Add batch support later if needed
- Useful for bulk updates

### 4. Error Handling
**Question**: How to handle failed revalidations?

**Recommendation**: 
- Log errors
- Return error response to WordPress
- Consider retry queue for production
- Start with simple error logging

### 5. Security
**Question**: Additional security beyond secret token?

**Recommendation**:
- Secret token is minimum
- Consider IP whitelisting (optional)
- Rate limiting (Netlify handles this)
- Start with secret token, add more if needed

---

## Success Criteria

### Functional Requirements
- ✅ Product update in WordPress triggers revalidation within 5 seconds
- ✅ Page regenerates on Netlify within 30-60 seconds
- ✅ Changes appear on live site within 60 seconds
- ✅ Invalid requests are rejected (security)
- ✅ Errors are logged and handled gracefully

### Performance Requirements
- ✅ Revalidation endpoint responds in <1 second
- ✅ Page regeneration completes in <60 seconds
- ✅ No impact on site performance for other users
- ✅ Can handle multiple concurrent revalidations

### Reliability Requirements
- ✅ 99%+ webhook delivery success rate
- ✅ Failed revalidations are logged
- ✅ System recovers from temporary failures
- ✅ Monitoring and alerting in place

---

## Risks & Mitigations

### Risk 1: Nuxt/Nitro doesn't support on-demand ISR
**Mitigation**: 
- Research Nuxt 4 ISR capabilities first
- Fallback: Use Netlify build hooks (less efficient but works)
- Alternative: Use time-based ISR with shorter intervals

### Risk 2: WordPress webhook fails silently
**Mitigation**:
- Add logging to WordPress plugin
- Add health check endpoint
- Monitor webhook delivery

### Risk 3: Rate limiting from Netlify
**Mitigation**:
- Implement request queuing
- Batch multiple updates
- Monitor Netlify rate limits

### Risk 4: Security breach
**Mitigation**:
- Use strong secret token
- Consider IP whitelisting
- Monitor for unauthorized requests
- Log all revalidation attempts

---

## Next Steps

1. **Research**: Check Nuxt 4/Nitro documentation for on-demand ISR API
2. **Prototype**: Build minimal revalidation endpoint
3. **Test**: Verify ISR can be triggered manually
4. **Decide**: Choose WordPress integration method
5. **Build**: Implement Phase 1 (revalidation endpoint)
6. **Iterate**: Test and refine

---

## Questions to Answer Before Starting

1. **Does Nuxt 4/Nitro support on-demand ISR invalidation?**
   - Need to check documentation
   - May need to use Netlify-specific APIs

2. **What's the preferred WordPress integration method?**
   - Plugin vs. theme functions
   - User preference

3. **How many products typically update per day?**
   - Affects rate limiting considerations
   - Affects batch revalidation priority

4. **What's the acceptable delay for updates?**
   - Current: 5 minutes (time-based ISR)
   - Target: 30-60 seconds (on-demand)
   - Helps prioritize features

5. **Do we need to revalidate related pages?**
   - Product page + listing page + category pages
   - Affects complexity of revalidation logic

