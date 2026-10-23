import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import RecoveryControls from "../src/features/match/RecoveryControls";
import { createIntentController } from "../src/features/match/intent-controller";
import { createMatchViewStore } from "../src/features/match/view-store";
import { latestBoardRecoveryError } from "../src/features/match/recovery";
import { realtimeUnavailableMessage } from "../src/features/match/realtime";
import { response } from "./fixtures";

it.each([latestBoardRecoveryError, realtimeUnavailableMessage])(
  "keeps failure copy and manual recovery after Escape clears a command message: %s",
  (recoveryMessage) => {
    const store = createMatchViewStore(response());
    const controller = createIntentController(store, {
      makeId: () => "command-id",
      send: async () => response(),
    });
    store.setMessage("Invalid target. Choose a highlighted area.");
    store.setSelection({ instanceId: "card0001", unitInstanceId: null });
    controller.cancelSelection();
    expect(store.getSnapshot().message).toBeNull();
    expect(store.getSnapshot().selection).toBeNull();
    const html = renderToStaticMarkup(
      createElement(RecoveryControls, {
        snapshot: store.getSnapshot(),
        controller,
        online: true,
        recovering: false,
        recoveryMessage,
        onRecover() {},
      }),
    );
    expect(html).toContain('data-active="true"');
    expect(html).toContain(recoveryMessage);
    expect(html).toContain("<button>Reconnect</button>");
  },
);

it("keeps receipt retry available alongside a persistent board recovery failure", () => {
  const store = createMatchViewStore(response());
  const controller = createIntentController(store, {
    makeId: () => "command-id",
    send: async () => response(),
  });
  store.setPending({
    envelope: {
      commandId: "command-id",
      expectedRevision: 1,
      action: { kind: "PASS_PHASE" },
    },
    status: "UNCERTAIN",
  });
  const html = renderToStaticMarkup(
    createElement(RecoveryControls, {
      snapshot: store.getSnapshot(),
      controller,
      online: true,
      recovering: false,
      recoveryMessage: latestBoardRecoveryError,
      onRecover() {},
    }),
  );
  expect(html).toContain(latestBoardRecoveryError);
  expect(html).toContain("<button>Reconnect</button>");
  expect(html).toContain("<button>Retry request</button>");
});
