# Obsidian integration

Required now: install and check Obsidian; automatically persist saved personal workspace records; generate a private dedicated vault after each successful backend revision; expose export failure and retry, never claim both stores succeeded when only SQLite saved.

Required final milestone (not optional): import edits made inside Obsidian back into this tool. Must include stable entry IDs, base revision and content hashes, detected changes, explicit conflict resolution, validation, backups and recovery. Never silently replace app edits or notes edits. Single direction export is an intermediate milestone, not completion of integration.

The app and SQLite remain authoritative during the first milestone. Existing files edited in Obsidian are preserved as a conflict copy before regeneration. Only managed files are touched; personal notes, credentials and plugins are excluded. Generated metadata retains identity and last exported revision to support the final milestone.

## Implemented first milestone

Windows activation detects Obsidian and installs it through winget when missing, with an installation notice. Setup registers a dedicated vault and verifies generated notes. Saved personal workspace changes automatically persist with revision checks; unchanged cached data never overwrites another device. New sessions load saved data before editing. Unsaved uploads warn before unload.

The interface displays the actual notes folder, opens the native Windows Explorer folder selection dialog, and applies a new folder only after staging notes and registering the vault. Existing folders are preserved. The configured NotesRoot survives activation. Paths that include the private database/key folder or project are rejected; credentials never move with notes. Chinese paths use UTF-8 throughout Windows helpers. If Obsidian is running, a new vault must be configured after closing it to avoid overwriting its live settings.

Tests: removed notes destination/failure retry, external edit preservation, conflicting device saves, chosen-folder display/apply, Unicode paths, configuration preservation and 375/390/768/1440px layouts. Native Obsidian opened the generated Notes vault and indexed 我的小改變.md.

Final bidirectional write-back is NOT complete and remains required. Do not treat the first milestone as completion of this plan.
