import { createResolver } from '@nuxt/kit';
const { resolve } = createResolver(import.meta.url);

export default defineNuxtConfig({
  compatibilityDate: '2025-11-06',
  future: {
    compatibilityVersion: 4,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      link: [{ rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }],
    },
    pageTransition: { name: 'page', mode: 'default' },
  },

  experimental: {
    sharedPrerenderData: true,
  },

  // Runtime configuration for WooCommerce REST API
  runtimeConfig: {
    // Private keys (server-side only)
    wooConsumerKey: process.env.WOO_REST_API_CONS_KEY || '',
    wooConsumerSecret: process.env.WOO_REST_API_CONS_SEC || '',
    
    // Public keys (exposed to client)
    public: {
      wooApiUrl: process.env.WOO_API_URL || 'https://satchart.com/wp-json',
      wooStoreApiUrl: process.env.WOO_STORE_API_URL || 'https://satchart.com/wp-json/wc/store/v1',
      wooRestApiUrl: process.env.WOO_REST_API_URL || 'https://satchart.com/wp-json/wc/v3',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://vincor.com',
    },
  },

  plugins: [resolve('./app/plugins/init.ts')],

  components: [{ path: resolve('./app/components'), pathPrefix: false }],

  devServer: {
    host: 'localhost',
    port: 3000
  },

  // Vite configuration
  vite: {
    optimizeDeps: {
      include: ['@tato30/vue-pdf'],
      esbuildOptions: {
        supported: {
          'top-level-await': true,
        },
      },
    },
    esbuild: {
      supported: {
        'top-level-await': true,
      },
    },
  },

  modules: ['@pinia/nuxt', 'woonuxt-settings', '@nuxtjs/tailwindcss', '@nuxt/icon', 
    
    '@nuxt/image', '@nuxtjs/i18n', '@nuxtjs/sitemap'],

  // Configure @nuxt/icon to use SVG mode for production compatibility
  icon: {
    mode: 'svg', // Use SVG mode instead of CSS mode for better production support
    provider: 'server', // Use server-side rendering for icons
  },

  // Configure Pinia stores directory
  pinia: {
    storesDirs: ['./app/stores'],
  },

  image: {
    // provider: "netlify",
    domains: ["satchart.com"],
    quality: 80,
    format: ['webp', 'jpg'],
  },


  alias: {
    '#constants': resolve('./app/constants'),
    '#services': resolve('./app/services'),
  },

  hooks: {
    'pages:extend'(pages) {
      const addPage = (name: string, path: string, file: string) => {
        pages.push({ name, path, file: resolve(`./app/pages/${file}`) });
      };

      addPage('product-page-pager', '/products/page/:pageNumber', 'products.vue');
      addPage('product-category-page', '/product-category/:categorySlug', 'product-category/[slug].vue');
      addPage('product-category-page-pager', '/product-category/:categorySlug/page/:pageNumber', 'product-category/[slug].vue');
      addPage('order-received', '/checkout/order-received/:orderId', 'order-summary.vue');
      addPage('order-summary', '/order-summary/:orderId', 'order-summary.vue');
    },
  },

  nitro: {
    preset: 'netlify_edge',
    routeRules: {
      '/': { prerender: true },
      '/about-us': { prerender: true },
      '/contact': { prerender: true },
      '/field-service': { prerender: true },
      // Use ISR (Incremental Static Regeneration) with short revalidation
      // This ensures content updates within 5 minutes while still being fast
      // ISR generates pages on-demand and caches them, but revalidates more frequently
      // NOTE: In development, ISR can interfere with SSR hydration, so we disable it
      '/products': process.dev ? { ssr: true } : { isr: 300 },                     // SSR in dev, ISR in prod
      '/products/**': process.dev ? { ssr: true } : { isr: 300 },                  // SSR in dev, ISR in prod
      '/product/**': process.dev ? { ssr: true } : { isr: 300 },                  // SSR in dev, ISR in prod
      '/product-category/**': process.dev ? { ssr: true } : { isr: 300 },          // SSR in dev, ISR in prod
      '/categories': process.dev ? { ssr: true } : { isr: 300 },                  // SSR in dev, ISR in prod
      '/checkout/order-received/**': { ssr: false },
      '/order-summary/**': { ssr: false },
      // API routes should NOT be prerendered - they are serverless functions
      // CRITICAL: Set headers to prevent Netlify/CDN caching
      '/api/**': { 
        cors: true, 
        index: false,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, private',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      },
      // Specific rules for datasheet endpoint - must never be cached
      '/api/products/**/datasheet': {
        cors: true,
        index: false,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, private',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Content-Type-Options': 'nosniff',
        }
      },
      '/api/sitemap-urls': { cors: true, index: false },
      '/api/categories': { cors: true, index: false },
    },
    prerender: {
      // Don't crawl links to prevent prerendering all products during build
      crawlLinks: false,
      // Only prerender essential static pages
      routes: ['/', '/about-us', '/contact', '/field-service'],
      // Don't fail build on 404s
      failOnError: false,
      // Exclude dynamic routes and APIs
      ignore: ['/api/**', '/product/**', '/product-category/**', '/products/**']
    }
  },

  // Multilingual support
  i18n: {
    locales: [
      { code: 'en_US', file: 'en-US.json', name: 'English 🇺🇸' },
      { code: 'de_DE', file: 'de-DE.json', name: 'Deutsch 🇩🇪' },
      { code: 'es_ES', file: 'es-ES.json', name: 'Español 🇪🇸' },
      { code: 'fr_FR', file: 'fr-FR.json', name: 'Français 🇫🇷' },
      { code: 'it_IT', file: 'it-IT.json', name: 'Italiano 🇮🇹' },
      { code: 'pt_BR', file: 'pt-BR.json', name: 'Português 🇧🇷' },
    ],
    langDir: resolve('./app/locales'),
    defaultLocale: 'en_US',
    strategy: 'no_prefix',
  },
});
