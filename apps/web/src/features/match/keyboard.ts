import type { KeyboardEvent } from "react";
export function groupArrows(event: KeyboardEvent<HTMLElement>) {
  if (
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    ![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ].includes(event.key)
  )
    return;
  const buttons = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>(
      "button:not(:disabled)",
    ),
  );
  const index = buttons.indexOf(event.target as HTMLButtonElement);
  if (index < 0) return;
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : (index +
            (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) +
            buttons.length) %
          buttons.length;
  event.preventDefault();
  buttons[next]?.focus();
}
export function openDialog(
  dialog: HTMLDialogElement,
  heading: HTMLElement | null,
  restoreFocus?: () => HTMLElement | null,
) {
  const previous = document.activeElement;
  dialog.showModal();
  heading?.focus();
  const trapTab = (event: globalThis.KeyboardEvent) => {
    if (event.key !== "Tab" || event.ctrlKey || event.altKey || event.metaKey)
      return;
    const controls = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]",
      ),
    ).filter(
      (element) => element.tabIndex >= 0 && element.getClientRects().length,
    );
    const first = controls[0],
      last = controls.at(-1),
      current = document.activeElement;
    // Native modality makes the page inert, but Chromium can still tab to its
    // browser chrome (document.activeElement becomes BODY) after the last control.
    if (!first || !last) {
      event.preventDefault();
      heading?.focus();
    } else if (
      event.shiftKey &&
      (current === first || !controls.includes(current as HTMLElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  };
  dialog.addEventListener("keydown", trapTab);
  return () => {
    dialog.removeEventListener("keydown", trapTab);
    dialog.close();
    const target = restoreFocus?.() ?? previous;
    if (target instanceof HTMLElement && target.isConnected) target.focus();
  };
}
