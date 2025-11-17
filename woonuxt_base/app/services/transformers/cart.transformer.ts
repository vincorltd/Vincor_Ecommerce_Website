/**
 * Cart Transformation Utilities
 * 
 * Transforms WooCommerce Store API cart responses to match GraphQL structure
 * This maintains compatibility with existing cart components
 */

import type { WooCart, WooCartItem } from '../api/types';
import { extractAddonsFromCartItem } from './addons.transformer';

/**
 * Transform Store API cart response to GraphQL Cart structure
 * Maintains full compatibility with existing cart components
 * 
 * @param storeApiCart - Cart response from Store API
 * @returns Transformed cart matching GraphQL structure
 */
export function transformCartToGraphQL(storeApiCart: WooCart): any {
  console.log('[Cart Transformer] 🔄 Transforming Store API cart to GraphQL format');
  
  // Handle empty cart or missing totals
  const totals = storeApiCart.totals || {
    total_price: '0',
    total_items: '0',
    total_tax: '0',
    total_discount: '0',
    total_shipping: '0',
  };
  
  console.log('[Cart Transformer] 📊 Input cart data:', {
    hasItems: !!storeApiCart.items,
    itemsCount: storeApiCart.items?.length || 0,
    totalItems: storeApiCart.items_count,
    totalPriceCents: totals.total_price,
    totalPriceDollars: (parseFloat(totals.total_price) / 100).toFixed(2),
  });
  
  return {
    // Totals (Store API uses cents, convert to dollars)
    total: formatPrice(totals.total_price),
    rawTotal: (parseFloat(totals.total_price) / 100).toFixed(2),
    subtotal: formatPrice(totals.total_items),
    totalTax: formatPrice(totals.total_tax),
    discountTotal: formatPrice(totals.total_discount),
    rawDiscountTotal: (parseFloat(totals.total_discount) / 100).toFixed(2),
    shippingTotal: formatPrice(totals.total_shipping),
    
    // Shipping methods
    chosenShippingMethods: storeApiCart.shipping_rates
      ?.flatMap(pkg => pkg.shipping_rates.filter(rate => rate.selected).map(rate => rate.rate_id))
      || [],
    
    availableShippingMethods: storeApiCart.shipping_rates?.map(pkg => ({
      rates: pkg.shipping_rates.map(rate => ({
        id: rate.rate_id,
        label: rate.name,
        cost: formatPrice(rate.price),
      }))
    })) || [],
    
    // Coupons
    appliedCoupons: storeApiCart.coupons?.map(coupon => ({
      code: coupon.code,
      discountAmount: formatPrice(coupon.totals.total_discount),
      discountTax: formatPrice(coupon.totals.total_discount_tax),
      description: '',
    })) || [],
    
    // Cart status
    isEmpty: !storeApiCart.items || storeApiCart.items.length === 0,
    
    // Cart contents
    contents: {
      itemCount: storeApiCart.items_count || 0,
      productCount: storeApiCart.items?.length || 0,
      nodes: (storeApiCart.items || []).map(item => transformCartItemToGraphQL(item)),
    },
  };
}

/**
 * Transform Store API cart item to GraphQL format
 */
function transformCartItemToGraphQL(storeApiItem: WooCartItem): any {
  console.log('[Cart Transformer] 📦 Transforming cart item:', storeApiItem.name);
  console.log('[Cart Transformer] 💰 Item prices (cents):', {
    line_subtotal: storeApiItem.totals.line_subtotal,
    line_total: storeApiItem.totals.line_total,
    unit_price: storeApiItem.prices.price,
  });
  
  // Determine if this is a variation
  const isVariation = storeApiItem.variation && storeApiItem.variation.length > 0;
  
  // Extract add-ons from extensions (Store API might not return them)
  const extraData = extractAddonsFromCartItem(storeApiItem);
  
  const transformedItem = {
    key: storeApiItem.key,
    quantity: storeApiItem.quantity,
    subtotal: formatPrice(storeApiItem.totals.line_subtotal),
    total: formatPrice(storeApiItem.totals.line_total),
    // Include raw totals object for CartCard calculations
    totals: {
      line_subtotal: storeApiItem.totals.line_subtotal,
      line_total: storeApiItem.totals.line_total,
      line_subtotal_tax: storeApiItem.totals.line_subtotal_tax,
      line_total_tax: storeApiItem.totals.line_total_tax,
    },
    
    // Product data
    product: {
      node: {
        databaseId: storeApiItem.id,
        name: storeApiItem.name,
        slug: storeApiItem.permalink?.split('/').pop() || '',
        sku: storeApiItem.sku || '',
        type: isVariation ? 'VARIABLE' : 'SIMPLE',
        image: storeApiItem.images?.[0] ? {
          sourceUrl: storeApiItem.images[0].src,
          cartSourceUrl: storeApiItem.images[0].thumbnail,
          altText: storeApiItem.images[0].alt || storeApiItem.name,
          title: storeApiItem.images[0].name || storeApiItem.name,
        } : null,
        price: formatPrice(storeApiItem.prices.price),
        regularPrice: formatPrice(storeApiItem.prices.regular_price),
        salePrice: formatPrice(storeApiItem.prices.sale_price),
        rawPrice: (parseFloat(storeApiItem.prices.price) / 100).toFixed(2),
        rawRegularPrice: (parseFloat(storeApiItem.prices.regular_price) / 100).toFixed(2),
        rawSalePrice: (parseFloat(storeApiItem.prices.sale_price) / 100).toFixed(2),
        stockStatus: 'INSTOCK', // Store API doesn't include stock status in cart
        stockQuantity: null,
        lowStockAmount: storeApiItem.low_stock_remaining,
      }
    },
    
    // Variation data (if applicable)
    variation: isVariation ? {
      node: {
        name: storeApiItem.name,
        slug: storeApiItem.permalink?.split('/').pop() || '',
        price: formatPrice(storeApiItem.prices.price),
        regularPrice: formatPrice(storeApiItem.prices.regular_price),
        salePrice: formatPrice(storeApiItem.prices.sale_price),
        rawRegularPrice: (parseFloat(storeApiItem.prices.regular_price) / 100).toFixed(2),
        rawSalePrice: (parseFloat(storeApiItem.prices.sale_price) / 100).toFixed(2),
        stockStatus: 'INSTOCK',
        image: storeApiItem.images?.[0] ? {
          sourceUrl: storeApiItem.images[0].src,
          cartSourceUrl: storeApiItem.images[0].thumbnail,
          altText: storeApiItem.images[0].alt || storeApiItem.name,
          title: storeApiItem.images[0].name || storeApiItem.name,
        } : null,
      }
    } : null,
    
    // Add-ons stored in extraData (compatible with existing components)
    extraData,
  };
  
  console.log('[Cart Transformer] ✅ Item transformed with add-ons:', extraData.length);
  
  return transformedItem;
}

/**
 * Format price from cents (Store API) to dollars with currency symbol
 */
function formatPrice(priceInCents: string): string {
  const dollars = parseFloat(priceInCents) / 100;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Parse price string to number (removes $ and converts to float)
 */
export function parsePrice(priceString: string): number {
  return parseFloat(priceString.replace(/[^0-9.-]+/g, ''));
}

/**
 * Transform GraphQL add to cart input to Store API format
 */
export function transformAddToCartInput(graphQLInput: any): any {
  return {
    id: graphQLInput.productId,
    quantity: graphQLInput.quantity || 1,
    variation: graphQLInput.variationId ? [{
      attribute: 'variation_id',
      value: graphQLInput.variationId.toString(),
    }] : undefined,
    addons_configuration: graphQLInput.addons_configuration || {},
  };
}

/**
 * Check if cart is empty
 */
export function isCartEmpty(cart: any): boolean {
  return !cart || cart.isEmpty || cart.contents?.itemCount === 0;
}

/**
 * Get cart item count
 */
export function getCartItemCount(cart: any): number {
  return cart?.contents?.itemCount || 0;
}

/**
 * Get cart total as number
 */
export function getCartTotal(cart: any): number {
  if (!cart?.rawTotal) return 0;
  return parseFloat(cart.rawTotal);
}

/**
 * Find cart item by key
 */
export function findCartItem(cart: any, itemKey: string): any {
  return cart?.contents?.nodes?.find((item: any) => item.key === itemKey);
}






