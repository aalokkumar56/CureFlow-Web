<script setup lang="ts">
	import {
		PhCalendarBlank,
		PhChecks,
		PhUsersThree,
		PhWhatsappLogo,
	} from "@phosphor-icons/vue";
	import {
		campaignMessage,
		formatCampaignShortDate,
		type Campaign,
	} from "~/utils/campaigns";

	defineProps<{ campaign: Campaign; themeIndex?: number }>();
</script>

<template>
	<NuxtLink
		:to="`/campaigns/${campaign.id}`"
		class="campaign-card"
		:class="`theme-${(themeIndex || 0) % 5}`">
		<div class="campaign-card-preview">
			<div class="campaign-card-channel">
				<PhWhatsappLogo
					:size="15"
					weight="fill" /><span>{{
					formatCampaignShortDate(
						campaign.scheduled_at || campaign.sent_at || campaign.created_at,
					) || "Draft message"
				}}</span>
			</div>
			<div class="campaign-message-bubble">
				{{ campaignMessage(campaign)
				}}<small
					>11:30 AM
					<PhChecks
						:size="12"
						weight="bold"
				/></small>
			</div>
		</div>
		<div class="campaign-card-content">
			<div class="campaign-card-title">
				<strong>{{ campaign.name || "Untitled campaign" }}</strong
				><span
					class="campaign-status"
					:class="`status-${campaign.status || 'draft'}`"
					>{{ campaign.status || "draft" }}</span
				>
			</div>
			<div class="campaign-card-meta">
				<span
					v-if="
						campaign.scheduled_at || campaign.sent_at || campaign.created_at
					"
					><PhCalendarBlank :size="13" />
					{{
						formatCampaignShortDate(
							campaign.scheduled_at || campaign.sent_at || campaign.created_at,
						)
					}}</span
				><span
					><PhUsersThree :size="13" />
					{{ campaign.total_recipients ?? 0 }}</span
				>
			</div>
		</div>
	</NuxtLink>
</template>
