import type {
  ClassId,
  Phase,
  Side,
  UnitView,
  VisibleEvent,
} from "@oathfront/contracts";
export const sideLabel: Record<Side, string> = { GOOD: "Thiện", EVIL: "Ác" };
export const phaseLabel: Record<Phase, string> = {
  MULLIGAN: "Đổi bài",
  TURN_START: "Bắt đầu lượt",
  EVIL_DEPLOY: "Triển khai Ác",
  GOOD_PLAY: "Lượt Thiện",
  EVIL_TRICKS: "Mưu kế Ác",
  COMBAT: "Giao tranh",
  TURN_END: "Kết thúc lượt",
  GAME_OVER: "Kết thúc trận",
};
export const classLabel: Record<ClassId, string> = {
  BASTION: "Thành Lũy",
  VERDANT: "Sinh Mạch",
  PRISM: "Lăng Kính",
  FURNACE: "Lò Lửa",
  HEX: "Hắc Chú",
  VEIL: "Màn Sương",
};
export const keywordLabel: Record<string, string> = {
  SHIELD: "Khiên",
  ARMOR: "Giáp",
  POISONED: "Độc",
  STUNNED: "Choáng",
  EXHAUSTED: "Kiệt sức",
  PIERCE: "Xuyên",
  MOVE: "Di chuyển",
};
export function unitStatuses(unit: UnitView) {
  return Object.entries(unit.statuses)
    .filter(([, value]) => !!value)
    .map(
      ([key, value]) =>
        `${keywordLabel[key.toUpperCase()]}${typeof value === "number" ? ` ${value}` : ""}`,
    );
}

export const eventLabel: Partial<Record<VisibleEvent["kind"], string>> = {
  MatchStarted: "Bắt đầu trận",
  MulliganCommitted: "Đã xác nhận đổi bài",
  CardPlayed: "Chơi bài",
  UnitCreated: "Triển khai quân",
  PowerUsed: "Dùng siêu năng lực",
  PhaseChanged: "Chuyển pha",
  TurnStarted: "Bắt đầu lượt",
  UnitDestroyed: "Quân bị hạ",
  DamageBatchResolved: "Giải quyết sát thương",
  LocationRevealed: "Mở địa hình",
  LifecycleChanged: "Trạng thái trận thay đổi",
};
