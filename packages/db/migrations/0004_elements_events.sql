CREATE TABLE editorial_posts (
 slug text PRIMARY KEY, revision integer NOT NULL DEFAULT 1 CHECK(revision>=1),
 title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 160), excerpt text NOT NULL,
 body jsonb NOT NULL CHECK(jsonb_typeof(body)='array'), category text NOT NULL CHECK(category IN ('NEWS','UPDATE','GUIDE','EVENT')),
 art_key text NOT NULL, state text NOT NULL CHECK(state IN ('DRAFT','SCHEDULED','PUBLISHED','ARCHIVED')),
 publish_at timestamptz NOT NULL, sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX editorial_publication ON editorial_posts(state,publish_at DESC,slug);
--> statement-breakpoint
CREATE TABLE weekly_events (
 id text PRIMARY KEY, season_id text NOT NULL, ordinal integer NOT NULL CHECK(ordinal BETWEEN 1 AND 12),
 slug text NOT NULL UNIQUE, title text NOT NULL, summary text NOT NULL,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, reveal_at timestamptz NOT NULL,
 featured_card_id text NOT NULL CHECK(featured_card_id ~ '^E(0[1-9]|1[0-2])$'), featured_hero_id text NOT NULL,
 systems jsonb NOT NULL CHECK(jsonb_typeof(systems)='array' AND jsonb_array_length(systems)=2),
 rewards jsonb NOT NULL CHECK(jsonb_typeof(rewards)='object'),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>=1), state text NOT NULL CHECK(state IN ('DRAFT','PUBLISHED')),
 sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(season_id,ordinal), UNIQUE(season_id,featured_card_id),
 CHECK(ends_at=starts_at+interval '7 days' AND reveal_at=starts_at)
);
CREATE INDEX events_schedule ON weekly_events(state,starts_at,ends_at);
--> statement-breakpoint
CREATE TABLE event_scenarios (
 id text PRIMARY KEY, event_id text NOT NULL REFERENCES weekly_events(id), day_index integer NOT NULL CHECK(day_index BETWEEN 0 AND 6),
 title text NOT NULL, description text NOT NULL, arena_key text NOT NULL,
 content_version text NOT NULL REFERENCES content_releases(version), manifest jsonb NOT NULL CHECK(jsonb_typeof(manifest)='object'),
 sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'), UNIQUE(event_id,day_index)
);
--> statement-breakpoint
ALTER TABLE matches ADD COLUMN scenario_manifest_sha256 text;
ALTER TABLE matches DROP CONSTRAINT match_side_mode;
ALTER TABLE matches ADD CONSTRAINT match_side_mode CHECK(human_side IN ('GOOD','EVIL') AND mode IN ('SKIRMISH','TUTORIAL','DAILY_CHALLENGE'));
ALTER TABLE matches DROP CONSTRAINT match_tutorial;
ALTER TABLE matches ADD CONSTRAINT match_tutorial CHECK(
 (mode='TUTORIAL' AND scenario_id IS NOT NULL AND tutorial_manifest_sha256 IS NOT NULL AND tutorial_manifest_sha256 ~ '^[a-f0-9]{64}$' AND scenario_manifest_sha256 IS NULL) OR
 (mode='SKIRMISH' AND scenario_id IS NULL AND tutorial_manifest_sha256 IS NULL AND scenario_manifest_sha256 IS NULL) OR
 (mode='DAILY_CHALLENGE' AND scenario_id IS NOT NULL AND tutorial_manifest_sha256 IS NULL AND scenario_manifest_sha256 IS NOT NULL AND scenario_manifest_sha256 ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE match_reward_bindings (
 match_id uuid PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
 event_id text NOT NULL REFERENCES weekly_events(id), eligible_account_id uuid REFERENCES principals(id),
 kind text NOT NULL CHECK(kind IN ('PVE','DAILY','PRACTICE')), day_index integer NOT NULL CHECK(day_index BETWEEN 0 AND 6),
 bound_day_ends_at timestamptz NOT NULL, completion_deadline timestamptz NOT NULL,
 CHECK(completion_deadline=bound_day_ends_at+interval '24 hours'), CHECK(kind<>'PRACTICE' OR eligible_account_id IS NULL)
);
CREATE TABLE daily_attempts (
 id uuid PRIMARY KEY, match_id uuid UNIQUE REFERENCES matches(id) ON DELETE SET NULL,
 principal_id uuid NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
 scenario_id text NOT NULL REFERENCES event_scenarios(id),
 status text NOT NULL CHECK(status IN ('ACTIVE','WIN','LOSS','FAULTED')),
 started_at timestamptz NOT NULL, ended_at timestamptz, retry_available_at timestamptz,
 CHECK((status='ACTIVE')=(ended_at IS NULL)),
 CHECK((status='LOSS' AND retry_available_at=ended_at+interval '1 hour' AND retry_available_at IS NOT NULL) OR (status<>'LOSS' AND retry_available_at IS NULL))
);
CREATE INDEX attempts_principal_scenario ON daily_attempts(principal_id,scenario_id,started_at DESC);
--> statement-breakpoint
CREATE TABLE weekly_progress (
 account_id uuid NOT NULL REFERENCES principals(id), event_id text NOT NULL REFERENCES weekly_events(id),
 tickets integer NOT NULL DEFAULT 0 CHECK(tickets BETWEEN 0 AND 1000000), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,event_id)
);
CREATE TABLE reward_ledger (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES principals(id), event_id text NOT NULL REFERENCES weekly_events(id),
 source_key text NOT NULL, kind text NOT NULL CHECK(kind IN ('DAILY','PVE','MILESTONE','CARD','COSMETIC')),
 tickets integer NOT NULL DEFAULT 0 CHECK(tickets BETWEEN 0 AND 10000), card_id text, cosmetic_key text,
 day_index integer CHECK(day_index BETWEEN 0 AND 6), match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
 earned_at timestamptz NOT NULL, UNIQUE(account_id,event_id,source_key),
 CHECK((kind IN ('DAILY','PVE','MILESTONE') AND tickets>0 AND card_id IS NULL AND cosmetic_key IS NULL) OR
 (kind='CARD' AND tickets=0 AND card_id IS NOT NULL AND cosmetic_key IS NULL) OR
 (kind='COSMETIC' AND tickets=0 AND card_id IS NULL AND cosmetic_key IS NOT NULL))
);
CREATE INDEX rewards_history ON reward_ledger(account_id,event_id,earned_at DESC,id);
CREATE TABLE collection_items (
 account_id uuid NOT NULL REFERENCES principals(id), card_id text NOT NULL CHECK(card_id ~ '^E(0[1-9]|1[0-2])$'),
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 2),
 first_earned_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,card_id)
);
CREATE TABLE cosmetic_unlocks (
 account_id uuid NOT NULL REFERENCES principals(id), cosmetic_key text NOT NULL, event_id text NOT NULL REFERENCES weekly_events(id),
 earned_at timestamptz NOT NULL, PRIMARY KEY(account_id,cosmetic_key)
);
--> statement-breakpoint
CREATE FUNCTION protect_started_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='weekly_events' THEN
  IF EXISTS(SELECT 1 FROM event_scenarios s JOIN daily_attempts a ON a.scenario_id=s.id WHERE s.event_id=OLD.id)
   AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Started event definitions are immutable' USING ERRCODE='23514'; END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM daily_attempts WHERE scenario_id=OLD.id)
   AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Started scenarios are immutable' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_event_definition BEFORE UPDATE ON weekly_events FOR EACH ROW EXECUTE FUNCTION protect_started_event();
CREATE TRIGGER protect_scenario_definition BEFORE UPDATE ON event_scenarios FOR EACH ROW EXECUTE FUNCTION protect_started_event();
