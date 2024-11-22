<template>
  <div class="mx-auto max-w-2xl text-center pt-32">
    <h2 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Get in contact with Vincor Ltd.</h2>
  </div>

  <div class="flex justify-center py-8">
    <NuxtLink to="mailto:marketing@vincor.com" class="btn px-4 py-2 mx-2 bg-primary text-white rounded-md">Ask Vincor™</NuxtLink>
    <NuxtLink to="mailto:RFQ@vincor.com" class="px-4 py-2 mx-2 bg-primary text-white rounded-md">E-mail existing RFQ</NuxtLink>
    <NuxtLink to="mailto:mailto:sales@vincor.com" class="px-4 py-2 mx-2 bg-primary text-white rounded-md">E-mail Vincor™ Sales</NuxtLink>
  </div>
  
<div class="pt-12">
  <div class="text-center">
    <h2 class="font-bold text-lg">Leave us a message here</h2>
  </div>
</div>
<div class="m-auto w-1/2 py-16">
<ContactForm />
</div>
<ContactInfo />

<div class="flex flex-col m-auto w-1/2 py-14">
<p>Vincor™ recognizes several major holidays and a host of optional, flexible holidays for our staff. We close our general office (without disruption to field service projects), in observance of: New Years Day, Memorial Day, Independence Day, Labor Day, Thanksgiving Day with the day after Thanksgiving, Christmas Eve and Christmas Day.</p>
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
