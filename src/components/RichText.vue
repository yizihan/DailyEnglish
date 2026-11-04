<script setup lang="ts">
import type { Rich } from "../domain/content";
defineProps<{ value: Rich; lang?: string }>();
</script>
<template><div :lang="lang" class="rich" v-html="value.html"></div></template>
