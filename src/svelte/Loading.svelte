<script lang="ts">
</script>

<div class="loader" />

<style>
  .loader {
    background: transparent !important;
    border-radius: 100%;
    border: 2px solid;
    display: flex;
    animation-fill-mode: both;
    margin: 0 auto;
    animation: niceSpinLoader 0.75s 0s infinite linear;
    border-color: var(--todoList-loaderBorderColor);

    width: var(--todoList-loaderSize);
    height: var(--todoList-loaderSize);
  }

  @keyframes niceSpinLoader {
    0% {
      transform: rotate(0deg);
    }

    50% {
      transform: rotate(180deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }
</style>
