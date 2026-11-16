# Ranveer Jaiswal — Portfolio (macOS Tahoe & iOS 18) 💻📱

> Interactive OS-style developer portfolio. macOS Tahoe desktop + iOS 18 home screen, devOS terminal, project cards, README modals, Spotlight search, Skills folder, Gallery, Contact.

Live: `https://github.com/Rvjais/Ranveer-Portfolio` (static `index.html` — deploy to Vercel / GitHub Pages)

![HTML](https://img.shields.io/badge/HTML-Tailwind-blue)
![JS](https://img.shields.io/badge/JS-Vanilla-yellow)
![OS](https://img.shields.io/badge/OS-macOS_Tahoe_+_iOS18-black)
![Projects](https://img.shields.io/badge/Projects-12-green)

## ✨ What It Does

- 🖥️ macOS Tahoe: real menu bar menus (About, Projects, Skills, Contact, Window, Help) that follow the focused app, desktop icons that auto-arrange like Finder, right-click desktop menu, lock screen
- 🧭 Dock: magnification, tooltips, running-app dots, bounce on launch, minimize-to-Dock genie, Resume + Trash — all icons are self-contained CSS (no external icon CDN to break)
- 🗂️ Finder: Projects, Skills, Applications, Documents & Recents with colour tags, icon/list views, search and a preview pane (single-click preview, double-click open)
- 🚀 Launchpad (`F4`), Mission Control (`F3`), Spotlight (`⌘K` / `Ctrl+Space`)
- 🧩 Desktop widgets: profile card with Resume/Contact, analog clock, calendar, featured projects (auto-hidden on smaller screens)
- 🔔 Notifications: macOS banners top-right, iOS banners under the Dynamic Island
- 📱 iOS 18: Dynamic Island, pinned dock + search pill, folders, Control Center, app switcher, theme-aware status bar, iOS sheets for READMEs, master→detail Notes
- 💬 devOS Terminal: `ls / cd / cat / open / neofetch / whoami / history / help`, ↑/↓ history, Tab completion
- 📦 Project Cards (12) + README for every project (live demo / npm / repo buttons)
- 🖼️ Photos: drag-drop upload (localStorage) + lightbox with ←/→ navigation
- 📧 Contact: opens the visitor's mail app with subject + message prefilled
- 🔗 Deep links: `#about`, `#projects`, `#contact`, `#finder/skills`, `#readme/nothing-veer`, …

## 🎯 All Projects — What they do & How they help

| # | Project | Repo | What it does | How it helps you |
|---|---------|------|--------------|------------------|
| 1 | **HR-Buddy AI Onboarding** | `Rvjais` / live `hr-buddy-beta.vercel.app` | AI quiz + anti-cheat pre-assessment | Hire faster, cheat-proof screening |
| 2 | **SRChess Platform** | `Rvjais` / live `srchess.vercel.app` | React chess, board logic + validation | Play + learn online, mobile-ready |
| 3 | **PioneerOS** | `Rvjais` | Project mgmt + messaging + queue, Prisma/PG | Internal team 50% faster |
| 4 | **Rain CRM** | `Rvjais` | WhatsApp bots + Twilio + email to WhatsApp | Leads never missed |
| 5 | **fullstack-code-visualiser** | `Rvjais/fullstack-code-visualiser` | npm: AST map UI→API→DB + live pulse | Kill dead routes, onboard in hours |
| 6 | **Stock Mgmt (C++/Qt)** | `Rvjais` | GUI OOP + file handling | Shop stock without Excel |
| 7 | **Veer Music — Nothing OS** | [Nothing-Veer](https://github.com/Rvjais/Nothing-Veer) | Expo + yt-dlp proxy, vinyl + LRC lyrics, cache/offline | Saves data, sing-along, metro offline, AMOLED battery |
| 8 | **RANVEER H.U.D. Assistant** | [Ranveer_Echo](https://github.com/Rvjais/Ranveer_Echo) | Tauri Rust Jarvis, voice wake-word, face/hands, SQLite memory, PC control | Hands-free, touchless login, remembers you, automates PC |
| 9 | **WebRip Scraper** | [Web-Scrapper](https://github.com/Rvjais/Web-Scrapper) | BFS to ZIP, SPA render, CDP anti-bot, SSE live | Backup/migrate sites, offline demos |
| 10 | **SR Chess Academy 3D** | [Srchess](https://github.com/Rvjais/Srchess) | Vite Three.js, 25 pages + 17 blogs, shop ₹, quiz | More trials, parent trust, extra merch revenue |
| 11 | **TextLens OCR-SHEET** | [OCR-SHEET](https://github.com/Rvjais/OCR-SHEET) | Batch image/PDF to text, Tesseract + PaddleOCR handwriting, invoice table | Digitize ledgers, 15 min/invoice saved, privacy no-log |
| 12 | **AICRMZ WhatsApp CRM** | [AI-CRM](https://github.com/Rvjais/AI-CRM) | Baileys QR, AI reply + sentiment, campaigns, follow-ups, Bolna voice | 24/7 reply, 10x reach, +20% closures, cut RTO |

Terminal: `cat nothing_veer.txt / ranveer_echo.txt / web_ripper.txt / srchess_rebuild.txt / textlens.txt / aicrmz.txt`
Spotlight + Cards + `openReadmeModal('nothing-veer'|'ranveer-echo'|'web-ripper'|'srchess'|'textlens'|'aicrmz')` all wired.

## 📁 Structure

```
portfolio/
├── index.html — windows (About, Terminal/Cards, Settings, Mail, Photos, Calculator, Notes, Calendar, Finder), menu bar, widgets, Launchpad
├── script.js — window manager, PORTFOLIO_PROJECTS / SKILLS_LIST data, Finder, Dock, menus, terminal, READMEs, gallery, iOS gestures
├── style.css — Tahoe + iOS styles (design tokens at the top, v2 component layer at the bottom)
├── profile.png, ranveer_jaiswal.pdf
└── README.md
```

## 🚀 Run

```powershell
cd portfolio
python -m http.server 8080
# → http://localhost:8080
# Terminal: ls → cd projects → cat aicrmz.txt
# Cards: Projects → Project Cards → Readme
```

Deploy: drag to Vercel / `gh-pages` — no build, CDN Tailwind + FA + Devicon.

## 👤 Author

**Ranveer Jaiswal** — Full Stack / MERN, Gurgaon. `ranveerjais9984@gmail.com` / `+91 9648165493` / [GitHub @Rvjais](https://github.com/Rvjais)
