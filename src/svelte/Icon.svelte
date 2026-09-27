<script lang="ts">
  export let name:
    | 'chevron'
    | 'disclosure'
    | 'settings'
    | 'search'
    | 'close'
    | 'collapse'
    | 'expand'
    | 'refresh'
    | 'arrow-right'
    | 'file'
  export let direction: 'up' | 'down' | 'left' | 'right' = 'down'
</script>

<svg
  class="checklist-icon"
  class:chevron={name === 'chevron' || name === 'disclosure'}
  class:rotated={(name === 'chevron' || name === 'disclosure') &&
    direction === 'right'}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true">
  {#if name === 'refresh'}<path
      d="M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.55-1L20 9M4 15l2.35 3A7 7 0 0 0 18 17" />
  {:else if name === 'disclosure'}<path
      d="m8 10 4 6 4-6z"
      fill="currentColor"
      stroke="none" />
  {:else if name === 'chevron'}<path d="m7 10 5 5 5-5" />
  {:else if name === 'settings'}<path d="M4 7h9m4 0h3M4 17h3m4 0h9" /><circle
      cx="15"
      cy="7"
      r="2" /><circle cx="9" cy="17" r="2" />
  {:else if name === 'search'}<circle cx="10.5" cy="10.5" r="6.5" /><path
      d="m16 16 4 4" />
  {:else if name === 'close'}<path d="m6 6 12 12M6 18 18 6" />
  {:else if name === 'collapse'}<path d="M5 4h14M5 20h14m-12-10 5 4 5-4" />
  {:else if name === 'expand'}<path d="M5 4h14M5 20h14m-12-6 5-4 5 4" />
  {:else if name === 'arrow-right'}<path d="M5 12h14m-6-6 6 6-6 6" />
  {:else if name === 'file'}<path d="M14 3H5v18h14V8zm0 0v5h5" />{/if}
</svg>

<style>
  .checklist-icon {
    width: 16px;
    height: 16px;
    min-width: 16px;
    flex-shrink: 0;
    display: block;
    pointer-events: none;
  }
  .chevron {
    transition: transform 120ms ease;
  }
  .rotated {
    transform: rotate(-90deg);
  }
  @media (prefers-reduced-motion: reduce) {
    .chevron {
      transition: none;
    }
  }
</style>
