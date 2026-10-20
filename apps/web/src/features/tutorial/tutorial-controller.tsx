import type { PlayerView, TutorialView } from "@oathfront/contracts";
export interface TutorialStep {
  title: string;
  copy: string;
  continueLabel: string;
}
const instructions: Record<TutorialView["stepId"], string> = {
  G01: "Chọn Người Gác Đèn, rồi chọn lane 2 để chặn Lính Tro.",
  G02: "Bạn đã dùng hết 1 năng lượng. Kỵ Sĩ Lá cần 2 nên chưa thể chơi. Cần 2 năng lượng, hiện có 0.",
  G03: "Người Trồng Mầm ở lane 4 không gặp quân địch, nên sẽ đánh thẳng hero. Bấm Kết thúc hành động.",
  G04: "Dùng Tia Đèn lên Lính Tro ở lane 4 để mở đường cho quân mình.",
  G05: "Kỵ Sĩ Lá và Gác Lò đều 2 công / 3 HP. Cả hai sẽ gây 2 sát thương. Bấm Kết thúc hành động.",
  G06: "Chơi Mầm Khiên vào lane 3. Rừng Cổ Đăng tăng 1 HP cho quân chơi từ tay vào đây.",
  G07: "Bạn nhận Lời Thề Nảy Mầm. Dùng ngay miễn phí lên Kỵ Sĩ Lá ở lane 4, hoặc giữ để dùng giá 1 trong pha Thiện.",
  G08: "Location mở ở các lượt 1, 3, 5. Lane 2 và 4 luôn thường. Bạn đã sẵn sàng chơi một trận.",
  E01: "Phe Ác chơi nhân vật trước. Chơi Lính Tro vào lane 2, rồi kết thúc triển khai.",
  E02: "Giờ bạn đã thấy quân của phe Thiện. Dùng Mũi Than lên Người Gác Đèn ở lane 5, rồi Kết thúc trick.",
};
const results: Partial<Record<TutorialView["stepId"], string>> = {
  G01: "Quân cùng lane sẽ giao tranh. Quân vừa chơi có thể đánh ngay.",
  G03: "Lane 4 gây 1 sát thương lên hero. Lane 2 đã chặn đường tấn công.",
  G04: "Trick có hiệu lực ngay. Bạn vẫn đang ở pha Thiện.",
  G05: "Đòn ác hiện trước, nhưng quân thiện vẫn gây sát thương trong cùng giao tranh.",
  G06: "Quân cũ giữ nguyên. Mầm Khiên mới nhận +0/+1.",
  G07: "Lựa chọn đã được giữ. Tiếp tục để xem Location ở lượt 5.",
  E01: "Bạn còn 2 mana cho pha trick. Năng lượng không hồi lại giữa hai pha Ác.",
  E02: "GC02 còn 1 HP. Quân ở lane 4 gây 2 sát thương lên hero Thiện.",
};
export function getTutorialStep(
  view: PlayerView,
  progress: TutorialView,
): TutorialStep {
  const ready = progress.stepState === "AWAITING_CONTINUE";
  let copy = ready
    ? (results[progress.stepId] ?? instructions[progress.stepId])
    : instructions[progress.stepId];
  if (progress.stepId === "G06" && view.turn < 3)
    copy =
      "Sắp sang lượt 3: Location ở lane 3 sẽ được mở. Quân đã có ở đây không được buff hồi tố.";
  if (progress.stepId === "G07" && !view.blockResponse && !ready)
    copy = "Meter đang 6/8. Đòn combat tiếp theo sẽ được chặn.";
  if (progress.stepId === "G08" && !ready)
    copy = "Đang hoàn tất lượt 4 và mở Location ở lượt 5…";
  const chapter = {
    A: "Đặt quân và năng lượng",
    B: "Dùng trick",
    C: "Location",
    D: "Phản hồi block",
    E: "Hai pha của phe Ác",
  }[progress.chapterId];
  return {
    title: `Tình huống ${progress.chapterId === "E" ? 1 : "ABCD".indexOf(progress.chapterId) + 1}: ${chapter}`,
    copy,
    continueLabel:
      progress.stepId === "G02"
        ? "Đã hiểu"
        : ["G08", "E02"].includes(progress.stepId)
          ? "Hoàn thành"
          : ["G03", "G05", "G06"].includes(progress.stepId)
            ? "Bài tiếp theo"
            : "Tiếp tục",
  };
}

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { validateBrowserWire } from "@oathfront/contracts/browser";
import type { CreateMatchRequest } from "@oathfront/contracts";
import type { ApiClient } from "../match/api-client";
import { ApiError } from "../match/api-error";
import { usePrivateStorage } from "../auth/private-storage";
import SessionRecovery from "../auth/SessionRecovery";
/** Explicit retries retain the principal-scoped create identity across session renewal. */
export function TutorialEntry({
  api,
  side,
  label,
  autoStart = false,
  onDismiss,
}: {
  api: ApiClient;
  side: "GOOD" | "EVIL";
  label: string;
  autoStart?: boolean;
  onDismiss?: () => void;
}) {
  const storage = usePrivateStorage(),
    router = useRouter();
  const pending = useRef<CreateMatchRequest | null>(null),
    sending = useRef(false),
    started = useRef(false);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [conflict, setConflict] = useState<string | null>(null);
  const key = "oathfront.tutorial.create";
  async function start() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setMessage("");
    if (!pending.current) {
      try {
        const saved: unknown = JSON.parse(storage.getItem(key) ?? "null");
        if (
          validateBrowserWire("CreateMatchRequest", saved) &&
          saved.mode === "TUTORIAL"
        ) {
          pending.current = saved;
          const expected = side === "GOOD" ? "tutorial_v1" : "tutorial_evil_v1";
          if (saved.scenarioId !== expected) {
            setMessage(
              `Có yêu cầu hướng dẫn phe ${saved.scenarioId === "tutorial_v1" ? "Thiện" : "Ác"} chưa được xác nhận. Thử lại yêu cầu này trước khi chọn bài khác.`,
            );
            sending.current = false;
            setBusy(false);
            return;
          }
        }
      } catch {
        /* Memory identity is retained below. */
      }
    }
    const request = pending.current ?? {
      commandId: crypto.randomUUID(),
      mode: "TUTORIAL" as const,
      scenarioId:
        side === "GOOD"
          ? ("tutorial_v1" as const)
          : ("tutorial_evil_v1" as const),
    };
    pending.current = request;
    let durable = true;
    try {
      storage.setItem(key, JSON.stringify(request));
    } catch {
      durable = false;
    }
    try {
      const response = await api.createMatch(request);
      try {
        storage.removeItem(key);
      } catch {
        /* Confirmed receipt. */
      }
      pending.current = null;
      router.push(`/matches/${response.view.matchId}`);
      onDismiss?.();
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.body.error.code === "ACTIVE_MATCH_EXISTS"
      ) {
        setConflict(e.body.error.details.matchId);
        pending.current = null;
        try {
          storage.removeItem(key);
        } catch {
          /* Confirmed rejection. */
        }
        setMessage(
          "Bạn có một trận đang diễn ra. Tiếp tục trận đó trước khi mở hướng dẫn.",
        );
      } else {
        setMessage(
          `Chưa xác định kết quả tạo hướng dẫn. Khôi phục phiên nếu cần rồi thử lại cùng yêu cầu.${durable ? "" : " Không lưu được yêu cầu; giữ trang này, không tải lại."}`,
        );
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      void start();
    }
  }, [autoStart]);
  return (
    <section className="tutorial-entry">
      <button disabled={busy || !!conflict} onClick={() => void start()}>
        {busy
          ? "Đang mở hướng dẫn…"
          : message && !conflict
            ? "Thử lại mở hướng dẫn"
            : label}
      </button>
      {message && <p role="status">{message}</p>}
      {conflict && <a href={`/matches/${conflict}`}>Tiếp tục trận</a>}
      <SessionRecovery />
      {onDismiss && !busy && <button onClick={onDismiss}>Đóng</button>}
    </section>
  );
}
