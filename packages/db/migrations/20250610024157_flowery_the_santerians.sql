CREATE TABLE
   `authors` (
      `author_id` integer PRIMARY KEY NOT NULL,
      `first_name` text,
      `last_name` text,
      `username` text NOT NULL,
      `email` text NOT NULL,
      `website` text,
      `affiliation` text,
      `data_created_at` integer NOT NULL,
      `data_updated_at` integer NOT NULL,
      `row_created_at` integer,
      `row_updated_at` integer
   );

--> statement-breakpoint
CREATE UNIQUE INDEX `authors_username_unique` ON `authors` (`username`);

--> statement-breakpoint
CREATE INDEX `authors_names` ON `authors` (`last_name`, `first_name`);

--> statement-breakpoint
CREATE INDEX `authors_email` ON `authors` (`email`);

--> statement-breakpoint
CREATE TABLE
   `authors_to_papers` (
      `author_id` integer NOT NULL,
      `paper_id` integer NOT NULL,
      `author_position` integer NOT NULL,
      `row_created_at` integer,
      `row_updated_at` integer,
      PRIMARY KEY (`author_id`, `paper_id`),
      FOREIGN KEY (`author_id`) REFERENCES `authors` (`author_id`) ON UPDATE cascade ON DELETE cascade,
      FOREIGN KEY (`paper_id`) REFERENCES `papers` (`paper_id`) ON UPDATE cascade ON DELETE cascade
   );

--> statement-breakpoint
CREATE TABLE
   `keywords` (
      `keyword_id` integer PRIMARY KEY NOT NULL,
      `keyword` text NOT NULL,
      `row_created_at` integer,
      `row_updated_at` integer
   );

--> statement-breakpoint
CREATE UNIQUE INDEX `keywords_keyword_unique` ON `keywords` (`keyword`);

--> statement-breakpoint
CREATE TABLE
   `keywords_to_papers` (
      `keyword_id` integer NOT NULL,
      `paper_id` integer NOT NULL,
      `row_created_at` integer,
      `row_updated_at` integer,
      PRIMARY KEY (`keyword_id`, `paper_id`),
      FOREIGN KEY (`keyword_id`) REFERENCES `keywords` (`keyword_id`) ON UPDATE cascade ON DELETE cascade,
      FOREIGN KEY (`paper_id`) REFERENCES `papers` (`paper_id`) ON UPDATE cascade ON DELETE cascade
   );

--> statement-breakpoint
CREATE TABLE
   `papers` (
      `paper_id` integer PRIMARY KEY NOT NULL,
      `lingbuzz_id` text NOT NULL,
      `paper_title` text NOT NULL,
      `published_in` text,
      `paper_year` text NOT NULL,
      `paper_month` text NOT NULL,
      `keywords_raw` text,
      `abstract` text,
      `paper_reference` text NOT NULL,
      `downloads` integer,
      `download_url` text,
      `paper_url` text,
      `data_created_at` integer NOT NULL,
      `data_updated_at` integer NOT NULL,
      `row_created_at` integer,
      `row_updated_at` integer
   );

--> statement-breakpoint
CREATE UNIQUE INDEX `papers_lingbuzzId_unique` ON `papers` (`lingbuzz_id`);

--> statement-breakpoint
CREATE INDEX `papers_year` ON `papers` (`paper_year`);

--> statement-breakpoint
CREATE INDEX `papers_month` ON `papers` (`paper_month`);

--> statement-breakpoint
CREATE INDEX `papers_date` ON `papers` (`paper_year`, `paper_month`);