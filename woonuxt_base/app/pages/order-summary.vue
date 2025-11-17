<script setup lang="ts">
import { OrderStatusEnum } from '#woo';
import { ordersService } from '~/services/woocommerce/orders.service';

const { query, params, name } = useRoute();
const { customer } = useAuth();
const { formatDate, formatPrice } = useHelpers();
const { t } = useI18n();

const order = ref<Order | null>(null);
const fetchDelay = ref<boolean>(query.fetch_delay === 'true');
const delayLength = 2500;
const isLoaded = ref<boolean>(false);
const errorMessage = ref('');

const isGuest = computed(() => !customer.value?.email);
const isSummaryPage = computed<boolean>(() => name === 'order-summary');
const isCheckoutPage = computed<boolean>(() => name === 'order-received');
const orderIsNotCompleted = computed<boolean>(() => order.value?.status !== OrderStatusEnum.COMPLETED);
const hasDiscount = computed<boolean>(() => !!parseFloat(order.value?.rawDiscountTotal || '0'));
const downloadableItems = computed(() => order.value?.downloadableItems?.nodes || []);

onBeforeMount(() => {
  /**
   * This is to close the child PayPal window we open on the checkout page.
   * It will fire off an event that redirects the parent window to the order summary page.
   */
  if (isCheckoutPage.value && (query.cancel_order || query.from_paypal || query.PayerID)) window.close();
});

onMounted(async () => {
  await getOrder();
  /**
   * WooCommerce sometimes takes a while to update the order status.
   * This is a workaround to fetch the order again after a delay.
   * The length of the delay might need to be adjusted depending on your server.
   */

  if (isCheckoutPage.value && fetchDelay.value && orderIsNotCompleted.value) {
    setTimeout(() => {
      getOrder();
    }, delayLength);
  }
});

async function getOrder() {
  try {
    console.log('[Order Summary] 🔍 Fetching order:', params.orderId);
    console.log('[Order Summary] 🔑 Order key from URL:', query.key);
    
    // Use REST API instead of GraphQL
    const orderId = parseInt(params.orderId as string);
    const orderKey = query.key as string | undefined;
    
    const restOrder = await ordersService.getById(orderId, orderKey);
    
    if (restOrder) {
      console.log('[Order Summary] ✅ Order fetched:', restOrder.id);
      
      // Transform REST API response to GraphQL structure
      order.value = transformOrderToGraphQL(restOrder);
    } else {
      errorMessage.value = 'Could not find order';
    }
  } catch (err: any) {
    console.error('[Order Summary] ❌ Error fetching order:', err);
    errorMessage.value = err?.message || err?.data?.message || 'Could not find order';
  }
  isLoaded.value = true;
}

// Transform REST API order to GraphQL structure for compatibility
function transformOrderToGraphQL(restOrder: any): Order {
  console.log('[Order Summary] 🔄 Transforming order:', {
    orderId: restOrder.id,
    total: restOrder.total,
    lineItemsCount: restOrder.line_items?.length,
    firstLineItem: restOrder.line_items?.[0],
  });
  
  return {
    databaseId: restOrder.id,
    orderKey: restOrder.order_key,
    orderNumber: restOrder.number,
    status: restOrder.status?.toUpperCase() || 'PENDING',
    date: restOrder.date_created,
    paymentMethodTitle: restOrder.payment_method_title,
    subtotal: formatPrice(parseFloat(restOrder.total) - parseFloat(restOrder.total_tax || '0')),
    total: formatPrice(parseFloat(restOrder.total)),
    totalTax: formatPrice(parseFloat(restOrder.total_tax || '0')),
    shippingTotal: formatPrice(parseFloat(restOrder.shipping_total || '0')),
    discountTotal: formatPrice(parseFloat(restOrder.discount_total || '0')),
    rawDiscountTotal: restOrder.discount_total || '0',
    lineItems: {
      nodes: (restOrder.line_items || []).map((item: any) => {
        // WooCommerce REST API returns prices as strings
        const itemTotal = item.total || item.subtotal || '0';
        const parsedTotal = parseFloat(itemTotal);
        
        // Extract add-ons from meta_data
        const addonsMetaData = (item.meta_data || []).filter((meta: any) => {
          // Filter out system meta keys (those starting with _)
          return meta.key && !meta.key.startsWith('_');
        });
        
        console.log('[Order Summary] 📦 Line item:', {
          name: item.name,
          total: item.total,
          subtotal: item.subtotal,
          parsedTotal,
          formatted: formatPrice(parsedTotal),
          metaDataCount: addonsMetaData.length,
          metaData: addonsMetaData,
        });
        
        // Convert meta_data to extraData format for compatibility with cart components
        const extraData = addonsMetaData.length > 0 ? [{
          key: 'addons',
          value: JSON.stringify(addonsMetaData.map((meta: any) => {
            // Extract price from display_value like "HALF HEAT (+$4,556.00)" or "HALF HEAT (+$4556.00)"
            let price = 0;
            
            if (meta.display_value) {
              const priceMatch = meta.display_value.match(/\(\+\$([0-9,.]+)\)/);
              if (priceMatch) {
                // Ensure we parse as number, removing commas and currency symbols
                const priceStr = priceMatch[1].replace(/,/g, '');
                price = parseFloat(priceStr) || 0;
                console.log('[Order Summary] 💰 Extracted price from display_value:', {
                  displayValue: meta.display_value,
                  extracted: priceMatch[1],
                  cleaned: priceStr,
                  parsed: price,
                });
              } else {
                console.log('[Order Summary] ⚠️ No price in display_value:', meta.display_value);
              }
            }
            
            // Fallback: check if price is in meta.value or meta itself
            if (!price && meta.price) {
              // Ensure price is converted to number, handling string prices
              const priceValue = typeof meta.price === 'string' 
                ? parseFloat(meta.price.replace(/[^0-9.-]+/g, '')) || 0
                : parseFloat(meta.price) || 0;
              price = priceValue;
              console.log('[Order Summary] 💰 Using meta.price:', {
                original: meta.price,
                parsed: price,
              });
            }
            
            // Final validation - ensure it's a valid number
            if (typeof price !== 'number' || isNaN(price)) {
              console.warn('[Order Summary] ⚠️ Price is invalid for addon:', meta);
              price = 0;
            }
            
            return {
              fieldName: meta.display_key || meta.key,
              value: meta.display_value || meta.value,
              price: price,
              label: meta.display_key || meta.key,
            };
          })),
        }] : [];
        
        return {
          id: item.id,
          productId: item.product_id,
          variationId: item.variation_id || null,
          quantity: item.quantity,
          total: formatPrice(parsedTotal),
          extraData: extraData,
          product: {
            node: {
              databaseId: item.product_id,
              name: item.name,
              slug: item.sku?.toLowerCase() || '',
              image: {
                sourceUrl: item.image?.src || '/images/placeholder.png',
                altText: item.name,
                title: item.name,
              },
            },
          },
          variation: item.variation_id ? {
            node: {
              databaseId: item.variation_id,
              name: item.name,
              image: {
                sourceUrl: item.image?.src || '/images/placeholder.png',
                altText: item.name,
                title: item.name,
              },
            },
          } : null,
        };
      }),
    },
    downloadableItems: {
      nodes: [], // Would need separate endpoint for downloadable items
    },
  } as Order;
}

const refreshOrder = async () => {
  isLoaded.value = false;
  await getOrder();
};

// Helper function to parse add-ons from extraData JSON string
function parseAddons(addonsJson: string): any[] {
  try {
    return JSON.parse(addonsJson);
  } catch (e) {
    console.error('[Order Summary] Failed to parse addons:', e);
    return [];
  }
}

// Helper to get clean addon value (removes price if it's in the value string)
function getAddonValue(value: string): string {
  if (!value) return '';
  // Remove price from value if it's there (e.g., "HALF HEAT (+$4556.00)" -> "HALF HEAT")
  return value.replace(/\s*\(\+\$[0-9,.]+\)\s*$/, '').replace(/\s*\(Included\)\s*$/, '');
}

// Helper to format addon price with validation
function formatAddonPrice(price: number): string {
  if (typeof price !== 'number' || isNaN(price)) {
    return '0.00';
  }
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

useSeoMeta({
  title() {
    return isSummaryPage.value ? t('messages.shop.orderSummary') : t('messages.shop.orderReceived');
  },
});
</script>

<template>
  <div
    class="w-full min-h-[600px] flex items-center p-4 text-gray-800 md:bg-white md:rounded-xl md:mx-auto md:shadow-lg md:my-24 md:mt-8 md:max-w-3xl md:p-16 flex-col">
    <LoadingIcon v-if="!isLoaded" class="flex-1" />
    <template v-else>
      <div v-if="order" class="w-full">
        <template v-if="isSummaryPage">
          <div class="flex items-center gap-4">
            <NuxtLink
              to="/my-account?tab=orders"
              class="inline-flex items-center justify-center p-2 border rounded-md"
              title="Back to orders"
              aria-label="Back to orders">
              <Icon name="ion:chevron-back-outline" />
            </NuxtLink>
            <h1 class="text-xl font-semibold">{{ $t('messages.shop.orderSummary') }}</h1>
          </div>
        </template>
        <template v-else-if="isCheckoutPage">
          <div class="flex items-center justify-between w-full mb-2">
            <h1 class="text-xl font-semibold">{{ $t('messages.shop.orderReceived') }}</h1>
            <button
              v-if="orderIsNotCompleted"
              type="button"
              class="inline-flex items-center justify-center p-2 bg-white border rounded-md"
              title="Refresh order"
              aria-label="Refresh order"
              @click="refreshOrder">
              <Icon name="ion:refresh-outline" />
            </button>
          </div>
          <p>{{ $t('messages.shop.orderThanks') }}</p>
        </template>
        <hr class="my-8" />
      </div>
      <div v-if="order" class="flex-1 w-full">
        <div class="flex items-start justify-between">
          <div class="w-[21%]">
            <div class="mb-2 text-xs text-gray-400 uppercase">{{ $t('messages.shop.order') }}</div>
            <div class="leading-none">#{{ order.databaseId! }}</div>
          </div>
          <div class="w-[21%]">
            <div class="mb-2 text-xs text-gray-400 uppercase">{{ $t('messages.general.date') }}</div>
            <div class="leading-none">{{ formatDate(order.date) }}</div>
          </div>
          <div class="w-[21%]">
            <div class="mb-2 text-xs text-gray-400 uppercase">{{ $t('messages.general.status') }}</div>
            <OrderStatusLabel v-if="order.status" :order="order" />
          </div>
          <div class="w-[21%]">
            <div class="mb-2 text-xs text-gray-400 uppercase">{{ $t('messages.general.paymentMethod') }}</div>
            <div class="leading-none">{{ order.paymentMethodTitle }}</div>
          </div>
        </div>

        <template v-if="order.lineItems">
          <hr class="my-8" />

          <div class="grid gap-4">
            <div v-for="item in order.lineItems.nodes" :key="item.id" class="border-b pb-4 last:border-b-0">
              <div class="flex items-center justify-between gap-8">
                <NuxtLink v-if="item.product?.node" :to="`/product/${item.product.node.slug}`">
                  <NuxtImg
                    class="w-16 h-16 rounded-xl"
                    :src="item.variation?.node?.image?.sourceUrl || item.product.node?.image?.sourceUrl || '/images/placeholder.png'"
                    :alt="item.variation?.node?.image?.altText || item.product.node?.image?.altText || 'Product image'"
                    :title="item.variation?.node?.image?.title || item.product.node?.image?.title || 'Product image'"
                    width="64"
                    height="64"
                    loading="lazy" />
                </NuxtLink>
                <div class="flex-1 leading-tight">
                  {{ item.variation ? item.variation?.node?.name : item.product?.node.name! }}
                </div>
                <div class="text-sm text-gray-600">Qty. {{ item.quantity }}</div>
                <span class="text-sm font-semibold">{{ formatPrice(item.total!) }}</span>
              </div>
              
              <!-- Add-ons Display -->
              <div v-if="item.extraData && item.extraData.length > 0" class="mt-3 ml-20 space-y-1">
                <template v-for="(extraItem, extraIndex) in item.extraData" :key="extraIndex">
                  <template v-if="extraItem.key === 'addons'">
                    <div v-for="(addon, addonIndex) in parseAddons(extraItem.value)" :key="addonIndex" class="flex justify-between text-sm text-gray-600">
                      <span class="font-medium">{{ addon.label }}:</span>
                      <span>
                        {{ getAddonValue(addon.value) }}
                        <span v-if="addon.price && !isNaN(addon.price) && addon.price > 0" class="text-green-600">
                          (+${{ formatAddonPrice(addon.price) }})
                        </span>
                      </span>
                    </div>
                  </template>
                </template>
              </div>
            </div>
          </div>
        </template>

        <hr class="my-8" />

        <div v-if="downloadableItems.length && !orderIsNotCompleted">
          <DownloadableItems :downloadableItems="downloadableItems" />
          <hr class="my-8" />
        </div>

        <div>
          <div class="flex justify-between">
            <span>{{ $t('messages.shop.subtotal') }}</span>
            <span>{{ order.subtotal }}</span>
          </div>
          <div class="flex justify-between">
            <span>{{ $t('messages.general.tax') }}</span>
            <span>{{ order.totalTax }}</span>
          </div>
          <div class="flex justify-between">
            <span>{{ $t('messages.general.shipping') }}</span>
            <span>{{ order.shippingTotal }}</span>
          </div>
          <div v-if="hasDiscount" class="flex justify-between text-primary">
            <span>{{ $t('messages.shop.discount') }}</span>
            <span>- {{ order.discountTotal }}</span>
          </div>
          <hr class="my-8" />
          <div class="flex justify-between">
            <span class>{{ $t('messages.shop.total') }}</span>
            <span class="font-semibold">{{ order.total }}</span>
          </div>
        </div>
      </div>
      <div v-else-if="errorMessage" class="flex flex-col items-center justify-center flex-1 w-full gap-4 text-center">
        <Icon name="ion:sad-outline" size="96" class="text-gray-700" />
        <h1 class="text-xl font-semibold">Error</h1>
        <div v-if="errorMessage" class="text-sm text-red-500" v-html="errorMessage" />
      </div>
    </template>
  </div>
</template>
