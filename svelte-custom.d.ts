declare namespace svelte.JSX {
  interface HTMLAttributes<T> {
    onclick_outside?: (ev: MouseEvent) => void;
  }
}
