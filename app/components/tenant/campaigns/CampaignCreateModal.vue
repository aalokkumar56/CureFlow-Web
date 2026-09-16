<script setup lang="ts">
	import { PhClock, PhUsersThree, PhX } from "@phosphor-icons/vue";
	import type { PatientRecord } from "~/composables/patients/usePatients";
	import type { CampaignAudience, CampaignDraft } from "~/utils/campaigns";
	import { patientList } from "~/utils/patients";
	import { hasPermission, PERMISSIONS } from "~/utils/permissions";
	import LeadAudiencePicker from "./LeadAudiencePicker.vue";

	const props = withDefaults(
		defineProps<{
			open: boolean;
			departments?: string[];
			saving?: boolean;
			previewing?: boolean;
			previewCount?: number | null;
			draft?: CampaignDraft | null;
		}>(),
		{
			departments: () => [],
			saving: false,
			previewing: false,
			previewCount: null,
			draft: null,
		},
	);

	const emit = defineEmits<{
		close: [];
		save: [payload: Record<string, unknown>];
		preview: [audience: CampaignAudience];
		audienceChanged: [];
	}>();

	const form = reactive({
		source: "patients" as "patients" | "leads",
		leadIds: [] as string[],
		allLeads: false,
		name: "",
		description: "",
		messageBody: "",
		tags: "",
		departments: [] as string[],
		statuses: [] as string[],
		genders: [] as string[],
		patientIds: [] as string[],
		inactiveDays: "",
		autoSend: false,
		scheduledAt: "",
	});
	const { $api } = useNuxtApp();
	const auth = useTenantAuth();
	const canUseLeads = computed(() =>
		hasPermission(auth.user.value, PERMISSIONS.LeadView),
	);
	const patients = ref<PatientRecord[]>([]);
	const patientSearch = ref("");
	const patientPickerOpen = ref(false);
	const loadingPatients = ref(false);
	const patientLoadError = ref("");
	const statuses = [
		"new_inquiry",
		"contacted",
		"appointment_scheduled",
		"visited",
		"re_engagement",
	];
	const genders = [
		{ value: "male", label: "Male" },
		{ value: "female", label: "Female" },
		{ value: "other", label: "Other" },
		{ value: "unknown", label: "Unknown" },
	];
	const message = computed(() => form.messageBody || "Your message preview…");
	const hasPhone = (patient: PatientRecord) =>
		String(patient.phone || "").trim().length > 0;
	const availablePatients = computed(() => patients.value.filter(hasPhone));
	const filteredPatients = computed(() => {
		const query = patientSearch.value.trim().toLowerCase();
		if (!query) return availablePatients.value;
		return availablePatients.value.filter((patient) =>
			[patient.name, patient.phone, patient.department, patient.gender]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
				.includes(query),
		);
	});
	const selectedPatients = computed(() =>
		availablePatients.value.filter((patient) =>
			form.patientIds.includes(String(patient.id)),
		),
	);
	const selectedPatientIds = computed(() =>
		selectedPatients.value.map((patient) => String(patient.id)),
	);
	const patientOptionLabel = (patient: PatientRecord) =>
		`${patient.name || "Patient"} (${patient.phone})`;
	const audience = computed<CampaignAudience>(() =>
		form.source === "leads"
			? {
					source: "leads",
					all_leads: form.allLeads,
					lead_ids: form.allLeads ? [] : form.leadIds,
					genders: form.allLeads || !form.leadIds.length ? form.genders : [],
				}
			: {
					source: "patients",
					tags: selectedPatientIds.value.length ? [] : form.tags
						.split(",")
						.map((item) => item.trim())
						.filter(Boolean),
					departments: selectedPatientIds.value.length ? [] : form.departments,
					statuses: selectedPatientIds.value.length ? [] : form.statuses,
					genders: selectedPatientIds.value.length ? [] : form.genders,
					patient_ids: selectedPatientIds.value,
					inactive_days: !selectedPatientIds.value.length && form.inactiveDays ? Number(form.inactiveDays) : null,
				},
	);
	watch(audience, () => emit("audienceChanged"), { deep: true });
	watch(
		() => form.source,
		() => {
			form.patientIds = [];
			form.leadIds = [];
			form.allLeads = false;
			form.genders = [];
			if (form.source === "patients" && !patients.value.length) loadPatients();
		},
	);
	const toggle = (items: string[], item: string) =>
		items.includes(item)
			? items.filter((value) => value !== item)
			: [...items, item];
	const submit = () =>
		emit("save", {
			name: form.name.trim(),
			description: form.description.trim(),
			messageBody: form.messageBody.trim(),
			audience: audience.value,
			...(form.autoSend && form.scheduledAt
				? { scheduledAt: new Date(form.scheduledAt).toISOString() }
				: {}),
		});
	const reset = () => {
		Object.assign(form, {
			source: "patients",
			leadIds: [],
			allLeads: false,
			name: "",
			description: "",
			messageBody: "",
			tags: "",
			departments: [],
			statuses: [],
			genders: [],
			patientIds: [],
			inactiveDays: "",
			autoSend: false,
			scheduledAt: "",
		});
		patientSearch.value = "";
		patientPickerOpen.value = false;
	};
	const close = () => {
		reset();
		emit("close");
	};
	const insert = (token: string) => {
		form.messageBody = `${form.messageBody}${token}`;
	};
	const loadPatients = async () => {
		loadingPatients.value = true;
		patientLoadError.value = "";
		try {
			const result = await $api.get<Record<string, unknown>>("/patients", {
				page: 1,
				page_size: 300,
			});
			patients.value = patientList<PatientRecord>(result).filter(hasPhone);
			form.patientIds = form.patientIds.filter((id) =>
				patients.value.some((patient) => String(patient.id) === id),
			);
		} catch {
			patientLoadError.value = "Patients could not be loaded.";
			patients.value = [];
		} finally {
			loadingPatients.value = false;
		}
	};
	watch(
		() => [props.open, props.draft],
		() => {
			if (!props.open) return;
			if (form.source === "patients" && !patients.value.length) loadPatients();
			if (props.draft) {
				Object.assign(form, {
					name: String(props.draft.draft_name || props.draft.name || ""),
					description: `${String(props.draft.category || "").replace(/_/g, " ")}${props.draft.event_date ? ` · ${props.draft.event_date}` : ""}`,
					messageBody: String(props.draft.suggested_message || ""),
					scheduledAt: props.draft.event_date
						? `${props.draft.event_date}T09:00`
						: "",
				});
			}
		},
		{ immediate: true },
	);
</script>

<template>
	<div v-if="open" class="campaign-modal-backdrop" @click.self="close">
		<section
			class="campaign-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-campaign-title"
		>
			<header>
				<div>
					<p class="campaign-kicker">WHATSAPP CAMPAIGN</p>
					<h2 id="create-campaign-title">Create campaign</h2>
				</div>
				<button type="button" aria-label="Close" @click="close">
					<PhX :size="20" />
				</button>
			</header>
			<div class="campaign-modal-body">
				<label
					>Campaign name *<input
						v-model="form.name"
						placeholder="Diwali Health Checkup"
				/></label>
				<label
					>Description<input
						v-model="form.description"
						placeholder="Optional description"
				/></label>
				<label
					>WhatsApp message *<textarea
						v-model="form.messageBody"
						rows="4"
						placeholder="Hi {name}, our diabetes care package is…"
					/>
				</label>
				<div class="campaign-placeholders">
					<button
						v-for="token in ['{name}', '{doctor}']"
						:key="token"
						type="button"
						@click="insert(token)"
					>
						{{ token }}
					</button>
				</div>
				<div class="campaign-preview">
					<strong>Preview</strong>
					<p>{{ message }}</p>
				</div>
				<div class="campaign-schedule">
					<label class="campaign-switch"
						><input v-model="form.autoSend" type="checkbox" /><span
							><PhClock :size="16" /> Auto-send on schedule</span
						></label
					><label v-if="form.autoSend"
						>Send at<input v-model="form.scheduledAt" type="datetime-local"
					/></label>
				</div>
				<fieldset>
					<legend>Audience filters</legend>
					<div>
						<span class="campaign-field-label">Audience</span>
						<div class="campaign-pills" role="group" aria-label="Audience type">
							<button
								type="button"
								:class="{ selected: form.source === 'patients' }"
								@click="form.source = 'patients'"
							>
								Patients
							</button>
							<button
								v-if="canUseLeads"
								type="button"
								:class="{ selected: form.source === 'leads' }"
								@click="form.source = 'leads'"
							>
								Leads
							</button>
						</div>
					</div>
					<template v-if="form.source === 'patients'">
						<label
							>Tags (comma separated)<input
								v-model="form.tags"
								placeholder="diabetes, high-value"
						/></label>
						<div>
							<span class="campaign-field-label">Departments</span>
							<div class="campaign-pills">
								<button
									v-for="department in props.departments"
									:key="department"
									type="button"
									:class="{ selected: form.departments.includes(department) }"
									@click="
										form.departments = toggle(form.departments, department)
									"
								>
									{{ department }}</button
								><span v-if="!props.departments.length" class="campaign-muted"
									>No departments configured</span
								>
							</div>
						</div>
						<div>
							<span class="campaign-field-label">Patient status</span>
							<div class="campaign-pills">
								<button
									v-for="status in statuses"
									:key="status"
									type="button"
									:class="{ selected: form.statuses.includes(status) }"
									@click="form.statuses = toggle(form.statuses, status)"
								>
									{{ status.replace(/_/g, " ") }}
								</button>
							</div>
						</div>
						<div>
							<span class="campaign-field-label">Patient gender</span>
							<div class="campaign-pills">
								<button
									v-for="gender in genders"
									:key="gender.value"
									type="button"
									:class="{ selected: form.genders.includes(gender.value) }"
									@click="form.genders = toggle(form.genders, gender.value)"
								>
									{{ gender.label }}
								</button>
							</div>
						</div>
						<div class="campaign-patient-picker">
							<span class="campaign-field-label">Specific patients</span>
							<p class="campaign-muted">Selecting specific patients overrides the audience filters, including gender. Clear the selection to use filters.</p>
							<button
								type="button"
								class="campaign-patient-trigger"
								@click="patientPickerOpen = !patientPickerOpen"
							>
								<span>
									{{
										selectedPatientIds.length
											? `${selectedPatientIds.length} patient${selectedPatientIds.length === 1 ? "" : "s"} selected`
											: "Select patients"
									}}
								</span>
								<small>Search and choose multiple patients</small>
							</button>
							<div
								v-if="selectedPatients.length"
								class="campaign-selected-patients"
							>
								<button
									v-for="patient in selectedPatients"
									:key="patient.id"
									type="button"
									@click="
										form.patientIds = toggle(
											form.patientIds,
											String(patient.id),
										)
									"
								>
									{{ patientOptionLabel(patient) }}
									<PhX :size="12" />
								</button>
							</div>
							<div v-if="patientPickerOpen" class="campaign-patient-dropdown">
								<input
									v-model="patientSearch"
									placeholder="Search by name, phone, department, or gender"
								/>
								<div class="campaign-patient-list">
									<p v-if="loadingPatients">Loading patients…</p>
									<p v-else-if="patientLoadError">{{ patientLoadError }}</p>
									<p v-else-if="!availablePatients.length">
										No patients with phone numbers found.
									</p>
									<template v-else>
										<label
											v-for="patient in filteredPatients"
											:key="patient.id"
											class="campaign-patient-option"
										>
											<input
												type="checkbox"
												:checked="form.patientIds.includes(String(patient.id))"
												@change="
													form.patientIds = toggle(
														form.patientIds,
														String(patient.id),
													)
												"
											/>
											<span>{{ patientOptionLabel(patient) }}</span>
										</label>
									</template>
									<p
										v-if="
											!loadingPatients &&
											!patientLoadError &&
											!filteredPatients.length
										"
									>
										No matching patients.
									</p>
								</div>
							</div>
						</div>
						<label
							>Inactive for (days)<input
								v-model="form.inactiveDays"
								type="number"
								min="1"
								placeholder="e.g. 90"
						/></label>
					</template>
					<template v-else>
						<div>
							<span class="campaign-field-label">Lead gender</span>
							<div class="campaign-pills">
								<button
									v-for="gender in genders"
									:key="gender.value"
									type="button"
									:class="{ selected: form.genders.includes(gender.value) }"
									@click="form.genders = toggle(form.genders, gender.value)"
								>
									{{ gender.label }}
								</button>
							</div>
						</div>
						<LeadAudiencePicker
							v-model="form.leadIds"
							v-model:all-selected="form.allLeads"
						/>
					</template>
					<button
						type="button"
						class="campaign-preview-button"
						:disabled="previewing"
						@click="emit('preview', audience)"
					>
						<PhUsersThree :size="16" />
						{{ previewing ? "Calculating…" : "Preview audience" }}
					</button>
					<p v-if="previewCount != null" class="campaign-audience-result">
						{{ previewCount }} unique phone number{{
							previewCount === 1 ? "" : "s"
						}}
						in this audience.
					</p>
				</fieldset>
			</div>
			<footer>
				<button type="button" class="campaign-secondary-button" @click="close">
					Cancel
				</button>
				<button
					type="button"
					class="campaign-primary-button"
					:disabled="
						saving ||
						!form.name.trim() ||
						!form.messageBody.trim() ||
						(form.autoSend && !form.scheduledAt)
					"
					@click="submit"
				>
					{{
						saving
							? "Saving…"
							: form.autoSend
								? "Schedule campaign"
								: "Create draft"
					}}
				</button>
			</footer>
		</section>
	</div>
</template>
