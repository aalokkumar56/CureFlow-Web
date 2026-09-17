<script setup lang="ts">
import { PhCalendarBlank, PhChatCircleDots, PhClock, PhCurrencyInr, PhListChecks, PhTrendUp, PhWarning } from '@phosphor-icons/vue'
import AnalyticsSection from '~/components/tenant/analytics/AnalyticsSection.vue'
import { useAnalytics } from '~/composables/analytics/useAnalytics'
import { analyticsItems, formatHospitalDate, formatRupee, minutesSince, type AnalyticsItem } from '~/utils/analytics'

definePageMeta({ layout: 'tenant', middleware: ['tenant-auth', 'tenant-approval'] })
useHead({ title: 'Analytics' })

const auth = useTenantAuth()
const { report, loading, error, canView, load } = useAnalytics()
const hospitalTimezone = computed(() => String(auth.tenant.value?.timezone || auth.tenant.value?.time_zone || 'Asia/Kolkata'))
const totalItems = computed(() => analyticsItems(report.value).length)
const categoryLoss = (key: string) => Number(report.value?.category_totals?.[key]?.estimated_loss || 0)
const patientName = (item: AnalyticsItem) => String(item.name || item.patient_name || item.wa_phone || 'Unknown patient')
onMounted(load)
</script>

<template>
  <section class="analytics-page">
    <div v-if="!canView" class="dashboard-state">You do not have permission to view analytics.</div>
    <div v-else-if="loading" class="analytics-loading">Loading analytics…</div>
    <div v-else-if="error" class="dashboard-state"><p>{{ error }}</p><button type="button" class="dashboard-retry" @click="() => load()">Try again</button></div>
    <template v-else-if="report">
      <div class="analytics-summary-grid"><article class="analytics-summary-card loss"><span><PhCurrencyInr :size="19" /></span><div><small>Total estimated loss</small><strong>{{ formatRupee(report.estimated_loss) }}</strong></div></article><article class="analytics-summary-card accountability"><span><PhWarning :size="19" /></span><div><small>Accountability items</small><strong>{{ totalItems }}</strong></div></article><article class="analytics-summary-card recoverable"><span><PhTrendUp :size="19" /></span><div><small>Potentially recoverable</small><strong>{{ formatRupee(report.recoverable_revenue) }}</strong></div></article></div>
      <div v-if="!totalItems" class="analytics-all-clear"><PhTrendUp :size="40" /><h2>All clear - no action items</h2><p>There are no unanswered inquiries, missed appointments, overdue follow-ups, or inactive patients right now.</p><NuxtLink to="/">Back to dashboard</NuxtLink></div>
      <div v-else class="analytics-sections-grid">
        <AnalyticsSection title="Unanswered inquiries" subtitle="No staff reply for more than 15 minutes" :icon="PhChatCircleDots" :items="report.unanswered_inquiries || []" :category-loss="categoryLoss('unanswered_inquiries')" accent="accent-red" empty="All caught up!"><template #default="{ item }"><NuxtLink to="/inbox" class="analytics-row-link"><div><strong>{{ patientName(item) }}</strong><small>{{ item.last_message_preview || 'No message preview' }}</small></div><div class="analytics-row-value"><small>{{ minutesSince(item.awaiting_reply_since) }}</small><b>{{ formatRupee(item.estimated_loss) }}</b></div></NuxtLink></template></AnalyticsSection>
        <AnalyticsSection title="Missed appointments" subtitle="Patient did not arrive (no-show)" :icon="PhCalendarBlank" :items="report.missed_appointments || []" :category-loss="categoryLoss('missed_appointments')" accent="accent-orange" empty="No missed appointments"><template #default="{ item }"><div class="analytics-row"><div><strong>{{ patientName(item) }}</strong><small>{{ item.doctor_name || 'Doctor not assigned' }} · {{ item.department || 'No department' }}</small></div><div class="analytics-row-value"><small>{{ formatHospitalDate(item.scheduled_at, hospitalTimezone) }}</small><b>{{ formatRupee(item.estimated_loss) }}</b></div></div></template></AnalyticsSection>
        <AnalyticsSection title="Overdue follow-ups" subtitle="Tasks past their due date" :icon="PhListChecks" :items="report.lost_followups || []" :category-loss="categoryLoss('lost_followups')" accent="accent-amber" empty="No overdue tasks"><template #default="{ item }"><NuxtLink to="/tasks" class="analytics-row-link"><div><strong>{{ item.title || 'Untitled task' }}</strong><small>{{ item.patient_name || 'No patient' }} · {{ String(item.type || 'follow-up').replace(/_/g, ' ') }}</small></div><div class="analytics-row-value"><small>{{ item.due_at ? `due ${minutesSince(item.due_at)}` : 'Due date unknown' }}</small><b>{{ formatRupee(item.estimated_loss) }}</b></div></NuxtLink></template></AnalyticsSection>
        <AnalyticsSection title="Inactive patients" subtitle="No contact in 90+ days · re-engage" :icon="PhClock" :items="report.inactive_patients || []" :category-loss="categoryLoss('inactive_patients')" accent="accent-purple" empty="All patients recently engaged"><template #default="{ item }"><NuxtLink :to="`/patients/${item.id}`" class="analytics-row-link"><div><strong>{{ patientName(item) }}</strong><small>{{ item.phone || 'No phone' }} · {{ item.department || 'No department' }}</small></div><div class="analytics-row-value"><small>{{ item.last_contact_at ? minutesSince(item.last_contact_at) : 'Never contacted' }}</small><b>{{ formatRupee(item.estimated_loss) }}</b></div></NuxtLink></template></AnalyticsSection>
      </div>
    </template>
  </section>
</template>
