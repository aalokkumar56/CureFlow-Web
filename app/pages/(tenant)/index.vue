<script setup lang="ts">
import { PhCalendarBlank, PhCurrencyInr, PhHeart, PhSparkle, PhUsersThree } from '@phosphor-icons/vue'
import { useDashboardData } from '~/composables/dashboard/useDashboardData'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'

definePageMeta({ layout: 'tenant', middleware: ['tenant-auth', 'tenant-approval'] })

const auth = useTenantAuth()
const { overview, loading, error, canView, load } = useDashboardData()
const appointmentPeriod = ref<'appointments_week' | 'appointments_last_week'>('appointments_week')
const revenuePeriod = ref<'revenue_month' | 'revenue_last_month' | 'revenue_week'>('revenue_month')

onMounted(load)

const appointments = computed(() => Array.isArray(overview.value?.[appointmentPeriod.value]) ? overview.value[appointmentPeriod.value] as Array<Record<string, unknown>> : [])
const revenue = computed(() => Array.isArray(overview.value?.[revenuePeriod.value]) ? overview.value[revenuePeriod.value] as Array<Record<string, unknown>> : [])
const upcoming = computed(() => overview.value?.upcoming_appointments || [])
const revenueTotal = computed(() => revenue.value.reduce((total, item) => total + Number(item.amount || 0), 0))
const maxAppointment = computed(() => Math.max(1, ...appointments.value.flatMap(item => [Number(item.scheduled || 0), Number(item.completed || 0)])))
const maxRevenue = computed(() => Math.max(1, ...revenue.value.map(item => Number(item.amount || 0))))
const formatRupee = (value: unknown) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`
const formatTime = (value?: string) => value ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : '—'
const periodLabel = (key: string) => ({ appointments_week: 'This week', appointments_last_week: 'Last week', revenue_month: 'This month', revenue_last_month: 'Last month', revenue_week: 'This week' })[key] || key
const percentageHeight = (value: unknown, maximum: number) => ({ height: `${(Number(value || 0) / maximum) * 100}%` })
const revenueTitle = (item: Record<string, unknown>) => `${item.label || ''}: ${formatRupee(item.amount)}`
</script>

<template>
  <section class="dashboard">
    <div v-if="!canView" class="dashboard-state">You do not have permission to view the dashboard.</div>
    <template v-else>
      <div v-if="loading" class="dashboard-cards dashboard-loading" aria-label="Loading dashboard"><div v-for="n in 4" :key="n" class="dashboard-card" /></div>
      <div v-else-if="error" class="dashboard-state"><p>{{ error }}</p><button type="button" class="dashboard-retry" @click="load">Try again</button></div>
      <template v-else-if="overview">
        <div class="dashboard-cards">
          <NuxtLink to="/appointments?date=today" class="dashboard-card"><span class="dashboard-icon blue"><PhCalendarBlank :size="20" weight="fill" /></span><p>Today's appointments</p><strong>{{ overview.appointments_today ?? 0 }}</strong><small v-if="overview.appointments_today_change_pct != null">↑ {{ Math.abs(Number(overview.appointments_today_change_pct)) }}% vs yesterday</small></NuxtLink>
          <NuxtLink to="/patients?status=new_inquiry" class="dashboard-card"><span class="dashboard-icon green"><PhUsersThree :size="20" weight="fill" /></span><p>New patients</p><strong>{{ overview.new_inquiries_today ?? 0 }}</strong><small v-if="overview.new_patients_change_pct != null">↑ {{ Math.abs(Number(overview.new_patients_change_pct)) }}% vs yesterday</small></NuxtLink>
          <NuxtLink v-if="auth.user.value && hasPermission(auth.user.value, PERMISSIONS.BillingView)" to="/missed-revenue" class="dashboard-card"><span class="dashboard-icon amber"><PhCurrencyInr :size="20" weight="fill" /></span><p>Revenue (MTD)</p><strong>{{ formatRupee(overview.revenue_mtd) }}</strong><small v-if="overview.revenue_mtd_change_pct != null">↑ {{ Math.abs(Number(overview.revenue_mtd_change_pct)) }}% vs last month</small></NuxtLink>
          <article class="dashboard-card"><span class="dashboard-icon pink"><PhHeart :size="20" weight="fill" /></span><p>Care score</p><strong>{{ overview.care_score ?? '—' }}<template v-if="overview.care_score != null">/5</template></strong><small v-if="overview.care_score_change != null">↑ {{ overview.care_score_change }} vs last month</small></article>
        </div>

        <div class="dashboard-grid">
          <article class="dashboard-panel"><div class="dashboard-panel-title"><div><h3>Appointments overview</h3><small><i class="scheduled" /> Scheduled <i class="completed" /> Completed</small></div><select v-model="appointmentPeriod" aria-label="Appointment period"><option value="appointments_week">This week</option><option value="appointments_last_week">Last week</option></select></div><div v-if="appointments.length" class="dashboard-bars"><div v-for="(item, index) in appointments" :key="String(item.label || index)" class="dashboard-bar-group"><div class="dashboard-bar-set"><span class="scheduled" :style="percentageHeight(item.scheduled, maxAppointment)" /><span class="completed" :style="percentageHeight(item.completed, maxAppointment)" /></div><small>{{ item.label }}</small></div></div><p v-else class="dashboard-empty">No appointment activity for {{ periodLabel(appointmentPeriod) }}.</p></article>

          <article class="dashboard-panel"><div class="dashboard-panel-title"><h3>Upcoming appointments</h3><NuxtLink to="/appointments">View all</NuxtLink></div><div v-if="upcoming.length" class="upcoming-list"><div v-for="appointment in upcoming.slice(0, 3)" :key="appointment.id" class="upcoming-row"><div><strong>{{ formatTime(appointment.scheduled_at) }}</strong><small>{{ appointment.duration_minutes || 30 }} min</small></div><span class="appointment-avatar">{{ appointment.patient_name?.[0]?.toUpperCase() || 'P' }}</span><div class="upcoming-person"><strong>{{ appointment.patient_name || 'Patient' }}</strong><small>{{ appointment.appointment_type || 'Consultation' }}</small></div><em :class="appointment.status === 'confirmed' || appointment.status === 'scheduled' ? 'confirmed' : 'pending'">{{ appointment.status === 'confirmed' || appointment.status === 'scheduled' ? 'Confirmed' : 'Pending' }}</em></div></div><p v-else class="dashboard-empty">No upcoming appointments.</p></article>

          <article v-if="auth.user.value && hasPermission(auth.user.value, PERMISSIONS.BillingView)" class="dashboard-panel revenue-panel"><div class="dashboard-panel-title"><div><h3>Revenue overview</h3><p>Total revenue ({{ periodLabel(revenuePeriod) }})</p></div><select v-model="revenuePeriod" aria-label="Revenue period"><option value="revenue_month">This month</option><option value="revenue_last_month">Last month</option><option value="revenue_week">This week</option></select></div><strong class="revenue-total">{{ formatRupee(revenueTotal) }}</strong><div v-if="revenue.length" class="revenue-bars"><span v-for="(item, index) in revenue" :key="String(item.label || index)" :style="percentageHeight(item.amount, maxRevenue)" :title="revenueTitle(item)" /></div><p v-else class="dashboard-empty">No revenue activity for this period.</p></article>

          <article class="dashboard-panel insight-panel"><span class="insight-icon"><PhSparkle :size="21" weight="fill" /></span><div><h3>AI insight</h3><p>Insights will appear here when they are available from your dashboard data.</p></div></article>
        </div>
      </template>
    </template>
  </section>
</template>
