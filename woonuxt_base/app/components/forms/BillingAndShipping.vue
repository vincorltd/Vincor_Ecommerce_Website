<template>
  <form class="bg-white rounded-lg shadow" @submit.prevent="saveChanges">
    <div class="grid p-8 gap-6 md:grid-cols-2">
      <h3 class="font-semibold text-xl col-span-full">{{ $t('messages.billing.billingDetails') }}</h3>

      <div class="w-full">
        <label for="billing-first-name">{{ $t('messages.billing.firstName') }}</label>
        <input id="billing-first-name" v-model="customer.billing.firstName" placeholder="John" autocomplete="given-name" type="text" required />
      </div>

      <div class="w-full">
        <label for="billing-last-name">{{ $t('messages.billing.lastName') }}</label>
        <input id="billing-last-name" v-model="customer.billing.lastName" placeholder="Doe" autocomplete="family-name" type="text" required />
      </div>

      <div class="w-full">
        <label for="billing-phone">{{ $t('messages.billing.phone') }}</label>
        <input id="billing-phone" v-model="customer.billing.phone" placeholder="+1 234 567 8901" autocomplete="tel" type="tel" />
      </div>

      <div class="w-full">
        <label for="billing-company">Company ({{ $t('messages.general.optional') }})</label>
        <input id="billing-company" v-model="customer.billing.company" placeholder="Company Name" autocomplete="organization" type="text" />
      </div>

      <div class="w-full">
        <label for="billing-address">{{ $t('messages.billing.address1') }}</label>
        <input id="billing-address" v-model="customer.billing.address1" placeholder="123 Main St" autocomplete="address-line1" type="text" />
      </div>

      <div class="w-full">
        <label for="billing-address-2">{{ $t('messages.billing.address2') }} ({{ $t('messages.general.optional') }})</label>
        <input id="billing-address-2" v-model="customer.billing.address2" placeholder="Apartment, studio, or floor" autocomplete="address-line2" type="text" />
      </div>

      <div class="w-full">
        <label for="billing-city">{{ $t('messages.billing.city') }}</label>
        <input id="billing-city" v-model="customer.billing.city" placeholder="New York" autocomplete="address-level2" type="text" />
      </div>

      <div class="w-full">
        <label for="billing-state">{{ $t('messages.billing.state') }} ({{ $t('messages.general.optional') }})</label>
        <StateSelect id="billing-state" v-model="customer.billing.state" :default-value="customer.billing.state" :country-code="customer.billing.country" />
      </div>

      <div class="w-full">
        <label for="billing-country">{{ $t('messages.billing.country') }}</label>
        <CountrySelect id="billing-country" v-model="customer.billing.country" :default-value="customer.billing.country" />
      </div>

      <div class="w-full">
        <label for="billing-zip">{{ $t('messages.billing.zip') }}</label>
        <input id="billing-zip" v-model="customer.billing.postcode" placeholder="10001" autocomplete="postal-code" type="text" />
      </div>

      <div class="w-full col-span-full">
        <label for="billing-email">{{ $t('messages.billing.email') }}</label>
        <input id="billing-email" v-model="customer.billing.email" placeholder="johndoe@email.com" autocomplete="email" type="email" required />
      </div>
    </div>

    <div class="bg-white backdrop-blur-sm bg-opacity-75 border-t col-span-full p-4 sticky bottom-0 rounded-b-lg">
      <button
        class="rounded-md flex font-semibold ml-auto text-white py-2 px-4 gap-4 items-center disabled:bg-gray-400 disabled:cursor-not-allowed"
        :class="button.color"
        :disabled="loading">
        <LoadingIcon v-if="loading" color="#fff" size="20" />
        <span>{{ button.text }}</span>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { authService } from '#services/woocommerce/auth.service';

const { viewer, customer } = useAuth();
const { t } = useI18n();

const loading = ref<boolean>(false);
const button = ref<{ text: string; color: string }>({ text: t('messages.account.updateDetails'), color: 'bg-primary hover:bg-primary-dark' });

async function saveChanges(): Promise<void> {
  loading.value = true;
  button.value.text = t('messages.account.updating');
  
  const billing = customer.value.billing;

  try {
    const response = await authService.updateCustomerData({
      billing: {
        first_name: billing.firstName,
        last_name: billing.lastName,
        company: billing.company,
        address_1: billing.address1,
        address_2: billing.address2,
        city: billing.city,
        state: billing.state,
        postcode: billing.postcode,
        country: billing.country,
        email: billing.email,
        phone: billing.phone,
      },
    });
    
    if (response.success) {
      button.value = { text: t('messages.account.updateSuccess'), color: 'bg-green-500' };
      // Update local customer state
      if (response.customer) {
        customer.value.billing = {
          ...customer.value.billing,
          ...billing,
        };
      }
    } else {
      button.value = { text: t('messages.account.failed'), color: 'bg-red-500' };
    }
  } catch (error) {
    console.error('[BillingDetails] Update failed:', error);
    button.value = { text: t('messages.account.failed'), color: 'bg-red-500' };
  }

  loading.value = false;

  setTimeout(() => {
    button.value = { text: t('messages.account.updateDetails'), color: 'bg-primary hover:bg-primary-dark' };
  }, 2000);
}
</script>
