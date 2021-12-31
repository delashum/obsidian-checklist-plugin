export function clickOutside(node) {
  const handleClick = (event: MouseEvent) => {
    if (node && !node.contains(event.target) && !event.defaultPrevented) {
      node.dispatchEvent(new CustomEvent("click_outside", node))
    }
  }

  document.addEventListener("mousedown", handleClick, true)

  return {
    destroy() {
      document.removeEventListener("mousedown", handleClick, true)
    },
  }
}
