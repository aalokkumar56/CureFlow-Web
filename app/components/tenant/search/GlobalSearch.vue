<script setup lang="ts">
import { PhMagnifyingGlass, PhSpinner, PhUsersThree } from '@phosphor-icons/vue'
type PatientResult = { id: string | number; name?: string; phone?: string }
const open = ref(false); const query = ref(''); const results = ref<PatientResult[]>([]); const loading = ref(false); let timer: ReturnType<typeof setTimeout> | undefined
const search = () => { clearTimeout(timer); if (!query.value.trim()) { results.value = []; return }; timer = setTimeout(async () => { loading.value = true; try { const { $api } = useNuxtApp(); const response = await $api.get<unknown>('/patients', { q: query.value, page: 1, page_size: 8 }); results.value = Array.isArray(response) ? response as PatientResult[] : Array.isArray((response as { items?: unknown[] }).items) ? (response as { items: PatientResult[] }).items : [] } catch { results.value = [] } finally { loading.value = false } }, 220) }
const go = async (path: string) => { open.value = false; query.value = ''; results.value = []; await navigateTo(path) }
const onShortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); open.value = !open.value } }
onMounted(() => window.addEventListener('keydown', onShortcut))
onBeforeUnmount(() => { clearTimeout(timer); window.removeEventListener('keydown', onShortcut) })
</script>
<template>
  <div class="global-search"><button class="tenant-header-action" type="button" aria-label="Search" @click="open = true"><PhMagnifyingGlass :size="19" /></button><div v-if="open" class="search-backdrop" @click="open = false" /><section v-if="open" class="search-dialog" role="dialog" aria-modal="true" aria-label="Global search"><div class="search-input"><PhMagnifyingGlass :size="20" /><input v-model="query" autofocus placeholder="Search patients or navigate…" @input="search"><PhSpinner v-if="loading" class="spin" :size="18" /></div><div class="search-results"><button type="button" @click="go('/')">Dashboard</button><button type="button" @click="go('/appointments')">Appointments</button><button type="button" @click="go('/patients')">Patients</button><template v-if="results.length"><p>Patients</p><button v-for="patient in results" :key="patient.id" type="button" @click="go(`/patients/${patient.id}`)"><PhUsersThree :size="17" /> <span>{{ patient.name || 'Patient' }}</span><small>{{ patient.phone }}</small></button></template><p v-else-if="query && !loading">No patients found.</p></div></section></div>
</template>
