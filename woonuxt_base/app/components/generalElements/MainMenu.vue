<template>
  <nav>
    <NuxtLink to="/" class="hover:text-blue-200">{{ $t('messages.general.home') }}</NuxtLink>
    <NuxtLink to="/products" class="hover:text-blue-200">{{ $t('messages.general.allProducts') }}</NuxtLink>
    <NuxtLink to="/contact" class="hover:text-blue-200">{{ $t('messages.general.contact') }}</NuxtLink>
    <NuxtLink to="/about-us" class="hover:text-blue-200">About Us</NuxtLink>
    <NuxtLink to="/field-service" class="hover:text-blue-200">Field Service</NuxtLink>

    <NuxtLink class="lg:hidden" to="/wishlist" :prefetch="false">Wishlist</NuxtLink>
    <NuxtLink class="lg:hidden" to="/my-account" :prefetch="false">My Account</NuxtLink>
  </nav>
</template>
