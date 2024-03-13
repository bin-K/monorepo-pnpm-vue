<template>
	<div>
		<h1>{{ str }}</h1>
		<Button />
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { checkType } from '@monorepo/shared/utils'
import { Button } from '@monorepo/shared/components'

const str = ref('样式测试')

onMounted(() => {
	console.log(checkType(666))
})
</script>

<style scoped>
@import url('@monorepo/shared/styles/index.scss');
.logo {
	height: 6em;
	padding: 1.5em;
	will-change: filter;
	transition: filter 300ms;
}
.logo:hover {
	filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
	filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
