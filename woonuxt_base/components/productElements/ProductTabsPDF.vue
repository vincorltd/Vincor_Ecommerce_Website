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
            <!-- Add a new tab for the PDF document -->
            <button type="button" 
          :class="show === tabPosts.length ? 'active' : ''" 
          @click.prevent="showTab(tabPosts.length)"
          v-if="fileExists">
    Datasheet
  </button>
    </nav>
    <div class="tab-contents">
      <div class="font-light mt-8 prose" v-html="activeTab" v-if="show < tabPosts.length" />
      <!-- Add an iframe to display the PDF document -->
      <iframe class="w-full min-h-[1000px]" :src="pdfUrl" v-else />
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
    const { data, error, loading } = useAsyncGql('getPosts');
    const activeTab = ref('');
    const initialTab = activeTab ? 0 : 1;
    const show = ref(initialTab);
    const fileExists = ref(false);

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
      let filteredPosts = posts.value.filter((post) =>
        post.tags.some((tag) => tag === props.productSku)
      );

      filteredPosts.sort((a, b) => (a.title === 'Specifications' ? -1 : b.title === 'Specifications' ? 1 : 0));

return filteredPosts;
    });

    const showTab = (index) => {
      show.value = index;
      activeTab.value = tabPosts.value[index].content;
    };

// const baseSku = computed(() => {
//   // Split the SKU at the last dash
//       const lastDashIndex = props.productSku.lastIndexOf('-');
//       return props.productSku.substring(0, lastDashIndex);
//     });

    const pdfUrl = computed(() => {
      // const sku = props.productSku.replace('/product', '');
      const sku = props.productSku;
      return `https://vincor.com/wp-content/pdf/products/${sku}.pdf`;
    });


    fetch(pdfUrl.value)
  .then(response => {
    if (response.status === 200) {
      fileExists.value = true;
    } else if (response.status === 404) {
      console.log("No document available for this product");
    }
  });

  onMounted(() => {
  if (tabPosts.value.length > 0) {
    showTab(0);
  } else if (fileExists.value) {
    show.value = 1;
  }
});

    return { tabPosts, activeTab, showTab, show, pdfUrl, fileExists };
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
 