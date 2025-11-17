// 100% REST API - NO GraphQL dependencies
import { transformCartToGraphQL } from '~/services/transformers/cart.transformer';
import { useCartAddonsStore } from '~/stores/cart-addons';

/**
 * @name useCart
 * @description A composable that handles cart operations using REST API
 * Uses WooCommerce Store API for cart operations (no authentication required)
 * 
 * FULL REST API APPROACH:
 * - Products: REST API ✅
 * - Cart: Store API (REST) ✅
 * - Checkout: REST API ✅
 * - NO GraphQL dependencies ✅
 */
export function useCart() {
  const { storeSettings } = useAppConfig();

  const cart = useState<Cart | null>('cart', () => null);
  const isShowingCart = useState<boolean>('isShowingCart', () => false);
  const isUpdatingCart = useState<boolean>('isUpdatingCart', () => false);
  const isUpdatingCoupon = useState<boolean>('isUpdatingCoupon', () => false);
  const paymentGateways = useState<PaymentGateways | null>('paymentGateways', () => null);
  const { clearAllCookies } = useHelpers();

  /**
   * Refresh the cart from REST API
   * @returns {Promise<boolean>} - A promise that resolves to true if successful
   */
  async function refreshCart(): Promise<boolean> {
    console.log('[useCart] 🔄 Refreshing cart from REST API...');
    
    try {
      // Ensure addons store is hydrated before refreshing cart
      const addonsStore = useCartAddonsStore();
      if (process.client && !addonsStore._hydrated) {
        console.log('[useCart] 💧 Hydrating addons store before refresh');
        addonsStore.hydrate();
      }
      
      const restCart = await $fetch('/api/cart', {
        method: 'GET',
        credentials: 'include', // Ensure cookies are sent with request
      });

      console.log('[useCart] ✅ Cart fetched from REST API');
      console.log('[useCart] 📊 Raw cart response:', {
        hasData: !!restCart,
        hasItems: !!(restCart as any)?.items,
        itemsCount: (restCart as any)?.items?.length || 0,
      });
      
      const transformedCart = transformCartToGraphQL(restCart as any);
      
      console.log('[useCart] 📦 Transformed cart:', {
        isEmpty: transformedCart.isEmpty,
        itemCount: transformedCart.contents?.itemCount,
        productCount: transformedCart.contents?.productCount,
        nodesLength: transformedCart.contents?.nodes?.length,
      });
      
      // Inject add-ons: Prefer item_data from API (source of truth) over stored addons
      if (transformedCart.contents?.nodes) {
        transformedCart.contents.nodes.forEach((item: any) => {
          // Always prefer item_data from API (it's the source of truth from WooCommerce)
          // This ensures we get the correct addons without duplicates
          if (item.extraData && item.extraData.length > 0) {
            console.log('[useCart] ✅ Using add-ons from item_data (API source of truth) for item:', item.key);
            
            // Parse and save to Pinia store so they persist across refreshes
            try {
              const addonsData = JSON.parse(item.extraData[0].value);
              if (addonsData && addonsData.length > 0) {
                console.log('[useCart] 💾 Saving add-ons from item_data to store for persistence:', addonsData.length, 'addons');
                console.log('[useCart] 📦 Addons data:', addonsData);
                
                // Store will normalize prices to numbers and prevent duplicates
                addonsStore.setItemAddons(item.key, addonsData);
              } else {
                // Clear stored addons if item_data has no addons (item was updated)
                console.log('[useCart] 🗑️ Clearing stored addons (item_data has no addons)');
                addonsStore.removeItemAddons(item.key);
              }
            } catch (error) {
              console.error('[useCart] ❌ Error parsing item_data addons:', error);
              // Clear corrupted stored addons
              addonsStore.removeItemAddons(item.key);
            }
          }
          // Fallback: use stored addons if item_data is not available
          else {
            const storedAddons = addonsStore.getItemAddons(item.key);
            if (storedAddons && storedAddons.length > 0) {
              console.log('[useCart] 💉 Using stored add-ons (fallback) for item:', item.key);
              item.extraData = [{
                key: 'addons',
                value: JSON.stringify(storedAddons),
              }];
            }
          }
        });
      }
      
      updateCart(transformedCart);

      return true;
    } catch (error: any) {
      console.error('[useCart] ❌ Error refreshing cart:', error);
      return false;
    } finally {
      isUpdatingCart.value = false;
    }
  }

  function resetInitialState() {
    cart.value = null;
    paymentGateways.value = null;
  }

  function updateCart(payload?: Cart | null): void {
    cart.value = payload || null;
  }

  function updatePaymentGateways(payload: PaymentGateways): void {
    paymentGateways.value = payload;
  }

  // toggle the cart visibility
  function toggleCart(state: boolean | undefined = undefined): void {
    isShowingCart.value = state ?? !isShowingCart.value;
  }

  /**
   * Add an item to the cart via REST API
   * Supports products with add-ons
   */
  async function addToCart(input: any): Promise<void> {
    isUpdatingCart.value = true;
    console.log('[useCart] 🛒 Adding to cart (REST API):', input);
    
    try {
      // Ensure addons store is hydrated before adding to cart
      const addonsStore = useCartAddonsStore();
      if (process.client && !addonsStore._hydrated) {
        console.log('[useCart] 💧 Hydrating addons store before add to cart');
        addonsStore.hydrate();
      }
      
      const payload: any = {
        id: input.productId,
        quantity: input.quantity || 1,
      };
      
      if (input.variationId) {
        payload.variation_id = input.variationId;
      }
      
      if (input.extraData) {
        payload.extra_data = input.extraData;
        console.log('[useCart] 📦 Including extraData:', payload.extra_data);
      }
      
      const addResult = await $fetch<any>('/api/cart/add-item', {
        method: 'POST',
        body: payload,
        credentials: 'include', // Ensure cookies are sent and received
      });

      console.log('[useCart] ✅ Item added to cart');
      
      // Store add-ons client-side if they were included
      if (addResult._addons_meta) {
        const addonsData = JSON.parse(addResult._addons_meta.addons);
        addonsStore.setItemAddons(addResult._addons_meta.itemKey, addonsData);
        console.log('[useCart] 💾 Stored add-ons for item:', addResult._addons_meta.itemKey);
      }
      
      // Refresh cart to get updated cart data
      console.log('[useCart] 🔄 Refreshing cart...');
      await refreshCart();
      
      if (storeSettings.autoOpenCart && !isShowingCart.value) {
        toggleCart(true);
      }
    } catch (error: any) {
      console.error('[useCart] ❌ Error adding to cart:', error);
      alert(error.message || 'Failed to add item to cart');
    } finally {
      isUpdatingCart.value = false;
    }
  }

  /**
   * Remove an item from the cart (REST API)
   */
  async function removeItem(key: string) {
    isUpdatingCart.value = true;
    console.log('[useCart] 🗑️ Removing item:', key);
    
    // Remove add-ons from store
    const addonsStore = useCartAddonsStore();
    addonsStore.removeItemAddons(key);
    
    try {
      const restCart = await $fetch('/api/cart/remove-item', {
        method: 'POST',
        body: { key },
        credentials: 'include',
      });

      console.log('[useCart] ✅ Item removed, updating cart...');
      const transformedCart = transformCartToGraphQL(restCart as any);
      
      // Inject add-ons for remaining items
      if (transformedCart.contents?.nodes) {
        transformedCart.contents.nodes.forEach((item: any) => {
          const storedAddons = addonsStore.getItemAddons(item.key);
          if (storedAddons && storedAddons.length > 0) {
            console.log('[useCart] 💉 Re-injecting add-ons for:', item.key);
            item.extraData = [{
              key: 'addons',
              value: JSON.stringify(storedAddons),
            }];
          }
        });
      }
      
      updateCart(transformedCart);
      console.log('[useCart] ✅ Cart updated, isEmpty:', transformedCart.isEmpty);
      
      // Force reactivity update
      isUpdatingCart.value = false;
      
    } catch (error: any) {
      console.error('[useCart] ❌ Error removing item:', error);
      isUpdatingCart.value = false;
    }
  }

  /**
   * Update the quantity of an item in the cart (REST API)
   */
  async function updateItemQuantity(key: string, quantity: number): Promise<void> {
    isUpdatingCart.value = true;
    console.log('[useCart] 🔢 Updating quantity:', { key, quantity });
    
    try {
      const restCart = await $fetch('/api/cart/update-item', {
        method: 'POST',
        body: {
          key,
          quantity,
        },
        credentials: 'include',
      });

      console.log('[useCart] ✅ Quantity updated');
      const transformedCart = transformCartToGraphQL(restCart as any);
      updateCart(transformedCart);
    } catch (error: any) {
      console.error('[useCart] ❌ Error updating quantity:', error);
    } finally {
      isUpdatingCart.value = false;
    }
  }

  /**
   * Empty the cart (REST API)
   */
  async function emptyCart(): Promise<void> {
    try {
      isUpdatingCart.value = true;
      console.log('[useCart] 🧹 Emptying cart...');
      
      const restCart = await $fetch('/api/cart/remove-items', {
        method: 'DELETE',
        credentials: 'include',
      });

      console.log('[useCart] ✅ Cart emptied');
      
      // Clear all add-ons from store
      const addonsStore = useCartAddonsStore();
      addonsStore.clearAll();
      
      const transformedCart = transformCartToGraphQL(restCart as any);
      updateCart(transformedCart);
      console.log('[useCart] ✅ Cart state updated, isEmpty:', transformedCart.isEmpty);
    } catch (error: any) {
      console.error('[useCart] ❌ Error emptying cart:', error);
    } finally {
      isUpdatingCart.value = false;
    }
  }

  /**
   * Update shipping method (REST API)
   */
  async function updateShippingMethod(shippingMethods: string) {
    isUpdatingCart.value = true;
    console.log('[useCart] 🚚 Updating shipping method:', shippingMethods);
    
    try {
      const restCart = await $fetch('/api/cart/select-shipping', {
        method: 'POST',
        body: {
          package_id: 0,
          rate_id: shippingMethods,
        },
        credentials: 'include',
      });

      console.log('[useCart] ✅ Shipping method updated');
      const transformedCart = transformCartToGraphQL(restCart as any);
      updateCart(transformedCart);
    } catch (error: any) {
      console.error('[useCart] ❌ Error updating shipping:', error);
    } finally {
      isUpdatingCart.value = false;
    }
  }

  /**
   * Apply coupon (REST API)
   */
  async function applyCoupon(code: string): Promise<{ message: string | null }> {
    try {
      isUpdatingCoupon.value = true;
      console.log('[useCart] 🎟️ Applying coupon:', code);
      
      const restCart = await $fetch('/api/cart/apply-coupon', {
        method: 'POST',
        body: { code },
        credentials: 'include',
      });

      console.log('[useCart] ✅ Coupon applied');
      const transformedCart = transformCartToGraphQL(restCart as any);
      updateCart(transformedCart);
      isUpdatingCoupon.value = false;
      
      return { message: 'Coupon applied successfully' };
    } catch (error: any) {
      isUpdatingCoupon.value = false;
      console.error('[useCart] ❌ Error applying coupon:', error);
      return { message: error.message || 'Failed to apply coupon' };
    }
  }

  /**
   * Remove coupon (REST API)
   */
  async function removeCoupon(code: string): Promise<void> {
    try {
      isUpdatingCart.value = true;
      console.log('[useCart] 🗑️ Removing coupon:', code);
      
      const restCart = await $fetch('/api/cart/remove-coupon', {
        method: 'POST',
        body: { code },
        credentials: 'include',
      });

      console.log('[useCart] ✅ Coupon removed');
      const transformedCart = transformCartToGraphQL(restCart as any);
      updateCart(transformedCart);
    } catch (error: any) {
      console.error('[useCart] ❌ Error removing coupon:', error);
      isUpdatingCart.value = false;
    }
  }

  // Stop the loading spinner when the cart is updated
  watch(cart, (val) => {
    isUpdatingCart.value = false;
  });

  // Check if all products in the cart are virtual
  const allProductsAreVirtual = computed(() => {
    const nodes = cart.value?.contents?.nodes || [];
    return nodes.length === 0 ? false : nodes.every((node) => (node.product?.node as SimpleProduct)?.virtual === true);
  });

  // Check if the billing address is enabled
  const isBillingAddressEnabled = computed(() => (storeSettings.hideBillingAddressForVirtualProducts ? !allProductsAreVirtual.value : true));

  return {
    cart,
    isShowingCart,
    isUpdatingCart,
    isUpdatingCoupon,
    paymentGateways,
    isBillingAddressEnabled,
    updateCart,
    refreshCart,
    toggleCart,
    addToCart,
    removeItem,
    updateItemQuantity,
    emptyCart,
    updateShippingMethod,
    applyCoupon,
    removeCoupon,
  };
}
