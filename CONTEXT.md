# LingBuzz Reading Layer

A public alternative frontend for LingBuzz (ling.auf.net): a metadata-only mirror offering modern browse and search over the linguistics preprint archive. LingBuzz remains the archive of record; this project never hosts papers.

## Language

**Archive of record**:
LingBuzz itself (ling.auf.net), the canonical home of every paper and PDF. All download links point here.
_Avoid_: source site, upstream (in user-facing copy)

**Reading layer**:
This project — the discovery and browsing surface over the archive of record. Explicitly unofficial, named distinctly from LingBuzz, and serves metadata only, never PDFs.
_Avoid_: mirror, clone, scraper site

**Paper**:
A single LingBuzz submission, identified by its `lingbuzzId`, with title, abstract, authors, keywords, and versions. The PDF itself is not part of a Paper here — only the link to it.
_Avoid_: article, preprint (as a distinct concept), post

**Author**:
A person with a LingBuzz account, keyed by unique `username`, optionally enriched with email, affiliation, and website. Author order on a Paper preserves citation order.
_Avoid_: user, contributor

**Sync**:
One scheduled scraper run that reconciles the database with the archive of record. Freshness contract: syncs happen every few hours, and the UI displays time since last sync ("last synced N hours ago") rather than pretending to be real-time.
_Avoid_: scrape (in user-facing copy), refresh, update job
