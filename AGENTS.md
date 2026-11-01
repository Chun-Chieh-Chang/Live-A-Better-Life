# Product and UI conventions

The intended user has no technical background. Use everyday Traditional Chinese and explain actions in terms of their effect on the user's records.

Keep the daily path short: choose a feeling, write a few words, save. Primary navigation is 今天 / 我的小改變 / 生活回顧 / 備份. Put secondary activities under 更多 and keep optional forms collapsed.

Do not expose implementation identifiers, architecture diagrams, source transcripts, model versions, API names, storage keys, JSON, Markdown, SSOT, MECE or diagnostic payloads in ordinary product screens. Technical information belongs in source/docs. Mention a file format or filename only when it helps complete an actual file operation. Clearly distinguish preset suggestions from AI-generated suggestions without exposing provider internals.

Keep warnings about saving, replacement, backup and sync clear and truthful. Never imply that a local save has uploaded data. Keep automatic strategy evaluation, dated feedback and correction working when simplifying its presentation.

Preserve the warm white and muted green palette, readable text (14px minimum for controls), 44px touch targets, visible focus and responsive layouts at 375, 390, 768 and desktop widths. Verify absence of horizontal overflow and exercise save, restore, sync and feedback after relevant changes.

SSOT and MECE are implementation principles: authoritative domain rules are shared, responsibilities do not overlap, and derived state is not duplicated. Do not turn these principles into product jargon.

Windows local data and tools belong inside the project as Live-A-Better-Life-Data and Live-A-Better-Life-Tools. Both directories must stay Git-ignored; preserve their private ACLs and never publish their contents. Folder selection should use the familiar native Windows Explorer dialog, with manual path entry retained.

For Obsidian work, read docs/OBSIDIAN_SYNC_PLAN.md and docs/PRODUCT_REQUIREMENTS.md before declaring the integration complete.

Keep the project layout consistent with docs/PROJECT_STRUCTURE.md. Do not regenerate retired root vault folders, embed historical transcripts in frontend code, or place test artifacts in the project root. Preserve original user source documents only in the ignored private Reference directory; current requirements belong in docs/PRODUCT_REQUIREMENTS.md.
