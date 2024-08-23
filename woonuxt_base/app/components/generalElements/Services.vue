<template>
    <div class=" py-24 sm:py-32">
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        <div class="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          <div>
            <h2 class="text-base font-semibold leading-7 text-primary">Satellite Communications Field Service</h2>
            <p class="mt-6 text-base leading-7 text-gray-600">Vincor™ has over 27 years of worldwide E.S.A. experience with all types of earth station antennas. We are Andrew®/ASC Signal™ certified, W.B. Walton certified. We install Vertex/RSI, ViaSat systems and can provide testing and engineering
</p>
<p class="mt-6 text-base leading-7 text-gray-600">ONE CREW.  ONE TRIP.  SAVE MONEY DOING IT SIMULTANEOUSLY!
From the foundation through testing, one company!  If you’re having an antenna erected, and you’re adding a de-icing system, then doing it simultaneously is the best way to save time and money! The more we can do, the more cost-efficient your project will be – and everyone wins!  For Earth Station Antenna services, you need to know Vincor.™
</p>
          </div>
          <dl class="col-span-2 grid grid-cols-1 gap-x-8 gap-y-10 text-base leading-7 text-gray-600 sm:grid-cols-2 lg:gap-y-16">
            <div v-for="feature in features" :key="feature.name" class="relative pl-9">
              <dt class="font-semibold text-gray-900">
                <CheckIcon class="absolute left-0 top-1 h-5 w-5 text-indigo-500" aria-hidden="true" />
                {{ feature.name }}
              </dt>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { CheckIcon } from '@heroicons/vue/20/solid'
  
  const features = [
    {
      name: 'Earth Station Antenna (E.S.A.) Installation and Service (All sizes, types and configurations)',
    },
    { name: 'Foundations, Grounding and Trenching',  },
    { name: 'Concrete Finish Work',  },
    { name: 'Antenna/Station/Antenna Farm Relocation',  },
    { name: 'SATCOM Product Sales and Channel Distribution',  },
    { name: 'Helicopter Airlifts',  },
    { name: 'Turnkey Project Management',  },
    { name: 'Field Service Supervision and Labor',  },
    { name: 'E.S.A. Engineering',  },
    { name: 'E.S.A. and system Troubleshooting and Repair',  },
    { name: 'Site Surveys, Report Writing and Consulting',  },
    { name: 'Custom Manufacturing and Fabrication',  },
  ]
  </script>