/** A fresh gate may retain its own artifacts without overwriting historical acceptance evidence. */
export function evidencePath(task: string, fallback: string) {
  return process.env.OATHFRONT_EVIDENCE_ROOT
    ? `${process.env.OATHFRONT_EVIDENCE_ROOT}/${task}`
    : fallback;
}
