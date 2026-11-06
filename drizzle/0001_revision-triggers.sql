CREATE TRIGGER people_revision_insert AFTER INSERT ON people BEGIN
  INSERT INTO wheel_state (id, revision) VALUES (1, 1)
  ON CONFLICT(id) DO UPDATE SET revision = revision + 1;
END;
--> statement-breakpoint
CREATE TRIGGER people_revision_update AFTER UPDATE ON people BEGIN
  INSERT INTO wheel_state (id, revision) VALUES (1, 1)
  ON CONFLICT(id) DO UPDATE SET revision = revision + 1;
END;
--> statement-breakpoint
CREATE TRIGGER picks_revision_insert AFTER INSERT ON picks BEGIN
  INSERT INTO wheel_state (id, revision) VALUES (1, 1)
  ON CONFLICT(id) DO UPDATE SET revision = revision + 1;
END;
--> statement-breakpoint
CREATE TRIGGER picks_revision_update AFTER UPDATE ON picks BEGIN
  INSERT INTO wheel_state (id, revision) VALUES (1, 1)
  ON CONFLICT(id) DO UPDATE SET revision = revision + 1;
END;
