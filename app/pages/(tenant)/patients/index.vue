<!-- <script setup lang="ts">
definePageMeta({
  auth: 'tenant',
})
</script>

<template>
  <div>Patients</div>
</template> -->

<script setup lang="ts">
import { PhHouse } from '@phosphor-icons/vue'
</script>

<template>
  <div class="min-h-screen bg-background p-8">
    <div class="mx-auto max-w-xl space-y-6">
      <div>
        <h1 class="text-2xl font-semibold text-foreground">
          CureFlow UI
        </h1>

        <p class="mt-1 text-muted-foreground">
          Testing the new CureFlow design system.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <Button>
          <PhHouse :size="18" />
          Dashboard
        </Button>

        <Button variant="outline">
          Cancel
        </Button>

        <Button variant="secondary">
          Secondary
        </Button>

        <Button variant="destructive">
          Delete
        </Button>
      </div>
    </div>
  </div>
</template>