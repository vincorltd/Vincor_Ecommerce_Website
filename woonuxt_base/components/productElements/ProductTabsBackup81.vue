<template>
  <div>
    <nav class="border-b flex gap-8 tabs">
      <button
        type="button"
        :class="show === index ? 'active' : ''"
        @click.prevent="show = index; activeTab = post.content"
        v-for="(post, index) in tabPosts"
        :key="post.id"
      >
        {{ post.title }}
      </button>
    </nav>
    <div class="tab-contents">
      <div class="font-light mt-8 prose" v-html="activeTab" />
      <!-- <div v-if="activeTab.title === 'Datasheet'" v-html="activeTab.content"></div>
<div v-else>{{ activeTab.content }}</div> -->
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';

export default {
  props: {
    productSku: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const { data, error, loading } = useAsyncGql('getPosts', {
      variables: {
        first: 1000, // Adjust this number as needed to ensure all posts are fetched
      },
    });
    const activeTab = ref('');
    const initialTab = activeTab ? 0 : 1;
    const show = ref(initialTab);

    const posts = computed(() => {
      if (data.value && data.value.posts) {
        return data.value.posts.edges.map(({ node }) => ({
          id: node.id,
          title: node.title,
          content: node.content,
          tags: node.tags.edges.map(({ node }) => node.name),
        }));
      }
      return [];
    });

    const tabPosts = computed(() => {
  return posts.value
    .filter(post => post.tags.includes(props.productSku))
    .sort((a, b) => {
      const aTagNumber = a.tags.find(tag => !isNaN(tag));
      const bTagNumber = b.tags.find(tag => !isNaN(tag));
      if (a.title === 'Datasheet') return 1;
      if (b.title === 'Datasheet') return -1;
      if (a.title === 'Specifications') return -1;
      if (b.title === 'Specifications') return 1;
      if (aTagNumber && bTagNumber) {
        return parseInt(aTagNumber) - parseInt(bTagNumber);
      }
      return 0;
    });
});

    const showTab = (index) => {
      show.value = index;
      activeTab.value = tabPosts.value[index].content;
    };

//     const showTab = (index) => {
//   show.value = index;
//   activeTab.value = tabPosts.value[index];
// };

    onMounted(() => {
      if (tabPosts.value.length > 0) {
        showTab(0);
      }
    });
    console.log('posts:', posts.value);
console.log('productSku:', props.productSku);
console.log('tabPosts:', tabPosts.value);
    return { tabPosts, activeTab, showTab, show };
  },
};
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
 