-- Transactional invalidations only: public revision plus routing identifiers.
-- PostgreSQL delivers NOTIFY after commit; rolled-back changes never escape.
CREATE FUNCTION notify_oathfront_match_changed() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR
     NEW.revision IS DISTINCT FROM OLD.revision OR
     NEW.status IS DISTINCT FROM OLD.status OR
     NEW.human_principal_id IS DISTINCT FROM OLD.human_principal_id THEN
    PERFORM pg_notify('oathfront_match_changed', json_build_object(
      'matchId', NEW.id,
      'revision', NEW.revision,
      'ownerId', NEW.human_principal_id
    )::text);
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER matches_realtime_changed
AFTER INSERT OR UPDATE OF revision, status, human_principal_id ON matches
FOR EACH ROW EXECUTE FUNCTION notify_oathfront_match_changed();
