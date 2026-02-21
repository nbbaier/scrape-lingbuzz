DROP TRIGGER IF EXISTS "update_authors_timestamp";

--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";

--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";

--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";

--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";

--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";

--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";

--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";

--> statement-breakpoint
DROP TRIGGER IF EXISTS "update_authors_timestamp";

--> statement-breakpoint
CREATE TRIGGER "update_authors_timestamp" AFTER
UPDATE ON "authors" FOR EACH ROW WHEN (
   "old"."firstName" <> "new"."firstName"
   or "old"."lastName" <> "new"."lastName"
   or "old"."username" <> "new"."username"
   or "old"."email" <> "new"."email"
   or "old"."website" <> "new"."website"
   or "old"."affiliation" <> "new"."affiliation"
) BEGIN
UPDATE authors
SET
   rows_updated_at = CURRENT_TIMESTAMP
WHERE
   authorId = "new"."authorId";

END;