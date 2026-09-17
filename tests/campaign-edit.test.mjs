import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import * as vue from "vue";

// Execute the actual component setup with Vue reactivity and mocked network boundaries.
function setup(file, bindings, expose) {
  const source = readFileSync(new URL("../" + file, import.meta.url), "utf8")
    .match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
    .replace(/import[\s\S]*?from\s*['"][^'"]+['"];?/g, "");
  const js = ts.transpile(source + "\nreturn {" + expose + "}", {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.None,
  });
  const globals = {
    ref: vue.ref,
    reactive: vue.reactive,
    computed: vue.computed,
    watch: vue.watch,
    onScopeDispose: vue.onScopeDispose,
    ...bindings,
  };
  const scope = vue.effectScope();
  const result = scope.run(() =>
    new Function(...Object.keys(globals), js)(...Object.values(globals)),
  );
  return { ...result, stop: () => scope.stop() };
}
function editor(campaign) {
  const events = [];
  const props = vue.reactive({
    open: true,
    campaign,
    draft: null,
    saving: false,
  });
  const result = setup(
    "app/components/tenant/campaigns/CampaignCreateModal.vue",
    {
      defineProps: () => props,
      withDefaults: (p) => p,
      defineEmits:
        () =>
        (...args) =>
          events.push(args),
      useNuxtApp: () => ({ $api: { get: async () => ({ items: [] }) } }),
      useTenantAuth: () => ({ user: vue.ref({}) }),
      hasPermission: () => true,
      PERMISSIONS: {},
      patientList: (r) => r.items,
    },
    "form, audience, submit, close, changeSource, validationError",
  );
  return { ...result, props, events };
}
test("editing preserves selected patients absent from loaded page and does not mutate original", async () => {
  const campaign = {
    id: "1",
    status: "draft",
    name: "Original",
    message_body: "Hello",
    audience: { patient_ids: ["missing"], genders: ["female"] },
  };
  const e = editor(campaign);
  await vue.nextTick();
  assert.deepEqual(e.audience.value.patient_ids, ["missing"]);
  e.form.name = "Updated";
  e.submit();
  assert.equal(e.events.find((x) => x[0] === "save")[1].name, "Updated");
  assert.equal(campaign.name, "Original");
  assert.deepEqual(campaign.audience.patient_ids, ["missing"]);
  e.stop();
});
test("lead prefill survives watchers, local schedule round trips, and removal clears schedule", async () => {
  const date = new Date(Date.now() + 86400000);
  date.setSeconds(0, 0);
  const e = editor({
    id: 1,
    name: "Lead campaign",
    messageBody: "Hi",
    status: "scheduled",
    scheduled_at: date.toISOString(),
    audience: { source: "leads", lead_ids: ["a", "b"] },
  });
  await vue.nextTick();
  assert.deepEqual(e.audience.value.lead_ids, ["a", "b"]);
  e.submit();
  assert.equal(
    e.events.find((x) => x[0] === "save")[1].scheduledAt,
    date.toISOString(),
  );
  e.form.autoSend = false;
  e.submit();
  assert.equal(
    e.events.filter((x) => x[0] === "save").at(-1)[1].clearSchedule,
    true,
  );
  e.stop();
});
test("invalid values cannot submit and saving cannot close or submit again", () => {
  const e = editor({ id: 1, name: "Test", message_body: "Hi", audience: {} });
  e.form.autoSend = true;
  e.form.scheduledAt = "2020-01-01T12:00";
  e.submit();
  assert.equal(e.events.filter((x) => x[0] === "save").length, 0);
  e.form.autoSend = false;
  e.form.inactiveDays = "-1";
  e.submit();
  assert.equal(e.events.filter((x) => x[0] === "save").length, 0);
  e.form.inactiveDays = "";
  e.props.saving = true;
  e.submit();
  e.close();
  assert.equal(
    e.events.filter((x) => ["save", "close"].includes(x[0])).length,
    0,
  );
  e.stop();
});
test("reopening create after edit resets all state", async () => {
  const e = editor({
    id: 1,
    name: "Old",
    message_body: "Hello",
    audience: { source: "leads", lead_ids: ["a"] },
  });
  e.props.open = false;
  await vue.nextTick();
  e.props.campaign = null;
  e.props.open = true;
  await vue.nextTick();
  assert.equal(e.form.name, "");
  assert.equal(e.form.source, "patients");
  assert.deepEqual(e.form.leadIds, []);
  e.stop();
});
test("toggling leads keeps preselected IDs that are not loaded", () => {
  const ids = vue.ref(["existing"]);
  const all = vue.ref(false);
  const picker = setup(
    "app/components/tenant/campaigns/LeadAudiencePicker.vue",
    {
      defineModel: (name) => (name === "allSelected" ? all : ids),
      useLeads: () => ({
        list: async () => ({ items: [], total: 0 }),
        $api: {
          get: async () => ({
            lead: { id: "existing", name: "Existing lead", phone: "123" },
          }),
        },
      }),
    },
    "toggle",
  );
  picker.toggle({ id: "new", name: "New" });
  assert.deepEqual(ids.value, ["existing", "new"]);
  picker.toggle({ id: "new" });
  assert.deepEqual(ids.value, ["existing"]);
  picker.stop();
});

test("detail update targets existing campaign, retains failed edits, refreshes after success, and blocks sent campaigns", async () => {
  let reject = true;
  let loads = 0;
  const updates = [];
  const original = {
    id: "campaign-42",
    name: "Saved",
    status: "draft",
    audience: {},
  };
  const page = setup(
    "app/pages/(tenant)/campaigns/[id].vue",
    {
      definePageMeta: () => {},
      useHead: () => {},
      onMounted: () => {},
      useRoute: () => ({ params: { id: original.id } }),
      useRouter: () => ({}),
      useTenantAuth: () => ({ user: vue.ref({}) }),
      hasPermission: () => true,
      PERMISSIONS: {},
      useNuxtApp: () => ({
        $api: {
          get: async () => {
            loads++;
            return { campaign: original };
          },
        },
      }),
      normalizeApiError: (_cause, fallback) => fallback,
      useCampaigns: () => ({
        departments: vue.ref([]),
        loadMetadata: async () => {},
        previewAudience: async () => ({ count: 2 }),
        update: async (id, payload) => {
          updates.push({ id, payload });
          if (reject) throw new Error("offline");
        },
      }),
    },
    "campaign, editOpen, editError, actionLoading, openEdit, saveEdit, canEdit",
  );
  page.campaign.value = original;
  page.openEdit();
  await page.saveEdit({ name: "Changed" });
  assert.equal(page.editOpen.value, true);
  assert.equal(page.actionLoading.value, false);
  assert.equal(page.editError.value, "Campaign could not be updated.");
  assert.equal(updates[0].id, original.id);
  assert.equal(loads, 0);
  reject = false;
  await page.saveEdit({ name: "Changed" });
  assert.equal(page.editOpen.value, false);
  assert.equal(loads, 1);
  page.campaign.value = { ...original, status: "sent" };
  assert.equal(page.canEdit.value, false);
  await page.saveEdit({ name: "Forbidden" });
  assert.equal(updates.length, 2);
  page.stop();
});

test("saved lead names are restored without opening the picker and late lookups cannot restore removed IDs", async () => {
  const ids = vue.ref(["saved"]);
  let resolve;
  const pending = new Promise((r) => {
    resolve = r;
  });
  const picker = setup(
    "app/components/tenant/campaigns/LeadAudiencePicker.vue",
    {
      defineModel: (name) => (name === "allSelected" ? vue.ref(false) : ids),
      useLeads: () => ({
        list: async () => ({ items: [], total: 0 }),
        $api: { get: () => pending },
      }),
    },
    "displayedSelection, selected",
  );
  assert.equal(picker.displayedSelection.value[0].id, "saved");
  resolve({ lead: { id: "saved", name: "Saved lead", phone: "123" } });
  await new Promise((r) => setImmediate(r));
  assert.equal(picker.displayedSelection.value[0].label, "Saved lead");
  ids.value = [];
  await vue.nextTick();
  assert.deepEqual(picker.displayedSelection.value, []);
  picker.stop();
});

test("save and reopen restores the new source and IDs; ignored audience updates remain open", async () => {
  let persisted = {
    id: "campaign",
    name: "Campaign",
    message_body: "Hello",
    status: "draft",
    audience: { source: "patients", patient_ids: ["patient"] },
  };
  let ignoreAudience = false;
  const page = setup(
    "app/pages/(tenant)/campaigns/[id].vue",
    {
      definePageMeta: () => {},
      useHead: () => {},
      onMounted: () => {},
      useRoute: () => ({ params: { id: "campaign" } }),
      useRouter: () => ({}),
      useTenantAuth: () => ({ user: vue.ref({}) }),
      hasPermission: () => true,
      PERMISSIONS: {},
      normalizeApiError: (_cause, fallback) => fallback,
      useNuxtApp: () => ({
        $api: {
          get: async () => ({
            campaign: structuredClone(persisted),
            audience: structuredClone(persisted.audience),
          }),
        },
      }),
      useCampaigns: () => ({
        departments: vue.ref([]),
        loadMetadata: async () => {},
        update: async (_id, payload) => {
          if (!ignoreAudience)
            persisted = {
              ...persisted,
              ...JSON.parse(JSON.stringify(payload)),
            };
        },
      }),
    },
    "load, editingCampaign, openEdit, editOpen, editError, saveEdit",
  );
  await page.load();
  page.openEdit();
  const first = editor(page.editingCampaign.value);
  first.changeSource("leads");
  first.form.leadIds = ["lead-a", "lead-b"];
  first.submit();
  await page.saveEdit(first.events.find((e) => e[0] === "save")[1]);
  assert.equal(page.editOpen.value, false);
  page.openEdit();
  const reopened = editor(page.editingCampaign.value);
  assert.equal(reopened.form.source, "leads");
  assert.deepEqual(reopened.form.leadIds, ["lead-a", "lead-b"]);
  ignoreAudience = true;
  await page.saveEdit({
    audience: { source: "patients", patient_ids: ["different"] },
  });
  assert.equal(page.editOpen.value, true);
  assert.match(page.editError.value, /not saved/);
  assert.equal(page.editingCampaign.value.audience.source, "leads");
  first.stop();
  reopened.stop();
  page.stop();
});
