<script setup lang="ts">
import { PhCurrencyInr, PhUsersThree } from '@phosphor-icons/vue'
import { formatReferralMoney, referrerColor, referrerInitials, type Referrer } from '~/utils/referrals'
const props = defineProps<{ doctor: Referrer }>()
</script>
<template>
  <NuxtLink :to="`/doctors/${props.doctor.id}`" class="referrer-card" draggable="false">
    <div class="referrer-card-top"><span class="referrer-avatar" :class="`avatar-${referrerColor(props.doctor.name)}`">{{ referrerInitials(props.doctor.name) }}</span><div class="referrer-card-copy"><strong>{{ props.doctor.name }}</strong><small v-if="props.doctor.specialty">{{ props.doctor.specialty }}</small><small v-if="props.doctor.clinic">{{ props.doctor.clinic }}</small></div></div>
    <div class="referrer-card-metrics"><span><PhUsersThree :size="13" />{{ props.doctor.patients_referred || 0 }}</span><span v-if="Number(props.doctor.total_revenue || 0) > 0"><PhCurrencyInr :size="13" />{{ formatReferralMoney(props.doctor.total_revenue) }}</span></div>
  </NuxtLink>
</template>
