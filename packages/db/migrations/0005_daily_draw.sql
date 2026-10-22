ALTER TABLE daily_attempts DROP CONSTRAINT daily_attempts_status_check;
ALTER TABLE daily_attempts ADD CONSTRAINT daily_attempts_status_check CHECK(status IN ('ACTIVE','WIN','LOSS','DRAW','FAULTED'));
