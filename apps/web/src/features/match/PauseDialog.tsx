import SettingsDialog from "../settings/SettingsDialog";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(
    () =>
      openDialog(dialog.current!, heading.current, () =>
        document.querySelector<HTMLButtonElement>("[data-pause-control]"),
      ),
    [],
  );
  return (
    <dialog
      ref={dialog}
      className="match-dialog panel"
      aria-labelledby="pause-heading"
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
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
          <h3>
            {snapshot.authoritativeView.mode === "TUTORIAL"
              ? "Bỏ qua hướng dẫn?"
              : "Xác nhận đầu hàng?"}
          </h3>
          <p>
            {snapshot.authoritativeView.mode === "TUTORIAL"
              ? "Bạn có thể học lại bất kỳ lúc nào; không tính thua."
              : "Trận đấu sẽ kết thúc và được ghi nhận là đầu hàng."}
          </p>
          <button
            disabled={disabled}
            onClick={() =>
              void controller.submitIntent({
                kind:
                  snapshot.authoritativeView.mode === "TUTORIAL"
                    ? "TUTORIAL_SKIP"
                    : "SURRENDER",
              })
            }
          >
            {snapshot.authoritativeView.mode === "TUTORIAL"
              ? "Xác nhận bỏ qua"
              : "Xác nhận đầu hàng"}
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
            {snapshot.authoritativeView.mode === "TUTORIAL"
              ? "Bỏ qua hướng dẫn"
              : "Đầu hàng"}
          </button>
          <a href="/">Về trang chủ</a>
        </>
      )}
      <button onClick={() => setSettingsOpen(true)}>Cài đặt</button>
      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} />
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
