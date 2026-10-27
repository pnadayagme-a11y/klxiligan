// KLX AI Chat Widget
// Add this ONE line before </body> in your HTML pages:
// <script src="/chat-widget.js" defer></script>

(function () {
  const API_URL = "/api/chat";
  const WELCOME =
    "Hi po! Welcome to KLX Receipt Photobooth 🧾\nAsk me about our packages, promos, or how to book.";
  const QUICK = ["Packages & prices", "Ber Month Promo", "How to book?"];

  // Fonts (same as KLX branding)
  const font = document.createElement("link");
  font.rel = "stylesheet";
  font.href =
    "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=VT323&display=swap";
  document.head.appendChild(font);

  const css = `
  #klx-chat-btn{position:fixed;left:18px;bottom:calc(18px + env(safe-area-inset-bottom, 0px));z-index:60;background:#000;color:#fff;border:2px solid #fff;
    font-family:'VT323',monospace;font-size:22px;letter-spacing:1px;padding:10px 18px;border-radius:999px;cursor:pointer;
    box-shadow:0 6px 18px rgba(0,0,0,.35)}
  #klx-chat-btn:hover{transform:translateY(-2px)}
  #klx-chat{position:fixed;left:18px;bottom:80px;z-index:60;width:340px;max-width:calc(100vw - 32px);height:480px;
    max-height:calc(100vh - 110px);display:none;flex-direction:column;background:#fff;color:#000;
    font-family:'Space Mono',monospace;font-size:13px;filter:drop-shadow(0 8px 20px rgba(0,0,0,.3))}
  #klx-chat.open{display:flex}
  #klx-chat::before,#klx-chat::after{content:"";position:absolute;left:0;right:0;height:10px;
    background:radial-gradient(circle at 5px 0,transparent 5px,#fff 5.5px) repeat-x;background-size:10px 10px}
  #klx-chat::before{top:-9px;transform:rotate(180deg)}
  #klx-chat::after{bottom:-9px}
  .klx-head{padding:14px 16px 10px;text-align:center;border-bottom:2px dashed #000}
  .klx-head h3{margin:0;font-family:'VT323',monospace;font-size:28px;line-height:1}
  .klx-head p{margin:4px 0 0;font-size:11px;opacity:.7}
  .klx-close{position:absolute;top:10px;right:12px;background:none;border:none;font-size:20px;cursor:pointer;color:#000}
  .klx-body{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
  .klx-msg{max-width:85%;padding:8px 10px;white-space:pre-wrap;word-wrap:break-word;line-height:1.45}
  .klx-msg a{color:inherit;text-decoration:underline}
  .klx-bot{align-self:flex-start;border:1.5px solid #000}
  .klx-user{align-self:flex-end;background:#000;color:#fff}
  .klx-quick{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 8px}
  .klx-quick button{font-family:inherit;font-size:11px;background:#fff;border:1.5px dashed #000;padding:5px 8px;cursor:pointer}
  .klx-quick button:hover{background:#000;color:#fff}
  .klx-form{display:flex;border-top:2px dashed #000}
  .klx-form input{flex:1;border:none;padding:12px;font-family:inherit;font-size:13px;outline:none;background:#fff;color:#000}
  .klx-form button{border:none;background:#000;color:#fff;font-family:'VT323',monospace;font-size:20px;padding:0 16px;cursor:pointer}
  .klx-form button:disabled{opacity:.5;cursor:default}
  .klx-foot{text-align:center;font-family:'VT323',monospace;font-size:14px;letter-spacing:3px;padding:4px 0 6px}
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const btn = document.createElement("button");
  btn.id = "klx-chat-btn";
  btn.textContent = "💬 CHAT";
  btn.setAttribute("aria-label", "Open KLX chat");

  const box = document.createElement("div");
  box.id = "klx-chat";
  box.innerHTML = `
    <button class="klx-close" aria-label="Close chat">×</button>
    <div class="klx-head"><h3>KLX ASSIST</h3><p>auto-reply • receipt no. 0001</p></div>
    <div class="klx-body"></div>
    <div class="klx-quick"></div>
    <form class="klx-form"><input type="text" placeholder="Type your message..." maxlength="500" /><button type="submit">SEND</button></form>
    <div class="klx-foot">|||| || ||| | |||| ||</div>
  `;
  document.body.appendChild(btn);
  document.body.appendChild(box);

  const body = box.querySelector(".klx-body");
  const quick = box.querySelector(".klx-quick");
  const form = box.querySelector(".klx-form");
  const input = form.querySelector("input");
  const sendBtn = form.querySelector("button");
  const history = [];
  let busy = false;

  // Safe rendering: text only, URLs and phone numbers become links
  function render(el, text) {
    const parts = text.split(/(https?:\/\/[^\s]+|(?:facebook\.com|m\.me)\/[^\s]+|09\d{9})/g);
    parts.forEach((p) => {
      if (/^(https?:\/\/|facebook\.com\/|m\.me\/)/.test(p)) {
        const a = document.createElement("a");
        a.href = p.startsWith("http") ? p : "https://" + p;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = p;
        el.appendChild(a);
      } else if (/^09\d{9}$/.test(p)) {
        const a = document.createElement("a");
        a.href = "tel:" + p;
        a.textContent = p;
        el.appendChild(a);
      } else {
        el.appendChild(document.createTextNode(p));
      }
    });
  }

  function addMsg(role, text) {
    const div = document.createElement("div");
    div.className = "klx-msg " + (role === "bot" ? "klx-bot" : "klx-user");
    render(div, text);
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    sendBtn.disabled = true;
    quick.style.display = "none";
    addMsg("user", text);
    history.push({ role: "user", text });
    const typing = addMsg("bot", "printing...");

    try {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await r.json();
      const reply =
        data.reply ||
        "Sorry po, naa'y gamay nga problema. Please contact us at 09472257991 or 09351265931.";
      typing.textContent = "";
      render(typing, reply);
      history.push({ role: "bot", text: reply });
    } catch (e) {
      typing.textContent = "";
      render(typing, "Offline ta karon po. Please contact us at 09472257991 or 09351265931.");
    }
    body.scrollTop = body.scrollHeight;
    busy = false;
    sendBtn.disabled = false;
    input.focus();
  }

  QUICK.forEach((q) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = q;
    b.onclick = () => send(q);
    quick.appendChild(b);
  });

  addMsg("bot", WELCOME);

  btn.onclick = () => {
    box.classList.toggle("open");
    if (box.classList.contains("open")) input.focus();
  };
  box.querySelector(".klx-close").onclick = () => box.classList.remove("open");
  form.onsubmit = (e) => {
    e.preventDefault();
    const t = input.value;
    input.value = "";
    send(t);
  };
})();
