<template>
  <div>
    <FieldServiceBanner/>
    <Services/>
    <Testimonials/>
  </div>
</template>

<script lang="ts" setup>
useSeoMeta({
  title: 'Field Service | Satellite Communication Installation & Maintenance',
  description: 'Professional SATCOM field services by Vincor Ltd. Expert installation, maintenance, and emergency repair of satellite communication systems and earth station antennas.',
  ogTitle: 'Field Service | Vincor Ltd. SATCOM Installation & Maintenance',
  ogDescription: 'Trust Vincor Ltd. for professional satellite communication field services. Expert technicians available 24/7 for installation, maintenance, and emergency repairs.',
  ogImage: '/images/vincor-social-share.jpg',
})

useHead({
  link: [
    { rel: 'canonical', href: 'https://vincor.com/field-service' }
  ],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Service',
        serviceType: 'Satellite Communication Field Service',
        provider: {
          '@type': 'Organization',
          name: 'Vincor Ltd.',
          description: 'Earth Station Antenna Specialists and Satellite Communication Product Distribution',
          url: 'https://www.vincor.com'
        },
        areaServed: 'Worldwide',
        description: 'Professional satellite communication field services including installation, maintenance, and emergency repair of earth station antennas and SATCOM systems.',
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: 'https://vincor.com/field-service',
          servicePhone: ['+1-888-284-6267', '+1-708-534-0008']
        }
      })
    }
  ]
})
</script>

<style>

</style>