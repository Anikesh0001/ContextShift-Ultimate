# ContextShift Ultimate (prototype)

A local-first Chrome Manifest V3 extension prototype for capturing visible AI chat messages, keeping a searchable local library, and preparing handoff briefs for ChatGPT, Claude, Gemini, Grok, and Perplexity.

## Current scope
- Content-script capture button on the five target domains.
- Heuristic DOM extraction; message completeness and speaker labels can be imperfect.
- Local Chrome extension storage.
- Search, JSON export, deletion, and library-wide export.
- Handoff brief with a user-editable goal, copy, and Markdown download.
- No extension-owned server, analytics, telemetry, remote code, or automatic message sending.

## Install
1. Extract the ZIP to a permanent folder.
2. Open `chrome://extensions`.
3. Turn on Developer mode.
4. Click **Load unpacked** and select this folder (the folder containing `manifest.json`).
5. Open one supported AI chat page and refresh it.
6. Click **Save context** on the page. Open the extension popup to search, export, or create a handoff.

## Test
Run `node tests/smoke-test.js` from this folder. The test checks manifest shape, required host matches, basic feature strings, and absence of explicit remote URL calls in shipped JS. This is a smoke test, not a browser end-to-end or security audit.

## Privacy notes
The prototype has no external network API calls of its own. Content scripts read text from supported pages when you click Save context. The extension stores captured content in `chrome.storage.local`, which persists until you delete it or clear extension data. The receiving AI only sees a handoff if you copy/paste it yourself.

## Known limitations
- DOM selectors now include platform-specific heuristics, but are not verified against every live UI version. Long/virtualized conversations, attachments, images, citations, artifacts, and hidden reasoning may not be captured completely.
- The current role classifier is best-effort and may mislabel messages.
- No automated platform-specific integration tests, live browser tests, network capture, or independent security review have been run.
- Smart compression is a structured handoff template plus a recent-message excerpt; it does not call an LLM and does not claim semantic lossless compression.
- Search runs over captured text only; it cannot search unsaved conversations.
- This is a prototype; use synthetic/non-sensitive chats until extraction has been verified.

## Permissions
- `storage`: persist the local conversation library.
- `downloads`: reserved for future browser download integration; current exports use a Blob download from the popup.
- `activeTab`: included for future explicit active-tab workflows.
- Host permissions: allow content scripts to be injected on the five selected AI domains. Remove any platform match you do not use.

## License
New prototype code is provided under MIT. It does not contain copied source from the research repositories. See `LICENSE`.
