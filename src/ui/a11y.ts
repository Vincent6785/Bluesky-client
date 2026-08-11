import type { KeyboardEvent } from "react";

/**
 * Lets a non-native clickable element (`role="link"` + `tabIndex={0}`)
 * respond to Enter the way a real `<a>` would — plain `onClick` alone only
 * fires on pointer/touch activation, never on keyboard.
 */
export function onLinkActivateKey(onActivate: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onActivate();
    }
  };
}
