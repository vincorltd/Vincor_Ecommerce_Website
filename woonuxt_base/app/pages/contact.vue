<template>
  <div class="container my-8">
    <h1 class="mb-8 text-3xl font-semibold text-primary">Contact Page</h1>
    <div class="my-8 prose">
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugiat facilis, commodi illum repellat accusamus praesentium quaerat ut ducimus ipsam deserunt, a voluptate id
        similique ullam, provident tenetur molestiae ad. Ea aperiam esse eaque aut, beatae consectetur nam velit unde! Et excepturi quam eos labore, nulla impedit recusandae
        quaerat maxime expedita.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur, adipisicing elit. Nemo voluptate neque in odio officia assumenda nulla cumque. Veniam et tenetur accusantium, fuga pariatur
        repellendus impedit. Quod sint odio quisquam! Sequi repellendus eum dolorum eveniet, quidem dolor necessitatibus velit sunt esse maiores. Eum odit dolorum mollitia?
        Adipisci amet hic veniam debitis architecto nobis necessitatibus inventore iure ullam cum illo quae quam, excepturi beatae itaque exercitationem magnam quidem aspernatur
        iusto. Quos, reprehenderit? Dignissimos autem recusandae qui sit cum velit consequatur pariatur illum omnis excepturi, adipisci ab eius, optio, temporibus iure unde
        inventore. Maxime officiis tempore voluptatum ipsa, ab possimus atque corporis repellendus obcaecati, numquam fuga ullam doloremque ea reprehenderit earum quam culpa neque
        dolor sint voluptates qui rem? Ipsam reiciendis non illum?
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Contact | Earth Station Antenna Specialists',
  description: 'Contact Vincor Ltd., your SATCOM solutions specialists. Call us at +1 (888) 284-6267 or +1 (708) 534-0008. Located in Monee, IL, we provide expert satellite communication solutions and antenna services.',
  ogTitle: 'Contact Vincor Ltd. | Earth Station Antenna Specialists',
  ogDescription: 'Get in touch with Vincor Ltd. - "We Work Harder For You"™. Expert SATCOM solutions, antenna specialists, and satellite communication product distribution.',
  ogImage: '/images/vincor-social-share.jpg',
})

useHead({
  link: [
    { rel: 'canonical', href: 'https://vincor.com/contact' }
  ],
  // Add structured data for business
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Vincor Ltd.',
        description: 'Earth Station Antenna Specialists and Satellite Communication Product Distribution',
        url: 'https://www.vincor.com',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '5652 W. Monee-Manhattan Road',
          addressLocality: 'Monee',
          addressRegion: 'IL',
          postalCode: '60449',
          addressCountry: 'US'
        },
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: ['+1-888-284-6267', '+1-708-534-0008'],
          contactType: 'customer service'
        },
        slogan: '"We Work Harder For You"™'
      })
    }
  ]
})
</script>
