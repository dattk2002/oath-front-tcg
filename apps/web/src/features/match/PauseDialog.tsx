import { useEffect, useRef, useState } from "react";
import { openDialog } from "./keyboard";
import RecoveryControls, {
  type RecoveryControlsProps,
} from "./RecoveryControls";
export default function PauseDialog({
  controller,
  disabled,
  snapshot,
  online,
  recovering,
  onRecover,
}: RecoveryControlsProps & {
  disabled: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(
    () =>
      openDialog(dialog.current!, heading.current, () =>
        document.querySelector<HTMLButtonElement>(".match-heading button"),
      ),
    [],
  );
  return (
    <dialog
      ref={dialog}
      className="match-dialog panel"
      aria-labelledby="pause-heading"
      onCancel={(event) => {
        event.preventDefault();
        if (confirm) setConfirm(false);
        else if (!disabled) void controller.submitIntent({ kind: "RESUME" });
      }}
    >
      <h2 id="pause-heading" ref={heading} tabIndex={-1}>
        Tạm dừng
      </h2>
      {confirm ? (
        <>
          <h3>Xác nhận đầu hàng?</h3>
          <p>Trận đấu sẽ kết thúc và được ghi nhận là đầu hàng.</p>
          <button
            disabled={disabled}
            onClick={() => void controller.submitIntent({ kind: "SURRENDER" })}
          >
            Xác nhận đầu hàng
          </button>
          <button disabled={disabled} onClick={() => setConfirm(false)}>
            Quay lại trận
          </button>
        </>
      ) : (
        <>
          <p>Bàn chơi được giữ. Tiếp tục khi bạn sẵn sàng.</p>
          <button
            className="primary"
            disabled={disabled}
            onClick={() => void controller.submitIntent({ kind: "RESUME" })}
          >
            Tiếp tục
          </button>
          <button disabled={disabled} onClick={() => setConfirm(true)}>
            Đầu hàng
          </button>
          <a href="/">Về trang chủ</a>
        </>
      )}
      <RecoveryControls
        snapshot={snapshot}
        controller={controller}
        online={online}
        recovering={recovering}
        onRecover={onRecover}
      />
    </dialog>
  );
}
