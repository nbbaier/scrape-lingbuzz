ALTER TABLE `authors`
DROP COLUMN `data_created_at`;

--> statement-breakpoint
ALTER TABLE `authors`
DROP COLUMN `data_updated_at`;

--> statement-breakpoint
ALTER TABLE `papers`
DROP COLUMN `data_created_at`;

--> statement-breakpoint
ALTER TABLE `papers`
DROP COLUMN `data_updated_at`;