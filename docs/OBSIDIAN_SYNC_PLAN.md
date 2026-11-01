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

The manual (我的小改變.md) uses the same rules. Each item carries a hidden id marker, so edits to wording, the on/off checkbox, new items (a line without a marker) and deleted items are all recognised; `OS_LISTS` in `src/utils/markdownExporter.ts` is the single definition of the lists and fields. Deleting an item the app also edited is a conflict. Reordering alone is not imported (the app's order stays). If the app's own text could not be read back identically, nothing is imported from that note.

Deliberately not imported, and kept as preserved copies when the note is rewritten: headings and fixed wording (derived from the app, nothing to learn from them), the AI advice block (generated content), tags and key factors (derived labels), and diary notes created from scratch in Obsidian (the app creates entries; a stray file has no identity to reconcile). Whitespace-only differences, the "not added yet" placeholder lines and the hidden markers do not count as edits.
Tests: `tests/obsidian.test.ts` (round trip for every state, line endings, conflict, damaged structure, API import/conflict/stale revision). Folder dialog: `npm run test:folder-dialog` opens the real dialog from a hidden process and checks visibility, foreground, cancel and choose; it needs an unlocked interactive desktop.