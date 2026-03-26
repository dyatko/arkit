<template>
  <div class="app">
    <Hello />
  </div>
</template>

<script>
import Hello from './Hello.vue';

export default {
  name: 'App',
  components: { Hello }
};
</script>

<style>
.app { color: red; }
</style>
