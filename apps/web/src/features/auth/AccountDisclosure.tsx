import { useUiMotion } from "../motion/use-ui-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Keep AuthPanel mounted so pending authentication and recovery still run. */
export default function AccountDisclosure({
  children,
  name,
}: {
  children: ReactNode;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useUiMotion(panel, "panel", open ? "open" : "closed", open);
  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    let previous = false;
    const check = () => {
      const next = !!element.querySelector('[data-urgent="true"]');
      setUrgent(next);
      if (next && !previous) setOpen(true);
      previous = next;
    };
    const observer = new MutationObserver(check);
    observer.observe(element, {
      attributes: true,
      attributeFilter: ["data-urgent"],
      subtree: true,
      childList: true,
    });
    check();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        !panel.current?.querySelector("dialog[open]")
      ) {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div className="account-disclosure" ref={root}>
      <button
        ref={button}
        className="account-trigger"
        aria-expanded={open}
        aria-controls="player-account"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21v-3a7 7 0 0 1 14 0v3" />
        </svg>
        <span>{name ?? "Account"}</span>
        {urgent && (
          <span className="account-attention" aria-label="Action needed" />
        )}
      </button>
      <div
        id="player-account"
        className="account-popover"
        ref={panel}
        hidden={!open}
      >
        <div className="account-popover-heading">
          <strong>Your progress</strong>
          <button
            aria-label="Close account controls"
            onClick={() => {
              setOpen(false);
              button.current?.focus();
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
