# Metadata-only mirror: we never host or serve PDFs

This project is a reading layer over LingBuzz, not a rehost. We store and
serve metadata only (titles, abstracts, authors, keywords, versions, download
counts); every PDF/download link points back to ling.auf.net. We chose this
over cached-PDF mirroring (resilience to LingBuzz outages) and over
fetch-for-full-text-indexing (better search) because it is the most courteous
posture toward the archive's host, carries zero copyright/author-consent
ambiguity, and the existing schema already supports it. Consequence: search
operates on abstracts and metadata, not full text, and paper availability
depends on LingBuzz uptime — both accepted deliberately. Revisiting full-text
*indexing* (never serving) is the plausible future exception.
