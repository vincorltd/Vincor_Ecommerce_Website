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
    preset: 'netlify_edge',
    prerender: {
      concurrency: 10,
      interval: 1000,
      failOnError: false,
      // API routes are excluded - they will be deployed as Netlify Functions
      ignore: ['/api/**']
    },
    routeRules: {
      '/wp-admin/': { redirect: 'https://satchart.com/wp-admin/' },
      // API routes should NOT be prerendered - they are serverless functions
      '/api/**': { cors: true, index: false, headers: { 'Cache-Control': 's-maxage=0' } },
      '/api/sitemap-urls': { cors: true, index: false },
    },
  },

  devtools: {
    enabled: true,
  },

  devServer: {
    host: 'localhost',
    port: 3000
  },

  modules: ['@nuxtjs/sitemap', '@nuxtjs/robots', 'nuxt-gtag'],

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