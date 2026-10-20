import type { LocationDefinition } from "@oathfront/contracts";
export const locations: LocationDefinition[] = [
  {
    id: "ancient_forest",
    locationVersion: "locations_v1",
    nameVi: "Rừng Cổ Đăng",
    group: "BUFF",
    hook: "ON_UNIT_PLAYED",
    exactTextVi: "Nhân vật được chơi từ tay vào đây nhận +0/+1 vĩnh viễn.",
    artKey: "locations/ancient_forest.webp",
    rule: {
      kind: "ENTRY_HEALTH",
      amount: 1,
      duration: "PERMANENT",
    },
  },
  {
    id: "volcano",
    locationVersion: "locations_v1",
    nameVi: "Miệng Lò Tro",
    group: "HAZARD",
    hook: "AFTER_LANE_COMBAT",
    exactTextVi:
      "Sau giao tranh ở lane này và các phản hồi block, gây 1 sát thương đồng thời lên mọi quân còn sống ở đây.",
    artKey: "locations/volcano.webp",
    rule: {
      kind: "AFTER_COMBAT_DAMAGE",
      amount: 1,
      simultaneous: true,
    },
  },
  {
    id: "storm_peak",
    locationVersion: "locations_v1",
    nameVi: "Đỉnh Ngân Lôi",
    group: "BUFF",
    hook: "BEFORE_ATTACK",
    exactTextVi:
      "Quân ở đây có ATK in trên card không quá 3 nhận +1 ATK cho regular attack này.",
    artKey: "locations/storm_peak.webp",
    rule: {
      kind: "ATTACK_BONUS",
      amount: 1,
      condition: "PRINTED_ATTACK_AT_MOST_3",
      duration: "REGULAR_ATTACK",
    },
  },
  {
    id: "frozen_lake",
    locationVersion: "locations_v1",
    nameVi: "Hồ Kính Lạnh",
    group: "CONTROL",
    hook: "ON_UNIT_PLAYED",
    exactTextVi:
      "Nhân vật được chơi từ tay vào đây bị Kiệt sức đến hết lượt hiện tại.",
    artKey: "locations/frozen_lake.webp",
    rule: {
      kind: "ENTRY_EXHAUST",
      duration: "TURN_END",
    },
  },
  {
    id: "desert",
    locationVersion: "locations_v1",
    nameVi: "Cồn Cát Chuông",
    group: "COST",
    hook: "COST_MODIFIER",
    exactTextVi: "Chơi card nhân vật từ tay vào đây tốn thêm 1 năng lượng.",
    artKey: "locations/desert.webp",
    rule: {
      kind: "UNIT_COST",
      amount: 1,
    },
  },
  {
    id: "healing_spring",
    locationVersion: "locations_v1",
    nameVi: "Suối Chồi Non",
    group: "BUFF",
    hook: "END_TURN",
    exactTextVi:
      "Cuối lượt, sau Độc và trigger quân, hồi 1 HP cho mỗi quân còn sống ở đây.",
    artKey: "locations/healing_spring.webp",
    rule: {
      kind: "END_TURN_HEAL",
      amount: 1,
    },
  },
  {
    id: "ruined_arena",
    locationVersion: "locations_v1",
    nameVi: "Đấu Trường Vỡ",
    group: "BUFF",
    hook: "BEFORE_ATTACK",
    exactTextVi:
      "Quân ở đây nhận +1 ATK cho regular attack này nếu lane có quân đối phương lúc chụp snapshot.",
    artKey: "locations/ruined_arena.webp",
    rule: {
      kind: "ATTACK_BONUS",
      amount: 1,
      condition: "ENEMY_PRESENT_AT_SNAPSHOT",
      duration: "REGULAR_ATTACK",
    },
  },
  {
    id: "quiet_meadow",
    locationVersion: "locations_v1",
    nameVi: "Đồng Cỏ Yên",
    group: "NEUTRAL",
    hook: "NONE",
    exactTextVi: "Không có hiệu ứng.",
    artKey: "locations/quiet_meadow.webp",
    rule: {
      kind: "NONE",
    },
  },
];
