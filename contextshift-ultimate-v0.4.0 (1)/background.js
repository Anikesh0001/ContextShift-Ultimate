const KEY = "csu_conversations";
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "CSU_SAVE" || !msg.conversation) return;
  (async () => {
    try {
      const data = await chrome.storage.local.get(KEY);
      let conversations = Array.isArray(data[KEY]) ? data[KEY] : [];
      const incoming = msg.conversation;
      const index = conversations.findIndex(c => c.url === incoming.url && c.title === incoming.title);
      if (index >= 0) conversations[index] = incoming;
      else conversations.unshift(incoming);
      conversations = conversations.slice(0, 250);
      await chrome.storage.local.set({ [KEY]: conversations });
      sendResponse({ ok: true, count: incoming.messages?.length ?? 0 });
    } catch (error) {
      console.error("ContextShift Ultimate save failed", error);
      sendResponse({ ok: false, error: String(error) });
    }
  })();
  return true;
});
