/**
 * App configuration.
 * This file is used to configure the app settings.
 * Below are the default values.
 */
export default defineAppConfig({
  siteName: 'Vincor Ltd.',
  shortDescription: 'Earth Station Antenna Services and Satcom Product Sales',
  description: `Earth Station Antenna Services and Satcom Product Sales`,
  baseUrl: 'https://vincor.com',
  siteImage: 'https://files.vincor.com/vincor_logo.png',
  storeSettings: {
    autoOpenCart: false,
    showReviews: true,
    showFilters: true,
    showOrderByDropdown: true,
    showSKU: true,
    showRelatedProducts: true,
    showProductCategoriesOnSingleProduct: true,
    showBreadcrumbOnSingleProduct: true,
    showMoveToWishlist: true,
    hideBillingAddressForVirtualProducts: false,
    initStoreOnUserActionToReduceServerLoad: true,
    saleBadge: 'percent', // 'percent', 'onSale' or 'hidden'
  },
});
