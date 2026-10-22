CREATE OR REPLACE FUNCTION pin_match_versions() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF ROW(NEW.human_side,NEW.mode,NEW.rules_version,NEW.content_version,NEW.location_version,NEW.bot_version,NEW.scenario_id,NEW.tutorial_manifest_sha256,NEW.scenario_manifest_sha256,NEW.rematch) IS DISTINCT FROM ROW(OLD.human_side,OLD.mode,OLD.rules_version,OLD.content_version,OLD.location_version,OLD.bot_version,OLD.scenario_id,OLD.tutorial_manifest_sha256,OLD.scenario_manifest_sha256,OLD.rematch) THEN RAISE EXCEPTION 'Immutable match configuration' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER reward_binding_immutable BEFORE UPDATE ON match_reward_bindings FOR EACH ROW EXECUTE FUNCTION reject_immutable_update();
