-- Marks a piece as assigned repertoire for the current semester, so the
-- semester profile can pull from the existing pieces list instead of keeping
-- a second free-text list that drifts out of sync. Boolean stored as 0/1;
-- existing rows default to 0.
ALTER TABLE pieces ADD COLUMN assigned INTEGER DEFAULT 0;
