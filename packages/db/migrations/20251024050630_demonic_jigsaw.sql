DROP TRIGGER IF EXISTS "update_authors_timestamp";--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";--> statement-breakpoint
CREATE TRIGGER "update_authors_timestamp"
	AFTER UPDATE ON "authors"
	FOR EACH ROW WHEN "old"."firstName" <> "new"."firstName"
BEGIN
	UPDATE authors SET rows_updated_at = CURRENT_TIMESTAMP WHERE authorId = "new"."authorId";
END;