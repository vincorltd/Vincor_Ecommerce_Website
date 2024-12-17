import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const graphqlEndpoint = config.public.graphqlEndpoint || 'https://satchart.com/graphql'
  
  const staticUrls = [
    {
      loc: '/',
      lastmod: new Date().toISOString(),
      changefreq: 'daily',
      priority: 1.0
    },
    {
      loc: '/about-us',
      changefreq: 'monthly',
      priority: 0.8
    },
    {
      loc: '/contact',
      changefreq: 'monthly',
      priority: 0.8
    },
    {
      loc: '/field-service',
      changefreq: 'weekly',
      priority: 0.8
    },
    {
      loc: '/my-account',
      changefreq: 'monthly', 
      priority: 0.8
    }
  ]

  try {
    const productsQuery = `
      query getProducts {
        products(
          first: 9999
          where: { typeNotIn: EXTERNAL, visibility: VISIBLE, minPrice: 0, orderby: { field: DATE, order: DESC }, status: "publish" }
        ) {
          nodes {
            ... on Product {
              slug
              modified
            }
            ... on SimpleProduct {
              slug
              modified
            }
            ... on VariableProduct {
              slug
              modified
            }
          }
        }
      }
    `

    const categoriesQuery = `
      query getProductCategories {
        productCategories(
          first: 100
          where: { orderby: COUNT, order: DESC, hideEmpty: true }
        ) {
          edges {
            node {
              slug
              count
            }
          }
        }
      }
    `

    const productsResponse = await $fetch(graphqlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { query: productsQuery }
    })

    const categoriesResponse = await $fetch(graphqlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { query: categoriesQuery }
    })

    const products = productsResponse?.data?.products?.nodes || []
    const categories = categoriesResponse?.data?.productCategories?.edges?.map(edge => edge.node) || []

    console.log(`Found ${products.length} products and ${categories.length} categories`)

    const productUrls = products
      .filter(product => product.slug)
      .map(product => ({
        loc: `/product/${product.slug}`,
        lastmod: product.modified || new Date().toISOString(),
        changefreq: 'weekly',
        priority: 0.6
      }))

    const categoryUrls = categories
      .filter(category => category.slug && category.count > 0)
      .map(category => ({
        loc: `/product-category/${category.slug}`,
        changefreq: 'weekly',
        priority: 0.7
      }))

    const allUrls = [...staticUrls, ...productUrls, ...categoryUrls]
    console.log(`Generated URLs breakdown:`)
    console.log(`- Static URLs: ${staticUrls.length}`)
    console.log(`- Product URLs: ${productUrls.length}`)
    console.log(`- Category URLs: ${categoryUrls.length}`)
    console.log(`Total URLs: ${allUrls.length}`)
    
    return allUrls
  } catch (error) {
    console.error('Error generating sitemap:', error.message)
    return staticUrls
  }
})