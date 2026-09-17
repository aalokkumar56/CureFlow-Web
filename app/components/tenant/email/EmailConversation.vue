<script setup lang="ts">
	import { PhEnvelopeSimple, PhPaperPlaneRight } from "@phosphor-icons/vue";
	import type { EmailThreadDetail } from "~/utils/email";
	const props = defineProps<{
		detail: EmailThreadDetail | null;
		detailLoading: boolean;
		active: boolean;
		sending: boolean;
	}>();
	const emit = defineEmits<{ send: [subject: string, body: string] }>();
	const subject = ref("");
	const body = ref("");
	const submit = () => {
		if (!body.value.trim() || !props.active || props.sending) return;
		emit("send", subject.value.trim(), body.value.trim());
		subject.value = "";
		body.value = "";
	};
	const formatDate = (value?: string) =>
		value ? new Date(value).toLocaleString() : "—";
</script>
<template>
	<section class="email-conversation">
		<div
			v-if="!props.detail"
			class="email-conversation-empty">
			<PhEnvelopeSimple
				:size="48"
				weight="duotone" />
			<p>Select a thread to view messages.</p>
		</div>
		<template v-else
			><header class="email-conversation-header">
				<div>
					<strong>{{ props.detail.patient_name || "Patient" }}</strong
					><small>{{ props.detail.to_email || "No email recorded" }}</small>
				</div>
			</header>
			<div class="email-message-scroll">
				<div
					v-if="props.detailLoading"
					class="email-empty">
					Loading conversation…
				</div>
				<article
					v-for="message in props.detail.messages || []"
					:key="message.id"
					class="email-message">
					<div class="email-message-heading">
						<strong>{{ message.subject || "(no subject)" }}</strong
						><span :class="`email-status-${message.status || 'unknown'}`">{{
							message.status || "unknown"
						}}</span>
					</div>
					<p>{{ message.body || "" }}</p>
					<small>{{ formatDate(message.created_at) }}</small>
				</article>
				<div
					v-if="!props.detail.messages?.length"
					class="email-empty">
					No messages in this thread.
				</div>
			</div>
			<form
				class="email-composer"
				@submit.prevent="submit">
				<input
					v-model="subject"
					:disabled="!props.active || props.sending"
					placeholder="Subject" /><textarea
					v-model="body"
					:disabled="!props.active || props.sending"
					rows="3"
					:placeholder="
						props.active ? 'Compose email…' : 'Email sending is disabled'
					" /><button
					type="submit"
					class="email-send-button"
					:disabled="!props.active || props.sending || !body.trim()">
					<PhPaperPlaneRight :size="17" />
					{{ props.sending ? "Sending…" : "Send email" }}
				</button>
			</form></template
		>
	</section>
</template>
