<script setup lang="ts">
	import type { Component } from "vue";
	import { formatRupee, type AnalyticsItem } from "~/utils/analytics";
	const props = defineProps<{
		title: string;
		subtitle: string;
		icon: Component;
		items: AnalyticsItem[];
		empty: string;
		categoryLoss?: number;
		accent?: string;
	}>();
	const sectionSlug = computed(() =>
		props.title.toLowerCase().replace(/\s+/g, "-"),
	);
</script>
<template>
	<section
		class="analytics-section"
		:data-testid="`analytics-section-${sectionSlug}`">
		<header class="analytics-section-header">
			<span
				class="analytics-section-icon"
				:class="accent || 'accent-green'"
				><component
					:is="icon"
					:size="17"
			/></span>
			<div>
				<h2>{{ title }}</h2>
				<p>{{ subtitle }}</p>
			</div>
			<div class="analytics-section-count">
				<b>{{ items.length }}</b
				><small v-if="Number(categoryLoss || 0) > 0">{{
					formatRupee(categoryLoss)
				}}</small>
			</div>
		</header>
		<div class="analytics-section-body">
			<p
				v-if="!items.length"
				class="analytics-section-empty">
				{{ empty }}
			</p>
			<div
				v-for="(item, index) in items"
				:key="item.id || index"
				class="analytics-item">
				<slot :item="item" />
			</div>
		</div>
	</section>
</template>
