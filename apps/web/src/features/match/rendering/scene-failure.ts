/** Public recovery reasons; raw browser/driver errors stay out of product copy. */
export type SceneFailureReason =
  | "graphics-unavailable"
  | "context-lost"
  | "scene-load-failed"
  | "render-failed";

export class SceneFailure extends Error {
  constructor(
    readonly reason: SceneFailureReason,
    cause?: unknown,
  ) {
    super(reason, { cause });
    this.name = "SceneFailure";
  }
}
