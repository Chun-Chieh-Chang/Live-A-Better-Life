# AI providers

The backend prefers Agnes when AGNES_API_KEY is configured. Agnes defaults to agnes-3.0-flash at https://apihub.agnes-ai.com/v1/chat/completions. The endpoint is fixed to prevent forwarding credentials to an arbitrary host. Redirects are rejected. AI_PROVIDER accepts auto (default), agnes or gemini. AGNES_MODEL and GEMINI_MODEL can override model IDs. Gemini remains supported. A failed request falls back to preset advice rather than sending the same journal to another provider.

Windows stores the chosen Agnes key in the protected, Git-ignored Live-A-Better-Life-Data directory inside the project as agnes.dpapi, encrypted using Windows CurrentUser DPAPI. Start-LifeOS.ps1 decrypts it only into the backend child process environment. No key value is stored in source, browser data, journal SQLite or JSON journal backups. AGNES_API_KEY in .env.example is empty. Do not copy the private data directory into Git or remote backups. Normal API calls send the credential only to the configured Agnes endpoint for authentication.

The adapter uses the documented chat/completions contract, bounded output, cancellation, generic errors and validated structured coaching responses. Stored aiSource distinguishes agnes, gemini and preset advice; the normal UI stays provider-neutral. Missing keys and provider failures leave journaling, feedback and backups available.

Verification: CLI checks use agnes-ai-cli and synthetic text. Unit tests exercise selection, request shape, auth rejection, invalid replies, timeout, accurate sources and backup compatibility. Regression browser tests explicitly unset both provider keys to avoid unintended external requests. Live checks must never use private journal content.

API documentation: https://agnes-ai.com/en/docs/quickstart

2026-11-01 verification: selected local DPAPI credential passed the CLI synthetic pong check. The restarted personal backend returned source=agnes and isFallback=false for a synthetic coaching request (about 6 seconds). The temporary test session was logged out. Plaintext credential scan found no key in repository files, browser bundle or journal backups. No private journal was used in these live checks.
