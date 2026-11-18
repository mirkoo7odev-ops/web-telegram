// ========================================================
// TELEGRAM WEB CLIENT - SIGNATURE FEATURES & MEDIA ENGINE
// ========================================================

// 1. Current User Identity
let myUser = {
  id: localStorage.getItem("tg_user_id") || "u_" + Math.random().toString(36).substring(2, 9),
  username: localStorage.getItem("tg_username") || "User_" + Math.floor(Math.random() * 900 + 100),
  avatar: localStorage.getItem("tg_avatar") || "👤",
  color: "#2481cc"
};

localStorage.setItem("tg_user_id", myUser.id);
localStorage.setItem("tg_username", myUser.username);

let onlineUsers = [];
let activeReply = null; // { id, text, sender }
let mediaRecorder = null;
let recordingInterval = null;
let recordingSeconds = 0;

// Chat Data Store
let chats = [
  {
    id: "dev_community",
    name: "Dev Telegram Community",
    username: "@dev_tg",
    avatar: "👥",
    category: "groups",
    online: true,
    bio: "Global real-time group chat. Test replies, floating reactions, images, and voice notes!",
    unread: 0,
    pinned: {
      id: "m_pin_1",
      text: "⚡ Welcome to Telegram Web! Try hovering over messages to react, or click the mic to send a voice note!"
    },
    messages: [
      {
        id: "m_1",
        sender: "Pavel Durov",
        text: "Welcome to Telegram Web. Notice the doodle background, floating emoji reactions, and voice message waveforms!",
        time: "10:00",
        outgoing: false,
        reactions: { "🔥": 4, "👍": 2 }
      },
      {
        id: "m_2",
        sender: "Sarah",
        text: "You can reply to this message by hovering over it and clicking the reply arrow!",
        time: "10:02",
        outgoing: false,
        reactions: { "❤️": 3 }
      }
    ]
  },
  {
    id: "telegram_bot",
    name: "Telegram Assistant",
    username: "@telegram_bot",
    avatar: "🤖",
    category: "bots",
    online: true,
    bio: "Official assistant bot. Type /help to see commands or test quick responses.",
    unread: 0,
    pinned: null,
    messages: [
      {
        id: "m_bot_1",
        sender: "Telegram Assistant",
        text: "Hello! Try /help, /time, /roll, or /joke. You can also customize your themes and sidebar position in Settings (⚙️)!",
        time: "09:00",
        outgoing: false,
        reactions: { "⚡": 1 }
      }
    ]
  },
  {
    id: "saved_messages",
    name: "Saved Messages",
    username: "@me",
    avatar: "🔖",
    category: "personal",
    online: true,
    bio: "Your private cloud storage. Save thoughts, code snippets, and voice notes.",
    unread: 0,
    pinned: null,
    messages: [
      {
        id: "m_saved_1",
        sender: "me",
        text: "Tip: Drag & drop any photo into the chat window to share it instantly! 🖼️",
        time: "08:30",
        outgoing: true,
        reactions: { "👍": 1 }
      }
    ]
  }
];

let activeChatId = "dev_community";
let activeFolder = "all";
let ws = null;
let reconnectTimer = null;
let typingTimeout = null;

// DOM Elements
const bodyEl = document.body;
const chatListEl = document.getElementById("chatList");
const messageFeedEl = document.getElementById("messageFeed");
const messageInputEl = document.getElementById("messageInput");
const sendBtnEl = document.getElementById("sendBtn");
const voiceBtnEl = document.getElementById("voiceBtn");
const attachBtnEl = document.getElementById("attachBtn");
const mediaFileInputEl = document.getElementById("mediaFileInput");
const searchInputEl = document.getElementById("searchInput");
const folderTabs = document.querySelectorAll(".folder-tabs .tab");
const activeTitleEl = document.getElementById("activeTitle");
const activeSubtitleEl = document.getElementById("activeSubtitle");
const activeAvatarEl = document.getElementById("activeAvatar");
const serverStatusEl = document.getElementById("serverStatus");
const statusDotEl = serverStatusEl.querySelector(".status-dot");
const statusTextEl = serverStatusEl.querySelector(".status-text");
const typingIndicatorEl = document.getElementById("typingIndicator");
const typingTextEl = document.getElementById("typingText");
const onlineBadgeEl = document.getElementById("onlineBadge");

// Pinned & Reply
const pinnedBannerEl = document.getElementById("pinnedBanner");
const pinnedTextEl = document.getElementById("pinnedText");
const unpinBtnEl = document.getElementById("unpinBtn");
const replyBarEl = document.getElementById("replyBar");
const replyBarNameEl = document.getElementById("replyBarName");
const replyBarTextEl = document.getElementById("replyBarText");
const closeReplyBtnEl = document.getElementById("closeReplyBtn");

// Voice Recording
const voiceRecordingBarEl = document.getElementById("voiceRecordingBar");
const recordingTimerEl = document.getElementById("recordingTimer");
const cancelRecordingBtnEl = document.getElementById("cancelRecordingBtn");

// Lightbox & Login
const lightboxModalEl = document.getElementById("lightboxModal");
const lightboxImgEl = document.getElementById("lightboxImg");
const lightboxCloseEl = document.getElementById("lightboxClose");
const loginModalEl = document.getElementById("loginModal");
const loginBtnEl = document.getElementById("loginBtn");
const loginCloseEl = document.getElementById("loginClose");
const mockScanBtnEl = document.getElementById("mockScanBtn");
const sendPhoneCodeBtnEl = document.getElementById("sendPhoneCodeBtn");
const verifyCodeBtnEl = document.getElementById("verifyCodeBtn");
const codeBoxEl = document.getElementById("codeBox");
const phoneNumberInputEl = document.getElementById("phoneNumberInput");
const smsCodeInputEl = document.getElementById("smsCodeInput");

// Settings & Profiles
const myAvatarEl = document.getElementById("myAvatar");
const myNameEl = document.getElementById("myName");
const myProfilePillEl = document.getElementById("myProfilePill");
const settingsBtnEl = document.getElementById("settingsBtn");
const settingsDrawerEl = document.getElementById("settingsDrawer");
const closeSettingsEl = document.getElementById("closeSettings");
const usernameInputEl = document.getElementById("usernameInput");
const saveProfileBtnEl = document.getElementById("saveProfileBtn");
const themeQuickBtnEl = document.getElementById("themeQuickBtn");
const posQuickBtnEl = document.getElementById("posQuickBtn");
const userDrawerEl = document.getElementById("userDrawer");
const closeDrawerEl = document.getElementById("closeDrawer");
const backBtnEl = document.getElementById("backBtn");
const appContainerEl = document.getElementById("appContainer");

// ========================================================
// THEMES & POSITION CONTROLLER
// ========================================================
const THEMES = ["theme-dark", "theme-light", "theme-amoled", "theme-emerald", "theme-sunset"];
let currentTheme = localStorage.getItem("tg_theme") || "theme-dark";
let currentPos = localStorage.getItem("tg_pos") || "sidebar-left";
let currentWidth = localStorage.getItem("tg_width") || "layout-full";

function applyPreferences() {
  THEMES.forEach(t => bodyEl.classList.remove(t));
  bodyEl.classList.add(currentTheme);

  document.querySelectorAll(".theme-card").forEach(card => {
    card.classList.toggle("active", card.dataset.theme === currentTheme);
  });

  bodyEl.classList.remove("sidebar-left", "sidebar-right");
  bodyEl.classList.add(currentPos);
  document.querySelectorAll("#posChoiceGroup .choice-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.pos === currentPos);
  });

  bodyEl.classList.remove("layout-full", "layout-centered");
  bodyEl.classList.add(currentWidth);
  document.querySelectorAll("#widthChoiceGroup .choice-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.width === currentWidth);
  });

  myNameEl.textContent = myUser.username;
  usernameInputEl.value = myUser.username;
}

function setTheme(newTheme) {
  currentTheme = newTheme;
  localStorage.setItem("tg_theme", newTheme);
  applyPreferences();
}

function setPosition(newPos) {
  currentPos = newPos;
  localStorage.setItem("tg_pos", newPos);
  applyPreferences();
}

function setWidth(newWidth) {
  currentWidth = newWidth;
  localStorage.setItem("tg_width", newWidth);
  applyPreferences();
}

themeQuickBtnEl.addEventListener("click", () => {
  setTheme(currentTheme === "theme-dark" ? "theme-light" : "theme-dark");
});

posQuickBtnEl.addEventListener("click", () => {
  setPosition(currentPos === "sidebar-left" ? "sidebar-right" : "sidebar-left");
});

document.querySelectorAll("#posChoiceGroup .choice-btn").forEach(btn => {
  btn.addEventListener("click", () => setPosition(btn.dataset.pos));
});

document.querySelectorAll("#widthChoiceGroup .choice-btn").forEach(btn => {
  btn.addEventListener("click", () => setWidth(btn.dataset.width));
});

document.querySelectorAll(".theme-card").forEach(card => {
  card.addEventListener("click", () => setTheme(card.dataset.theme));
});

// Profile Editing
saveProfileBtnEl.addEventListener("click", saveProfile);
usernameInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveProfile();
});

function saveProfile() {
  const newName = usernameInputEl.value.trim();
  if (!newName) return;
  myUser.username = newName;
  localStorage.setItem("tg_username", newName);
  myNameEl.textContent = newName;

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "update_profile", user: myUser }));
  }
  settingsDrawerEl.classList.remove("open");
  renderChatList();
}

// Drawer Toggles
settingsBtnEl.addEventListener("click", () => settingsDrawerEl.classList.add("open"));
document.getElementById("menuBtn").addEventListener("click", () => settingsDrawerEl.classList.add("open"));
myProfilePillEl.addEventListener("click", () => settingsDrawerEl.classList.add("open"));
closeSettingsEl.addEventListener("click", () => settingsDrawerEl.classList.remove("open"));

// ========================================================
// SOUND EFFECTS & AUDIO PLAYBACK (Web Audio API)
// ========================================================
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playChime(isOutgoing = true) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isOutgoing) {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch (e) {}
}

// Synthesize voice note playback sound
function playVoiceSample(durationSec, onProgress, onEnd) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + durationSec);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);

    let start = Date.now();
    let timer = setInterval(() => {
      let elapsed = (Date.now() - start) / 1000;
      let progress = Math.min(elapsed / durationSec, 1);
      onProgress(progress);
      if (progress >= 1) {
        clearInterval(timer);
        onEnd();
      }
    }, 50);

    return () => {
      try { osc.stop(); } catch(e){}
      clearInterval(timer);
    };
  } catch(e) {
    onEnd();
    return () => {};
  }
}

function getCurrentTimeString() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ========================================================
// REPLIES & QUOTES CONTROLLER
// ========================================================
function setReplyMessage(msgId) {
  const chat = chats.find(c => c.id === activeChatId);
  if (!chat) return;
  const msg = chat.messages.find(m => m.id === msgId);
  if (!msg) return;

  activeReply = {
    id: msg.id,
    sender: msg.sender,
    text: msg.text || (msg.mediaType ? `[${msg.mediaType}]` : "Message")
  };

  replyBarNameEl.textContent = activeReply.sender;
  replyBarTextEl.textContent = activeReply.text;
  replyBarEl.classList.add("active");
  messageInputEl.focus();
}

function clearReply() {
  activeReply = null;
  replyBarEl.classList.remove("active");
}

closeReplyBtnEl.addEventListener("click", clearReply);

// ========================================================
// FLOATING REACTIONS & PINNING CONTROLLER
// ========================================================
function addReaction(msgId, emoji) {
  const chat = chats.find(c => c.id === activeChatId);
  if (!chat) return;
  const msg = chat.messages.find(m => m.id === msgId);
  if (!msg) return;

  if (!msg.reactions) msg.reactions = {};
  msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1;

  renderMessageFeed();

  // Send over WebSocket
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "reaction",
      chatId: activeChatId,
      messageId: msgId,
      emoji: emoji,
      sender: myUser.username
    }));
  }
}

function pinMessage(msgId) {
  const chat = chats.find(c => c.id === activeChatId);
  if (!chat) return;
  const msg = chat.messages.find(m => m.id === msgId);
  if (!msg) return;

  chat.pinned = {
    id: msg.id,
    text: msg.text || (msg.mediaType ? `[${msg.mediaType}]` : "Message")
  };

  updatePinnedBanner();

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "pin",
      chatId: activeChatId,
      messageId: msgId,
      text: chat.pinned.text
    }));
  }
}

function updatePinnedBanner() {
  const chat = chats.find(c => c.id === activeChatId);
  if (chat && chat.pinned) {
    pinnedTextEl.textContent = chat.pinned.text;
    pinnedBannerEl.style.display = "flex";
  } else {
    pinnedBannerEl.style.display = "none";
  }
}

unpinBtnEl.addEventListener("click", (e) => {
  e.stopPropagation();
  const chat = chats.find(c => c.id === activeChatId);
  if (chat) {
    chat.pinned = null;
    updatePinnedBanner();
  }
});

document.getElementById("pinnedContent").addEventListener("click", () => {
  const chat = chats.find(c => c.id === activeChatId);
  if (chat && chat.pinned) {
    scrollToMessage(chat.pinned.id);
  }
});

function scrollToMessage(msgId) {
  const el = document.getElementById("msg_" + msgId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight-pulse");
    setTimeout(() => el.classList.remove("highlight-pulse"), 1200);
  }
}

// ========================================================
// MEDIA ATTACHMENTS & LIGHTBOX
// ========================================================
attachBtnEl.addEventListener("click", () => mediaFileInputEl.click());

mediaFileInputEl.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    sendMediaMessage(event.target.result, "image");
  };
  reader.readAsDataURL(file);
  mediaFileInputEl.value = "";
});

// Drag and drop images onto chat area
document.getElementById("chatArea").addEventListener("dragover", (e) => {
  e.preventDefault();
});

document.getElementById("chatArea").addEventListener("drop", (e) => {
  e.preventDefault();
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    const file = e.dataTransfer.files[0];
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => sendMediaMessage(ev.target.result, "image");
      reader.readAsDataURL(file);
    }
  }
});

function openLightbox(src) {
  lightboxImgEl.src = src;
  lightboxModalEl.classList.add("active");
}

lightboxCloseEl.addEventListener("click", () => lightboxModalEl.classList.remove("active"));
lightboxModalEl.addEventListener("click", (e) => {
  if (e.target === lightboxModalEl) lightboxModalEl.classList.remove("active");
});

// ========================================================
// VOICE MESSAGE RECORDING & PLAYBACK
// ========================================================
voiceBtnEl.addEventListener("click", () => {
  if (!voiceRecordingBarEl.classList.contains("active")) {
    startVoiceRecording();
  } else {
    stopVoiceRecording(true);
  }
});

cancelRecordingBtnEl.addEventListener("click", () => stopVoiceRecording(false));

function startVoiceRecording() {
  voiceRecordingBarEl.classList.add("active");
  recordingSeconds = 0;
  recordingTimerEl.textContent = "0:00";
  recordingInterval = setInterval(() => {
    recordingSeconds++;
    const m = Math.floor(recordingSeconds / 60);
    const s = recordingSeconds % 60;
    recordingTimerEl.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
  }, 1000);
}

function stopVoiceRecording(send = true) {
  clearInterval(recordingInterval);
  voiceRecordingBarEl.classList.remove("active");

  if (send && recordingSeconds >= 1) {
    sendMediaMessage(null, "voice", { duration: recordingSeconds });
  }
}

// Dynamic Action Button: switch mic vs plane
messageInputEl.addEventListener("input", () => {
  adjustTextareaHeight();
  const hasText = messageInputEl.value.trim().length > 0;
  if (hasText) {
    voiceBtnEl.style.display = "none";
    sendBtnEl.style.display = "flex";
  } else {
    voiceBtnEl.style.display = "flex";
    sendBtnEl.style.display = "none";
  }

  // Typing state
  if (ws && ws.readyState === WebSocket.OPEN && !typingTimeout) {
    ws.send(JSON.stringify({ type: "typing", chatId: activeChatId, sender: myUser.username }));
    typingTimeout = setTimeout(() => { typingTimeout = null; }, 2000);
  }
});

// ========================================================
// SEND MESSAGES (TEXT & MEDIA)
// ========================================================
function sendMessage() {
  const text = messageInputEl.value.trim();
  if (!text) return;

  const chat = chats.find(c => c.id === activeChatId);
  if (!chat) return;

  const msgId = "m_" + Date.now();
  const newMsg = {
    id: msgId,
    sender: myUser.username,
    text: text,
    time: getCurrentTimeString(),
    outgoing: true,
    replyTo: activeReply ? { ...activeReply } : null,
    reactions: {}
  };

  chat.messages.push(newMsg);
  messageInputEl.value = "";
  adjustTextareaHeight();
  clearReply();
  playChime(true);

  voiceBtnEl.style.display = "flex";
  sendBtnEl.style.display = "none";

  renderChatList();
  renderMessageFeed();

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "message",
      id: msgId,
      chatId: activeChatId,
      recipientId: chat.recipientId || null,
      text: text,
      sender: myUser.username,
      senderId: myUser.id,
      time: newMsg.time,
      replyTo: newMsg.replyTo
    }));
  } else {
    simulateBotReply(activeChatId, text);
  }
}

function sendMediaMessage(mediaData, mediaType, extra = {}) {
  const chat = chats.find(c => c.id === activeChatId);
  if (!chat) return;

  const msgId = "m_" + Date.now();
  const newMsg = {
    id: msgId,
    sender: myUser.username,
    text: "",
    media: mediaData,
    mediaType: mediaType,
    duration: extra.duration || 5,
    time: getCurrentTimeString(),
    outgoing: true,
    replyTo: activeReply ? { ...activeReply } : null,
    reactions: {}
  };

  chat.messages.push(newMsg);
  clearReply();
  playChime(true);

  renderChatList();
  renderMessageFeed();

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "message",
      id: msgId,
      chatId: activeChatId,
      recipientId: chat.recipientId || null,
      text: "",
      media: mediaData,
      mediaType: mediaType,
      duration: newMsg.duration,
      sender: myUser.username,
      senderId: myUser.id,
      time: newMsg.time,
      replyTo: newMsg.replyTo
    }));
  }
}

// ========================================================
// RENDER MESSAGE FEED
// ========================================================
function renderMessageFeed() {
  const chat = chats.find(c => c.id === activeChatId);
  if (!chat) return;

  messageFeedEl.innerHTML = `<div class="date-divider">Today</div>`;

  chat.messages.forEach(msg => {
    if (msg.sender === "System") {
      const sysDiv = document.createElement("div");
      sysDiv.className = "system-divider";
      sysDiv.textContent = msg.text;
      messageFeedEl.appendChild(sysDiv);
      return;
    }

    const row = document.createElement("div");
    row.className = `message-row ${msg.outgoing ? 'outgoing' : 'incoming'}`;
    row.id = `msg_${msg.id}`;

    // Floating Reactions & Actions Toolbar
    const toolbar = document.createElement("div");
    toolbar.className = "reaction-toolbar";
    toolbar.innerHTML = `
      <button class="reaction-btn" data-emoji="👍">👍</button>
      <button class="reaction-btn" data-emoji="❤️">❤️</button>
      <button class="reaction-btn" data-emoji="🔥">🔥</button>
      <button class="reaction-btn" data-emoji="😂">😂</button>
      <button class="reaction-btn" data-emoji="🎉">🎉</button>
      <button class="reaction-btn" data-emoji="⚡">⚡</button>
      <button class="reply-action-btn" title="Reply">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
        </svg>
      </button>
      <button class="reply-action-btn pin-action-btn" title="Pin message">📌</button>
    `;

    toolbar.querySelectorAll(".reaction-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        addReaction(msg.id, btn.dataset.emoji);
      });
    });

    toolbar.querySelector(".reply-action-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      setReplyMessage(msg.id);
    });

    toolbar.querySelector(".pin-action-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      pinMessage(msg.id);
    });

    // Bubble
    const bubble = document.createElement("div");
    bubble.className = `message-bubble ${msg.outgoing ? 'outgoing' : 'incoming'}`;

    let contentHTML = "";

    // 1. Quoted Reply Header
    if (msg.replyTo) {
      contentHTML += `
        <div class="quoted-reply" data-target="${msg.replyTo.id}">
          <span class="quoted-reply-sender">${escapeHTML(msg.replyTo.sender)}</span>
          <span class="quoted-reply-text">${escapeHTML(msg.replyTo.text)}</span>
        </div>
      `;
    }

    // 2. Sender Name (incoming only)
    if (!msg.outgoing) {
      contentHTML += `<div class="sender-name">${escapeHTML(msg.sender)}</div>`;
    }

    // 3. Image Media
    if (msg.mediaType === "image" && msg.media) {
      contentHTML += `<img src="${msg.media}" class="bubble-image" alt="Image">`;
    }

    // 4. Voice Note Waveform Player
    if (msg.mediaType === "voice") {
      contentHTML += `
        <div class="voice-player" data-duration="${msg.duration || 5}">
          <button class="voice-play-btn">▶</button>
          <div class="voice-waveform">
            ${Array.from({ length: 24 }).map((_, i) => `
              <div class="wave-bar" style="height: ${Math.max(25, (Math.sin(i * 0.7) * 40 + 50))}%"></div>
            `).join('')}
          </div>
          <div class="voice-info">
            <span class="voice-duration">0:${(msg.duration || 5) < 10 ? '0' : ''}${msg.duration || 5}</span>
            <span class="voice-speed-pill">1X</span>
          </div>
        </div>
      `;
    }

    // 5. Message Text
    if (msg.text) {
      contentHTML += `<div class="message-content">${escapeHTML(msg.text)}</div>`;
    }

    // 6. Meta info
    contentHTML += `
      <div class="message-meta">
        <span class="message-time">${msg.time}</span>
        ${msg.outgoing ? '<span class="check-marks">✓✓</span>' : ''}
      </div>
    `;

    bubble.innerHTML = contentHTML;

    // Attach Quoted Reply Click Scroll
    const quoteEl = bubble.querySelector(".quoted-reply");
    if (quoteEl) {
      quoteEl.addEventListener("click", () => scrollToMessage(quoteEl.dataset.target));
    }

    // Attach Image Lightbox Click
    const imgEl = bubble.querySelector(".bubble-image");
    if (imgEl) {
      imgEl.addEventListener("click", () => openLightbox(imgEl.src));
    }

    // Attach Voice Player Click
    const voicePlayerEl = bubble.querySelector(".voice-player");
    if (voicePlayerEl) {
      setupVoicePlayer(voicePlayerEl);
    }

    // Reactions container under bubble
    if (msg.reactions && Object.keys(msg.reactions).length > 0) {
      const reactionsDiv = document.createElement("div");
      reactionsDiv.className = "reactions-container";
      for (const [emoji, count] of Object.entries(msg.reactions)) {
        const pill = document.createElement("span");
        pill.className = "reaction-pill";
        pill.innerHTML = `<span>${emoji}</span> <b>${count}</b>`;
        pill.addEventListener("click", () => addReaction(msg.id, emoji));
        reactionsDiv.appendChild(pill);
      }
      bubble.appendChild(reactionsDiv);
    }

    row.appendChild(toolbar);
    row.appendChild(bubble);
    messageFeedEl.appendChild(row);
  });

  scrollToBottom();
}

function setupVoicePlayer(playerEl) {
  const playBtn = playerEl.querySelector(".voice-play-btn");
  const waveBars = playerEl.querySelectorAll(".wave-bar");
  const duration = parseInt(playerEl.dataset.duration || 5, 10);
  let isPlaying = false;
  let stopFn = null;

  playBtn.addEventListener("click", () => {
    if (!isPlaying) {
      isPlaying = true;
      playBtn.textContent = "⏸";

      stopFn = playVoiceSample(duration, (progress) => {
        const playedCount = Math.floor(progress * waveBars.length);
        waveBars.forEach((bar, idx) => {
          bar.classList.toggle("played", idx <= playedCount);
        });
      }, () => {
        isPlaying = false;
        playBtn.textContent = "▶";
        waveBars.forEach(b => b.classList.remove("played"));
      });
    } else {
      if (stopFn) stopFn();
      isPlaying = false;
      playBtn.textContent = "▶";
    }
  });
}

function scrollToBottom() {
  const container = document.querySelector(".message-feed-container");
  container.scrollTop = container.scrollHeight;
}

function escapeHTML(str) {
  return String(str || "").replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// ========================================================
// AUTHENTIC TELEGRAM LOGIN MODAL (QR & PHONE)
// ========================================================
loginBtnEl.addEventListener("click", () => loginModalEl.classList.add("active"));
loginCloseEl.addEventListener("click", () => loginModalEl.classList.remove("active"));
document.getElementById("openLoginFromSettings").addEventListener("click", () => {
  settingsDrawerEl.classList.remove("open");
  loginModalEl.classList.add("active");
});

// Login Tabs
document.querySelectorAll(".login-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".login-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".login-tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    if (tab.dataset.tab === "qr") document.getElementById("tabQR").classList.add("active");
    else document.getElementById("tabPhone").classList.add("active");
  });
});

// Simulate QR Login
mockScanBtnEl.addEventListener("click", () => {
  mockScanBtnEl.textContent = "Verifying QR Code...";
  setTimeout(() => {
    myUser.username = "TelegramUser_" + Math.floor(Math.random() * 900 + 100);
    localStorage.setItem("tg_username", myUser.username);
    applyPreferences();

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "update_profile", user: myUser }));
    }

    loginModalEl.classList.remove("active");
    mockScanBtnEl.textContent = "⚡ Simulate Instant QR Scan";
    alert(`🎉 Successfully logged in as ${myUser.username}!`);
  }, 900);
});

// Phone Login Simulation
sendPhoneCodeBtnEl.addEventListener("click", () => {
  const phone = phoneNumberInputEl.value.trim();
  if (!phone) {
    alert("Please enter a valid phone number.");
    return;
  }
  sendPhoneCodeBtnEl.style.display = "none";
  codeBoxEl.style.display = "block";
  smsCodeInputEl.focus();
  smsCodeInputEl.value = "77492"; // Mock auto-fill
});

verifyCodeBtnEl.addEventListener("click", () => {
  myUser.username = "TgMember_" + phoneNumberInputEl.value.slice(-4);
  localStorage.setItem("tg_username", myUser.username);
  applyPreferences();

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "update_profile", user: myUser }));
  }

  loginModalEl.classList.remove("active");
  alert(`🎉 Phone verified! Welcome, ${myUser.username}!`);
});

// ========================================================
// BOT SIMULATION
// ========================================================
function simulateBotReply(chatId, incomingText) {
  if (chatId === "saved_messages") return;

  triggerTyping(true, "Telegram Assistant");

  setTimeout(() => {
    triggerTyping(false);
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    let reply = "";
    const lower = incomingText.toLowerCase();

    if (lower.startsWith("/help")) {
      reply = "Telegram Web Commands:\n/help - Help menu\n/time - Server time\n/ping - Ping check\n/roll - Roll 1-100 dice\n/joke - Developer humor";
    } else if (lower.startsWith("/time")) {
      reply = `Server time: ${new Date().toLocaleString()}`;
    } else if (lower.startsWith("/ping")) {
      reply = "⚡ Pong! Response latency: 0.4ms";
    } else if (lower.startsWith("/roll")) {
      reply = `🎲 You rolled: ${Math.floor(Math.random() * 100) + 1}/100!`;
    } else if (lower.startsWith("/joke")) {
      reply = "Why did the developer go broke? Because he used up all his cache!";
    } else {
      reply = `Received: "${incomingText}". Try reacting to this message with an emoji!`;
    }

    chat.messages.push({
      id: "m_reply_" + Date.now(),
      sender: chat.name,
      text: reply,
      time: getCurrentTimeString(),
      outgoing: false,
      reactions: { "👍": 1 }
    });

    if (chat.id === activeChatId) {
      playChime(false);
      renderMessageFeed();
    } else {
      chat.unread += 1;
    }
    renderChatList();
  }, 750);
}

function triggerTyping(active, name = "someone") {
  if (active) {
    typingTextEl.textContent = `${name} is typing...`;
    typingIndicatorEl.classList.add("active");
  } else {
    typingIndicatorEl.classList.remove("active");
  }
}

// ========================================================
// WEBSOCKET INTEGRATION
// ========================================================
function initWebSocket() {
  if (location.protocol !== "http:" && location.protocol !== "https:") {
    statusDotEl.className = "status-dot";
    statusTextEl.textContent = "Offline Mode (Local File)";
    return;
  }

  const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${wsProtocol}//${location.host}/ws`;

  statusDotEl.className = "status-dot";
  statusTextEl.textContent = "Connecting...";

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      statusDotEl.className = "status-dot connected";
      statusTextEl.textContent = "Live Connected";
      ws.send(JSON.stringify({ type: "join", user: myUser }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleIncomingWsMessage(data);
      } catch (err) {
        console.error("WS Parse Error:", err);
      }
    };

    ws.onclose = () => {
      statusDotEl.className = "status-dot disconnected";
      statusTextEl.textContent = "Reconnecting...";
      ws = null;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(initWebSocket, 2500);
    };
  } catch (e) {
    statusDotEl.className = "status-dot";
    statusTextEl.textContent = "Standalone Mode";
  }
}

function handleIncomingWsMessage(data) {
  // 1. Online Users Sync
  if (data.type === "user_list") {
    syncOnlineUsers(data.users || []);
    return;
  }

  // 2. Emoji Reaction Broadcast
  if (data.type === "reaction") {
    const chat = chats.find(c => c.id === data.chatId);
    if (chat) {
      const msg = chat.messages.find(m => m.id === data.messageId);
      if (msg) {
        if (!msg.reactions) msg.reactions = {};
        msg.reactions[data.emoji] = (msg.reactions[data.emoji] || 0) + 1;
        if (chat.id === activeChatId) renderMessageFeed();
      }
    }
    return;
  }

  // 3. Pinned Message Broadcast
  if (data.type === "pin") {
    const chat = chats.find(c => c.id === data.chatId);
    if (chat) {
      chat.pinned = { id: data.messageId, text: data.text };
      if (chat.id === activeChatId) updatePinnedBanner();
    }
    return;
  }

  // 4. System Announcement
  if (data.type === "system") {
    const devChat = chats.find(c => c.id === "dev_community");
    if (devChat) {
      devChat.messages.push({
        id: "sys_" + Date.now(),
        sender: "System",
        text: data.text,
        time: getCurrentTimeString(),
        outgoing: false
      });
      if (activeChatId === "dev_community") renderMessageFeed();
    }
    return;
  }

  // 5. Typing notification
  if (data.type === "typing") {
    if (data.chatId === activeChatId || activeChatId === "dev_community") {
      triggerTyping(true, data.sender || "Someone");
      setTimeout(() => triggerTyping(false), 2500);
    }
    return;
  }

  // 6. Inbound Chat Message
  if (data.type === "message") {
    let targetChat = null;

    if (data.recipientId === myUser.id) {
      const directId = "direct_" + data.senderId;
      targetChat = chats.find(c => c.id === directId);
      if (!targetChat) {
        targetChat = {
          id: directId,
          recipientId: data.senderId,
          name: data.sender,
          username: "@" + data.sender.toLowerCase().replace(/\s+/g, "_"),
          avatar: "👤",
          category: "online",
          online: true,
          bio: `Direct chat with ${data.sender}`,
          unread: 0,
          pinned: null,
          messages: []
        };
        chats.push(targetChat);
      }
    } else {
      targetChat = chats.find(c => c.id === data.chatId) || chats[0];
    }

    targetChat.messages.push({
      id: data.id || "m_" + Date.now(),
      sender: data.sender,
      text: data.text,
      media: data.media,
      mediaType: data.mediaType,
      duration: data.duration,
      replyTo: data.replyTo,
      time: data.time || getCurrentTimeString(),
      outgoing: false,
      reactions: {}
    });

    if (targetChat.id === activeChatId) {
      playChime(false);
      renderMessageFeed();
    } else {
      targetChat.unread += 1;
      playChime(false);
    }
    renderChatList();
  }
}

function syncOnlineUsers(usersList) {
  onlineUsers = usersList.filter(u => u.id !== myUser.id);
  onlineBadgeEl.textContent = onlineUsers.length;

  onlineUsers.forEach(user => {
    const directChatId = "direct_" + user.id;
    let chat = chats.find(c => c.id === directChatId);
    if (!chat) {
      chats.push({
        id: directChatId,
        recipientId: user.id,
        name: user.username,
        username: "@" + user.username.toLowerCase().replace(/\s+/g, "_"),
        avatar: user.avatar || "👤",
        category: "online",
        online: true,
        bio: `Connected directly via Telegram Web. User ID: ${user.id}`,
        unread: 0,
        pinned: null,
        messages: [
          {
            id: "m_welcome_" + Date.now(),
            sender: "System",
            text: `Direct connection opened with ${user.username}. Say hi! 👋`,
            time: getCurrentTimeString(),
            outgoing: false
          }
        ]
      });
    } else {
      chat.online = true;
      chat.name = user.username;
    }
  });

  chats.forEach(chat => {
    if (chat.id.startsWith("direct_")) {
      chat.online = onlineUsers.some(u => u.id === chat.recipientId);
    }
  });

  renderChatList();
}

function renderChatList() {
  const searchTerm = searchInputEl.value.trim().toLowerCase();
  chatListEl.innerHTML = "";

  const filteredChats = chats.filter(chat => {
    let matchesFolder = false;
    if (activeFolder === "all") matchesFolder = true;
    else if (activeFolder === "online") matchesFolder = (chat.category === "online" || chat.online) && chat.id !== "saved_messages";
    else matchesFolder = chat.category === activeFolder;

    const matchesSearch = chat.name.toLowerCase().includes(searchTerm) || 
                          chat.messages.some(m => (m.text || "").toLowerCase().includes(searchTerm));
    return matchesFolder && matchesSearch;
  });

  filteredChats.forEach(chat => {
    const lastMsg = chat.messages[chat.messages.length - 1];
    let previewText = "No messages yet";
    if (lastMsg) {
      if (lastMsg.mediaType === "image") previewText = lastMsg.outgoing ? "You: 📷 Photo" : `${lastMsg.sender}: 📷 Photo`;
      else if (lastMsg.mediaType === "voice") previewText = lastMsg.outgoing ? "You: 🎙️ Voice message" : `${lastMsg.sender}: 🎙️ Voice message`;
      else previewText = lastMsg.outgoing ? `You: ${lastMsg.text}` : `${lastMsg.sender}: ${lastMsg.text}`;
    }

    const lastTime = lastMsg ? lastMsg.time : "";

    const item = document.createElement("div");
    item.className = `chat-item ${chat.id === activeChatId ? 'active' : ''}`;
    item.dataset.chatId = chat.id;

    item.innerHTML = `
      <div class="chat-avatar ${chat.online ? 'online' : ''}">${chat.avatar}</div>
      <div class="chat-info">
        <div class="chat-row-top">
          <span class="chat-name">${escapeHTML(chat.name)}</span>
          <span class="chat-time">${lastTime}</span>
        </div>
        <div class="chat-row-bottom">
          <span class="chat-preview">${escapeHTML(previewText)}</span>
          ${chat.unread > 0 ? `<span class="unread-badge">${chat.unread}</span>` : ''}
        </div>
      </div>
    `;

    item.addEventListener("click", () => selectChat(chat.id));
    chatListEl.appendChild(item);
  });
}

function selectChat(chatId) {
  activeChatId = chatId;
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  chat.unread = 0;
  activeTitleEl.textContent = chat.name;
  activeSubtitleEl.textContent = chat.online ? (chat.category === 'bots' ? 'bot · online' : 'online') : 'last seen recently';
  activeAvatarEl.textContent = chat.avatar;

  appContainerEl.classList.add("chat-open");
  updatePinnedBanner();
  renderChatList();
  renderMessageFeed();
  messageInputEl.focus();
}

function adjustTextareaHeight() {
  messageInputEl.style.height = "auto";
  messageInputEl.style.height = `${Math.min(messageInputEl.scrollHeight, 120)}px`;
}

sendBtnEl.addEventListener("click", sendMessage);

messageInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Category Folder Tabs
folderTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    folderTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activeFolder = tab.dataset.folder;
    renderChatList();
  });
});

searchInputEl.addEventListener("input", renderChatList);
backBtnEl.addEventListener("click", () => appContainerEl.classList.remove("chat-open"));

// User Profile Drawer Toggle
document.getElementById("activeInfo").addEventListener("click", () => {
  const chat = chats.find(c => c.id === activeChatId);
  if (!chat) return;

  document.getElementById("drawerAvatar").textContent = chat.avatar;
  document.getElementById("drawerName").textContent = chat.name;
  document.getElementById("drawerUsername").textContent = chat.username;
  document.getElementById("drawerBio").textContent = chat.bio;

  const actionSection = document.getElementById("drawerActionSection");
  actionSection.innerHTML = `
    <label>STATUS</label>
    <p>${chat.online ? '🟢 Currently Active' : '⚪ Offline'}</p>
  `;

  userDrawerEl.classList.add("open");
});

closeDrawerEl.addEventListener("click", () => userDrawerEl.classList.remove("open"));

// Quick Emoji
document.getElementById("emojiBtn").addEventListener("click", () => {
  const emojis = ["👍", "🔥", "❤️", "⚡", "🚀", "🎉", "👏", "😊", "😎", "💯"];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  messageInputEl.value += randomEmoji;
  messageInputEl.focus();
  adjustTextareaHeight();
  voiceBtnEl.style.display = "none";
  sendBtnEl.style.display = "flex";
});

// Initialize on Load
applyPreferences();
renderChatList();
selectChat(activeChatId);
initWebSocket();
