<script setup lang="ts">
import { PhCalendarBlank, PhCheckCircle, PhClock, PhListChecks, PhPlus, PhWarning, PhMagnifyingGlass } from '@phosphor-icons/vue'
import FollowUpCard from '~/components/tenant/followups/FollowUpCard.vue'
import FollowUpFormModal from '~/components/tenant/followups/FollowUpFormModal.vue'
import { useFollowUps } from '~/composables/followups/useFollowUps'
import { followUpColumn, followUpColumns, isFollowUpDone, type FollowUp } from '~/utils/followups'
import { normalizeApiError } from '~/utils/api/errors'

definePageMeta({ layout: 'tenant', middleware: ['tenant-auth', 'tenant-approval'] })
useHead({ title: 'Follow-ups' })

const { followUps, loading, saving, error, draft, load, create, updateStatus, remove } = useFollowUps()
const search = ref('')
const modalOpen = ref(false)
const actionError = ref('')
const icons = { due_today: PhCalendarBlank, this_week: PhClock, overdue: PhWarning, completed: PhCheckCircle }
const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  return !query ? followUps.value : followUps.value.filter(task => [task.title, task.patient_name, task.type, task.notes].some(value => String(value || '').toLowerCase().includes(query)))
})
const columnItems = (id: string) => filtered.value.filter(task => followUpColumn(task) === id)
const openCreate = () => { actionError.value = ''; modalOpen.value = true }
const save = async () => { actionError.value = ''; try { await create(); modalOpen.value = false } catch (cause) { actionError.value = cause instanceof Error ? cause.message : normalizeApiError(cause, 'Follow-up could not be created.') } }
const complete = async (task: FollowUp) => { actionError.value = ''; try { await updateStatus(task.id, isFollowUpDone(task.status) ? 'pending' : 'done') } catch (cause) { actionError.value = normalizeApiError(cause, 'Follow-up could not be updated.') } }
const removeTask = async (task: FollowUp) => { if (!window.confirm(`Delete “${task.title}”?`)) return; actionError.value = ''; try { await remove(task.id) } catch (cause) { actionError.value = normalizeApiError(cause, 'Follow-up could not be deleted.') } }
const move = async (task: FollowUp, column: string) => { if (column !== 'completed' || isFollowUpDone(task.status)) return; await complete(task) }
onMounted(load)
</script>

<template>
  <section class="followups-page">
    <header class="followups-toolbar"><div class="followups-toolbar-actions"><label class="followups-search"><PhMagnifyingGlass :size="17" /><input v-model="search" type="search" placeholder="Search follow-ups…" aria-label="Search follow-ups" /></label><button type="button" class="followup-primary-button" @click="openCreate"><PhPlus :size="17" /> New follow-up</button></div></header>
    <p v-if="actionError" class="followup-alert" role="alert">{{ actionError }}</p>
    <div v-if="loading" class="followups-state">Loading follow-ups…</div>
    <div v-else-if="error" class="followups-state"><p>{{ error }}</p><button type="button" class="followup-secondary-button" @click="load()">Try again</button></div>
    <div v-else-if="!filtered.length" class="followups-empty"><PhListChecks :size="42" /><strong>{{ search ? 'No matching follow-ups' : 'No follow-ups yet' }}</strong><p>{{ search ? 'Try another search term.' : 'Create a task to keep important patient care actions on track.' }}</p><button type="button" class="followup-primary-button" @click="openCreate"><PhPlus :size="17" /> New follow-up</button></div>
    <div v-else class="followup-board">
      <article v-for="column in followUpColumns" :key="column.id" class="followup-column" :class="`column-${column.tone}`" @dragover.prevent @drop="move(JSON.parse($event.dataTransfer?.getData('followup') || '{}'), column.id)">
        <header><span><component :is="icons[column.id]" :size="17" /><strong>{{ column.label }}</strong></span><b>{{ columnItems(column.id).length }}</b></header>
        <div v-if="!columnItems(column.id).length" class="followup-column-empty">{{ column.empty }}</div>
        <FollowUpCard v-for="task in columnItems(column.id)" :key="task.id" :task="task" draggable="true" @dragstart="$event.dataTransfer?.setData('followup', JSON.stringify(task))" @complete="complete" @remove="removeTask" />
      </article>
    </div>
    <FollowUpFormModal :open="modalOpen" :draft="draft" :saving="saving" :error="actionError" @close="modalOpen = false" @save="save" />
  </section>
</template>
