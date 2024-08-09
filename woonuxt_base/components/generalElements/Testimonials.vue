<template>
  <div class="text-center">
    <h2 class="text-3xl font-bold">Testimonials</h2>
  </div>
      <section class="py-12">
      <figure v-for="testimonial in testimonials" :key="testimonial.name" class="mx-auto max-w-2xl">
        <blockquote class="mt-10 text-xl font-semibold leading-8 tracking-tight text-gray-900 sm:text-2xl sm:leading-9">
          <p>{{ testimonial.quote }}</p>
        </blockquote>
        <figcaption class="mt-10 flex items-center gap-x-6">
          <div class="text-sm leading-6">
            <div class="font-semibold text-gray-900">{{ testimonial.position }}</div>
            <div class="mt-0.5 text-gray-600">{{ testimonial.name }}</div>
          </div>
        </figcaption>
      </figure>
    </section>
  </template>

  <script setup>
  const testimonials = [
    {
      quote: '"... Mr. David Basile and [Vincor Technicians] finished the antenna installation in record time, working many hours each day beyond the call of duty. The perfect antenna installation is a credit to their skill and knowledge."',
      position: 'General Manager',
      name: 'ARAB REPUBLIC OF EGYPT'
    },
    {
      quote: '"... I signed the site acceptance document yesterday afternoon on the Andrew 7.6M ESA installation project phase one. I would like to take this opportunity to express our satisfaction with the job Vincor did on the antenna installation. From start to finish Mark [Vinezeano] and everyone with Vincor did an excellent job on the antenna installation project. We absolutely would use their services again."',
      position: 'Project Manager',
      name: 'U.S. DEPARTMENT OF VETERANS AFFAIRS'
    },
    {
      quote: '"...Planning, coordination and work-around was implemented to circumvent delays which could have resulted due to part shortages and delayed deliveries... the transition and finishing effort was accomplished with maximum efficiency under adverse conditions. The dedication and competence of the Vincor employees along with the relationship they established with customer and subcontractor personnel contributed to a quality end product. The whole team is to be commended for a job well done."',
      position: 'Senior Systems Engineer, Ground Systems Group',
      name: 'HUGHES AIRCRAFT COMPANY'
    },
    {
      quote: '"... They have worked long and hard in absolute worst of circumstances. They have always displayed a most positive attitude, even when encountering problems. When people find a way to get it done instead of finding an excuse for not trying, it is most refreshing."',
      position: 'Project Manager',
      name: 'LUCENT TECHNOLGIES, INC.'
    },
    {
      quote: '"... I would like to take this opportunity to commend Vincor on the professional way in which Vincor installers perform on Andrew projects and the first rate quality demonstrated time and time again. It is very comforting to know that when Vincor is assigned I can rest assured that the job will be completed on time and done right. Thank you very much for your support on behalf of Andrew Field Service operations worldwide and I am greatly looking forward to using Vincor on upcoming projects."',
      position: 'Supervisor, Earth Station Antenna Installation Services',
      name: 'ANDREW® CORPORATION'
    },
    {
      quote: '"... with respect to the 7.6m install, we have a very positive impression of your companys work and the conduct and professionalism of your crew. With the weather what is was, we were impressed with the teams ability to stay on schedule and function under what would be considered terrible conditions by any measure. Your team Vincor, Ltd. was self-sufficient and required no measurable support from the station."',
      position: 'Systems Management',
      name: 'STS ENGINEERING CLIENT'
    },
    {
      quote: '"... I was on-line and checked out your website - it looks really good!"',
      position: 'Principal Network Engineer',
      name: 'GTECH Corporation'
    },
    {
      quote: '"...I just want to say thanks for how fast our orders get processed and shipped by you folks. Its appreciated."',
      position: 'Vice-President',
      name: 'River Communications'
    },

  ]
  </script>
