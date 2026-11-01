# Obsidian integration

Required now: install and check Obsidian; automatically persist saved personal workspace records; generate a private dedicated vault after each successful backend revision; expose export failure and retry, never claim both stores succeeded when only SQLite saved.

Required final milestone (not optional): import edits made inside Obsidian back into this tool. Must include stable entry IDs, base revision and content hashes, detected changes, explicit conflict resolution, validation, backups and recovery. Never silently replace app edits or notes edits. Single direction export is an intermediate milestone, not completion of integration.

The app and SQLite remain authoritative during the first milestone. Existing files edited in Obsidian are preserved as a conflict copy before regeneration. Only managed files are touched; personal notes, credentials and plugins are excluded. Generated metadata retains identity and last exported revision to support the final milestone.

## Implemented first milestone

Windows activation detects Obsidian and installs it through winget when missing, with an installation notice. Setup registers a dedicated vault and verifies generated notes. Saved personal workspace changes automatically persist with revision checks; unchanged cached data never overwrites another device. New sessions load saved data before editing. Unsaved uploads warn before unload.

The interface displays the actual notes folder, opens the native Windows Explorer folder selection dialog, and applies a new folder only after staging notes and registering the vault. Existing folders are preserved. The configured NotesRoot survives activation. Paths that include the private database/key folder or project are rejected; credentials never move with notes. Chinese paths use UTF-8 throughout Windows helpers. If Obsidian is running, a new vault must be configured after closing it to avoid overwriting its live settings.

Tests: removed notes destination/failure retry, external edit preservation, conflicting device saves, chosen-folder display/apply, Unicode paths, configuration preservation and 375/390/768/1440px layouts. Native Obsidian opened the generated Notes vault and indexed 我的小改變.md.

## Implemented write-back milestone

Scope: the words the user writes in each daily note (the fields listed in `DAILY_LAYOUT` in `src/utils/markdownExporter.ts`, the single source for both export and re-reading). Each export records a per-entry snapshot of those fields next to the file hashes in `.life-os-sync.json`.

- Detection: a note whose file changed is parsed; per field, notes vs. snapshot vs. app decides the result. Only fields where the notes differ from both snapshot and app are reported (`GET /api/obsidian/changes`). Line-ending-only changes are not edits. A note whose fixed headings were damaged is never imported (it is preserved and rewritten as before).
- No silent loss: while an unimported edit exists, later saves do not rewrite that note. After an import it is rewritten without leaving a duplicate copy.
- Conflict: the same field changed in notes and in the app requires an explicit choice per day. Choosing the notes version imports it (a new revision, so the previous one stays in history); choosing the app version saves the notes version into the preserved-edits folder and rewrites the note (`POST /api/obsidian/import`, which also rejects stale revisions and invalid data).
- Interface: the personal-space panel lists changes in plain words after the window regains focus, and imports only when the user presses the button.

Not covered yet, kept as preserved copies rather than imported: edits to 我的小改變.md, edits outside the listed fields (headings, tags, advice blocks), and notes created from scratch in Obsidian.

Tests: `tests/obsidian.test.ts` (round trip for every state, line endings, conflict, damaged structure, API import/conflict/stale revision). Folder dialog: `npm run test:folder-dialog` opens the real dialog from a hidden process and checks visibility, foreground, cancel and choose; it needs an unlocked interactive desktop.