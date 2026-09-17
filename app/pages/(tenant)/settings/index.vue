<script setup lang="ts">
import {
  PhBell,
  PhBuildings,
  PhChatText,
  PhFloppyDisk,
  PhPlus,
  PhPlugs,
  PhTrash,
} from '@phosphor-icons/vue'
import SettingsNavigation from '~/components/tenant/settings/SettingsNavigation.vue'
import UsersSettingsPanel from '~/components/tenant/settings/UsersSettingsPanel.vue'
import RolesSettingsPanel from '~/components/tenant/settings/RolesSettingsPanel.vue'
import PermissionsSettingsPanel from '~/components/tenant/settings/PermissionsSettingsPanel.vue'
import { useSettings } from '~/composables/settings/useSettings'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
import { settingsSections, type SettingsSection } from '~/utils/settings'
import { normalizeApiError } from '~/utils/api/errors'

definePageMeta({
  layout: 'tenant',
  middleware: ['tenant-auth', 'tenant-approval'],
})
useHead({ title: 'Settings' })
const auth = useTenantAuth()
const canView = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.SettingsView),
)
const canEdit = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.SettingsEdit),
)
const {
  profile,
  departments,
  integrations,
  templates,
  loading,
  saving,
  error,
  load,
  saveHospital,
  saveIntegration,
  createTemplate,
  removeTemplate,
} = useSettings()
const route = useRoute()
const router = useRouter()
const section = computed<SettingsSection>(
  () =>
    (settingsSections.some((item) => item.id === route.query.section)
      ? route.query.section
      : 'hospital') as SettingsSection,
)
const actionError = ref('')
const newDepartment = ref('')
const templateForm = reactive({ name: '', body: '', category: 'general' })
const selectSection = async (next: SettingsSection) => {
  await router.replace({ query: { section: next } })
}
const save = async (task: () => Promise<void>, message: string) => {
  actionError.value = ''
  try {
    await task()
    return true
  } catch (cause) {
    actionError.value = normalizeApiError(cause, message)
    return false
  }
}
const addDepartment = () => {
  const value = newDepartment.value.trim()
  if (
    value &&
    !departments.value.some(
      (item) => item.toLowerCase() === value.toLowerCase(),
    )
  )
    departments.value = [...departments.value, value].sort()
  newDepartment.value = ''
}
const addTemplate = async () => {
  if (!templateForm.name.trim() || !templateForm.body.trim()) {
    actionError.value = 'Template name and body are required.'
    return
  }
  const saved = await save(
    () =>
      createTemplate({
        ...templateForm,
        name: templateForm.name.trim(),
        body: templateForm.body.trim(),
      }),
    'Template could not be created.',
  )
  if (saved)
    Object.assign(templateForm, { name: '', body: '', category: 'general' })
}
const integrationStatus = (kind: 'whatsapp' | 'sms' | 'email') => {
  const item = integrations[kind]
  if (kind === 'whatsapp')
    return Boolean(
      item.enabled &&
      item.provider === 'MetaCloud' &&
      item.phone_number_id &&
      (item.has_access_token || item.access_token),
    )
  if (kind === 'sms')
    return Boolean(
      item.enabled && item.gateway_url && (item.has_api_key || item.api_key),
    )
  return Boolean(item.enabled && item.smtp_host && item.from_email)
}
onMounted(() => {
  if (canView.value) void load(section.value)
})
watch(section, (value) => {
  if (canView.value) void load(value)
})
</script>

<template>
  <section class="settings-page">
    <div v-if="!canView" class="settings-state">
      You do not have permission to view settings.
    </div>
    <template v-else>
      <div v-if="actionError" class="settings-alert">{{ actionError }}</div>
      <div v-if="loading" class="settings-state">Loading settings…</div>
      <div v-else-if="error" class="settings-state">
        <p>{{ error }}</p>
        <button
          type="button"
          class="settings-secondary-button"
          @click="load(section)"
        >
          Try again
        </button>
      </div>
      <div v-else class="settings-layout">
        <SettingsNavigation :section="section" @select="selectSection" />
        <main class="settings-content">
          <UsersSettingsPanel v-if="section === 'users'" />
          <RolesSettingsPanel v-else-if="section === 'roles'" />
          <PermissionsSettingsPanel v-else-if="section === 'permissions'" />
          <section v-else-if="section === 'hospital'" class="settings-card">
            <header>
              <div>
                <h3><PhBuildings :size="18" /> Hospital profile</h3>
                <p>
                  Profile, timezone, and departments used across this hospital.
                </p>
              </div>
              <button
                v-if="canEdit"
                type="button"
                class="settings-primary-button"
                :disabled="saving"
                @click="
                  save(saveHospital, 'Hospital settings could not be saved.')
                "
              >
                <PhFloppyDisk :size="16" />
                {{ saving ? 'Saving…' : 'Save changes' }}
              </button>
            </header>
            <fieldset :disabled="!canEdit || saving" class="settings-form-grid">
              <label>Hospital name<input v-model="profile.name" /></label
              ><label>Phone<input v-model="profile.phone" /></label
              ><label>Email<input v-model="profile.email" type="email" /></label
              ><label
                >Timezone<input
                  v-model="profile.timezone"
                  placeholder="Asia/Kolkata" /></label
              ><label class="settings-full-field"
                >Address<textarea v-model="profile.address" rows="3" />
              </label>
            </fieldset>
            <div class="settings-subsection">
              <h4>Departments</h4>
              <p>Used for appointments, patient assignment, and filters.</p>
              <div class="settings-chips">
                <span v-for="department in departments" :key="department"
                  >{{ department
                  }}<button
                    v-if="canEdit"
                    type="button"
                    :aria-label="`Remove ${department}`"
                    @click="
                      departments = departments.filter(
                        (item) => item !== department,
                      )
                    "
                  >
                    <PhTrash :size="13" /></button></span
                ><small v-if="!departments.length"
                  >No departments configured.</small
                >
              </div>
              <div v-if="canEdit" class="settings-add-row">
                <input
                  v-model="newDepartment"
                  placeholder="Add department"
                  @keydown.enter.prevent="addDepartment"
                /><button
                  type="button"
                  class="settings-secondary-button"
                  @click="addDepartment"
                >
                  <PhPlus :size="15" /> Add
                </button>
              </div>
              <button
                v-if="canEdit"
                type="button"
                class="settings-primary-button"
                :disabled="saving"
                @click="save(saveHospital, 'Departments could not be saved.')"
              >
                Save departments
              </button>
            </div>
          </section>
          <section v-else-if="section === 'integrations'" class="settings-card">
            <header>
              <div>
                <h3><PhPlugs :size="18" /> Integrations</h3>
                <p>Configure communication providers used by this tenant.</p>
              </div>
            </header>
            <div class="integration-list">
              <article>
                <div>
                  <strong>WhatsApp Business</strong>
                  <p>Enable WhatsApp messaging and inbox communication.</p>
                </div>
                <span
                  class="integration-status"
                  :class="{ active: integrationStatus('whatsapp') }"
                  >{{
                    integrationStatus('whatsapp') ? 'Active' : 'Not connected'
                  }}</span
                ><button
                  v-if="canEdit"
                  :disabled="
                    saving || integrations.whatsapp.provider !== 'MetaCloud'
                  "
                  type="button"
                  class="settings-secondary-button"
                  @click="
                    save(
                      () => saveIntegration('whatsapp'),
                      'WhatsApp settings could not be saved.',
                    )
                  "
                >
                  Save WhatsApp
                </button>
                <p
                  v-if="integrations.whatsapp.provider === 'WhatsBiz'"
                  class="settings-alert"
                >
                  WhatsBiz configuration is disabled. Select Meta Cloud API to
                  configure a supported connection.
                </p>
                <fieldset
                  :disabled="!canEdit || saving"
                  class="integration-fields"
                >
                  <label
                    >Provider<select v-model="integrations.whatsapp.provider">
                      <option value="MetaCloud">Meta Cloud API</option>
                      <option value="WhatsBiz" disabled>
                        WhatsBiz — not supported
                      </option>
                    </select></label
                  ><label
                    >Phone number ID<input
                      v-model="integrations.whatsapp.phone_number_id" /></label
                  ><label
                    >WABA ID<input
                      v-model="integrations.whatsapp.waba_id" /></label
                  ><label
                    >Verify token<input
                      v-model="integrations.whatsapp.verify_token" /></label
                  ><label
                    >App secret<input
                      v-model="integrations.whatsapp.app_secret"
                      type="password"
                      placeholder="Leave blank to keep existing" /></label
                  ><label
                    >Business name<input
                      v-model="integrations.whatsapp.business_name" /></label
                  ><label
                    >Access token<input
                      v-model="integrations.whatsapp.access_token"
                      type="password"
                      placeholder="Leave blank to keep existing" /></label
                  ><label class="toggle-field"
                    ><input
                      v-model="integrations.whatsapp.enabled"
                      type="checkbox"
                    />
                    Enable WhatsApp</label
                  >
                </fieldset>
              </article>
              <article>
                <div>
                  <strong>SMS Gateway</strong>
                  <p>Transactional SMS configuration.</p>
                </div>
                <span
                  class="integration-status"
                  :class="{ active: integrationStatus('sms') }"
                  >{{
                    integrationStatus('sms') ? 'Active' : 'Not connected'
                  }}</span
                ><button
                  v-if="canEdit"
                  type="button"
                  class="settings-secondary-button"
                  @click="
                    save(
                      () => saveIntegration('sms'),
                      'SMS settings could not be saved.',
                    )
                  "
                >
                  Save SMS
                </button>
                <fieldset
                  :disabled="!canEdit || saving"
                  class="integration-fields"
                >
                  <label
                    >Gateway URL<input
                      v-model="integrations.sms.gateway_url" /></label
                  ><label
                    >API key<input
                      v-model="integrations.sms.api_key"
                      type="password"
                      placeholder="Leave blank to keep existing" /></label
                  ><label
                    >Sender ID<input
                      v-model="integrations.sms.sender_id" /></label
                  ><label class="toggle-field"
                    ><input
                      v-model="integrations.sms.enabled"
                      type="checkbox"
                    />
                    Enable SMS</label
                  >
                </fieldset>
              </article>
              <article>
                <div>
                  <strong>Email (SMTP)</strong>
                  <p>Email notifications and appointment communication.</p>
                </div>
                <span
                  class="integration-status"
                  :class="{ active: integrationStatus('email') }"
                  >{{
                    integrationStatus('email') ? 'Active' : 'Not connected'
                  }}</span
                ><button
                  v-if="canEdit"
                  type="button"
                  class="settings-secondary-button"
                  @click="
                    save(
                      () => saveIntegration('email'),
                      'Email settings could not be saved.',
                    )
                  "
                >
                  Save email
                </button>
                <fieldset
                  :disabled="!canEdit || saving"
                  class="integration-fields"
                >
                  <label
                    >SMTP host<input
                      v-model="integrations.email.smtp_host" /></label
                  ><label
                    >SMTP port<input
                      v-model="integrations.email.smtp_port"
                      type="number" /></label
                  ><label
                    >From email<input
                      v-model="integrations.email.from_email"
                      type="email" /></label
                  ><label
                    >SMTP username<input
                      v-model="integrations.email.smtp_username"
                      autocomplete="off" /></label
                  ><label
                    >From name<input
                      v-model="integrations.email.from_name" /></label
                  ><label class="toggle-field"
                    ><input
                      v-model="integrations.email.use_ssl"
                      type="checkbox"
                    />
                    Use SSL/TLS</label
                  ><label class="toggle-field"
                    ><input
                      v-model="integrations.email.send_with_whatsapp"
                      type="checkbox"
                    />
                    Send email with WhatsApp for appointments</label
                  ><label
                    >SMTP password<input
                      v-model="integrations.email.smtp_password"
                      type="password"
                      placeholder="Leave blank to keep existing" /></label
                  ><label class="toggle-field"
                    ><input
                      v-model="integrations.email.enabled"
                      type="checkbox"
                    />
                    Enable email</label
                  >
                </fieldset>
              </article>
            </div>
          </section>
          <TenantSettingsNotificationPreferences
            v-else-if="section === 'notifications'"
            :manage-roles="canEdit"
          />
          <section v-else class="settings-card">
            <header>
              <div>
                <h3><PhChatText :size="18" /> Message templates</h3>
                <p>
                  Reusable templates for WhatsApp and patient communication.
                </p>
              </div>
            </header>
            <form class="template-form" @submit.prevent="addTemplate">
              <input
                v-model="templateForm.name"
                placeholder="Template name"
              /><select v-model="templateForm.category">
                <option value="general">General</option>
                <option value="appointment">Appointment</option>
                <option value="follow_up">Follow-up</option>
                <option value="marketing">Marketing</option></select
              ><textarea
                v-model="templateForm.body"
                rows="3"
                placeholder="Message body…"
              /><button
                v-if="canEdit"
                type="submit"
                class="settings-primary-button"
                :disabled="saving"
              >
                <PhPlus :size="16" /> Add template
              </button>
            </form>
            <div class="template-list">
              <article v-for="template in templates" :key="template.id">
                <div>
                  <strong>{{ template.name }}</strong
                  ><small>{{ template.category || 'general' }}</small>
                  <p>{{ template.body || 'No message body' }}</p>
                </div>
                <button
                  v-if="canEdit"
                  type="button"
                  class="settings-delete-button"
                  aria-label="Delete template"
                  @click="
                    save(
                      () => removeTemplate(template.id),
                      'Template could not be deleted.',
                    )
                  "
                >
                  <PhTrash :size="16" />
                </button>
              </article>
              <p v-if="!templates.length" class="settings-empty">
                No templates yet.
              </p>
            </div>
          </section>
        </main>
      </div>
    </template>
  </section>
</template>
