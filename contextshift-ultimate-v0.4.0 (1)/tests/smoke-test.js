const fs = require("fs");
const assert = require("assert");
const path = require("path");
const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
assert.equal(manifest.manifest_version, 3, "Manifest V3");
assert.equal(manifest.background.service_worker, "background.js", "service worker save receiver");
assert.ok(manifest.permissions.includes("storage"), "storage permission");
for (const domain of ["chatgpt.com", "chat.openai.com", "claude.ai", "gemini.google.com", "grok.com", "perplexity.ai"]) {
  assert.ok(manifest.host_permissions.some(x => x.includes(domain)), `host permission for ${domain}`);
  assert.ok(manifest.content_scripts[0].matches.some(x => x.includes(domain)), `content script match for ${domain}`);
}
for (const file of ["content.js", "popup.js", "popup.html", "popup.css"]) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} exists`);
}
const js = ["content.js", "popup.js", "background.js"].map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\\n");
assert.ok(js.includes("chrome.storage.local"), "local storage used");
assert.ok(js.includes("CSU_SAVE"), "capture message path exists");
assert.ok(js.includes("handoffFor"), "handoff builder exists");
assert.ok(js.includes("model-response") && js.includes("user-query"), "Gemini-specific selectors exist");
assert.ok(js.includes("No messages were captured"), "empty capture is guarded");
assert.ok(!js.includes('fetch("http://') && !js.includes('fetch("https://') && !js.includes("fetch(`http://") && !js.includes("fetch(`https://"), "no explicit hard-coded remote fetch");
assert.ok(!js.includes("XMLHttpRequest"), "no XMLHttpRequest usage");
console.log("PASS: manifest, platform coverage, core feature markers, and simple network-call smoke checks.");
console.log("NOTE: this does not test browser behavior, extraction accuracy, privacy against all code paths, or platform compatibility.");

assert.ok(js.includes("autoObserver") && js.includes("lastSignature"), "auto-capture observer exists");

assert.ok(js.includes("main article") && js.includes("main .prose"), "fallback selectors exist");
