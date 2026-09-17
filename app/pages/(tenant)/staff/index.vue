<script setup lang="ts">
import { PhMagnifyingGlass, PhPlus, PhUserCircle } from '@phosphor-icons/vue'
import StaffDetailPanel from '~/components/tenant/staff/StaffDetailPanel.vue'
import StaffFormModal from '~/components/tenant/staff/StaffFormModal.vue'
import { useStaff } from '~/composables/staff/useStaff'
import { employmentTypes, staffRoles, staffTabs, type StaffMember } from '~/utils/staff'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
import { normalizeApiError } from '~/utils/api/errors'

definePageMeta({ layout: 'tenant', middleware: ['tenant-auth', 'tenant-approval'] })
useHead({ title: 'Hospital Staff' })

const auth = useTenantAuth()
const canCreate = computed(() => hasPermission(auth.user.value, PERMISSIONS.StaffCreate))
const { staff, users, departments, schedules, selected, loading, saving, error, draft, load, open, create, update, addSchedule } = useStaff()
const tab = ref('all')
const search = ref('')
const modalOpen = ref(false)
const actionError = ref('')
const filtered = computed(() => staff.value)
const save = async () => { actionError.value = ''; try { await create(); modalOpen.value = false; await load(tab.value, search.value) } catch (cause) { actionError.value = cause instanceof Error ? cause.message : normalizeApiError(cause, 'Staff profile could not be created.') } }
const saveProfile = async (member: StaffMember) => { actionError.value = ''; try { await update(); await load(tab.value, search.value); selected.value = { ...member } } catch (cause) { actionError.value = normalizeApiError(cause, 'Staff profile could not be updated.') } }
const addSlot = async (payload: Record<string, unknown>) => { try { await addSchedule(payload) } catch (cause) { actionError.value = normalizeApiError(cause, 'Schedule could not be added.') } }
watch([tab, search], () => load(tab.value, search.value))
onMounted(() => load())
</script>

<template>
  <section class="staff-page">
    <p v-if="actionError" class="staff-alert">{{ actionError }}</p>
    <div class="staff-filter-bar">
      <div class="staff-tabs"><button v-for="item in staffTabs" :key="item.id" type="button" :class="{ active: tab === item.id }" @click="tab = item.id">{{ item.label }}</button></div>
      <div class="staff-toolbar-actions"><label class="staff-search"><PhMagnifyingGlass :size="17" /><input v-model="search" type="search" placeholder="Search staff…" aria-label="Search staff" /></label><button v-if="canCreate" type="button" class="staff-primary-button" @click="actionError = ''; modalOpen = true"><PhPlus :size="17" /> Add staff profile</button></div>
    </div>
    <div v-if="loading" class="staff-state">Loading hospital staff…</div>
    <div v-else-if="error" class="staff-state"><p>{{ error }}</p><button type="button" class="staff-secondary-button" @click="load(tab, search)">Try again</button></div>
    <section v-else class="staff-table-card">
      <div v-if="!filtered.length" class="staff-empty"><PhUserCircle :size="42" /><strong>No staff profiles yet</strong><p>Create a staff profile to manage doctors, nurses, and reception teams.</p><button v-if="canCreate" type="button" class="staff-primary-button" @click="modalOpen = true"><PhPlus :size="17" /> Add staff profile</button></div>
      <div v-else class="staff-table-scroll"><table><thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Specialization</th><th>Employment</th><th>Fee</th><th>Shift</th><th>Available</th></tr></thead><tbody><tr v-for="member in filtered" :key="member.id" tabindex="0" @click="open(member)" @keydown.enter="open(member)"><td><strong>{{ member.name }}</strong><small>{{ member.email || member.phone || 'Contact not recorded' }}</small></td><td>{{ staffRoles[member.role] || member.role }}</td><td>{{ member.department || '—' }}</td><td>{{ member.specialization || '—' }}</td><td>{{ employmentTypes[member.employment_type || ''] || member.employment_type || '—' }}</td><td>{{ member.role === 'doctor' ? (member.consultation_fee != null ? `₹${Number(member.consultation_fee).toLocaleString('en-IN')}` : '—') : '—' }}</td><td>{{ member.shift || '—' }}</td><td><span class="staff-availability" :class="{ unavailable: !member.is_available }">{{ member.is_available ? 'Available' : 'Unavailable' }}</span></td></tr></tbody></table></div>
    </section>
    <StaffFormModal :open="modalOpen" :draft="draft" :departments="departments" :users="users" :saving="saving" :error="actionError" @close="modalOpen = false" @save="save" />
    <div v-if="selected" class="staff-detail-overlay" @click.self="selected = null"><StaffDetailPanel :member="selected" :schedules="schedules" :departments="departments" :saving="saving" :error="actionError" @close="selected = null" @save="saveProfile" @add-schedule="addSlot" /></div>
  </section>
</template>
