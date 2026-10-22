/* Generated from docs/contracts/api-v1.schema.json. Run pnpm contracts:generate. */

/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "Uuid".
 */
export type Uuid = string;
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "InstanceId".
 */
export type InstanceId = string;
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "Side".
 */
export type Side = "GOOD" | "EVIL";
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "LaneId".
 */
export type LaneId = number;
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "Version".
 */
export type Version = string;
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "DateTime".
 */
export type DateTime = string;
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "CardId".
 */
export type CardId =
  | "GC01"
  | "GC02"
  | "GC03"
  | "GC04"
  | "GC05"
  | "GC06"
  | "B01"
  | "B02"
  | "B03"
  | "B04"
  | "B05"
  | "B06"
  | "B07"
  | "B08"
  | "V01"
  | "V02"
  | "V03"
  | "V04"
  | "V05"
  | "V06"
  | "V07"
  | "V08"
  | "P01"
  | "P02"
  | "P03"
  | "P04"
  | "P05"
  | "P06"
  | "P07"
  | "P08"
  | "EC01"
  | "EC02"
  | "EC03"
  | "EC04"
  | "EC05"
  | "EC06"
  | "F01"
  | "F02"
  | "F03"
  | "F04"
  | "F05"
  | "F06"
  | "F07"
  | "F08"
  | "X01"
  | "X02"
  | "X03"
  | "X04"
  | "X05"
  | "X06"
  | "X07"
  | "X08"
  | "S01"
  | "S02"
  | "S03"
  | "S04"
  | "S05"
  | "S06"
  | "S07"
  | "S08";
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "HeroId".
 */
export type HeroId =
  | "H_G_BV"
  | "H_G_BP"
  | "H_G_VP"
  | "H_E_FX"
  | "H_E_FS"
  | "H_E_XS"
  | "H_G_SOL"
  | "H_G_CAI"
  | "H_G_ZEP"
  | "H_G_MER"
  | "H_G_MOS"
  | "H_G_HAL"
  | "H_G_ROW"
  | "H_E_ROO"
  | "H_E_NYX"
  | "H_E_BRI"
  | "H_E_SAB"
  | "H_E_VAN"
  | "H_E_GRA"
  | "H_E_SCO";
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "PowerId".
 */
export type PowerId =
  | "P_B1"
  | "P_B2"
  | "P_V1"
  | "P_V2"
  | "P_P1"
  | "P_P2"
  | "P_F1"
  | "P_F2"
  | "P_X1"
  | "P_X2"
  | "P_S1"
  | "P_S2"
  | "S_G_BV"
  | "S_G_BP"
  | "S_G_VP"
  | "S_E_FX"
  | "S_E_FS"
  | "S_E_XS"
  | "S_G_SOL"
  | "S_G_CAI"
  | "S_G_ZEP"
  | "S_G_MER"
  | "S_G_MOS"
  | "S_G_HAL"
  | "S_G_ROW"
  | "S_E_ROO"
  | "S_E_NYX"
  | "S_E_BRI"
  | "S_E_SAB"
  | "S_E_VAN"
  | "S_E_GRA"
  | "S_E_SCO";
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "TokenId".
 */
export type TokenId = "TK_G_SEED" | "TK_G_LANTERN" | "TK_E_CINDER";
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "LocationId".
 */
export type LocationId =
  | "ancient_forest"
  | "volcano"
  | "storm_peak"
  | "frozen_lake"
  | "desert"
  | "healing_spring"
  | "ruined_arena"
  | "quiet_meadow";
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "DefinitionId".
 */
export type DefinitionId = CardId | PowerId | TokenId;
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "Phase".
 */
export type Phase =
  "MULLIGAN" | "TURN_START" | "EVIL_DEPLOY" | "GOOD_PLAY" | "EVIL_TRICKS" | "COMBAT" | "TURN_END" | "GAME_OVER";
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "Lifecycle".
 */
export type Lifecycle = "ACTIVE" | "PAUSED" | "COMPLETED" | "ABANDONED" | "FAULTED";
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "EntityRef".
 */
export type EntityRef =
  | {
      kind: "UNIT";
      instanceId: InstanceId;
    }
  | {
      kind: "HERO";
      side: Side;
    };
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "Target".
 */
export type Target =
  | {
      kind: "NONE";
    }
  | {
      kind: "UNIT";
      instanceId: InstanceId;
    }
  | {
      kind: "HERO";
      side: Side;
    }
  | {
      kind: "LANE";
      laneId: LaneId;
    }
  | {
      kind: "UNIT_AND_LANE";
      instanceId: InstanceId;
      laneId: LaneId;
    };
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "StepId".
 */
export type StepId = "G01" | "G02" | "G03" | "G04" | "G05" | "G06" | "G07" | "G08" | "E01" | "E02";
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "ChapterId".
 */
export type ChapterId = "A" | "B" | "C" | "D" | "E";
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "PlayerAction".
 */
export type PlayerAction =
  | {
      kind: "MULLIGAN";
      /**
       * @minItems 0
       * @maxItems 4
       */
      cardInstanceIds: InstanceId[];
    }
  | {
      kind: "PLAY_UNIT";
      cardInstanceId: InstanceId;
      laneId: LaneId;
    }
  | {
      kind: "PLAY_TRICK";
      cardInstanceId: InstanceId;
      target: Target;
    }
  | {
      kind: "USE_POWER";
      powerInstanceId: InstanceId;
      target: Target;
    }
  | {
      kind: "USE_BLOCK_POWER";
      powerInstanceId: InstanceId;
      target: Target;
    }
  | {
      kind: "PASS_PHASE";
    }
  | {
      kind: "KEEP_BLOCK_POWER";
    }
  | {
      kind: "ADVANCE";
    }
  | {
      kind: "PAUSE";
    }
  | {
      kind: "RESUME";
    }
  | {
      kind: "SURRENDER";
    }
  | {
      kind: "TUTORIAL_CONTINUE";
      stepId: StepId;
    }
  | {
      kind: "TUTORIAL_RESTART";
      chapterId: ChapterId;
    }
  | {
      kind: "TUTORIAL_SKIP";
    };
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "LocationView".
 */
export type LocationView =
  | {
      state: "NORMAL";
    }
  | {
      state: "HIDDEN";
      revealTurn: 1 | 3 | 5;
    }
  | {
      state: "REVEALED";
      definitionId: LocationId;
      revealTurn: number;
    };
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "BlockResponse".
 */
export type BlockResponse =
  | {
      visibility: "OWN";
      side: Side;
      laneId: LaneId;
      powerInstanceId: InstanceId;
      costNow: 0;
    }
  | {
      visibility: "OPPONENT";
      side: Side;
      laneId: LaneId;
    };
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "VisibleEvent".
 */
export type VisibleEvent =
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "MatchStarted";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        mode: "SKIRMISH" | "TUTORIAL";
        heroes: {
          GOOD: HeroId;
          EVIL: HeroId;
        };
        versions: Versions;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "MulliganCommitted";
      visibility: "OWNER";
      ownerSide: Side;
      payload: {
        side: Side;
        replacedCount: number;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "TurnStarted";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        turn: number;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "LocationRevealed";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        laneId: LaneId;
        definitionId: LocationId;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "EnergyRefilled";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        side: Side;
        before: number;
        after: number;
        max: number;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "CardDrawn";
      visibility: "OWNER";
      ownerSide: Side;
      payload: {
        side: Side;
        card: HandCard;
        handCount: number;
        deckCount: number;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "HandCountChanged";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        side: Side;
        handCount: number;
        deckCount: number;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "CardDiscarded";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        side: Side;
        definitionId: CardId;
        reason: "OVERDRAW" | "TRICK_RESOLVED" | "UNIT_DESTROYED";
        discardQuantity: number;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "CardPlayed";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        side: Side;
        cardInstanceId: InstanceId;
        definitionId: CardId;
        target: Target;
        energySpent: number;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "UnitCreated";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        unit: UnitView;
        cause: "PLAY" | "SUMMON";
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "UnitMoved";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        instanceId: InstanceId;
        side: Side;
        fromLane: LaneId;
        toLane: LaneId;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "StatsChanged";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        instanceId: InstanceId;
        before: Stats;
        after: Stats;
        /**
         * @minItems 0
         * @maxItems 256
         */
        modifiers: ModifierView[];
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "StatusChanged";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        instanceId: InstanceId;
        before: Statuses;
        after: Statuses;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "AttackDeclared";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        batchId: string;
        /**
         * @minItems 1
         * @maxItems 2
         */
        attacks: [
          {
            sourceUnitId: InstanceId;
            side: Side;
            laneId: LaneId;
            attack: number;
            /**
             * @minItems 1
             * @maxItems 2
             */
            targets: [EntityRef, ...EntityRef[]];
            displayOrder: number;
          },
          ...{
            sourceUnitId: InstanceId;
            side: Side;
            laneId: LaneId;
            attack: number;
            /**
             * @minItems 1
             * @maxItems 2
             */
            targets: [EntityRef, ...EntityRef[]];
            displayOrder: number;
          }[]
        ];
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "DamageBatchResolved";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        batchId: string;
        /**
         * @minItems 1
         * @maxItems 20
         */
        packets: [DamagePacket, ...DamagePacket[]];
        /**
         * @minItems 0
         * @maxItems 12
         */
        hpChanges: HpChange[];
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "HeroHealed";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        side: Side;
        amount: number;
        before: number;
        after: number;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "UnitDestroyed";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        instanceId: InstanceId;
        definitionId: CardId | TokenId;
        owner: Side;
        laneId: LaneId;
        isToken: boolean;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "BlockMeterChanged";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        side: Side;
        chargeBefore: number;
        chargeAfter: number;
        blocksUsed: number;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "BlockOccurred";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        side: Side;
        preventedDamage: number;
        blocksUsed: number;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "PowerGranted";
      visibility: "OWNER";
      ownerSide: Side;
      payload: {
        side: Side;
        power: ReservePower;
        reason: "INITIAL" | "BLOCK";
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "ReserveCountChanged";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        side: Side;
        reserveCount: number;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "BlockResponseOpened";
      visibility: "OWNER";
      ownerSide: Side;
      payload: {
        side: Side;
        laneId: LaneId;
        powerInstanceId: InstanceId;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "BlockResponseClosed";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        side: Side;
        choice: "USED" | "KEPT";
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "PowerUsed";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        side: Side;
        powerInstanceId: InstanceId;
        definitionId: PowerId;
        target: Target;
        energySpent: number;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "PhaseChanged";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        from: Phase;
        to: Phase;
        turn: number;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "MatchEnded";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        outcome: Outcome;
        turn: number;
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "LifecycleChanged";
      visibility: "PUBLIC";
      ownerSide: null;
      payload: {
        from: Lifecycle;
        to: Lifecycle;
        reason: "PAUSE" | "RESUME" | "EXPIRED" | "ACCOUNT_MERGE" | "FAULT";
      };
    }
  | {
      eventId: string;
      sequence: number;
      rootId: string;
      kind: "TutorialAdvanced";
      visibility: "OWNER";
      ownerSide: Side;
      payload: {
        tutorial: TutorialView;
      };
    };
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "DeckSource".
 */
export type DeckSource =
  | {
      kind: "PRESET";
      presetId:
        | "D_G_BV"
        | "D_G_BP"
        | "D_G_VP"
        | "D_E_FX"
        | "D_E_FS"
        | "D_E_XS"
        | "D_G_SOL"
        | "D_G_CAI"
        | "D_G_ZEP"
        | "D_G_MER"
        | "D_G_MOS"
        | "D_G_HAL"
        | "D_G_ROW"
        | "D_E_ROO"
        | "D_E_NYX"
        | "D_E_BRI"
        | "D_E_SAB"
        | "D_E_VAN"
        | "D_E_GRA"
        | "D_E_SCO";
    }
  | {
      kind: "SAVED";
      deckId: Uuid;
      deckRevision: number;
    };
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "CreateMatchRequest".
 */
export type CreateMatchRequest =
  | {
      commandId: Uuid;
      mode: "SKIRMISH";
      deck: DeckSource;
      opponentHeroId: HeroId;
      difficulty: "EASY" | "NORMAL";
      expectedContentVersion: Version;
    }
  | {
      commandId: Uuid;
      mode: "TUTORIAL";
      scenarioId: "tutorial_v1" | "tutorial_evil_v1";
    };
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "Secret256".
 */
export type Secret256 = string;
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "ErrorResponse".
 */
export type ErrorResponse =
  | {
      error: {
        code: "VALIDATION_FAILED";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {
          /**
           * @minItems 1
           * @maxItems 50
           */
          issues: [
            {
              path: string;
              rule: string;
            },
            ...{
              path: string;
              rule: string;
            }[]
          ];
        };
      };
    }
  | {
      error: {
        code: "SESSION_EXPIRED";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {};
      };
    }
  | {
      error: {
        code: "FORBIDDEN";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {};
      };
    }
  | {
      error: {
        code: "CSRF";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {};
      };
    }
  | {
      error: {
        code: "NOT_FOUND";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {};
      };
    }
  | {
      error: {
        code: "IDEMPOTENCY_CONFLICT";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {};
      };
    }
  | {
      error: {
        code: "VERSION_UNSUPPORTED";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {};
      };
    }
  | {
      error: {
        code: "INTERNAL";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {};
      };
    }
  | {
      error: {
        code: "TEMPORARILY_UNAVAILABLE";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {};
      };
    }
  | {
      error: {
        code: "STALE_REVISION";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {
          snapshot: CommandResponse;
        };
      };
    }
  | {
      error: {
        code: "STALE_DECK_REVISION";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {
          deck: DeckDTO;
        };
      };
    }
  | {
      error: {
        code: "ACTIVE_MATCH_EXISTS";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {
          matchId: Uuid;
        };
      };
    }
  | {
      error: {
        code: "MERGE_MATCH_CONFLICT";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {
          guestMatch: MatchSummary;
          accountMatch: MatchSummary;
        };
      };
    }
  | {
      error: {
        code: "INVALID_DECK";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {
          validation: DeckValidation;
        };
      };
    }
  | {
      error: {
        code: "ILLEGAL_ACTION";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {
          reason:
            | "NOT_YOUR_TURN"
            | "WRONG_PHASE"
            | "INSUFFICIENT_ENERGY"
            | "CARD_UNAVAILABLE"
            | "INVALID_TARGET"
            | "LANE_OCCUPIED"
            | "POWER_UNAVAILABLE"
            | "MATCH_PAUSED"
            | "MATCH_ENDED"
            | "TUTORIAL_STEP_MISMATCH";
          field: string | null;
        };
      };
    }
  | {
      error: {
        code: "RATE_LIMITED";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {
          retryAfterSeconds: number;
        };
      };
    }
  | {
      error: {
        code: "LOG_EXPIRED";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {
          earliestAvailableSeq: number;
        };
      };
    }
  | {
      error: {
        code: "MATCH_DETAILS_EXPIRED";
        messageKey: string;
        requestId: Uuid;
        retryable: boolean;
        details: {
          summaryAvailable: true;
        };
      };
    };
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "ClassId".
 */
export type ClassId = "BASTION" | "VERDANT" | "PRISM" | "FURNACE" | "HEX" | "VEIL";
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "ArtKey".
 */
export type ArtKey = string;
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "CardDefinitionView".
 */
export type CardDefinitionView =
  | {
      id: CardId;
      faction: Side;
      classId: ClassId | null;
      nameVi: string;
      cost: number;
      /**
       * @minItems 0
       * @maxItems 6
       */
      keywords: ("SHIELD" | "ARMOR" | "POISONED" | "STUNNED" | "PIERCE" | "MOVE")[];
      /**
       * @minItems 0
       * @maxItems 8
       */
      abilities: AbilityView[];
      exactTextVi: string;
      artKey: ArtKey;
      type: "UNIT";
      printed: {
        attack: number;
        hp: number;
      };
    }
  | {
      id: CardId;
      faction: Side;
      classId: ClassId | null;
      nameVi: string;
      cost: number;
      /**
       * @minItems 0
       * @maxItems 6
       */
      keywords: ("SHIELD" | "ARMOR" | "POISONED" | "STUNNED" | "PIERCE" | "MOVE")[];
      /**
       * @minItems 0
       * @maxItems 8
       */
      abilities: AbilityView[];
      exactTextVi: string;
      artKey: ArtKey;
      type: "TRICK";
      printed: null;
    };

export interface NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation {
  [k: string]: unknown;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "Versions".
 */
export interface Versions {
  rules: Version;
  content: Version;
  locations: Version;
  bot: Version;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "CommandEnvelope".
 */
export interface CommandEnvelope {
  commandId: Uuid;
  expectedRevision: number;
  action: PlayerAction;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "Stats".
 */
export interface Stats {
  attack: number;
  hp: number;
  maxHp: number;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "Statuses".
 */
export interface Statuses {
  shield: boolean;
  armor: number;
  poisoned: boolean;
  stunned: boolean;
  exhausted: boolean;
  pierce: boolean;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "ModifierView".
 */
export interface ModifierView {
  sourceDefinitionId: DefinitionId | LocationId;
  sourceInstanceId: InstanceId | null;
  sourceLaneAtCreation: LaneId | null;
  createdEventSeq: number;
  attackDelta: number;
  healthDelta: number;
  trait: ("SHIELD" | "ARMOR" | "POISONED" | "STUNNED" | "EXHAUSTED" | "PIERCE") | null;
  duration: "PERMANENT" | "TURN_END";
  expiryTurn: number | null;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "UnitView".
 */
export interface UnitView {
  instanceId: InstanceId;
  definitionId: CardId | TokenId;
  owner: Side;
  laneId: LaneId;
  isToken: boolean;
  printed: Stats;
  current: Stats;
  statuses: Statuses;
  /**
   * @minItems 0
   * @maxItems 256
   */
  modifiers: ModifierView[];
  lastRegularAttackTurn: number | null;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "LaneView".
 */
export interface LaneView {
  laneId: LaneId;
  location: LocationView;
  good: UnitView | null;
  evil: UnitView | null;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "DiscardEntry".
 */
export interface DiscardEntry {
  definitionId: CardId;
  quantity: number;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "HeroView".
 */
export interface HeroView {
  heroId: HeroId;
  hp: number;
  maxHp: 20;
  energy: {
    current: number;
    max: number;
  };
  block: {
    charge: 0 | 2 | 4 | 6;
    used: number;
    active: boolean;
  };
  handCount: number;
  deckCount: number;
  reserveCount: number;
  /**
   * @minItems 0
   * @maxItems 30
   */
  discard: DiscardEntry[];
  /**
   * @minItems 0
   * @maxItems 4
   */
  usedPowers: PowerId[];
  fatigueCounter: number;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "HandCard".
 */
export interface HandCard {
  instanceId: InstanceId;
  definitionId: CardId;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "ReservePower".
 */
export interface ReservePower {
  instanceId: InstanceId;
  definitionId: PowerId;
  normalCost: 1;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "OwnZone".
 */
export interface OwnZone {
  side: Side;
  /**
   * @minItems 0
   * @maxItems 10
   */
  hand: HandCard[];
  /**
   * @minItems 0
   * @maxItems 4
   */
  reserve: ReservePower[];
  mulliganCommitted: boolean;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "Outcome".
 */
export interface Outcome {
  result: "WIN" | "LOSS" | "DRAW" | "NONE";
  winner: Side | null;
  reason:
    | "HERO_DEFEATED"
    | "SIMULTANEOUS_LETHAL"
    | "TURN_LIMIT"
    | "SURRENDER"
    | "EXPIRED"
    | "ACCOUNT_MERGE"
    | "ENGINE_FAULT"
    | "TUTORIAL_COMPLETED"
    | "TUTORIAL_SKIPPED";
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "TutorialView".
 */
export interface TutorialView {
  scenarioId: "tutorial_v1" | "tutorial_evil_v1";
  chapterId: ChapterId;
  stepId: StepId;
  stepState: "ACTIVE" | "AWAITING_CONTINUE" | "COMPLETED" | "SKIPPED";
  /**
   * @minItems 0
   * @maxItems 10
   */
  completedStepIds: StepId[];
  copyKey: string;
  /**
   * @minItems 0
   * @maxItems 10
   */
  focusTargets: {
    kind: "CARD" | "UNIT" | "LANE" | "ENERGY" | "PHASE" | "BLOCK" | "CONTINUE";
    instanceId: InstanceId | null;
    laneId: LaneId | null;
    side: Side | null;
  }[];
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "PlayerView".
 */
export interface PlayerView {
  schemaVersion: "api_v1";
  matchId: Uuid;
  mode: "SKIRMISH" | "TUTORIAL";
  lifecycle: Lifecycle;
  humanSide: Side;
  turn: number;
  phase: Phase;
  activeSide: Side | null;
  versions: Versions;
  players: {
    GOOD: HeroView;
    EVIL: HeroView;
  };
  /**
   * @minItems 5
   * @maxItems 5
   */
  board: [LaneView, LaneView, LaneView, LaneView, LaneView, ...LaneView[]];
  self: OwnZone;
  /**
   * @minItems 0
   * @maxItems 2048
   */
  legalActions: PlayerAction[];
  blockResponse: BlockResponse | null;
  combat: {
    laneId: LaneId;
    stage: "BEFORE_PAIR" | "PAIR" | "BLOCK_RESPONSES" | "AFTER_LANE";
  } | null;
  outcome: Outcome | null;
  tutorial: TutorialView | null;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "DamagePacket".
 */
export interface DamagePacket {
  source: EntityRef | null;
  target: EntityRef;
  damageType: "COMBAT" | "EFFECT" | "POISON" | "LOCATION" | "FATIGUE";
  rawDamage: number;
  mitigatedDamage: number;
  finalDamage: number;
  blocked: boolean;
  shieldConsumed: boolean;
  displayOrder: number | null;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "HpChange".
 */
export interface HpChange {
  target: EntityRef;
  before: number;
  after: number;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "CommandResponse".
 */
export interface CommandResponse {
  view: PlayerView;
  revision: number;
  latestSeq: number;
  /**
   * @minItems 0
   * @maxItems 100
   */
  events: VisibleEvent[];
  eventsThroughSeq: number;
  needsAdvance: boolean;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "EventPage".
 */
export interface EventPage {
  /**
   * @minItems 0
   * @maxItems 100
   */
  events: VisibleEvent[];
  nextCursor: number;
  scannedThroughSeq: number;
  hasMore: boolean;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "DeckEntry".
 */
export interface DeckEntry {
  cardId: CardId;
  quantity: number;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "DeckInput".
 */
export interface DeckInput {
  name: string;
  heroId: HeroId;
  contentVersion: Version;
  /**
   * @minItems 0
   * @maxItems 30
   */
  entries: DeckEntry[];
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "DeckIssue".
 */
export interface DeckIssue {
  code:
    | "TOTAL_NOT_30"
    | "TOO_MANY_COPIES"
    | "WRONG_FACTION"
    | "WRONG_CLASS"
    | "DUPLICATE_CARD_ID"
    | "UNKNOWN_CARD"
    | "VERSION_UNSUPPORTED";
  cardId: string | null;
  messageKey: string;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "DeckValidation".
 */
export interface DeckValidation {
  playable: boolean;
  totalCards: number;
  /**
   * @minItems 0
   * @maxItems 100
   */
  issues: DeckIssue[];
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "DeckDTO".
 */
export interface DeckDTO {
  name: string;
  heroId: HeroId;
  contentVersion: Version;
  /**
   * @minItems 0
   * @maxItems 30
   */
  entries: DeckEntry[];
  id: Uuid;
  revision: number;
  validation: DeckValidation;
  updatedAt: DateTime;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "PresetDTO".
 */
export interface PresetDTO {
  presetId:
    | "D_G_BV"
    | "D_G_BP"
    | "D_G_VP"
    | "D_E_FX"
    | "D_E_FS"
    | "D_E_XS"
    | "D_G_SOL"
    | "D_G_CAI"
    | "D_G_ZEP"
    | "D_G_MER"
    | "D_G_MOS"
    | "D_G_HAL"
    | "D_G_ROW"
    | "D_E_ROO"
    | "D_E_NYX"
    | "D_E_BRI"
    | "D_E_SAB"
    | "D_E_VAN"
    | "D_E_GRA"
    | "D_E_SCO";
  heroId: HeroId;
  name: string;
  contentVersion: Version;
  /**
   * @minItems 15
   * @maxItems 15
   */
  entries: [
    DeckEntry,
    DeckEntry,
    DeckEntry,
    DeckEntry,
    DeckEntry,
    DeckEntry,
    DeckEntry,
    DeckEntry,
    DeckEntry,
    DeckEntry,
    DeckEntry,
    DeckEntry,
    DeckEntry,
    DeckEntry,
    DeckEntry,
    ...DeckEntry[]
  ];
  strategyKey: string;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "SaveDeckRequest".
 */
export interface SaveDeckRequest {
  commandId: Uuid;
  deck: DeckInput;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "UpdateDeckRequest".
 */
export interface UpdateDeckRequest {
  commandId: Uuid;
  expectedDeckRevision: number;
  deck: DeckInput;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "DeckList".
 */
export interface DeckList {
  /**
   * @minItems 0
   * @maxItems 20
   */
  items: DeckDTO[];
  /**
   * @minItems 6
   * @maxItems 20
   */
  presets: [PresetDTO, PresetDTO, PresetDTO, PresetDTO, PresetDTO, PresetDTO, ...PresetDTO[]];
  nextCursor: string | null;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "Principal".
 */
export interface Principal {
  id: Uuid;
  kind: "GUEST" | "ACCOUNT";
  displayName: string;
  expiresAt: DateTime | null;
  tutorialCompletedAt: DateTime | null;
  evilTutorialCompletedAt: DateTime | null;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "SessionResponse".
 */
export interface SessionResponse {
  principal: Principal;
  csrfToken: Secret256;
  sessionExpiresAt: DateTime;
  activeMatchId: Uuid | null;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "GuestRequest".
 */
export interface GuestRequest {
  commandId: Uuid;
  recoverySecret: Secret256;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "AuthExchangeRequest".
 */
export interface AuthExchangeRequest {
  commandId: Uuid;
  identityToken: string;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "ClaimGuestRequest".
 */
export interface ClaimGuestRequest {
  commandId: Uuid;
  identityToken: string;
  keepMatchId: Uuid | null;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "MatchSummary".
 */
export interface MatchSummary {
  matchId: Uuid;
  mode: "SKIRMISH" | "TUTORIAL";
  lifecycle: Lifecycle;
  humanHeroId: HeroId;
  opponentHeroId: HeroId;
  difficulty: ("EASY" | "NORMAL") | null;
  outcome: Outcome | null;
  turns: number;
  activeDurationMs: number;
  damageDealt: number;
  createdAt: DateTime;
  endedAt: DateTime | null;
  resumable: boolean;
  blocksUsed: number;
  rematch: RematchConfig | null;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "RematchConfig".
 */
export interface RematchConfig {
  deck: DeckSource;
  opponentHeroId: HeroId;
  difficulty: "EASY" | "NORMAL";
  expectedContentVersion: Version;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "MatchList".
 */
export interface MatchList {
  /**
   * @minItems 0
   * @maxItems 20
   */
  items: MatchSummary[];
  nextCursor: string | null;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "HealthLive".
 */
export interface HealthLive {
  status: "ok";
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "HealthReady".
 */
export interface HealthReady {
  status: "ready" | "not_ready";
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "AbilityView".
 */
export interface AbilityView {
  id: string;
  hook: "ON_PLAY" | "BEFORE_COMBAT_HERE" | "ON_DAMAGED" | "ON_DESTROYED" | "ON_TURN_END";
  exactTextVi: string;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "PowerDefinitionView".
 */
export interface PowerDefinitionView {
  id: PowerId;
  faction: Side;
  classId: ClassId | null;
  signatureOwner: HeroId | null;
  type: "SUPERPOWER";
  nameVi: string;
  baseCost: 1;
  targetKind: "NONE" | "UNIT" | "HERO_OR_UNIT" | "LANE" | "UNIT_AND_LANE";
  exactTextVi: string;
  artKey: ArtKey;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "HeroDefinitionView".
 */
export interface HeroDefinitionView {
  id: HeroId;
  faction: Side;
  nameVi: string;
  titleVi: string;
  /**
   * @minItems 2
   * @maxItems 2
   */
  classes: [ClassId, ClassId, ...ClassId[]];
  /**
   * @minItems 4
   * @maxItems 4
   */
  powerIds: [PowerId, PowerId, PowerId, PowerId, ...PowerId[]];
  signaturePowerId: PowerId;
  strategyKey: string;
  portraitKey: ArtKey;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "LocationDefinitionView".
 */
export interface LocationDefinitionView {
  id: LocationId;
  nameVi: string;
  group: "BUFF" | "NEUTRAL" | "HAZARD" | "CONTROL" | "COST";
  hook: "ON_UNIT_PLAYED" | "BEFORE_ATTACK" | "AFTER_LANE_COMBAT" | "END_TURN" | "COST_MODIFIER" | "NONE";
  exactTextVi: string;
  artKey: ArtKey;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "TokenDefinitionView".
 */
export interface TokenDefinitionView {
  id: TokenId;
  faction: Side;
  nameVi: string;
  printed: {
    attack: number;
    hp: number;
  };
  /**
   * @minItems 0
   * @maxItems 1
   */
  keywords: "SHIELD"[];
  tutorialOnly: boolean;
  artKey: ArtKey;
}
export interface PublicCatalog {
  version: "core_v1" | "heroes_v1";
  rulesVersion: Version;
  locationVersion: Version;
  sha256: string;
  /**
   * @minItems 60
   * @maxItems 60
   */
  cards: [
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    CardDefinitionView,
    ...CardDefinitionView[]
  ];
  /**
   * @minItems 6
   * @maxItems 20
   */
  heroes: [
    HeroDefinitionView,
    HeroDefinitionView,
    HeroDefinitionView,
    HeroDefinitionView,
    HeroDefinitionView,
    HeroDefinitionView,
    ...HeroDefinitionView[]
  ];
  /**
   * @minItems 18
   * @maxItems 32
   */
  powers: [
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    PowerDefinitionView,
    ...PowerDefinitionView[]
  ];
  /**
   * @minItems 8
   * @maxItems 8
   */
  locations: [
    LocationDefinitionView,
    LocationDefinitionView,
    LocationDefinitionView,
    LocationDefinitionView,
    LocationDefinitionView,
    LocationDefinitionView,
    LocationDefinitionView,
    LocationDefinitionView,
    ...LocationDefinitionView[]
  ];
  /**
   * @minItems 3
   * @maxItems 3
   */
  tokens: [TokenDefinitionView, TokenDefinitionView, TokenDefinitionView, ...TokenDefinitionView[]];
  /**
   * @minItems 6
   * @maxItems 20
   */
  presets: [PresetDTO, PresetDTO, PresetDTO, PresetDTO, PresetDTO, PresetDTO, ...PresetDTO[]];
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "EmptyBody".
 */
export interface EmptyBody {}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "ListQuery".
 */
export interface ListQuery {
  cursor?: string;
  limit?: number;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "EventQuery".
 */
export interface EventQuery {
  afterSeq: number;
  throughSeq: number;
  limit?: number;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "MatchParams".
 */
export interface MatchParams {
  id: Uuid;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "DeckParams".
 */
export interface DeckParams {
  id: Uuid;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "CatalogParams".
 */
export interface CatalogParams {
  version: Version;
}
/**
 * This interface was referenced by `NguLoPublicAPIV1ProposedSpecificationNotRuntimeImplementation`'s JSON-Schema
 * via the `definition` "DeckVersionQuery".
 */
export interface DeckVersionQuery {
  revision?: number;
}

export interface WireDefinitions {
  Uuid: Uuid;
  InstanceId: InstanceId;
  Side: Side;
  LaneId: LaneId;
  Version: Version;
  Versions: Versions;
  DateTime: DateTime;
  CardId: CardId;
  HeroId: HeroId;
  PowerId: PowerId;
  TokenId: TokenId;
  LocationId: LocationId;
  DefinitionId: DefinitionId;
  Phase: Phase;
  Lifecycle: Lifecycle;
  EntityRef: EntityRef;
  Target: Target;
  StepId: StepId;
  ChapterId: ChapterId;
  PlayerAction: PlayerAction;
  CommandEnvelope: CommandEnvelope;
  Stats: Stats;
  Statuses: Statuses;
  ModifierView: ModifierView;
  UnitView: UnitView;
  LocationView: LocationView;
  LaneView: LaneView;
  DiscardEntry: DiscardEntry;
  HeroView: HeroView;
  HandCard: HandCard;
  ReservePower: ReservePower;
  OwnZone: OwnZone;
  BlockResponse: BlockResponse;
  Outcome: Outcome;
  TutorialView: TutorialView;
  PlayerView: PlayerView;
  DamagePacket: DamagePacket;
  HpChange: HpChange;
  VisibleEvent: VisibleEvent;
  CommandResponse: CommandResponse;
  EventPage: EventPage;
  DeckEntry: DeckEntry;
  DeckInput: DeckInput;
  DeckIssue: DeckIssue;
  DeckValidation: DeckValidation;
  DeckDTO: DeckDTO;
  PresetDTO: PresetDTO;
  SaveDeckRequest: SaveDeckRequest;
  UpdateDeckRequest: UpdateDeckRequest;
  DeckList: DeckList;
  DeckSource: DeckSource;
  CreateMatchRequest: CreateMatchRequest;
  Principal: Principal;
  Secret256: Secret256;
  SessionResponse: SessionResponse;
  GuestRequest: GuestRequest;
  AuthExchangeRequest: AuthExchangeRequest;
  ClaimGuestRequest: ClaimGuestRequest;
  MatchSummary: MatchSummary;
  MatchList: MatchList;
  HealthLive: HealthLive;
  HealthReady: HealthReady;
  ErrorResponse: ErrorResponse;
  ClassId: ClassId;
  ArtKey: ArtKey;
  AbilityView: AbilityView;
  CardDefinitionView: CardDefinitionView;
  PowerDefinitionView: PowerDefinitionView;
  HeroDefinitionView: HeroDefinitionView;
  LocationDefinitionView: LocationDefinitionView;
  TokenDefinitionView: TokenDefinitionView;
  PublicCatalog: PublicCatalog;
  EmptyBody: EmptyBody;
  ListQuery: ListQuery;
  EventQuery: EventQuery;
  MatchParams: MatchParams;
  DeckParams: DeckParams;
  CatalogParams: CatalogParams;
  RematchConfig: RematchConfig;
  DeckVersionQuery: DeckVersionQuery;
}
