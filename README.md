# Telegram Web - Full-Stack Architecture

A complete, multi-language Telegram Web ecosystem built with **HTML5, CSS3, JavaScript, Python, C++, C, and C#**.

---

## 🌟 Authentic Telegram Signature Features

### 1. Visual & UX Polish
* **Telegram Doodle Wallpaper**: The authentic tiled SVG doodle background across all themes.
* **Floating Emoji Reactions**: Hover or tap any message to trigger quick reactions (`👍`, `❤️`, `🔥`, `😂`, `🎉`, `⚡`) with real-time reaction badges.
* **Message Replies & Quotes**: Click the reply arrow on any message to quote it with an accent bar; clicking the quote smoothly scrolls to the original message with a highlight pulse.
* **Message Bubble Tails & Grouping**: Messages from the same sender group seamlessly with classic curved tails.
* **Sticky Pinned Messages Banner**: Header banner showing the currently pinned announcement with instant jump-to-message.

### 2. Media & Voice Messages
* **Voice Notes with Scrubbable Waveform**: Record voice notes via the microphone button (`🎙️`) with animated waveform playback, audio synthesis, and 1X/2X speed toggle.
* **Image Sharing & Lightbox**: Drag-and-drop or attach photos with inline rounded thumbnails and a fullscreen dark Lightbox viewer.

### 3. Telegram Authentication Flow
* **QR Code Login Screen**: Animated laser scan line across the Telegram QR code with mobile linking instructions and instant simulation.
* **Phone Verification**: Country code picker, international phone validation, and 5-digit verification code screen.

### 4. Themes & Custom Positioning
* **5 Themes**: Night Blue (`theme-dark`), Day Light (`theme-light`), Midnight AMOLED (`theme-amoled`), Emerald Matrix (`theme-emerald`), and Sunset Amber (`theme-sunset`).
* **Sidebar Swapping**: Flip the sidebar between Left and Right (`⇄`).
* **Chat Width**: Full Width vs Centered Desktop mode.

---

## 🏗️ Architecture & Component Roles

| File | Language | Role in Telegram Web |
| :--- | :--- | :--- |
| [index.html](file:///home/mirko/MY%20PROJECTS/telegram%20web/index.html) | HTML5 | **Frontend Layout**: Doodle wallpaper, sticky pinned banner, reply bar, voice recorder, QR login modal, and lightbox. |
| [style.css](file:///home/mirko/MY%20PROJECTS/telegram%20web/style.css) | CSS3 | **Signature Styling**: SVG doodle pattern, floating reaction toolbar, bubble tails, QR scan animation, and 5 themes. |
| [script.js](file:///home/mirko/MY%20PROJECTS/telegram%20web/script.js) | JavaScript | **Frontend Controller**: Quoted replies, floating reactions, waveform synthesizer, voice recorder, image lightbox, and WebSocket sync. |
| [pip.py](file:///home/mirko/MY%20PROJECTS/telegram%20web/pip.py) | Python (Tornado) | **Central Real-Time Server**: Port `3000` WebSockets & HTTP, user presence, reactions, pins, voice/images, and TCP bridge on port `3001`. |
| [m.c++](file:///home/mirko/MY%20PROJECTS/telegram%20web/m.c++) | C++20 | **MTProto Engine**: Binary serialization, CRC32 checksums, sub-millisecond packet benchmarking. |
| [main.c](file:///home/mirko/MY%20PROJECTS/telegram%20web/main.c) | C (POSIX Sockets) | **Native Terminal Client**: Connects via TCP to port 3001; terminal messages appear in real-time in the browser. |
| [eck.cs](file:///home/mirko/MY%20PROJECTS/telegram%20web/eck.cs) | C# (.NET) | **Enterprise Bot Service**: Asynchronous TCP streaming service to connect .NET backend services to Telegram Web. |

---

## 🚀 How to Run

### Open Telegram Web in Your Browser
The server is running at:
👉 **[http://127.0.0.1:3000](http://127.0.0.1:3000)**

* Open **two browser tabs** to test real-time chatting, reactions, voice notes, and quoted replies between users!
* Click the user icon (`👤`) at the top right to open the **QR Code Login Screen**.
