# Travel book references

The hosted `/api/books` serves a bibliographic catalog only. Records are in `lib/books-catalog.json`; they are not evidence that the book contents have been read or reviewed. Do not feed these titles into the travel fact answer generator as verified claims.

Full public-domain texts and their SHA-256 checksums are retained in the sibling local folder `../travel-library/`. See that folder's `README.md`, `catalog.json`, and `search.sqlite`. Use `node ../travel-library/search-books.mjs "search words"` to retrieve relevant local passages. The local reader `../travel-library/index.html` opens without a server.

No OpenAI API is used. Do not upload the large text collection into Site build output. The site displays that full texts are stored locally, and links to each catalog source; it does not falsely offer downloads of local files from the cloud.

Collection data distinguishes original publication years from Gutenberg digital release dates, records rather than unique intellectual works, bibliography-only entries from actual saved text, and historical content from current travel advice. Book copyright status follows the source's US public-domain classification; original license notices remain in the saved files.
