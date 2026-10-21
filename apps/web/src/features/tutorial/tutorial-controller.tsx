import type { PlayerView, TutorialView } from "@oathfront/contracts";
export interface TutorialStep {
  title: string;
  copy: string;
  continueLabel: string;
}
const instructions: Record<TutorialView["stepId"], string> = {
  G01: "Select Lanternkeeper, then choose lane 2 to block Ash Soldier.",
  G02: "You spent your 1 energy. Leaf Knight costs 2 and cannot be played yet. Requires 2 energy; you have 0.",
  G03: "Seed Tender in lane 4 has no enemy opposite, so it will attack the hero directly. Select End phase.",
  G04: "Use Lantern Ray on Ash Soldier in lane 4 to clear a path for your unit.",
  G05: "Leaf Knight and Furnace Guard both have 2 ATK / 3 HP. Each will deal 2 damage. Select End phase.",
  G06: "Play Shieldseed in lane 3. Elder Lanternwood grants 1 HP to units played here from hand.",
  G07: "You received Oath of Growth. Use it now for free on Leaf Knight in lane 4, or keep it to use for 1 energy during the Dawnward phase.",
  G08: "Locations reveal on turns 1, 3 and 5. Lanes 2 and 4 are always normal. You are ready for a match.",
  E01: "Ashen Court deploys units first. Play Ash Soldier in lane 2, then end deployment.",
  E02: "You can now see Dawnward's units. Use Coal Lance on Lanternkeeper in lane 5, then select End tricks.",
};
const results: Partial<Record<TutorialView["stepId"], string>> = {
  G01: "Units in the same lane fight each other. Newly played units can attack immediately.",
  G03: "Lane 4 dealt 1 damage to the hero. Lane 2 blocked the attack path.",
  G04: "Tricks take effect immediately. You are still in the Dawnward phase.",
  G05: "The Ashen Court attack appears first, but the Dawnward unit still deals damage in the same combat.",
  G06: "Existing units are unchanged. The newly played Shieldseed gained +0/+1.",
  G07: "Your choice was saved. Continue to see the location on turn 5.",
  E01: "You have 2 energy left for tricks. Energy does not refill between Ashen Court's two phases.",
  E02: "Leaf Knight has 1 HP left. The unit in lane 4 dealt 2 damage to the Dawnward hero.",
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
      "Turn 3 is next: the location in lane 3 will reveal. Units already here do not gain its entry bonus retroactively.";
  if (progress.stepId === "G07" && !view.blockResponse && !ready)
    copy = "Your meter is at 6/8. The next combat attack will be blocked.";
  if (progress.stepId === "G08" && !ready)
    copy = "Finishing turn 4 and revealing the location on turn 5…";
  const chapter = {
    A: "Units and energy",
    B: "Play tricks",
    C: "Location",
    D: "Block response",
    E: "Ashen Court's two phases",
  }[progress.chapterId];
  return {
    title: `Scenario ${progress.chapterId === "E" ? 1 : "ABCD".indexOf(progress.chapterId) + 1}: ${chapter}`,
    copy,
    continueLabel:
      progress.stepId === "G02"
        ? "Got it"
        : ["G08", "E02"].includes(progress.stepId)
          ? "Finish"
          : ["G03", "G05", "G06"].includes(progress.stepId)
            ? "Next lesson"
            : "Continue",
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
              `An unconfirmed tutorial request for ${saved.scenarioId === "tutorial_v1" ? "Dawnward" : "Ashen Court"} is pending. Retry that request before choosing another lesson.`,
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
          "You have an active match. Resume it before starting a tutorial.",
        );
      } else {
        setMessage(
          `Tutorial creation is unconfirmed. Restore your session if needed, then retry the same request.${durable ? "" : " The request could not be saved; keep this page open and do not reload."}`,
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
          ? "Opening tutorial…"
          : message && !conflict
            ? "Retry tutorial"
            : label}
      </button>
      {message && <p role="status">{message}</p>}
      {conflict && <a href={`/matches/${conflict}`}>Resume match</a>}
      <SessionRecovery />
      {onDismiss && !busy && <button onClick={onDismiss}>Close</button>}
    </section>
  );
}
