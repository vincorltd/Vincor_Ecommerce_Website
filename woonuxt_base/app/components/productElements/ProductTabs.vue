<template>
  <div>
    <nav class="border-b flex gap-8 tabs">
      <button
        type="button"
        :class="show === index ? 'active' : ''"
        @click.prevent="showTab(index)"
        v-for="(post, index) in tabPosts"
        :key="post.id"
      >
        {{ post.title }}
      </button>
      <button
        v-if="hasShowPdfTag"
        type="button"
        :class="show === tabPosts.length ? 'active' : ''"
        @click.prevent="showTab(tabPosts.length)"
      >
        Datasheet
      </button>
    </nav>
    <div class="tab-contents">
      <div v-if="show < tabPosts.length" class="font-light mt-8 prose" v-html="activeTab" />
      <DatasheetTab v-else-if="hasShowPdfTag" :product="product" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import DatasheetTab from './DatasheetTab.vue'; // Import the DatasheetTab component

// Define the props type
interface Props {
  product: Product;
  productSku: string;
}

// Use the defined props type
const props = defineProps<Props>();

const posts = ref([]);
const activeTab = ref('');
const show = ref(0);

// Computed property to check for the specific tag "show-pdf"
const hasShowPdfTag = computed(() => {
  return props.product.productTags?.nodes.some(tag => tag.name === 'show-pdf') || false;
});

const fetchPosts = async (after = null) => {
  const response = await fetch('https://satchart.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query getAllPosts($after: String) {
          posts(first: 100, after: $after) {
            edges {
              node {
                id
                content
                title
                tags {
                  edges {
                    node {
                      id
                      name
                    }
                  }
                }
              }
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      `,
      variables: { after },
    }),
  });

  const { data } = await response.json();
  if (data) {
    posts.value.push(...data.posts.edges.map(({ node }) => ({
      id: node.id,
      title: node.title,
      content: node.content,
      tags: node.tags.edges.map(({ node }) => node.name) || [],
    })));
    if (data.posts.pageInfo.hasNextPage) {
      await fetchPosts(data.posts.pageInfo.endCursor);
    }
  }
};

const tabPosts = computed(() => {
  const uniquePosts = new Map();
  posts.value.forEach(post => {
    if (post.tags.includes(props.productSku)) {
      uniquePosts.set(post.title, post);
    }
  });
  return Array.from(uniquePosts.values()).sort((a, b) => {
    if (a.title === 'Specifications') return -1;
    if (b.title === 'Specifications') return 1;
    return 0;
  });
});

const showTab = (index) => {
  show.value = index;
  if (index < tabPosts.value.length) {
    activeTab.value = tabPosts.value[index].content;
  } else {
    activeTab.value = ''; // Ensure activeTab is cleared if no valid tab is selected
  }
};



onMounted(async () => {
  await fetchPosts();
  console.log('Fetched Posts:', posts.value); // Debugging log
  console.log('Tab Posts:', tabPosts.value); // Debugging log
  if (tabPosts.value.length > 0) {
    showTab(0);
  }
});
</script>

<style lang="postcss" scoped>
.tabs button {
  @apply border-transparent border-b-2 text-lg pb-8;
  margin-bottom: -1px;
}

.tabs button.active {
  @apply border-primary text-primary;
}
</style>
