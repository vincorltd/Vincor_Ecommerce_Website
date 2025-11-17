/**
 * Transformation Utilities Index
 * 
 * Exports all transformation functions for converting between:
 * - WooCommerce REST API and GraphQL formats
 * - User selections and Store API formats
 * - Cart data and order data
 */

// Product transformers
export {
  transformProductToGraphQL,
  transformVariationToGraphQL,
  transformAddonsToGraphQL,
  isChoiceAddonType,
  isTextAddonType,
  isNumericAddonType,
} from './product.transformer';

// Add-ons transformers
export {
  formatAddonsForCart,
  extractAddonsFromCartItem,
  parseAddonsFromExtraData,
  buildOrderLineItemMeta,
  calculateAddonsTotalPrice,
  validateAddonsSelection,
  getAddonDisplayName,
  hasOptions,
  getAddonPlaceholder,
} from './addons.transformer';

// Cart transformers
export {
  transformCartToGraphQL,
  transformAddToCartInput,
  parsePrice,
  isCartEmpty,
  getCartItemCount,
  getCartTotal,
  findCartItem,
} from './cart.transformer';

// Re-export types for convenience
export type {
  SelectedAddon,
  CartAddonData,
  CartItemAddonExtension,
  ProductAddonsCartConfiguration,
} from '../api/types';

