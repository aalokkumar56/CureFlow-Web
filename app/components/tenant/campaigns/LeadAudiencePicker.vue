<script setup lang="ts">
import { useLeads, type Lead } from "~/composables/leads/useLeads";
import { normalizeApiError } from "~/utils/api/errors";
const selectedIds = defineModel<string[]>({ default: () => [] });
const allSelected = defineModel<boolean>("allSelected", { default: false });
const { list, $api } = useLeads();
const search = ref("");
const page = ref(1);
const rows = ref<Lead[]>([]);
const selected = ref<Lead[]>([]);
const displayedSelection = computed(() =>
  selectedIds.value.map((id) => ({
    id,
    label:
      selected.value.find((lead) => lead.id === id)?.name ||
      rows.value.find((lead) => lead.id === id)?.name ||
      `Lead (${id})`,
    phone:
      selected.value.find((lead) => lead.id === id)?.phone ||
      rows.value.find((lead) => lead.id === id)?.phone,
  })),
);
let selectionRequest = 0;
const total = ref(0);
const loading = ref(false);
const error = ref("");
const open = ref(false);
let request = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const load = async () => {
  const current = ++request;
  loading.value = true;
  error.value = "";
  try {
    const result = await list({
      q: search.value,
      page: page.value,
      page_size: 25,
      status: "active",
    });
    if (current !== request) return;
    rows.value = result.items;
    total.value = result.total;
  } catch (cause) {
    if (current === request)
      error.value = normalizeApiError(cause, "Leads could not be loaded.");
  } finally {
    if (current === request) loading.value = false;
  }
};
const toggle = (lead: Lead) => {
  if (allSelected.value) allSelected.value = false;
  selected.value = selectedIds.value.includes(lead.id)
    ? selected.value.filter((item) => item.id !== lead.id)
    : [...selected.value, lead];
  selectedIds.value = selectedIds.value.includes(lead.id)
    ? selectedIds.value.filter((id) => id !== lead.id)
    : [...selectedIds.value, lead.id];
};
const selectAll = () => {
  allSelected.value = true;
  selectedIds.value = [];
  selected.value = [];
};
const clearAll = () => {
  allSelected.value = false;
};
const previousPage = () => {
  if (page.value <= 1) return;
  page.value -= 1;
  load();
};
const nextPage = () => {
  if (page.value * 25 >= total.value) return;
  page.value += 1;
  load();
};
watch(search, () => {
  request++;
  clearTimeout(timer);
  timer = setTimeout(() => {
    page.value = 1;
    load();
  }, 300);
});
watch(open, (value) => {
  if (value) load();
});
watch(
  selectedIds,
  async (ids) => {
    const current = ++selectionRequest;
    selected.value = selected.value.filter((lead) => ids.includes(lead.id));
    const missing = ids.filter(
      (id) => !selected.value.some((lead) => lead.id === id),
    );
    const details = await Promise.allSettled(
      missing.map((id) =>
        $api.get<{ lead: Lead }>(`/leads/${encodeURIComponent(id)}`),
      ),
    );
    if (current !== selectionRequest) return;
    for (const result of details) {
      if (
        result.status === "fulfilled" &&
        result.value.lead &&
        selectedIds.value.includes(result.value.lead.id)
      ) {
        selected.value.push(result.value.lead);
      }
    }
  },
  { immediate: true },
);
watch(allSelected, (value) => {
  if (value) {
    selectedIds.value = [];
    selected.value = [];
  }
});
onScopeDispose(() => {
  selectionRequest++;
  request++;
  clearTimeout(timer);
});
</script>

<template>
  <div class="campaign-patient-picker">
    <span class="campaign-field-label">Specific leads</span>
    <button
      type="button"
      class="campaign-patient-trigger"
      :aria-expanded="open"
      @click="open = !open"
    >
      {{
        allSelected
          ? "All active leads selected"
          : selectedIds.length
            ? `${selectedIds.length} leads selected`
            : "Select leads"
      }}<small>Search and select multiple leads</small>
    </button>
    <div v-if="allSelected" class="campaign-audience-result">
      All active leads will be included, filtered by gender.
      <button type="button" @click="clearAll">Clear selection</button>
    </div>
    <button
      v-if="!allSelected && selectedIds.length"
      type="button"
      @click="selectedIds = []"
    >
      Clear selected leads
    </button>
    <div
      v-if="!allSelected && displayedSelection.length"
      class="campaign-selected-patients"
    >
      <button
        v-for="lead in displayedSelection"
        :key="lead.id"
        type="button"
        @click="selectedIds = selectedIds.filter((id) => id !== lead.id)"
      >
        {{ lead.label
        }}<template v-if="lead.phone"> ({{ lead.phone }})</template> ×
      </button>
    </div>
    <div v-if="open" class="campaign-patient-dropdown">
      <input
        v-model="search"
        placeholder="Search leads by name or phone"
        aria-label="Search leads"
      />
      <div
        class="campaign-pills lead-picker-actions"
        role="group"
        aria-label="Bulk lead selection"
      >
        <button
          v-if="!allSelected"
          type="button"
          class="selected"
          @click="selectAll"
        >
          Select all active leads
        </button>
        <button v-else type="button" @click="clearAll">Clear all leads</button>
      </div>
      <p v-if="error" role="alert">
        {{ error }} <button type="button" @click="load">Retry</button>
      </p>
      <div v-if="!allSelected" class="campaign-patient-list">
        <p v-if="loading">Loading leads…</p>
        <p v-else-if="!rows.length">No active leads found.</p>
        <template v-else
          ><label
            v-for="lead in rows"
            :key="lead.id"
            class="campaign-patient-option"
            ><input
              type="checkbox"
              :checked="selectedIds.includes(lead.id)"
              @change="toggle(lead)"
            /><span
              >{{ lead.name || "Unnamed lead" }} ({{ lead.phone }})</span
            ></label
          ></template
        >
      </div>
      <div v-if="!allSelected" class="lead-picker-pagination">
        <button
          type="button"
          :disabled="loading || page <= 1"
          @click="previousPage"
        >
          Previous</button
        ><span>{{ total }} leads · Page {{ page }}</span
        ><button
          type="button"
          :disabled="loading || page * 25 >= total"
          @click="nextPage"
        >
          Next
        </button>
      </div>
    </div>
    <p class="campaign-muted">
      Select all includes every active lead matching the gender filter. Specific
      selections use only those leads.
    </p>
  </div>
</template>

<style scoped>
.lead-picker-pagination {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}
.lead-picker-pagination button {
  padding: 6px 10px;
  border: 1px solid #dbe4f0;
  border-radius: 6px;
}
.lead-picker-pagination span,
.campaign-muted {
  font-size: 13px;
}
</style>
