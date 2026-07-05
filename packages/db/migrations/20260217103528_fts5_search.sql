CREATE VIRTUAL TABLE IF NOT EXISTS papers_fts USING fts5(
  paper_id UNINDEXED,
  lingbuzz_id UNINDEXED,
  title,
  abstract,
  keywords,
  authors,
  tokenize='porter unicode61'
);

--> statement-breakpoint
DELETE FROM papers_fts;

--> statement-breakpoint
INSERT INTO papers_fts (paper_id, lingbuzz_id, title, abstract, keywords, authors)
SELECT
  p.paper_id,
  p.lingbuzz_id,
  p.paper_title,
  COALESCE(p.abstract, ''),
  COALESCE(
    (
      SELECT GROUP_CONCAT(keyword, ' ')
      FROM (
        SELECT k.keyword AS keyword
        FROM keywords_to_papers ktp
        JOIN keywords k ON k.keyword_id = ktp.keyword_id
        WHERE ktp.paper_id = p.paper_id
        ORDER BY k.keyword
      )
    ),
    ''
  ),
  COALESCE(
    (
      SELECT GROUP_CONCAT(author_name, ' ')
      FROM (
        SELECT TRIM(COALESCE(a.first_name, '') || ' ' || COALESCE(a.last_name, '')) AS author_name
        FROM authors_to_papers atp
        JOIN authors a ON a.author_id = atp.author_id
        WHERE atp.paper_id = p.paper_id
        ORDER BY atp.author_position
      )
    ),
    ''
  )
FROM papers p;

--> statement-breakpoint
DROP TRIGGER IF EXISTS papers_fts_paper_insert;

--> statement-breakpoint
CREATE TRIGGER papers_fts_paper_insert
AFTER INSERT ON papers
FOR EACH ROW
BEGIN
  INSERT INTO papers_fts (paper_id, lingbuzz_id, title, abstract, keywords, authors)
  VALUES (
    NEW.paper_id,
    NEW.lingbuzz_id,
    NEW.paper_title,
    COALESCE(NEW.abstract, ''),
    COALESCE(
      (
        SELECT GROUP_CONCAT(keyword, ' ')
        FROM (
          SELECT k.keyword AS keyword
          FROM keywords_to_papers ktp
          JOIN keywords k ON k.keyword_id = ktp.keyword_id
          WHERE ktp.paper_id = NEW.paper_id
          ORDER BY k.keyword
        )
      ),
      ''
    ),
    COALESCE(
      (
        SELECT GROUP_CONCAT(author_name, ' ')
        FROM (
          SELECT TRIM(COALESCE(a.first_name, '') || ' ' || COALESCE(a.last_name, '')) AS author_name
          FROM authors_to_papers atp
          JOIN authors a ON a.author_id = atp.author_id
          WHERE atp.paper_id = NEW.paper_id
          ORDER BY atp.author_position
        )
      ),
      ''
    )
  );
END;

--> statement-breakpoint
DROP TRIGGER IF EXISTS papers_fts_paper_update;

--> statement-breakpoint
CREATE TRIGGER papers_fts_paper_update
AFTER UPDATE ON papers
FOR EACH ROW
BEGIN
  UPDATE papers_fts
  SET
    paper_id = NEW.paper_id,
    lingbuzz_id = NEW.lingbuzz_id,
    title = NEW.paper_title,
    abstract = COALESCE(NEW.abstract, ''),
    keywords = COALESCE(
      (
        SELECT GROUP_CONCAT(keyword, ' ')
        FROM (
          SELECT k.keyword AS keyword
          FROM keywords_to_papers ktp
          JOIN keywords k ON k.keyword_id = ktp.keyword_id
          WHERE ktp.paper_id = NEW.paper_id
          ORDER BY k.keyword
        )
      ),
      ''
    ),
    authors = COALESCE(
      (
        SELECT GROUP_CONCAT(author_name, ' ')
        FROM (
          SELECT TRIM(COALESCE(a.first_name, '') || ' ' || COALESCE(a.last_name, '')) AS author_name
          FROM authors_to_papers atp
          JOIN authors a ON a.author_id = atp.author_id
          WHERE atp.paper_id = NEW.paper_id
          ORDER BY atp.author_position
        )
      ),
      ''
    )
  WHERE paper_id = OLD.paper_id;
END;

--> statement-breakpoint
DROP TRIGGER IF EXISTS papers_fts_paper_delete;

--> statement-breakpoint
CREATE TRIGGER papers_fts_paper_delete
AFTER DELETE ON papers
FOR EACH ROW
BEGIN
  DELETE FROM papers_fts WHERE paper_id = OLD.paper_id;
END;

--> statement-breakpoint
DROP TRIGGER IF EXISTS papers_fts_keyword_link_insert;

--> statement-breakpoint
CREATE TRIGGER papers_fts_keyword_link_insert
AFTER INSERT ON keywords_to_papers
FOR EACH ROW
BEGIN
  UPDATE papers_fts
  SET keywords = COALESCE(
    (
      SELECT GROUP_CONCAT(keyword, ' ')
      FROM (
        SELECT k.keyword AS keyword
        FROM keywords_to_papers ktp
        JOIN keywords k ON k.keyword_id = ktp.keyword_id
        WHERE ktp.paper_id = NEW.paper_id
        ORDER BY k.keyword
      )
    ),
    ''
  )
  WHERE paper_id = NEW.paper_id;
END;

--> statement-breakpoint
DROP TRIGGER IF EXISTS papers_fts_keyword_link_update;

--> statement-breakpoint
CREATE TRIGGER papers_fts_keyword_link_update
AFTER UPDATE ON keywords_to_papers
FOR EACH ROW
BEGIN
  UPDATE papers_fts
  SET keywords = COALESCE(
    (
      SELECT GROUP_CONCAT(keyword, ' ')
      FROM (
        SELECT k.keyword AS keyword
        FROM keywords_to_papers ktp
        JOIN keywords k ON k.keyword_id = ktp.keyword_id
        WHERE ktp.paper_id = NEW.paper_id
        ORDER BY k.keyword
      )
    ),
    ''
  )
  WHERE paper_id = NEW.paper_id;

  UPDATE papers_fts
  SET keywords = COALESCE(
    (
      SELECT GROUP_CONCAT(keyword, ' ')
      FROM (
        SELECT k.keyword AS keyword
        FROM keywords_to_papers ktp
        JOIN keywords k ON k.keyword_id = ktp.keyword_id
        WHERE ktp.paper_id = OLD.paper_id
        ORDER BY k.keyword
      )
    ),
    ''
  )
  WHERE paper_id = OLD.paper_id
    AND OLD.paper_id <> NEW.paper_id;
END;

--> statement-breakpoint
DROP TRIGGER IF EXISTS papers_fts_keyword_link_delete;

--> statement-breakpoint
CREATE TRIGGER papers_fts_keyword_link_delete
AFTER DELETE ON keywords_to_papers
FOR EACH ROW
BEGIN
  UPDATE papers_fts
  SET keywords = COALESCE(
    (
      SELECT GROUP_CONCAT(keyword, ' ')
      FROM (
        SELECT k.keyword AS keyword
        FROM keywords_to_papers ktp
        JOIN keywords k ON k.keyword_id = ktp.keyword_id
        WHERE ktp.paper_id = OLD.paper_id
        ORDER BY k.keyword
      )
    ),
    ''
  )
  WHERE paper_id = OLD.paper_id;
END;

--> statement-breakpoint
DROP TRIGGER IF EXISTS papers_fts_author_link_insert;

--> statement-breakpoint
CREATE TRIGGER papers_fts_author_link_insert
AFTER INSERT ON authors_to_papers
FOR EACH ROW
BEGIN
  UPDATE papers_fts
  SET authors = COALESCE(
    (
      SELECT GROUP_CONCAT(author_name, ' ')
      FROM (
        SELECT TRIM(COALESCE(a.first_name, '') || ' ' || COALESCE(a.last_name, '')) AS author_name
        FROM authors_to_papers atp
        JOIN authors a ON a.author_id = atp.author_id
        WHERE atp.paper_id = NEW.paper_id
        ORDER BY atp.author_position
      )
    ),
    ''
  )
  WHERE paper_id = NEW.paper_id;
END;

--> statement-breakpoint
DROP TRIGGER IF EXISTS papers_fts_author_link_update;

--> statement-breakpoint
CREATE TRIGGER papers_fts_author_link_update
AFTER UPDATE ON authors_to_papers
FOR EACH ROW
BEGIN
  UPDATE papers_fts
  SET authors = COALESCE(
    (
      SELECT GROUP_CONCAT(author_name, ' ')
      FROM (
        SELECT TRIM(COALESCE(a.first_name, '') || ' ' || COALESCE(a.last_name, '')) AS author_name
        FROM authors_to_papers atp
        JOIN authors a ON a.author_id = atp.author_id
        WHERE atp.paper_id = NEW.paper_id
        ORDER BY atp.author_position
      )
    ),
    ''
  )
  WHERE paper_id = NEW.paper_id;

  UPDATE papers_fts
  SET authors = COALESCE(
    (
      SELECT GROUP_CONCAT(author_name, ' ')
      FROM (
        SELECT TRIM(COALESCE(a.first_name, '') || ' ' || COALESCE(a.last_name, '')) AS author_name
        FROM authors_to_papers atp
        JOIN authors a ON a.author_id = atp.author_id
        WHERE atp.paper_id = OLD.paper_id
        ORDER BY atp.author_position
      )
    ),
    ''
  )
  WHERE paper_id = OLD.paper_id
    AND OLD.paper_id <> NEW.paper_id;
END;

--> statement-breakpoint
DROP TRIGGER IF EXISTS papers_fts_author_link_delete;

--> statement-breakpoint
CREATE TRIGGER papers_fts_author_link_delete
AFTER DELETE ON authors_to_papers
FOR EACH ROW
BEGIN
  UPDATE papers_fts
  SET authors = COALESCE(
    (
      SELECT GROUP_CONCAT(author_name, ' ')
      FROM (
        SELECT TRIM(COALESCE(a.first_name, '') || ' ' || COALESCE(a.last_name, '')) AS author_name
        FROM authors_to_papers atp
        JOIN authors a ON a.author_id = atp.author_id
        WHERE atp.paper_id = OLD.paper_id
        ORDER BY atp.author_position
      )
    ),
    ''
  )
  WHERE paper_id = OLD.paper_id;
END;

--> statement-breakpoint
DROP TRIGGER IF EXISTS papers_fts_keyword_update;

--> statement-breakpoint
CREATE TRIGGER papers_fts_keyword_update
AFTER UPDATE OF keyword ON keywords
FOR EACH ROW
BEGIN
  UPDATE papers_fts
  SET keywords = COALESCE(
    (
      SELECT GROUP_CONCAT(keyword, ' ')
      FROM (
        SELECT k.keyword AS keyword
        FROM keywords_to_papers ktp
        JOIN keywords k ON k.keyword_id = ktp.keyword_id
        WHERE ktp.paper_id = papers_fts.paper_id
        ORDER BY k.keyword
      )
    ),
    ''
  )
  WHERE paper_id IN (
    SELECT DISTINCT paper_id
    FROM keywords_to_papers
    WHERE keyword_id = NEW.keyword_id
  );
END;

--> statement-breakpoint
DROP TRIGGER IF EXISTS papers_fts_author_name_update;

--> statement-breakpoint
CREATE TRIGGER papers_fts_author_name_update
AFTER UPDATE OF first_name, last_name ON authors
FOR EACH ROW
BEGIN
  UPDATE papers_fts
  SET authors = COALESCE(
    (
      SELECT GROUP_CONCAT(author_name, ' ')
      FROM (
        SELECT TRIM(COALESCE(a.first_name, '') || ' ' || COALESCE(a.last_name, '')) AS author_name
        FROM authors_to_papers atp
        JOIN authors a ON a.author_id = atp.author_id
        WHERE atp.paper_id = papers_fts.paper_id
        ORDER BY atp.author_position
      )
    ),
    ''
  )
  WHERE paper_id IN (
    SELECT DISTINCT paper_id
    FROM authors_to_papers
    WHERE author_id = NEW.author_id
  );
END;
