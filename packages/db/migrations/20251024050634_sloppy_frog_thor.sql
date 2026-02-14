DROP TRIGGER IF EXISTS "update_authors_timestamp";--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";--> statement-breakpoint
CREATE TRIGGER "update_authors_timestamp"
	AFTER UPDATE ON "authors"
	FOR EACH ROW WHEN "old"."firstName" <> "new"."firstName" OR "old"."lastName" <> "new"."lastName" OR "old"."username" <> "new"."username" OR "old"."email" <> "new"."email" OR "old"."website" <> "new"."website" OR "old"."affiliation" <> "new"."affiliation"
BEGIN
	UPDATE authors SET rows_updated_at = CURRENT_TIMESTAMP WHERE authorId = "new"."authorId";
END;