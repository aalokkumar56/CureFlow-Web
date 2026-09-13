<template>
  <ClientOnly>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <template #fallback>
      <div class="app-loading" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>
