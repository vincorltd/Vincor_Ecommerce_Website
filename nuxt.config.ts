export default defineNuxtConfig({

  // Get all the pages, components, composables and plugins from the parent theme
  extends: ['./woonuxt_base'],

  components: [{ path: './components', pathPrefix: false }],

  /**
   * Depending on your servers capabilities, you may need to adjust the following settings.
   * It will affect the build time but also increase the reliability of the build process.
   * If you have a server with a lot of memory and CPU, you can remove the following settings.
   * @property {number} concurrency - How many pages to prerender at once
   * @property {number} interval - How long to wait between prerendering pages
   * @property {boolean} failOnError - This stops the build from failing but the page will not be statically generated
   */
  nitro: {
    prerender: {
      concurrency: 10,
      interval: 1000,
      failOnError: false,
    },
    routeRules: {
      '/wp-admin/': { redirect: 'https://satchart.com/wp-admin/' },
      '/api/sitemap-urls': { cors: true },
    },
  },

  devtools: {
    enabled: true,
    timeline: {
      enabled: true
    }
  },

  devServer: {
    host: 'localhost',
    port: 3000
  },

  modules: ['@pinia/nuxt', '@nuxtjs/sitemap', '@nuxtjs/robots', 'nuxt-graphql-client', 'nuxt-gtag'],

  // Configure Pinia to find stores in woonuxt_base layer
  pinia: {
    storesDirs: ['./woonuxt_base/app/stores'],
  },

'graphql-client': {
  clients: {
    default: {
      host: process.env.GQL_HOST || 'https://satchart.com/graphql',
      corsOptions: { 
        mode: 'cors', 
        credentials: 'include'
      },
      headers: () => {
        // Get the current hostname from window if available
        const hostname = process.client ? window.location.hostname : 
          process.env.NETLIFY_URL || 'vincor.com';
        
        console.log('Debug - GraphQL Client Hostname:', {
          hostname,
          netlifyUrl: process.env.NETLIFY_URL,
          nodeEnv: process.env.NODE_ENV
        });
        
        return {
          'Origin': `https://${hostname}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Debug-Environment': process.env.NODE_ENV || 'unknown',
          'X-Host-Name': hostname
        };
      },
      onRequest: (config) => {
        console.log('Debug - GraphQL Request:', {
          url: config.url,
          headers: config.headers,
          hostname: process.client ? window.location.hostname : 'server'
        });
      },
      onRequestError: (error) => {
        console.error('Debug - GraphQL Request Error:', {
          message: error.message,
          response: error.response,
          request: error.request
        });
      }
    },
  },
},

  site: {
    url: 'https://vincor.com',
    name: 'Vincor Ltd.'
  },

  // Updated sitemap configuration with proper URL format
  sitemap: {
    sitemaps: {
      main: {
        sources: ['/api/sitemap-urls']
      }
    }
  },

  // Robots.txt configuration
  robots: {
    rules: {
      UserAgent: '*',
      Disallow: [
        '/my-account',
        '/checkout',
        '/cart',
        '/order-summary',
        '/wp-admin'
      ],
      Sitemap: 'https://vincor.com/sitemap.xml'
    }
  },

  // Optional: Add debug logging for development
  // debug: process.env.NODE_ENV === 'development',

  gtag: {
    id: 'G-J531C0D03Y',
    config: {
      page_title: 'Vincor Ltd', // Optional: customize page title
      debug_mode: process.env.NODE_ENV !== 'production' // Optional: enable debug mode in development
    },
    initCommands: [
      ['consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        wait_for_update: 500
      }]
    ]
  },

  // Add Matomo script to head
  app: {
    head: {
      script: [
        {
          children: `
            var _paq = window._paq = window._paq || [];
            _paq.push(['requireConsent']);
            _paq.push(['trackPageView']);
            _paq.push(['enableLinkTracking']);`,
          type: 'text/javascript'
        }
      ]
    }
  }
});
