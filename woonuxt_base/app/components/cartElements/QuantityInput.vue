<script setup lang="ts">
const { updateItemQuantity, isUpdatingCart, cart } = useCart();
const { debounce } = useHelpers();

const props = defineProps({
  item: { type: Object, required: true }
});

const quantity = ref(props.item.quantity);
const productType = computed(() => (props.item.variation ? props.item.variation?.node : props.item.product?.node));
const hasNoMoreStock = computed(() => (productType.value.stockQuantity ? productType.value.stockQuantity <= quantity.value : false));

// Increment/Decrement functions
const incrementQuantity = () => {
  if (!hasNoMoreStock.value) {
    quantity.value++;
  }
};

const decrementQuantity = () => {
  if (quantity.value > 0) {
    quantity.value--;
  }
};

// Calculate total with addons
const calculateTotalWithAddons = (qty) => {
  const basePrice = parseFloat(productType.value.rawRegularPrice || productType.value.rawSalePrice || 0);
  let addonTotal = 0;
  
  try {
    const extraData = JSON.parse(JSON.stringify(props.item.extraData));
    const addons = JSON.parse(extraData ? extraData.find(el => el.key === 'addons')?.value || '[]' : '[]');
    addonTotal = addons.reduce((sum, addon) => sum + (parseFloat(addon.price) || 0), 0);
  } catch (e) {
    console.error('Error parsing addons:', e);
  }
  
  return (basePrice + addonTotal) * qty;
};

const onFocusOut = () => {
  if (quantity.value === "") {
    const cartItem = cart.value?.contents?.nodes?.find(node => node.key === props.item.key);
    if (cartItem) {
      quantity.value = cartItem.quantity;
    }
  }
};

watch(
  quantity,
  debounce(async () => {
    if (quantity.value !== "") {
      await updateItemQuantity(props.item.key, quantity.value);
    }
  }, 250),
);
</script>

<template>
  <div class="flex rounded bg-white text-sm leading-none shadow-sm shadow-gray-200 isolate">
    <button
      title="Decrease Quantity"
      aria-label="Decrease Quantity"
      @click="decrementQuantity"
      type="button"
      class="focus:outline-none border-r w-6 h-6 border rounded-l border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed"
      :disabled="isUpdatingCart || quantity <= 0">
      <Icon name="ion:remove" size="14" />
    </button>
    <input
      v-model.number="quantity"
      type="number"
      min="0"
      :max="productType.stockQuantity"
      aria-label="Quantity"
      @focusout="onFocusOut"
      class="flex items-center justify-center w-8 px-2 text-right text-xs focus:outline-none border-y border-gray-300" />
    <button
      title="Increase Quantity"
      aria-label="Increase Quantity"
      @click="incrementQuantity"
      type="button"
      class="focus:outline-none border-l w-6 h-6 border rounded-r hover:bg-gray-50 border-gray-300 disabled:cursor-not-allowed disabled:bg-gray-100"
      :disabled="isUpdatingCart || hasNoMoreStock">
      <Icon name="ion:add" size="14" />
    </button>
  </div>
</template>

<style scoped lang="postcss">
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
