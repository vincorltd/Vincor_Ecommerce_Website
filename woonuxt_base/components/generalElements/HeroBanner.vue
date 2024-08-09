<template>
  <div class="mx-auto relative">
    <img
      width="1400"
      height="800"
      class="object-cover h-[360px] w-full md:h-[420px] lg:h-[560px] xl:h-[640px]"
      src="https://vincor.com/wp-content/uploads/2021/10/Picture-071-scaled-1.jpg"
      alt="Hero image"
      loading="eager"
      format="webp"
      fit="outside"
      sizes="sm:100vw lg:1400px" />
    
    <div class="container bg-gradient-to-l flex flex-col from-gray-100 inset-0 text-white absolute items-start justify-center md:bg-none md:p-12 lg:p-24">
      <h2 class="font-bold text-lg md:mb-4 lg:text-3xl">Check out our extensive catalog</h2>

      <NuxtLink class="rounded-xl font-bold bg-[#253779] text-white py-4 px-8 hover:bg-[#2947B4]" to="/products">Shop now</NuxtLink>
    </div>
  </div>
</template>
