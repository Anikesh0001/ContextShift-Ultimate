(() => {
  if (window.__contextShiftUltimateLoaded) return;
  window.__contextShiftUltimateLoaded = true;

  const host = location.hostname;
  const platform = host.includes("claude.ai") ? "Claude"
    : host.includes("gemini.google.com") ? "Gemini"
    : host.includes("grok.com") ? "Grok"
    : host.includes("perplexity.ai") ? "Perplexity" : "ChatGPT";
  const clean = value => (value || "").replace(/\u200b/g, "").trim();
  const visible = node => !!node && node.getClientRects().length > 0;
  const textOf = node => {
    if (!node) return "";
    const clone = node.cloneNode(true);
    clone.querySelectorAll("button, input, textarea, select, nav, [aria-hidden='true'], svg").forEach(n => n.remove());
    return clean(clone.innerText || clone.textContent || "");
  };
  const unique = nodes => [...new Set(nodes)];

  // Message-level selectors first; broad fallback selectors are used only if needed.
  const SELECTORS = {
    ChatGPT: [
      '[data-message-author-role="user"]',
      '[data-message-author-role="assistant"]',
      '[data-testid^="conversation-turn-"]',
      'main article'
    ],
    Claude: [
      '[data-testid="user-message"]',
      '[data-testid="chat-message"]',
      '[data-testid*="message"]',
      '.font-user-message',
      'main [class*="message"]'
    ],
    Gemini: [
      'user-query',
      'model-response',
      'main [class*="query-text"]',
      'main [class*="response-content"]',
      'main [class*="message"]'
    ],
    Grok: [
      '[data-testid*="message"]',
      '[data-message-author-role="user"]',
      '[data-message-author-role="assistant"]',
      'main article',
      'main [class*="message"]'
    ],
    Perplexity: [
      '[data-testid*="answer"]',
      '[data-testid*="query"]',
      '[data-message-author-role="user"]',
      '[data-message-author-role="assistant"]',
      'main article',
      'main [class*="message"]'
    ]
  };

  function collectNodes() {
    const specific = {
      ChatGPT: ['[data-message-author-role="user"]','[data-message-author-role="assistant"]','[data-testid^="conversation-turn-"]'],
      Claude: ['[data-testid="user-message"]','[data-testid="chat-message"]','[data-testid*="message"]','[class*="font-user-message"]'],
      Gemini: ['user-query','model-response','[class*="query-text"]','[class*="response-content"]'],
      Grok: ['[data-testid*="message"]','[data-message-author-role="user"]','[data-message-author-role="assistant"]'],
      Perplexity: ['[data-testid*="answer"]','[data-testid*="query"]','[data-message-author-role="user"]','[data-message-author-role="assistant"]']
    };
    const broad = {
      ChatGPT: ['main article','main [data-testid*="conversation-turn"]','main [class*="group"]'],
      Claude: ['main [class*="message"]','main [class*="Message"]','main .prose'],
      Gemini: ['main user-query','main model-response','main [class*="message"]','main [class*="response"]'],
      Grok: ['main article','main [class*="message"]','main [class*="Message"]'],
      Perplexity: ['main article','main [class*="message"]','main [class*="Message"]','main [class*="prose"]']
    };
    const query = selectors => {
      const found = [];
      for (const selector of selectors || []) {
        try { found.push(...document.querySelectorAll(selector)); } catch (_) {}
      }
      return unique(found).filter(n => visible(n) && textOf(n).length >= 2);
    };
    let nodes = query(specific[platform]);
    // Do not use overly broad ancestor filtering on explicit message nodes.
    if (!nodes.length) nodes = query(broad[platform]);
    // If selector-specific candidates are nested, keep the smallest useful message node,
    // not the page-level wrapper that can swallow an entire transcript.
    nodes = nodes.filter(n => {
      const txt = textOf(n);
      if (!txt) return false;
      const parent = n.parentElement;
      if (!parent) return true;
      // Suppress a node only when its parent has essentially identical text and is also
      // a known message wrapper; avoid suppressing all child messages under main.
      const parentText = textOf(parent);
      const knownWrapper = parent.matches?.('[data-testid^="conversation-turn-"],[data-message-author-role],user-query,model-response,article');
      return !(knownWrapper && parentText === txt);
    });
    const seen = new Set();
    nodes = nodes.filter(n => {
      const t = textOf(n);
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
    return nodes.sort((a,b) => {
      const pos = a.compareDocumentPosition(b);
      return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 :
             pos & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
    });
  }

  function inferRole(node, index) {
    const roleNode = node.closest?.("[data-message-author-role]") || node.querySelector?.("[data-message-author-role]") || node;
    const info = [
      roleNode.getAttribute("data-message-author-role"),
      node.getAttribute("data-message-author-role"),
      node.getAttribute("data-author"),
      node.getAttribute("aria-label"),
      node.getAttribute("data-testid"),
      node.tagName,
      typeof node.className === "string" ? node.className : ""
    ].join(" ").toLowerCase();
    if (/user-query|user-message|font-user-message|author-role.?user|(^|[\s_-])user([\s_-]|$)/.test(info)) return "user";
    if (/model-response|assistant|answer|response-content|ai-message/.test(info)) return "assistant";
    return index % 2 === 0 ? "user" : "assistant";
  }

  function titleText() {
    const title = clean(document.title.replace(/\s*[|—-]\s*(ChatGPT|Claude|Gemini|Grok|Perplexity).*$/i, ""));
    if (title && !/^(ChatGPT|Claude|Gemini|Grok|Perplexity)$/i.test(title)) return title;
    const heading = document.querySelector("main h1, main h2");
    return clean(heading?.innerText) || `${platform} conversation`;
  }

  function extractConversation() {
    const nodes = collectNodes();
    const messages = nodes.map((node, index) => ({role: inferRole(node,index), content: textOf(node), index}))
      .filter(m => m.content.length > 0);
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,10)}`,
      platform, title: titleText(), url: location.href,
      capturedAt: new Date().toISOString(), messages,
      extraction: `${platform} DOM heuristic; ${messages.length} candidate message blocks. Verify completeness and speaker labels.`
    };
  }

  async function captureAll() {
    // Give SPA hydration a short opportunity, then read all currently mounted DOM nodes.
    await new Promise(resolve => setTimeout(resolve, 350));
    const conversation = extractConversation();
    if (!conversation.messages.length) {
      throw new Error(`No message blocks found on ${platform}. This UI may need a selector update.`);
    }
    const response = await chrome.runtime.sendMessage({type:"CSU_SAVE", conversation});
    if (!response?.ok) throw new Error(response?.error || "Storage service did not confirm save");
    return {count: response.count ?? conversation.messages.length, title: conversation.title};
  }

  function notify(message) {
    let status = document.getElementById("csu-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "csu-status";
      status.style.cssText = "position:fixed;right:20px;bottom:76px;z-index:2147483647;background:#18254f;color:white;padding:12px 16px;border-radius:10px;font:13px system-ui;box-shadow:0 4px 20px #0003;max-width:360px";
      document.documentElement.appendChild(status);
    }
    status.textContent = message;
    setTimeout(() => status.remove(), 5000);
  }

  function addButton() {
    if (document.getElementById("csu-capture-button")) return;
    const btn = document.createElement("button");
    btn.id = "csu-capture-button";
    btn.type = "button";
    btn.textContent = "Save context";
    btn.title = "Capture conversation currently loaded in this page";
    btn.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:2147483647;border:0;border-radius:24px;background:#263c83;color:#fff;padding:13px 18px;font:600 13px system-ui;cursor:pointer;box-shadow:0 3px 14px #0003";
    btn.addEventListener("click", async () => {
      btn.disabled = true; btn.textContent = "Capturing…";
      try {
        const result = await captureAll();
        btn.textContent = `Saved (${result.count})`;
        notify(`Saved ${result.count} message blocks from ${platform}. Please verify completeness before handoff.`);
      } catch (error) {
        btn.textContent = "Capture failed";
        console.error("ContextShift Ultimate capture failed", error);
        notify(`Capture failed: ${error.message}`);
      } finally {
        setTimeout(() => { btn.textContent = "Save context"; btn.disabled = false; }, 2600);
      }
    });
    document.documentElement.appendChild(btn);
  }

  addButton();
  let autoTimer = null;
  let lastSignature = "";
  const autoObserver = new MutationObserver((mutations) => {
    addButton();
    // Ignore mutations confined to our own UI and common transient controls.
    const meaningful = mutations.some(m => {
      const target = m.target?.nodeType === 1 ? m.target : m.target?.parentElement;
      return target && !target.closest?.("#csu-capture-button, #csu-status");
    });
    if (!meaningful) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(async () => {
      try {
        const conversation = extractConversation();
        if (!conversation.messages.length) return;
        const signature = conversation.messages.map(m => m.role + ":" + m.content).join("\\n");
        if (signature === lastSignature) return;
        lastSignature = signature;
        await chrome.runtime.sendMessage({type:"CSU_SAVE", conversation});
      } catch (error) {
        console.debug("ContextShift Ultimate auto-capture skipped", error);
      }
    }, 1400);
  });
  autoObserver.observe(document.documentElement, {childList:true,subtree:true,characterData:true});
})();