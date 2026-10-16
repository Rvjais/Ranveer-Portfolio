# Ranveer Jaiswal — Portfolio (macOS Tahoe & iOS 18) 💻📱

> Interactive OS-style developer portfolio. macOS Tahoe desktop + iOS 18 home screen, devOS terminal, project cards, README modals, Spotlight search, Skills folder, Gallery, Contact.

Live: `https://github.com/Rvjais/Ranveer-Portfolio` (static `index.html` — deploy to Vercel / GitHub Pages)

![HTML](https://img.shields.io/badge/HTML-Tailwind-blue)
![JS](https://img.shields.io/badge/JS-Vanilla-yellow)
![OS](https://img.shields.io/badge/OS-macOS_Tahoe_+_iOS18-black)
![Projects](https://img.shields.io/badge/Projects-12-green)

## ✨ What It Does

- 🖥️ macOS Tahoe: menu bar, draggable icons, dock, Mission Control, windows with traffic lights
- 📱 iOS 18: Dynamic Island, home grid, folders, dock, Spotlight (`Cmd+K`)
- 💬 devOS Terminal: `ls / cd / cat / open / whoami / help` + quick chips, `projects/` file system
- 📦 Project Cards (12): Live Demo + GitHub + Readme modal per project
- 📖 README Modals: in-site preview with npm + repo buttons (no tab switch)
- 🔍 Spotlight: fuzzy search apps / projects / skills / resume
- 🖼️ Gallery: photos/videos + drag-drop upload (localStorage) + lightbox
- 📧 Contact: simulated send + toast system

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
├── index.html — 12 cards, folders, dock, terminal view, readme modal
├── script.js — fileSystem (12 txt), searchIndex (18), projectReadmes (7), terminal, gallery, island
├── style.css — Tahoe + iOS styles
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
