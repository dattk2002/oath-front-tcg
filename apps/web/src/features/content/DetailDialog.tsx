import { useEffect, useId, useRef, type ReactNode } from "react";
import { openDialog } from "../match/keyboard";
import { useUiMotion } from "../motion/use-ui-motion";
export default function DetailDialog({
  title,
  label,
  children,
  onClose,
}: {
  title: string;
  label: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => openDialog(dialog.current!, heading.current), []);
  useUiMotion(dialog, "panel");
  return (
    <dialog
      className="lobby-dialog"
      ref={dialog}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="lobby-dialog-heading">
        <h2 ref={heading} id={id} tabIndex={-1}>
          {title}
        </h2>
        <button aria-label={`Close ${label.toLowerCase()}`} onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
