<template>
    <AboutUsBanner />
    <div class="flex flex-col max-w-7xl m-auto py-16 ">
        <div class="">
        <p class="italic py-6">Earth Station Antenna Specialists and Satellite Communication Product Distribution</p>

<p class="py-2">Founded in 1986, Vincor has emerged as a worldwide leader in earth station antenna (E.S.A.) sales, installation and service. In 1998, Vincor expanded its field service core to include a full-line of SATCOM products enabling a complete turnkey opportunity for customers.</p>

<p class="py-2">To-date, Vincor field service crews have been deployed throughtout every U.S. state and U.S. territory as well as over 50 additional countries worldwide. Experience is an understatement at Vincor!</p>

<p class="py-2">Vincor works directly with some of the industries largest companies as well as with resellers, system integrators, and manufacturers.</p>

<p class="py-2 italic">“We Work Harder For You”™ — a well-earned motto you can trust at Vincor™</p>

<p class="font-bold py-2">Discuss your project needs with us Toll Free (CONUS): 1.888.284.6267; or outside the continental U.S. call 708.534.0008!</p>
</div>
    </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'About Us | Earth Station Antenna Specialists',
  description: 'Since 1986, Vincor Ltd. has been a worldwide leader in earth station antenna sales, installation, and SATCOM solutions. Operating in all U.S. states and over 50 countries worldwide.',
  ogTitle: 'About Vincor Ltd. | Earth Station Antenna Specialists',
  ogDescription: 'Learn about Vincor Ltd. - "We Work Harder For You"™. Global leaders in earth station antenna services and SATCOM solutions since 1986.',
  ogImage: '/images/vincor-social-share.jpg',
})

useHead({
  link: [
    { rel: 'canonical', href: 'https://vincor.com/about-us' }
  ],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        mainEntity: {
          '@type': 'Organization',
          name: 'Vincor Ltd.',
          description: 'Earth Station Antenna Specialists and Satellite Communication Product Distribution',
          foundingDate: '1986',
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
        }
      })
    }
  ]
})
</script>