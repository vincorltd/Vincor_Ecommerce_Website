<script setup lang="ts">
const runtimeConfig = useRuntimeConfig();
const { viewer } = useAuth();

const { link } = defineProps<{ link: string }>();

// Get WordPress base URL from REST API config
const wpBase = computed(() => {
  const wooApiUrl = runtimeConfig?.public?.wooApiUrl;
  if (!wooApiUrl) return null;
  // Remove /wp-json from the end to get the base URL
  return wooApiUrl.replace('/wp-json', '');
});

const formattedLink = computed(() => 
  wpBase.value ? `${wpBase.value}${link}` : null
);

const linkStartsWithWpAdmin = link?.startsWith('/wp-admin') || false;

// Check if user is an administrator
const isAdmin = computed(() => {
  if (!viewer.value?.roles) {
    console.log('[WPAdminLink] No viewer roles found');
    return false;
  }
  const hasAdminRole = viewer.value.roles.includes('administrator');
  console.log('[WPAdminLink] Viewer roles:', viewer.value.roles, 'Is admin:', hasAdminRole);
  return hasAdminRole;
});

// Check if we're in development mode (runtime check)
const isDev = computed(() => {
  // Check if running on localhost or development URLs
  if (process.client) {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.includes('local');
  }
  return false;
});

// Show link if in dev mode OR user is admin
const shouldShowLink = computed(() => {
  const showLink = isDev.value || isAdmin.value;
  console.log('[WPAdminLink] Should show link:', showLink, '(isDev:', isDev.value, 'isAdmin:', isAdmin.value, ')');
  return showLink;
});
</script>

<template>
  <ClientOnly>
    <a
      v-if="shouldShowLink && linkStartsWithWpAdmin && wpBase && link"
      :href="formattedLink"
      target="_blank"
      class="wp-admin-link"
      :title="isDev.value ? 'Edit in WordPress (Dev Mode)' : 'Edit in WordPress (Admin)'">
      <span class="link">
        <slot />
      </span>
      <Icon name="ion:open-outline" size="14" />
    </a>
  </ClientOnly>
</template>

<style scoped lang="postcss">
.wp-admin-link {
  @apply inline-flex items-center bg-yellow-400 leading-tight py-1 px-2 rounded gap-1 text-xs text-yellow-900 border-b border-yellow-500 uppercase transition-all duration-100 ease-in-out;

  &:hover {
    @apply bg-yellow-500 border-yellow-600 border-b;
  }
}
</style>
