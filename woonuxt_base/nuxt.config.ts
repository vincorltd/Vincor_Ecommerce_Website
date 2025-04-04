import { createResolver } from '@nuxt/kit';
const { resolve } = createResolver(import.meta.url);

export default defineNuxtConfig({
  compatibilityDate: '2024-07-09',
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

  plugins: [resolve('./app/plugins/init.ts')],

  components: [{ path: resolve('./app/components'), pathPrefix: false }],

  modules: ['woonuxt-settings', 'nuxt-graphql-client', '@nuxtjs/tailwindcss', '@nuxt/icon', 
    
    '@nuxt/image', '@nuxtjs/i18n', '@nuxtjs/sitemap'],

  'graphql-client': {
    clients: {
      default: {
        host: process.env.GQL_HOST || 'https://satchart.com/graphql',
        corsOptions: { 
          mode: 'cors', 
          credentials: 'include'
        },
        headers: () => {
          const hostname = process.client ? window.location.hostname : 
            process.env.NETLIFY_URL || 'vincor.com';
          
          console.log('Debug - GraphQL Client Config:', {
            hostname,
            gqlHost: process.env.GQL_HOST,
            netlifyUrl: process.env.NETLIFY_URL,
            nodeEnv: process.env.NODE_ENV,
            origin: `https://${hostname}`
          });
          
          return {
            'Origin': `https://${hostname}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Debug-Environment': process.env.NODE_ENV || 'unknown',
            'X-Host-Name': hostname,
            'Referer': `https://${hostname}`
          };
        },
        onRequest: (config) => {
          console.log('Debug - GraphQL Request:', {
            url: config.url,
            method: config.method,
            headers: config.headers,
            body: config.body
          });
        },
        onRequestError: (error) => {
          console.error('Debug - GraphQL Request Error:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            headers: error.response?.headers,
            data: error.response?.data
          });
        }
      },
    },
  },

  image: {
    // provider: "netlify",

    domains: ["satchart.com"],
  },


  alias: {
    '#constants': resolve('./app/constants'),
    '#woo': '../.nuxt/gql/default',
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
    routeRules: {
      '/': { prerender: true },
      '/products/**': { swr: 3600 },
      '/checkout/order-received/**': { ssr: false },
      '/order-summary/**': { ssr: false },
      '/api/sitemap-urls': { cors: true },
      '/api/categories': { swr: true },
    },
    prerender: {
      routes: ['/api/categories']
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
    langDir: 'locales',
    defaultLocale: 'en_US',
    strategy: 'no_prefix',
  },
});
