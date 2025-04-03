export default defineEventHandler(async (event) => {
  try {
    const query = `
      query getProductCategories($first: Int = 100) {
        productCategories(
          first: $first
          where: { orderby: COUNT, order: DESC, hideEmpty: true }
        ) {
          edges {
            node {
              id
              databaseId
              name
              slug
              count
              parent {
                node {
                  id
                  name
                  slug
                }
              }
              children {
                edges {
                  node {
                    id
                    name
                    slug
                    count
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await $fetch(process.env.GQL_HOST || 'https://satchart.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { first: 100 }
      })
    });

    if (!response?.data?.productCategories?.edges) {
      throw new Error('No categories found');
    }

    // Process categories into a hierarchical structure
    const processedCategories = processCategories(response.data.productCategories.edges);
    
    return {
      categories: processedCategories
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch categories'
    });
  }
});

function processCategories(edges: any[]) {
  const categoriesMap = new Map();
  
  edges.forEach(({ node }) => {
    if (!node.parent && node.count > 0) {
      if (!categoriesMap.has(node.id)) {
        categoriesMap.set(node.id, {
          id: node.id,
          name: node.name,
          slug: node.slug,
          count: node.count,
          children: [],
          showChildren: false
        });

        // Process children if they exist
        if (node.children?.edges) {
          const parentCategory = categoriesMap.get(node.id);
          node.children.edges.forEach(({ node: child }) => {
            if (child.count > 0) {
              parentCategory.children.push({
                id: child.id,
                name: child.name,
                slug: child.slug,
                count: child.count,
                children: [],
                showChildren: false
              });
            }
          });
        }
      }
    }
  });

  return Array.from(categoriesMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));
} 