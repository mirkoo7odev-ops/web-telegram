#!/usr/bin/env python3
"""
Telegram Web - Python Backend Server (pip.py)
---------------------------------------------
Features:
1. Static File HTTP Server (serves index.html, style.css, script.js on port 3000)
2. Multi-user Real-Time WebSocket Engine (/ws):
   - User presence tracking & online status
   - Direct 1-on-1 & Group Chats
   - Media (Images, Voice Notes) transmission
   - Message Reactions & Quoted Replies
   - Pinned Messages coordination
   - Live Typing Indicators
3. Built-in Telegram Bot responder (/help, /time, /ping, /roll, /joke, etc.)
4. Native TCP Bridge (port 3001) for C/C++ clients
"""

import os
import sys
import json
import random
import datetime
import asyncio
import tornado.ioloop
import tornado.web
import tornado.websocket

PORT = 3000
TCP_PORT = 3001
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Active connections & registered user info: ws -> dict(id, username, avatar, color)
connected_users = {}
tcp_writers = set()

def get_current_time():
    return datetime.datetime.now().strftime("%H:%M")

def get_online_users_list():
    return list(connected_users.values())

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render(os.path.join(BASE_DIR, "index.html"))

    def head(self):
        self.set_header("Content-Type", "text/html; charset=UTF-8")
        self.finish()

class ChatWebSocketHandler(tornado.websocket.WebSocketHandler):
    def check_origin(self, origin):
        return True

    def open(self):
        default_id = f"user_{int(datetime.datetime.now().timestamp() * 1000) % 100000}"
        connected_users[self] = {
            "id": default_id,
            "username": f"Guest_{default_id[-4:]}",
            "avatar": "👤",
            "color": "#2481cc"
        }
        print(f"[WS] Client connected. Total online: {len(connected_users)}")
        self.broadcast_user_list()

    def on_close(self):
        user_info = connected_users.pop(self, None)
        print(f"[WS] Client disconnected. Total online: {len(connected_users)}")
        if user_info:
            system_msg = json.dumps({
                "type": "system",
                "text": f"{user_info['username']} left the chat."
            })
            for client in list(connected_users.keys()):
                try:
                    client.write_message(system_msg)
                except Exception:
                    pass
        self.broadcast_user_list()

    def broadcast_user_list(self):
        payload = json.dumps({
            "type": "user_list",
            "users": get_online_users_list()
        })
        for client in list(connected_users.keys()):
            try:
                client.write_message(payload)
            except Exception:
                pass

    async def on_message(self, message):
        try:
            payload = json.loads(message)
            msg_type = payload.get("type", "message")

            # 1. Profile Join / Update
            if msg_type in ["join", "update_profile"]:
                user_data = payload.get("user", {})
                current = connected_users.get(self, {})
                current.update({
                    "id": user_data.get("id", current.get("id")),
                    "username": user_data.get("username", current.get("username")),
                    "avatar": user_data.get("avatar", current.get("avatar", "👤")),
                    "color": user_data.get("color", current.get("color", "#2481cc"))
                })
                connected_users[self] = current
                self.broadcast_user_list()

                if msg_type == "join":
                    join_msg = json.dumps({
                        "type": "system",
                        "text": f"🎉 {current['username']} joined Telegram Web!"
                    })
                    for client in list(connected_users.keys()):
                        try:
                            client.write_message(join_msg)
                        except Exception:
                            pass
                return

            # 2. Live Typing Notification
            if msg_type == "typing":
                chat_id = payload.get("chatId", "")
                sender = payload.get("sender", "Someone")
                typing_payload = json.dumps({
                    "type": "typing",
                    "chatId": chat_id,
                    "sender": sender
                })
                for client in list(connected_users.keys()):
                    if client != self:
                        try:
                            client.write_message(typing_payload)
                        except Exception:
                            pass
                return

            # 3. Emoji Reaction Broadcast
            if msg_type == "reaction":
                for client in list(connected_users.keys()):
                    try:
                        client.write_message(message)
                    except Exception:
                        pass
                return

            # 4. Pinned Message Broadcast
            if msg_type == "pin":
                for client in list(connected_users.keys()):
                    try:
                        client.write_message(message)
                    except Exception:
                        pass
                return

            # 5. Chat Messages (Text, Replies, Media, Voice)
            if msg_type == "message":
                chat_id = payload.get("chatId", "dev_community")
                text = payload.get("text", "")
                sender = payload.get("sender", "User")
                sender_id = payload.get("senderId", connected_users.get(self, {}).get("id", "anon"))
                msg_time = payload.get("time", get_current_time())
                recipient_id = payload.get("recipientId", None)
                msg_id = payload.get("id", f"m_{int(datetime.datetime.now().timestamp() * 1000)}")
                reply_to = payload.get("replyTo", None)
                media = payload.get("media", None)
                media_type = payload.get("mediaType", None)

                print(f"[WS Message] [{chat_id}] {sender}: {text[:50] if text else media_type}")

                broadcast_data = json.dumps({
                    "type": "message",
                    "id": msg_id,
                    "chatId": chat_id,
                    "sender": sender,
                    "senderId": sender_id,
                    "text": text,
                    "time": msg_time,
                    "recipientId": recipient_id,
                    "replyTo": reply_to,
                    "media": media,
                    "mediaType": media_type
                })

                # Direct 1-on-1 routing
                if recipient_id:
                    for client, uinfo in list(connected_users.items()):
                        if uinfo.get("id") == recipient_id:
                            try:
                                client.write_message(broadcast_data)
                            except Exception:
                                pass
                else:
                    # Broadcast to everyone else
                    for client in list(connected_users.keys()):
                        if client != self:
                            try:
                                client.write_message(broadcast_data)
                            except Exception:
                                pass

                # Forward to TCP native clients
                summary_text = text if text else f"[{media_type or 'media'}]"
                tcp_payload = f"[{sender} -> {chat_id}]: {summary_text}\n".encode()
                for writer in list(tcp_writers):
                    try:
                        writer.write(tcp_payload)
                        await writer.drain()
                    except Exception:
                        tcp_writers.discard(writer)

                # Bot Auto-Response
                if chat_id == "telegram_bot" or (text and text.startswith("/")):
                    await self.handle_bot_response(chat_id, text)

        except Exception as e:
            print(f"[WS Error] Failed to process message: {e}")

    async def handle_bot_response(self, chat_id, text):
        self.write_message(json.dumps({
            "type": "typing",
            "chatId": chat_id,
            "sender": "Telegram Assistant"
        }))

        await asyncio.sleep(0.6)

        lower = (text or "").strip().lower()
        if lower in ["/start", "/help"]:
            reply = (
                "🤖 *Welcome to Telegram Web!*\n\n"
                "Signature Features now active:\n"
                "• 🎨 5 Themes + Left/Right position swap\n"
                "• 💬 Replying to messages with quotes\n"
                "• ⚡ Emoji Reactions (hover any message)\n"
                "• 📌 Sticky Pinned Messages\n"
                "• 🎙️ Voice Notes with animated waveforms\n"
                "• 📷 Drag-and-drop Image sharing & Lightbox\n"
                "• 🔐 Official Telegram Login Screen (QR / Phone)\n\n"
                "Commands:\n"
                "/time · /ping · /roll · /joke · /info"
            )
        elif lower == "/time":
            reply = f"🕒 Server Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        elif lower == "/ping":
            reply = "⚡ Pong! Latency: < 0.5ms."
        elif lower == "/roll":
            reply = f"🎲 You rolled: {random.randint(1, 100)} / 100!"
        elif lower == "/joke":
            jokes = [
                "Why do C programmers wear glasses? Because they can't C#.",
                "There are 10 types of people in the world: those who understand binary, and those who don't.",
                "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'"
            ]
            reply = f"😄 {random.choice(jokes)}"
        elif lower == "/info":
            reply = (
                "🚀 *Telegram Web Full Architecture:*\n"
                "• Frontend: HTML5 / CSS3 / Vanilla JS / Web Audio API\n"
                "• Wallpaper: Authentic Telegram SVG Doodles\n"
                "• Real-Time: Tornado WebSockets (port 3000) & TCP Bridge (port 3001)\n"
                "• Native: C (main.c) & C++ MTProto Engine (m.c++)"
            )
        else:
            reply = f"I received your message: \"{text}\". Everything is running at peak Telegram speed!"

        self.write_message(json.dumps({
            "type": "message",
            "id": f"m_{int(datetime.datetime.now().timestamp() * 1000)}",
            "chatId": chat_id,
            "sender": "Telegram Assistant",
            "text": reply,
            "time": get_current_time()
        }))

# TCP Server for C / C++ Native Clients
async def handle_tcp_client(reader, writer):
    tcp_writers.add(writer)
    addr = writer.get_extra_info('peername')
    print(f"[TCP] Native client connected from {addr}")

    welcome = f"Connected to Telegram Web Python Bridge (port {TCP_PORT})\nType a message to send to Telegram Web:\n".encode()
    writer.write(welcome)
    await writer.drain()

    try:
        while True:
            data = await reader.readline()
            if not data:
                break
            line = data.decode(errors='ignore').strip()
            if line:
                print(f"[TCP Inbound from {addr}]: {line}")
                msg = {
                    "type": "message",
                    "id": f"m_{int(datetime.datetime.now().timestamp() * 1000)}",
                    "chatId": "dev_community",
                    "sender": f"NativeClient ({addr[0]})",
                    "text": line,
                    "time": get_current_time()
                }
                for ws in list(connected_users.keys()):
                    try:
                        ws.write_message(json.dumps(msg))
                    except Exception:
                        pass
    except Exception as e:
        print(f"[TCP Client Error]: {e}")
    finally:
        tcp_writers.discard(writer)
        writer.close()
        await writer.wait_closed()
        print(f"[TCP] Client disconnected: {addr}")

def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r"/ws", ChatWebSocketHandler),
        (r"/(.*)", tornado.web.StaticFileHandler, {"path": BASE_DIR, "default_filename": "index.html"}),
    ], debug=False)

async def main():
    app = make_app()
    app.listen(PORT, address="127.0.0.1")
    print(f"=====================================================")
    print(f"🚀 Telegram Web Server running at:")
    print(f"   👉 http://127.0.0.1:{PORT}")
    print(f"   👉 WebSocket: ws://127.0.0.1:{PORT}/ws")
    print(f"   👉 Native TCP Bridge: port {TCP_PORT}")
    print(f"=====================================================")
    sys.stdout.flush()

    tcp_server = await asyncio.start_server(handle_tcp_client, '127.0.0.1', TCP_PORT)
    async with tcp_server:
        await asyncio.Event().wait()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer stopped.")
