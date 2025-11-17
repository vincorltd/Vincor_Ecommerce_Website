// REST API imports only - no GraphQL
import { ordersService } from '~/services/woocommerce/orders.service';
import { parseAddonsFromExtraData, buildOrderLineItemMeta } from '~/services/transformers/addons.transformer';
import type { WooOrderCreateInput, WooOrderLineItemInput } from '~/services/api/types';
import { useCartAddonsStore } from '~/stores/cart-addons';

export function useCheckout() {
  const orderInput = useState<any>('orderInput', () => {
    return {
      customerNote: '',
      paymentMethod: '',
      shipToDifferentAddress: false,
      metaData: [{ key: 'order_via', value: 'WooNuxt' }],
    };
  });

  const isProcessingOrder = useState<boolean>('isProcessingOrder', () => false);

  // if Country or State are changed, calculate the shipping rates again
  async function updateShippingLocation() {
    const { customer, viewer } = useAuth();
    const { isUpdatingCart, refreshCart } = useCart();

    isUpdatingCart.value = true;

    try {
      // For Store API, shipping calculations happen automatically during checkout
      // based on the billing/shipping addresses in the order payload
      // We just refresh the cart to get updated shipping methods
      console.log('[Checkout] 🚚 Updating shipping location...');
      
      if (viewer.value?.databaseId) {
        // If logged in, update customer via REST API
        const { customersService } = await import('~/services/woocommerce/customers.service');
        
        await customersService.updateCustomer(viewer.value.databaseId, {
          billing: customer.value.billing,
          shipping: orderInput.value.shipToDifferentAddress ? customer.value.shipping : customer.value.billing,
        });
        
        console.log('[Checkout] ✅ Customer updated');
      }
      
      // Refresh cart to recalculate shipping
      await refreshCart();
      console.log('[Checkout] ✅ Shipping rates updated');
      
    } catch (error) {
      console.error('[Checkout] ❌ Error updating shipping location:', error);
    } finally {
      isUpdatingCart.value = false;
    }
  }

  function openPayPalWindow(redirectUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      const width = 750;
      const height = 750;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2 + 80;
      const payPalWindow = window.open(redirectUrl, '', `width=${width},height=${height},top=${top},left=${left}`);
      const timer = setInterval(() => {
        if (payPalWindow?.closed) {
          clearInterval(timer);
          resolve(true);
        }
      }, 500);
    });
  }

  /**
   * Process checkout using REST API
   * Creates order from cart with full add-ons support
   */
  const proccessCheckout = async (isPaid = false) => {
    const { customer, loginUser, viewer } = useAuth();
    const router = useRouter();
    const { cart, emptyCart, refreshCart } = useCart();

    isProcessingOrder.value = true;
    console.log('[Checkout] 🚀 Starting checkout process...');

    const { username, password, shipToDifferentAddress } = orderInput.value;
    const billing = customer.value?.billing;
    const shipping = shipToDifferentAddress ? customer.value?.shipping : billing;

    try {
      // Build line items from cart with add-ons
      const lineItems: WooOrderLineItemInput[] = [];
      
      if (!cart.value?.contents?.nodes || cart.value.contents.nodes.length === 0) {
        throw new Error('Cart is empty');
      }

      console.log('[Checkout] 📦 Building line items from cart...', cart.value.contents.nodes.length);

      const addonsStore = useCartAddonsStore();
      
      for (const cartItem of cart.value.contents.nodes) {
        // Parse base price from cart item (remove currency formatting)
        const basePrice = parseFloat(
          (cartItem.product.node.rawPrice || cartItem.product.node.price || '0')
            .toString()
            .replace(/[^0-9.-]+/g, '')
        );
        
        console.log('[Checkout] 💰 Base price for', cartItem.product.node.name, ':', basePrice);
        
        // Calculate total with add-ons
        let addonsPrice = 0;
        let addonsMeta: any[] = [];
        
        // Get add-ons from store (Store API doesn't return them in cart)
        const storedAddons = addonsStore.getItemAddons(cartItem.key);
        if (storedAddons && storedAddons.length > 0) {
          console.log('[Checkout] 🎁 Adding add-ons from store to line item:', storedAddons.length);
          addonsPrice = storedAddons.reduce((sum, addon) => sum + (addon.price || 0), 0);
          addonsMeta = buildOrderLineItemMeta(storedAddons);
          
          console.log('[Checkout] 💵 Add-ons breakdown:', storedAddons.map(a => ({
            name: a.fieldName,
            price: a.price,
          })));
        }
        // Fallback: try to get from extraData if present
        else if (cartItem.extraData && cartItem.extraData.length > 0) {
          const cartAddons = parseAddonsFromExtraData(cartItem.extraData);
          
          if (cartAddons.length > 0) {
            console.log('[Checkout] 🎁 Adding add-ons from extraData to line item:', cartAddons.length);
            addonsPrice = cartAddons.reduce((sum, addon) => sum + (addon.price || 0), 0);
            addonsMeta = buildOrderLineItemMeta(cartAddons);
          }
        }
        
        // Calculate line item total: base price + addons price
        const lineTotal = basePrice + addonsPrice;
        
        console.log('[Checkout] 🧮 Line item total calculation:', {
          basePrice,
          addonsPrice,
          lineTotal,
          quantity: cartItem.quantity,
        });
        
        const lineItem: WooOrderLineItemInput = {
          product_id: cartItem.product.node.databaseId,
          quantity: cartItem.quantity,
          subtotal: lineTotal.toString(),
          total: lineTotal.toString(),
        };

        // Add variation ID if variable product
        if (cartItem.variation) {
          lineItem.variation_id = cartItem.variation.node.databaseId;
        }
        
        // Add meta_data if we have addons
        if (addonsMeta.length > 0) {
          lineItem.meta_data = addonsMeta;
        }

        lineItems.push(lineItem);
      }

      console.log('[Checkout] ✅ Line items built:', lineItems.length);

      // Build order payload
      const orderPayload: WooOrderCreateInput = {
        payment_method: orderInput.value.paymentMethod?.id || 'cod',
        payment_method_title: orderInput.value.paymentMethod?.title || 'Request Quote',
        set_paid: isPaid, // For RFQ system, this is false
        billing: {
          first_name: billing?.firstName || '',
          last_name: billing?.lastName || '',
          company: billing?.company || '',
          address_1: billing?.address1 || '',
          address_2: billing?.address2 || '',
          city: billing?.city || '',
          state: billing?.state || '',
          postcode: billing?.postcode || '',
          country: billing?.country || '',
          email: billing?.email || '',
          phone: billing?.phone || '',
        },
        line_items: lineItems,
        customer_note: orderInput.value.customerNote || '',
        status: 'pending', // Order status for RFQ
        meta_data: orderInput.value.metaData || [],
      };

      // Add shipping address if different
      if (shipToDifferentAddress && shipping) {
        orderPayload.shipping = {
          first_name: shipping?.firstName || '',
          last_name: shipping?.lastName || '',
          company: shipping?.company || '',
          address_1: shipping?.address1 || '',
          address_2: shipping?.address2 || '',
          city: shipping?.city || '',
          state: shipping?.state || '',
          postcode: shipping?.postcode || '',
          country: shipping?.country || '',
          phone: shipping?.phone || '',
        };
      }

      // Add shipping method if selected
      if (cart.value.chosenShippingMethods && cart.value.chosenShippingMethods.length > 0) {
        orderPayload.shipping_lines = [{
          method_id: cart.value.chosenShippingMethods[0],
          method_title: cart.value.chosenShippingMethods[0],
        }];
      }

      // Add customer ID if logged in
      if (viewer.value?.databaseId) {
        orderPayload.customer_id = viewer.value.databaseId;
        console.log('[Checkout] 👤 Adding customer ID to order:', viewer.value.databaseId);
      } else if (viewer.value?.id) {
        orderPayload.customer_id = viewer.value.id;
        console.log('[Checkout] 👤 Adding customer ID to order:', viewer.value.id);
      }

      console.log('[Checkout] 📝 Creating order via REST API...');

      // Create order via REST API
      const order = await ordersService.create(orderPayload);

      console.log('[Checkout] ✅ Order created:', order.id, order.order_key);

      // Handle account creation if requested
      if (orderInput.value.createAccount && username && password) {
        console.log('[Checkout] 👤 Creating customer account...');
        try {
          // Note: Account creation would need a separate endpoint or be handled differently
          // For now, we skip it - the order is created as guest
          // await loginUser({ username, password });
        } catch (e) {
          console.warn('[Checkout] ⚠️ Account creation failed (order still created):', e);
        }
      }

      const orderId = order.id;
      const orderKey = order.order_key;

      // Empty cart after successful order
      console.log('[Checkout] 🧹 Emptying cart...');
      await emptyCart();
      await refreshCart();

      // Redirect to order confirmation
      console.log('[Checkout] ✅ Checkout complete! Redirecting...');
      router.push(`/checkout/order-received/${orderId}/?key=${orderKey}`);

      return order;
      
    } catch (error: any) {
      isProcessingOrder.value = false;
      console.error('[Checkout] ❌ Checkout error:', error);

      const errorMessage = error?.message || error?.data?.message || 'Failed to process checkout';

      if (errorMessage.includes('An account is already registered with your email address')) {
        alert('An account is already registered with your email address');
        return null;
      }

      alert(`Checkout Error: ${errorMessage}`);
      return null;
    }

    isProcessingOrder.value = false;
  };

  return {
    orderInput,
    isProcessingOrder,
    proccessCheckout,
    updateShippingLocation,
  };
}
