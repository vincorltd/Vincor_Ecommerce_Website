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
    </nav>
    <div class="tab-contents">
      <div class="font-light mt-8 prose" v-html="activeTab" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  productSku: {
    type: String,
    required: true,
  },
});

const posts = ref([]);
const activeTab = ref('');
const show = ref(0);

const fetchPosts = async (after = null) => {
  const response = await fetch('https://vincor.com/graphql', {
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
  return posts.value.filter(post => post.tags.includes(props.productSku)).sort((a, b) => {
    if (a.title === 'Datasheet') return 1;
    if (b.title === 'Datasheet') return -1;
    if (a.title === 'Specifications') return -1;
    if (b.title === 'Specifications') return 1;
    return 0;
  });
});

const showTab = (index) => {
  show.value = index;
  activeTab.value = tabPosts.value[index].content;
};

onMounted(async () => {
  await fetchPosts();
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