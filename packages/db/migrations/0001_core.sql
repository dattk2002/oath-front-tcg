CREATE TABLE "app_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"principal_id" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"csrf_hash" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "session_hashes" CHECK (octet_length("app_sessions"."token_hash")=32 AND octet_length("app_sessions"."csrf_hash")=32)
);
--> statement-breakpoint
CREATE TABLE "auth_claims" (
	"source_session_id" uuid NOT NULL,
	"command_id" uuid NOT NULL,
	"source_principal_id" uuid NOT NULL,
	"target_principal_id" uuid NOT NULL,
	"auth_subject" text NOT NULL,
	"request_hash" text NOT NULL,
	"result" jsonb NOT NULL,
	"last_issued_session_id" uuid,
	"committed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recover_until" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "auth_claims_source_session_id_command_id_pk" PRIMARY KEY("source_session_id","command_id"),
	CONSTRAINT "claim_hash" CHECK ("auth_claims"."request_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "command_receipts" (
	"principal_id" uuid NOT NULL,
	"command_id" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"response" jsonb NOT NULL,
	"resulting_revision" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "command_receipts_principal_id_command_id_pk" PRIMARY KEY("principal_id","command_id"),
	CONSTRAINT "receipt_hash_revision" CHECK ("command_receipts"."request_hash" ~ '^[a-f0-9]{64}$' AND ("command_receipts"."resulting_revision" IS NULL OR "command_receipts"."resulting_revision" BETWEEN 0 AND 9007199254740991))
);
--> statement-breakpoint
CREATE TABLE "content_releases" (
	"version" text PRIMARY KEY NOT NULL,
	"rules_version" text NOT NULL,
	"location_version" text NOT NULL,
	"manifest" jsonb NOT NULL,
	"sha256" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "release_sha" CHECK ("content_releases"."sha256" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "deck_versions" (
	"deck_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"content_version" text NOT NULL,
	"hero_id" text NOT NULL,
	"entries" jsonb NOT NULL,
	"validation_status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deck_versions_deck_id_revision_pk" PRIMARY KEY("deck_id","revision"),
	CONSTRAINT "deck_version_revision" CHECK ("deck_versions"."revision" >= 1),
	CONSTRAINT "deck_validation" CHECK ("deck_versions"."validation_status" IN ('DRAFT','PLAYABLE') AND jsonb_typeof("deck_versions"."entries")='array')
);
--> statement-breakpoint
CREATE TABLE "decks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"hero_id" text NOT NULL,
	"current_revision" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deck_name" CHECK (char_length("decks"."name") BETWEEN 1 AND 40),
	CONSTRAINT "deck_revision" CHECK ("decks"."current_revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "guest_bootstraps" (
	"command_id" uuid PRIMARY KEY NOT NULL,
	"recovery_secret_hash" "bytea" NOT NULL,
	"principal_id" uuid NOT NULL,
	"last_issued_session_id" uuid NOT NULL,
	"recover_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "bootstrap_hash" CHECK (octet_length("guest_bootstraps"."recovery_secret_hash")=32)
);
--> statement-breakpoint
CREATE TABLE "match_action_journal" (
	"match_id" uuid NOT NULL,
	"step_seq" bigint NOT NULL,
	"origin" text NOT NULL,
	"command_id" uuid,
	"action" jsonb NOT NULL,
	"next_bot_random_state" jsonb,
	"pre_state_hash" text NOT NULL,
	"post_state_hash" text NOT NULL,
	"first_event_seq" bigint,
	"last_event_seq" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_action_journal_match_id_step_seq_pk" PRIMARY KEY("match_id","step_seq"),
	CONSTRAINT "journal_step" CHECK ("match_action_journal"."step_seq" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "journal_origin_rng" CHECK (("match_action_journal"."origin"='BOT' AND "match_action_journal"."next_bot_random_state" IS NOT NULL AND jsonb_typeof("match_action_journal"."next_bot_random_state")='array' AND jsonb_array_length("match_action_journal"."next_bot_random_state")=4) OR ("match_action_journal"."origin" IN ('HUMAN','AUTO') AND "match_action_journal"."next_bot_random_state" IS NULL)),
	CONSTRAINT "journal_bounds" CHECK (("match_action_journal"."first_event_seq" IS NULL AND "match_action_journal"."last_event_seq" IS NULL) OR ("match_action_journal"."first_event_seq" IS NOT NULL AND "match_action_journal"."last_event_seq" IS NOT NULL AND "match_action_journal"."first_event_seq" BETWEEN 1 AND 9007199254740991 AND "match_action_journal"."last_event_seq" BETWEEN "match_action_journal"."first_event_seq" AND 9007199254740991)),
	CONSTRAINT "journal_hashes" CHECK ("match_action_journal"."pre_state_hash" ~ '^[a-f0-9]{64}$' AND "match_action_journal"."post_state_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "match_checkpoints" (
	"match_id" uuid PRIMARY KEY NOT NULL,
	"revision" bigint NOT NULL,
	"state" jsonb NOT NULL,
	"state_hash" text NOT NULL,
	"last_event_seq" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkpoint_numbers" CHECK ("match_checkpoints"."revision" BETWEEN 0 AND 9007199254740991 AND "match_checkpoints"."last_event_seq" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "checkpoint_hash" CHECK ("match_checkpoints"."state_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "checkpoint_size" CHECK (octet_length("match_checkpoints"."state"::text) <= 262144)
);
--> statement-breakpoint
CREATE TABLE "match_events" (
	"match_id" uuid NOT NULL,
	"seq" bigint NOT NULL,
	"event_id" text NOT NULL,
	"root_id" text NOT NULL,
	"kind" text NOT NULL,
	"visibility" text NOT NULL,
	"owner_side" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_events_match_id_seq_pk" PRIMARY KEY("match_id","seq"),
	CONSTRAINT "event_sequence" CHECK ("match_events"."seq" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "event_visibility" CHECK (("match_events"."visibility"='OWNER' AND "match_events"."owner_side" IS NOT NULL AND "match_events"."owner_side" IN ('GOOD','EVIL')) OR ("match_events"."visibility" IN ('PUBLIC','SERVER') AND "match_events"."owner_side" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "match_initializations" (
	"match_id" uuid PRIMARY KEY NOT NULL,
	"heroes" jsonb NOT NULL,
	"deck_snapshots" jsonb NOT NULL,
	"initial_state" jsonb NOT NULL,
	"private_seed" "bytea" NOT NULL,
	"rng_algorithm_version" text NOT NULL,
	CONSTRAINT "initial_seed" CHECK (octet_length("match_initializations"."private_seed")=32)
);
--> statement-breakpoint
CREATE TABLE "match_results" (
	"match_id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"human_hero_id" text NOT NULL,
	"bot_hero_id" text NOT NULL,
	"difficulty" text NOT NULL,
	"outcome" text NOT NULL,
	"reason" text NOT NULL,
	"turns" integer NOT NULL,
	"active_duration_ms" bigint NOT NULL,
	"damage_dealt" bigint NOT NULL,
	"blocks_used" integer NOT NULL,
	"summary" jsonb NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "result_numbers" CHECK ("match_results"."turns" BETWEEN 0 AND 20 AND "match_results"."active_duration_ms" BETWEEN 0 AND 9007199254740991 AND "match_results"."damage_dealt" BETWEEN 0 AND 9007199254740991 AND "match_results"."blocks_used" BETWEEN 0 AND 3),
	CONSTRAINT "result_enums" CHECK ("match_results"."difficulty" IN ('EASY','NORMAL') AND "match_results"."outcome" IN ('WIN','LOSS','DRAW','ABANDONED','FAULTED'))
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"human_principal_id" uuid NOT NULL,
	"human_side" text NOT NULL,
	"mode" text NOT NULL,
	"status" text NOT NULL,
	"revision" bigint NOT NULL,
	"rules_version" text NOT NULL,
	"content_version" text NOT NULL,
	"location_version" text NOT NULL,
	"bot_version" text NOT NULL,
	"bot_intents_since_human" integer DEFAULT 0 NOT NULL,
	"scenario_id" text,
	"tutorial_manifest_sha256" text,
	"rematch" jsonb,
	"active_duration_ms" bigint DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"details_expires_at" timestamp with time zone,
	"history_expires_at" timestamp with time zone,
	CONSTRAINT "match_lifecycle" CHECK ("matches"."status" IN ('ACTIVE','PAUSED','COMPLETED','ABANDONED','FAULTED') AND (("matches"."status" IN ('ACTIVE','PAUSED')) = ("matches"."ended_at" IS NULL))),
	CONSTRAINT "match_numbers" CHECK ("matches"."bot_intents_since_human" BETWEEN 0 AND 64 AND "matches"."revision" >= 0 AND "matches"."revision" <= 9007199254740991 AND "matches"."active_duration_ms" >= 0 AND "matches"."active_duration_ms" <= 9007199254740991),
	CONSTRAINT "match_side_mode" CHECK ("matches"."human_side" IN ('GOOD','EVIL') AND "matches"."mode" IN ('SKIRMISH','TUTORIAL')),
	CONSTRAINT "match_tutorial" CHECK (("matches"."mode"='TUTORIAL' AND "matches"."scenario_id" IS NOT NULL AND "matches"."tutorial_manifest_sha256" IS NOT NULL AND "matches"."tutorial_manifest_sha256" ~ '^[a-f0-9]{64}$') OR ("matches"."mode"='SKIRMISH' AND "matches"."scenario_id" IS NULL AND "matches"."tutorial_manifest_sha256" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "principals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"auth_subject" text,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"tutorial_completed_at" timestamp with time zone,
	"evil_tutorial_completed_at" timestamp with time zone,
	"merged_into_principal_id" uuid,
	"merged_at" timestamp with time zone,
	CONSTRAINT "principal_kind" CHECK ("principals"."kind" IN ('GUEST','ACCOUNT') AND ("principals"."kind" <> 'ACCOUNT' OR "principals"."auth_subject" IS NOT NULL)),
	CONSTRAINT "principal_name" CHECK (char_length("principals"."display_name") BETWEEN 1 AND 32),
	CONSTRAINT "principal_merge" CHECK (("principals"."merged_into_principal_id" IS NULL) = ("principals"."merged_at" IS NULL) AND "principals"."merged_into_principal_id" IS DISTINCT FROM "principals"."id")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_windows" (
	"scope" text NOT NULL,
	"key_hash" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_limit_windows_scope_key_hash_window_start_pk" PRIMARY KEY("scope","key_hash","window_start"),
	CONSTRAINT "rate_limit_values" CHECK ("rate_limit_windows"."scope" IN ('COMMAND','MATCH_CREATE','GUEST_BOOTSTRAP') AND "rate_limit_windows"."key_hash" ~ '^[a-f0-9]{64}$' AND "rate_limit_windows"."count" >= 1)
);
--> statement-breakpoint
ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_principal_id_principals_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_claims" ADD CONSTRAINT "auth_claims_source_session_id_app_sessions_id_fk" FOREIGN KEY ("source_session_id") REFERENCES "public"."app_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_claims" ADD CONSTRAINT "auth_claims_source_principal_id_principals_id_fk" FOREIGN KEY ("source_principal_id") REFERENCES "public"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_claims" ADD CONSTRAINT "auth_claims_target_principal_id_principals_id_fk" FOREIGN KEY ("target_principal_id") REFERENCES "public"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_claims" ADD CONSTRAINT "auth_claims_last_issued_session_id_app_sessions_id_fk" FOREIGN KEY ("last_issued_session_id") REFERENCES "public"."app_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_receipts" ADD CONSTRAINT "command_receipts_principal_id_principals_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_versions" ADD CONSTRAINT "deck_versions_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_versions" ADD CONSTRAINT "deck_versions_content_version_content_releases_version_fk" FOREIGN KEY ("content_version") REFERENCES "public"."content_releases"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_owner_id_principals_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_bootstraps" ADD CONSTRAINT "guest_bootstraps_principal_id_principals_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_bootstraps" ADD CONSTRAINT "guest_bootstraps_last_issued_session_id_app_sessions_id_fk" FOREIGN KEY ("last_issued_session_id") REFERENCES "public"."app_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_action_journal" ADD CONSTRAINT "match_action_journal_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_checkpoints" ADD CONSTRAINT "match_checkpoints_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_initializations" ADD CONSTRAINT "match_initializations_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_owner_id_principals_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_human_principal_id_principals_id_fk" FOREIGN KEY ("human_principal_id") REFERENCES "public"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_content_version_content_releases_version_fk" FOREIGN KEY ("content_version") REFERENCES "public"."content_releases"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principals" ADD CONSTRAINT "principals_merged_into_principal_id_principals_id_fk" FOREIGN KEY ("merged_into_principal_id") REFERENCES "public"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash" ON "app_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_principal_expiry" ON "app_sessions" USING btree ("principal_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "claims_once_per_source" ON "auth_claims" USING btree ("source_principal_id");--> statement-breakpoint
CREATE INDEX "decks_owner_updated" ON "decks" USING btree ("owner_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_event_id" ON "match_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "results_owner_ended" ON "match_results" USING btree ("owner_id","ended_at" DESC NULLS LAST,"match_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_one_live_principal" ON "matches" USING btree ("human_principal_id") WHERE "matches"."status" IN ('ACTIVE','PAUSED');--> statement-breakpoint
CREATE UNIQUE INDEX "matches_id_revision" ON "matches" USING btree ("id","revision");--> statement-breakpoint
CREATE INDEX "matches_owner_history" ON "matches" USING btree ("human_principal_id","created_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE UNIQUE INDEX "principals_auth_subject" ON "principals" USING btree ("auth_subject") WHERE "principals"."auth_subject" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "rate_limit_expiry" ON "rate_limit_windows" USING btree ("expires_at");
--> statement-breakpoint
ALTER TABLE match_checkpoints ADD CONSTRAINT checkpoint_matches_revision FOREIGN KEY(match_id,revision) REFERENCES matches(id,revision) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
CREATE FUNCTION reject_immutable_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Immutable application record' USING ERRCODE='23514'; END $$;
--> statement-breakpoint
CREATE TRIGGER content_release_immutable BEFORE UPDATE ON content_releases FOR EACH ROW EXECUTE FUNCTION reject_immutable_update();
--> statement-breakpoint
CREATE TRIGGER deck_version_immutable BEFORE UPDATE ON deck_versions FOR EACH ROW EXECUTE FUNCTION reject_immutable_update();
--> statement-breakpoint
CREATE TRIGGER initialization_immutable BEFORE UPDATE ON match_initializations FOR EACH ROW EXECUTE FUNCTION reject_immutable_update();
--> statement-breakpoint
CREATE FUNCTION pin_match_versions() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF ROW(NEW.human_side,NEW.mode,NEW.rules_version,NEW.content_version,NEW.location_version,NEW.bot_version,NEW.scenario_id,NEW.tutorial_manifest_sha256,NEW.rematch) IS DISTINCT FROM ROW(OLD.human_side,OLD.mode,OLD.rules_version,OLD.content_version,OLD.location_version,OLD.bot_version,OLD.scenario_id,OLD.tutorial_manifest_sha256,OLD.rematch) THEN RAISE EXCEPTION 'Immutable match configuration' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER match_versions_pinned BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION pin_match_versions();
