<script setup lang="ts">
	import { PhClock, PhUsersThree, PhX } from "@phosphor-icons/vue";
	import type { CampaignAudience, CampaignDraft } from "~/utils/campaigns";

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
	}>();

	const form = reactive({
		name: "",
		description: "",
		messageBody: "",
		tags: "",
		departments: [] as string[],
		statuses: [] as string[],
		inactiveDays: "",
		autoSend: false,
		scheduledAt: "",
	});
	const statuses = [
		"new_inquiry",
		"contacted",
		"appointment_scheduled",
		"visited",
		"re_engagement",
	];
	const message = computed(() => form.messageBody || "Your message preview…");
	const audience = computed<CampaignAudience>(() => ({
		tags: form.tags
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean),
		departments: form.departments,
		statuses: form.statuses,
		inactive_days: form.inactiveDays ? Number(form.inactiveDays) : null,
	}));
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
	const reset = () =>
		Object.assign(form, {
			name: "",
			description: "",
			messageBody: "",
			tags: "",
			departments: [],
			statuses: [],
			inactiveDays: "",
			autoSend: false,
			scheduledAt: "",
		});
	const close = () => {
		reset();
		emit("close");
	};
	const insert = (token: string) => {
		form.messageBody = `${form.messageBody}${token}`;
	};
	watch(
		() => [props.open, props.draft],
		() => {
			if (!props.open || !props.draft) return;
			Object.assign(form, {
				name: String(props.draft.draft_name || props.draft.name || ""),
				description: `${String(props.draft.category || "").replace(/_/g, " ")}${props.draft.event_date ? ` · ${props.draft.event_date}` : ""}`,
				messageBody: String(props.draft.suggested_message || ""),
				scheduledAt: props.draft.event_date
					? `${props.draft.event_date}T09:00`
					: "",
			});
		},
		{ immediate: true },
	);
</script>

<template>
	<div
		v-if="open"
		class="campaign-modal-backdrop"
		@click.self="close">
		<section
			class="campaign-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-campaign-title">
			<header>
				<div>
					<p class="campaign-kicker">WHATSAPP CAMPAIGN</p>
					<h2 id="create-campaign-title">Create campaign</h2>
				</div>
				<button
					type="button"
					aria-label="Close"
					@click="close">
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
						placeholder="Hi {name}, our diabetes care package is…" />
				</label>
				<div class="campaign-placeholders">
					<button
						v-for="token in ['{name}', '{doctor}']"
						:key="token"
						type="button"
						@click="insert(token)">
						{{ token }}
					</button>
				</div>
				<div class="campaign-preview">
					<strong>Preview</strong>
					<p>{{ message }}</p>
				</div>
				<div class="campaign-schedule">
					<label class="campaign-switch"
						><input
							v-model="form.autoSend"
							type="checkbox" /><span
							><PhClock :size="16" /> Auto-send on schedule</span
						></label
					><label v-if="form.autoSend"
						>Send at<input
							v-model="form.scheduledAt"
							type="datetime-local"
					/></label>
				</div>
				<fieldset>
					<legend>Audience filters</legend>
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
								">
								{{ department }}</button
							><span
								v-if="!props.departments.length"
								class="campaign-muted"
								>No departments configured</span
							>
						</div>
					</div>
					<div>
						<span class="campaign-field-label">Lead status</span>
						<div class="campaign-pills">
							<button
								v-for="status in statuses"
								:key="status"
								type="button"
								:class="{ selected: form.statuses.includes(status) }"
								@click="form.statuses = toggle(form.statuses, status)">
								{{ status.replace(/_/g, " ") }}
							</button>
						</div>
					</div>
					<label
						>Inactive for (days)<input
							v-model="form.inactiveDays"
							type="number"
							min="1"
							placeholder="e.g. 90" /></label
					><button
						type="button"
						class="campaign-preview-button"
						:disabled="previewing"
						@click="emit('preview', audience)">
						<PhUsersThree :size="16" />
						{{ previewing ? "Calculating…" : "Preview audience" }}
					</button>
					<p
						v-if="previewCount != null"
						class="campaign-audience-result">
						{{ previewCount }} patient{{ previewCount === 1 ? "" : "s" }} match
						this audience.
					</p>
				</fieldset>
			</div>
			<footer>
				<button
					type="button"
					class="campaign-secondary-button"
					@click="close">
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
					@click="submit">
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
