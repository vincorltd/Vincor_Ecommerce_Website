<script setup lang="ts">
const cookieConsent = useCookie('cookie-consent', {
  maxAge: 60 * 60 * 24 * 365, // 1 year
  path: '/',
  sameSite: 'lax'
})

const showBanner = ref(false)

// Only check cookie value on client side to avoid hydration mismatch
onMounted(() => {
  showBanner.value = !cookieConsent.value
  console.log('Cookie consent status:', cookieConsent.value, 'Show banner:', showBanner.value)
})

const { grantConsent, denyConsent } = useAnalyticsConsent()

const accept = () => {
  try {
    cookieConsent.value = 'accepted'
    showBanner.value = false
    grantConsent()
    console.log('Cookie consent accepted, cookie value:', cookieConsent.value)
  } catch (error) {
    console.error('Error accepting cookies:', error)
  }
}

const decline = () => {
  try {
    cookieConsent.value = 'declined'
    showBanner.value = false
    denyConsent()
    console.log('Cookie consent declined, cookie value:', cookieConsent.value)
  } catch (error) {
    console.error('Error declining cookies:', error)
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-full opacity-0"
  >
    <div
      v-if="showBanner"
      class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700 z-50"
    >
      <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 md:py-6">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            <p>
              We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
              By clicking "Accept", you consent to our use of cookies.
              <a
                href="/privacy-policy"
                class="underline hover:text-primary-600 dark:hover:text-primary-400"
              >
                Learn more about our privacy policy
              </a>
            </p>
          </div>
          <div class="flex gap-4 shrink-0">
            <button
              @click="decline"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Decline
            </button>
            <button
              @click="accept"
              class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>