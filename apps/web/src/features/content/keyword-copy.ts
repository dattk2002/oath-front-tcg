export const keywordCopy: Record<string, string> = {
  SHIELD: "Blocks one positive damage packet, then consumes Shield.",
  ARMOR: "Reduces each damage packet by 1; does not stack.",
  POISONED: "Takes 1 damage at turn end; Poison does not stack.",
  STUNNED:
    "Cannot attack for the rest of this turn; still blocks the lane and triggers abilities.",
  PIERCE:
    "Regular attacks damage both the blocking unit and the hero behind it.",
  MOVE: "Changes lanes while keeping HP, statuses and its attack marker.",
};
