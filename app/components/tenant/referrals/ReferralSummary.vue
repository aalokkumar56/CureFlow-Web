<script setup lang="ts">
import { PhCurrencyInr, PhTrendUp, PhUsersThree, PhTrophy } from '@phosphor-icons/vue'
import { formatReferralMoney, referrerColor, referrerInitials, type ReferralAnalytics, type Referrer } from '~/utils/referrals'
const props = defineProps<{ analytics: ReferralAnalytics; doctors: Referrer[] }>()
const topDoctors = computed(() => (props.analytics.top_doctors || []).slice(0, 6).map(item => ({ ...item, doctor: props.doctors.find(doctor => String(doctor.id) === String(item.doctor_id)) })))
</script>
<template>
  <aside class="referral-summary"><header><span class="referral-trophy"><PhTrophy :size="17" weight="fill" /></span><div><strong>Top referrers</strong><small>This month</small></div></header><div class="referral-ranking"><p v-if="!topDoctors.length" class="referral-summary-empty">No referrals logged yet</p><NuxtLink v-for="(item, index) in topDoctors" :key="item.doctor_id" :to="`/doctors/${item.doctor_id}`" class="referral-rank-row"><b>{{ index + 1 }}</b><span class="referrer-avatar small" :class="`avatar-${referrerColor(item.doctor_name || item.doctor?.name || '')}`">{{ referrerInitials(item.doctor_name || item.doctor?.name || '') }}</span><span class="referral-rank-name"><strong>{{ item.doctor_name || item.doctor?.name || 'Unknown' }}</strong><small>{{ item.doctor?.specialty || item.doctor?.clinic || '' }}</small></span><em>{{ item.count || 0 }}</em></NuxtLink></div><footer><div><small>Total referrals</small><strong>{{ props.analytics.total_referrals || 0 }}</strong></div><div><small><PhCurrencyInr :size="13" /> Revenue</small><strong>{{ formatReferralMoney(props.analytics.total_revenue) }}</strong></div></footer></aside>
</template>
