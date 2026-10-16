/**
 * OS Developer Portfolio - Desktop (macOS Tahoe) & Mobile (iOS 18) Core Logic
 * Ranveer Jaiswal — Full Stack / MERN Developer
 */

// --- Global State ---
let highestZIndex = 50;
let maximizedStates = {};
let runningApps = [];
let isMissionControlOpen = false;
let isIosSwitcherOpen = false;
let switcherOpenedTime = 0;

// Dynamic Viewport Height Handler (Protects layout from mobile browser search/address bar shifts)
function updateDynamicViewport() {
    const vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}
window.addEventListener('resize', updateDynamicViewport);
window.addEventListener('orientationchange', updateDynamicViewport);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateDynamicViewport);
    window.visualViewport.addEventListener('scroll', updateDynamicViewport);
}
updateDynamicViewport();

// --- Clock & Status Bar Management ---
function updateClocks() {
    const now = new Date();
    
    // iOS Format: HH:MM
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    let displayHours = hours % 12;
    displayHours = displayHours ? displayHours : 12;
    const minsFormatted = minutes < 10 ? '0' + minutes : minutes;
    
    const iosClockEl = document.getElementById('ios-clock');
    if (iosClockEl) {
        iosClockEl.innerText = `${displayHours}:${minsFormatted}`;
    }

    // macOS Format: Day Month Date HH:MM AM/PM
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayStr = days[now.getDay()];
    const monthStr = months[now.getMonth()];
    const dateNum = now.getDate();

    const macClockEl = document.getElementById('mac-clock');
    if (macClockEl) {
        macClockEl.innerText = `${dayStr} ${monthStr} ${dateNum}  ${displayHours}:${minsFormatted} ${ampm}`;
    }

    // Terminal initial date
    const termDateEl = document.getElementById('term-date');
    if (termDateEl && !termDateEl.dataset.initialized) {
        termDateEl.innerText = `${dayStr} ${monthStr} ${dateNum} ${displayHours}:${minsFormatted}:${now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds()}`;
        termDateEl.dataset.initialized = "true";
    }

    // Live Calendar Widgets & Badges Sync
    if (typeof updateCalendarDatesDisplay === 'function') {
        updateCalendarDatesDisplay(now);
    }
}

setInterval(updateClocks, 1000);
updateClocks();

// --- Dynamic Island Interaction ---
let dynamicIslandCollapseTimer = null;

function toggleDynamicIsland() {
    const island = document.getElementById('dynamic-island');
    if (!island) return;
    
    clearTimeout(dynamicIslandCollapseTimer);
    island.classList.toggle('expanded');
    const compactContent = island.querySelector('.island-compact');
    const expandedContent = island.querySelector('.island-expanded');

    if (island.classList.contains('expanded')) {
        if (navigator.vibrate) navigator.vibrate(20);
        if (compactContent) compactContent.classList.add('hidden');
        if (expandedContent) expandedContent.classList.remove('hidden');
        
        // Auto collapse after 5 seconds
        dynamicIslandCollapseTimer = setTimeout(() => {
            if (island.classList.contains('expanded')) {
                toggleDynamicIsland();
            }
        }, 5000);
    } else {
        if (compactContent) compactContent.classList.remove('hidden');
        if (expandedContent) expandedContent.classList.add('hidden');
    }
}

// Tap outside expanded Dynamic Island to collapse
document.addEventListener('click', (e) => {
    const island = document.getElementById('dynamic-island');
    if (island && island.classList.contains('expanded') && !island.contains(e.target)) {
        toggleDynamicIsland();
    }
});

// --- App Management (Open / Close / Minimize / Maximize) ---
function openApp(appId) {
    const app = document.getElementById(`app-${appId}`);
    if (!app) return;

    // Track running apps
    if (!runningApps.includes(appId)) {
        runningApps.push(appId);
    }

    // Reset any interactive drag transforms on mobile
    app.style.transform = '';
    app.style.borderRadius = '';
    app.style.transition = '';

    // Remove any closing animation classes
    app.classList.remove('closing', 'genie-closing');
    app.classList.add('is-open');

    // Bring to front
    bringToFront(app);

    // Show active indicator in macOS dock
    const dot = document.getElementById(`dot-${appId}`);
    if (dot) dot.style.display = 'block';

    // Update iOS global home bar style based on app theme
    const homeBar = document.getElementById('ios-global-home-bar');
    if (homeBar) {
        if (['about', 'skills', 'contact'].includes(appId)) {
            homeBar.classList.add('dark');
        } else {
            homeBar.classList.remove('dark');
        }
    }

    // Update mobile status bar theme (dark text for light-background apps like about, skills)
    const mobileNav = document.querySelector('nav.mobile-only');
    if (mobileNav) {
        if (['about', 'skills'].includes(appId)) {
            mobileNav.classList.add('light-theme');
        } else {
            mobileNav.classList.remove('light-theme');
        }
    }

    // App-specific initialization
    if (appId === 'notes' && typeof initNotesApp === 'function') {
        initNotesApp();
    }
    if (appId === 'calculator' && typeof updateCalcDisplay === 'function') {
        updateCalcDisplay();
    }
    if (appId === 'calendar') {
        if (typeof renderCalendarGrid === 'function') renderCalendarGrid();
        if (typeof updateCalendarDatesDisplay === 'function') updateCalendarDatesDisplay();
    }

    // Desktop positioning
    if (window.innerWidth >= 768 && !app.style.top) {
        const randomOffset = Math.floor(Math.random() * 30) - 15;
        app.style.top = `calc(50% + ${randomOffset}px)`;
        app.style.left = `calc(50% + ${randomOffset}px)`;
        app.style.transform = `translate(-50%, -50%)`;
    }

    // If projects app is opened, ensure terminal input is focused
    if (appId === 'projects') {
        setTimeout(() => {
            const input = document.getElementById('term-input');
            if (input) input.focus();
        }, 200);
    }

    // Refresh Mission Control or Switcher if open
    if (isMissionControlOpen) renderMissionControlTiles();
    if (isIosSwitcherOpen) renderIosSwitcherCards();
    if (typeof updateMacOSDockOpenApps === 'function') updateMacOSDockOpenApps();
}

function closeApp(appId) {
    const app = document.getElementById(`app-${appId}`);
    if (!app) return;

    // Remove from running apps
    runningApps = runningApps.filter(id => id !== appId);

    // Reset transforms
    app.style.transform = '';
    app.style.borderRadius = '';

    if (window.innerWidth < 768) {
        // Mobile iOS closing animation
        app.classList.add('closing');
        setTimeout(() => {
            app.classList.remove('is-open', 'closing');
        }, 220);
    } else {
        // macOS Magic Lamp / Genie animation closing
        app.classList.add('genie-closing');
        setTimeout(() => {
            app.classList.remove('is-open', 'genie-closing');
        }, 460);
    }

    // Hide active dot in macOS dock
    const dot = document.getElementById(`dot-${appId}`);
    if (dot) dot.style.display = 'none';

    // Update iOS home bar theme and mobile nav theme
    const activeTopApp = runningApps[runningApps.length - 1];
    const homeBar = document.getElementById('ios-global-home-bar');
    if (homeBar) {
        if (activeTopApp && ['about', 'skills', 'contact'].includes(activeTopApp)) {
            homeBar.classList.add('dark');
        } else {
            homeBar.classList.remove('dark');
        }
    }
    const mobileNav = document.querySelector('nav.mobile-only');
    if (mobileNav) {
        if (activeTopApp && ['about', 'skills'].includes(activeTopApp)) {
            mobileNav.classList.add('light-theme');
        } else {
            mobileNav.classList.remove('light-theme');
        }
    }

    // Refresh views if open
    if (isMissionControlOpen) renderMissionControlTiles();
    if (isIosSwitcherOpen) renderIosSwitcherCards();
    if (typeof updateMacOSDockOpenApps === 'function') updateMacOSDockOpenApps();
}


function minimizeApp(appId) {
    const app = document.getElementById(`app-${appId}`);
    if (!app) return;

    if (window.innerWidth >= 768) {
        // macOS Magic Lamp / Genie animation minimizing into dock
        app.classList.add('genie-closing');
        setTimeout(() => {
            app.classList.remove('is-open', 'genie-closing');
        }, 460);
    } else {
        app.classList.remove('is-open');
    }
    // Dock dot remains visible on desktop
}

function maximizeApp(appId) {
    if (window.innerWidth < 768) return;
    const app = document.getElementById(`app-${appId}`);
    if (!app) return;

    if (!maximizedStates[appId]) {
        // Save current window positioning
        maximizedStates[appId] = {
            top: app.style.top,
            left: app.style.left,
            width: app.style.width,
            height: app.style.height,
            transform: app.style.transform
        };
        app.classList.add('is-maximized');
        bringToFront(app);
    } else {
        // Restore window
        app.classList.remove('is-maximized');
        app.style.top = maximizedStates[appId].top;
        app.style.left = maximizedStates[appId].left;
        app.style.width = maximizedStates[appId].width || '';
        app.style.height = maximizedStates[appId].height || '';
        app.style.transform = maximizedStates[appId].transform || 'translate(-50%, -50%)';
        delete maximizedStates[appId];
    }
}

function bringToFront(appElement) {
    highestZIndex++;
    if (appElement) {
        appElement.style.zIndex = highestZIndex;
    }
}

// --- About App Tab Switching ---
function switchAboutTab(tabName, clickedElement) {
    // Hide all about tab sections
    const contents = document.querySelectorAll('.about-tab-content');
    contents.forEach(content => {
        content.classList.add('hidden');
        content.classList.remove('block');
    });

    // Show requested content
    const target = document.getElementById(`about-content-${tabName}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('block');
    }

    // Update Desktop Sidebar active styling
    const sidebarItems = document.querySelectorAll('#about-sidebar li');
    sidebarItems.forEach(item => {
        item.classList.remove('bg-gray-200/80', 'font-semibold');
        item.classList.add('hover:bg-gray-200/50');
    });
    const activeSidebarItem = document.querySelector(`#about-sidebar li[data-tab="${tabName}"]`);
    if (activeSidebarItem) {
        activeSidebarItem.classList.add('bg-gray-200/80', 'font-semibold');
        activeSidebarItem.classList.remove('hover:bg-gray-200/50');
    }

    // Update Mobile Segmented Control active styling
    const mobileSegments = document.querySelectorAll('.about-segment-btn');
    mobileSegments.forEach(btn => {
        btn.classList.remove('active');
    });
    const activeSegment = document.querySelector(`.about-segment-btn[data-tab="${tabName}"]`);
    if (activeSegment) {
        activeSegment.classList.add('active');
    }
}

// --- Projects App Switching (Terminal vs Cards) ---
function switchProjectsView(viewMode, clickedBtn) {
    const terminalView = document.getElementById('projects-view-terminal');
    const cardsView = document.getElementById('projects-view-cards');
    const btns = document.querySelectorAll('.projects-segment-btn');

    btns.forEach(b => b.classList.remove('active'));
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    } else {
        const matchingBtn = document.querySelector(`.projects-segment-btn[data-view="${viewMode}"]`);
        if (matchingBtn) matchingBtn.classList.add('active');
    }

    if (viewMode === 'terminal') {
        if (terminalView) terminalView.classList.remove('hidden');
        if (cardsView) cardsView.classList.add('hidden');
        setTimeout(() => {
            const input = document.getElementById('term-input');
            if (input) input.focus();
        }, 100);
    } else {
        if (terminalView) terminalView.classList.add('hidden');
        if (cardsView) cardsView.classList.remove('hidden');
    }
}

// --- Quick Command execution for Mobile Terminal ---
function runQuickCommand(cmd) {
    const input = document.getElementById('term-input');
    if (input) {
        input.value = cmd;
        executeTerminalCommand(cmd);
        input.value = '';
    }
}

// --- Toast Notifications ---
function showToast(message, icon = 'fas fa-info-circle') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'ios-toast opacity-0 translate-y-[-10px]';
    toast.innerHTML = `<i class="${icon} text-blue-400"></i> <span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.remove('opacity-0', 'translate-y-[-10px]');
        });
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-[-10px]');
        setTimeout(() => toast.remove(), 280);
    }, 2800);
}

// --- Contact Form Sending Simulation ---
function handleSend() {
    const subj = document.getElementById('contact-subj').value.trim();
    const msg = document.getElementById('contact-msg').value.trim();

    if (!subj || !msg) {
        showToast("Please enter a subject and message.", "fas fa-exclamation-triangle");
        return;
    }

    showToast("Message sent successfully! Ranveer will reply soon.", "fas fa-check-circle");
    document.getElementById('contact-subj').value = '';
    document.getElementById('contact-msg').value = '';

    // Auto close app on mobile after send
    if (window.innerWidth < 768) {
        setTimeout(() => closeApp('contact'), 800);
    }
}

// --- Desktop Window Dragging & Resizing ---
function setupWindowDragging() {
    const windows = document.querySelectorAll('.app-window');
    windows.forEach(win => {
        const header = win.querySelector('.app-header');
        if (!header) return;

        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        win.addEventListener('mousedown', () => {
            if (window.innerWidth >= 768) {
                bringToFront(win);
            }
        });

        header.addEventListener('mousedown', (e) => {
            if (window.innerWidth < 768) return;
            if (e.target.closest('.traffic-btn') || e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;

            isDragging = true;
            win.classList.add('dragging');

            const rect = win.getBoundingClientRect();
            if (win.style.transform && win.style.transform.includes('translate')) {
                win.style.top = rect.top + 'px';
                win.style.left = rect.left + 'px';
                win.style.transform = 'none';
                win.style.margin = '0';
            }

            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            win.style.left = `${Math.max(10, Math.min(window.innerWidth - 100, e.clientX - offsetX))}px`;
            win.style.top = `${Math.max(30, Math.min(window.innerHeight - 80, e.clientY - offsetY))}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                win.classList.remove('dragging');
            }
        });
    });
}

function setupWindowResizing() {
    const windows = document.querySelectorAll('.app-window');
    windows.forEach(win => {
        const handle = win.querySelector('.window-resize-handle');
        if (!handle) return;

        let isResizing = false;
        let startX, startY, startW, startH;

        handle.addEventListener('mousedown', (e) => {
            if (window.innerWidth < 768) return;
            e.preventDefault();
            e.stopPropagation();

            isResizing = true;
            win.classList.add('resizing');
            bringToFront(win);

            startX = e.clientX;
            startY = e.clientY;
            startW = parseInt(document.defaultView.getComputedStyle(win).width, 10);
            startH = parseInt(document.defaultView.getComputedStyle(win).height, 10);

            // Normalize transform if needed
            const rect = win.getBoundingClientRect();
            if (win.style.transform && win.style.transform.includes('translate')) {
                win.style.top = rect.top + 'px';
                win.style.left = rect.left + 'px';
                win.style.transform = 'none';
                win.style.margin = '0';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const newW = Math.max(440, Math.min(window.innerWidth - 20, startW + (e.clientX - startX)));
            const newH = Math.max(320, Math.min(window.innerHeight - 50, startH + (e.clientY - startY)));
            win.style.width = `${newW}px`;
            win.style.height = `${newH}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                win.classList.remove('resizing');
            }
        });
    });
}

// --- Desktop Free-form Icon Dragging ---
function setupDesktopIconDragging() {
    const shortcuts = document.querySelectorAll('.desktop-shortcut');
    shortcuts.forEach(icon => {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialLeft = 0;
        let initialTop = 0;
        let hasMoved = false;

        icon.addEventListener('mousedown', (e) => {
            if (window.innerWidth < 768) return;
            if (e.button !== 0) return; // Only left click

            const rect = icon.getBoundingClientRect();
            // Convert to explicit left/top coordinates
            icon.style.left = `${rect.left}px`;
            icon.style.top = `${rect.top}px`;
            icon.style.right = 'auto';

            isDragging = true;
            hasMoved = false;
            delete icon.dataset.dragged;

            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;

            icon.classList.add('dragging');
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
                hasMoved = true;
                icon.dataset.dragged = "true";
            }

            const newLeft = Math.max(10, Math.min(window.innerWidth - 90, initialLeft + dx));
            const newTop = Math.max(35, Math.min(window.innerHeight - 100, initialTop + dy));

            icon.style.left = `${newLeft}px`;
            icon.style.top = `${newTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                icon.classList.remove('dragging');
                if (hasMoved) {
                    setTimeout(() => {
                        delete icon.dataset.dragged;
                    }, 120);
                }
            }
        });
    });
}


// --- Spotlight Search System (macOS Tahoe & iOS) ---
const searchIndex = [
    { title: "About Ranveer Jaiswal", category: "Application", desc: "Full Stack & MERN Developer profile, bio, skills and experience", action: () => openApp('about'), icon: "fas fa-user-astronaut text-blue-400", badge: "APP", tech: ["Profile", "Bio", "Gurgaon"] },
    { title: "Calculator", category: "Application", desc: "Interactive macOS Tahoe precision math & arithmetic calculator", action: () => openApp('calculator'), icon: "fas fa-calculator text-amber-400", badge: "APP", tech: ["Math", "Arithmetic", "Keypad"] },
    { title: "Calendar", category: "Application", desc: "macOS Tahoe monthly schedule, sprint deadlines & developer agenda", action: () => openApp('calendar'), icon: "far fa-calendar-alt text-red-500", badge: "APP", tech: ["Calendar", "Schedule", "Sprint", "Agenda"] },
    { title: "Notes — Ranveer's DevPad", category: "Application", desc: "Engineering journals, full-stack architecture notes & local scratchpad", action: () => openApp('notes'), icon: "fas fa-note-sticky text-yellow-400", badge: "APP", tech: ["Notes", "Scratchpad", "Local Storage"] },
    { title: "Projects Folder", category: "Folder", desc: "Interactive iOS folder containing all 12 projects and apps", action: () => openFolderModal(), icon: "fas fa-folder text-amber-400", badge: "FOLDER", tech: ["12 Projects", "Interactive", "Directory"] },
    { title: "Projects Showcase", category: "Application", desc: "Interactive devOS Terminal and live project architecture cards", action: () => { openApp('projects'); switchProjectsView('cards', null); }, icon: "fas fa-terminal text-green-400", badge: "APP", tech: ["Terminal", "zsh", "React Cards"] },
    { title: "fullstack-code-visualiser (npm)", category: "Package", desc: "MERN Stack Visualizer & AST Architecture Tracer", action: () => openReadmeModal('fullstack-code-visualiser'), icon: "fab fa-npm text-red-500", badge: "NPM", tech: ["React", "Node.js", "Babel AST", "MongoDB"] },
    { title: "Veer Music — Nothing OS App", category: "Project", desc: "Expo music client + yt-dlp proxy, 33 RPM vinyl disc, LRCLIB lyrics", action: () => openReadmeModal('nothing-veer'), icon: "fas fa-music text-red-400", badge: "MOBILE", tech: ["React Native", "Expo 54", "yt-dlp", "LRU Cache"] },
    { title: "HR-Buddy (Live App)", category: "Project", desc: "AI onboarding quiz with anti-cheat mechanism (React, Node.js)", action: () => window.open('https://hr-buddy-beta.vercel.app/', '_blank'), icon: "fas fa-user-check text-amber-400", badge: "LIVE DEMO", tech: ["React", "Node.js", "AI Quiz"] },
    { title: "SRChess (Live App)", category: "Project", desc: "Full-stack interactive chess platform (React, WebSockets)", action: () => window.open('https://srchess.vercel.app/', '_blank'), icon: "fas fa-chess-knight text-purple-400", badge: "LIVE DEMO", tech: ["React", "WebSockets", "Board Logic"] },
    { title: "RANVEER H.U.D. Assistant", category: "Project", desc: "Tauri Rust Jarvis, voice + face + autonomous computer control", action: () => openReadmeModal('ranveer-echo'), icon: "fas fa-robot text-cyan-400", badge: "DESKTOP", tech: ["Tauri", "Rust", "Whisper AI"] },
    { title: "WebRip Scraper", category: "Project", desc: "BFS website to ZIP, Playwright + SSE real-time download progress", action: () => openReadmeModal('web-ripper'), icon: "fas fa-globe text-teal-400", badge: "TOOL", tech: ["Playwright", "Node.js", "BFS Crawler"] },
    { title: "PioneerOS", category: "Project", desc: "Multi-module internal platform with project management & queue system", action: () => { openApp('projects'); switchProjectsView('cards', null); }, icon: "fas fa-desktop text-blue-400", badge: "PLATFORM", tech: ["Next.js", "Prisma", "PostgreSQL"] },
    { title: "Rain CRM", category: "Project", desc: "CRM with AI WhatsApp bots, Twilio calling & automated email client", action: () => { openApp('projects'); switchProjectsView('cards', null); }, icon: "fas fa-users-cog text-emerald-400", badge: "CRM", tech: ["React", "Twilio", "WhatsApp Bot"] },
    { title: "TextLens OCR Sheet", category: "Project", desc: "Image/PDF to text, PaddleOCR handwriting + invoice table parser", action: () => openReadmeModal('textlens'), icon: "fas fa-file-alt text-indigo-400", badge: "AI TOOL", tech: ["PaddleOCR", "Python", "Table Extraction"] },
    { title: "AICRMZ WhatsApp CRM", category: "Project", desc: "Baileys QR CRM, AI auto-replies, automated campaigns & voice notes", action: () => openReadmeModal('aicrmz'), icon: "fab fa-whatsapp text-green-400", badge: "WHATSAPP", tech: ["Baileys", "Node.js", "Campaigns"] },
    { title: "Skills Folder (All Skills)", category: "Folder", desc: "Interactive folder listing Docker, AWS, React, Node.js, TypeScript & MongoDB", action: () => openSkillsFolderModal(), icon: "fas fa-layer-group text-blue-400", badge: "FOLDER", tech: ["Docker", "AWS", "React", "Node"] },
    { title: "System Settings (Skills)", category: "Application", desc: "Full-stack languages, frameworks, databases & tooling preferences", action: () => openApp('skills'), icon: "fas fa-gear text-gray-400", badge: "APP", tech: ["DevOps", "Databases", "Frontend"] },
    { title: "Photos & Videos (Gallery)", category: "Application", desc: "Personal media gallery, photos & video uploads", action: () => openApp('gallery'), icon: "fas fa-images text-pink-400", badge: "APP", tech: ["Photos", "Videos", "Uploads"] },
    { title: "Mail Composer (Contact)", category: "Application", desc: "Send an email or message directly to Ranveer", action: () => openApp('contact'), icon: "fas fa-envelope text-blue-400", badge: "APP", tech: ["Email", "Messages", "Gurgaon"] },
    { title: "Resume (PDF)", category: "Document", desc: "Official resume of Ranveer Jaiswal (ranveer_jaiswal.pdf)", action: () => window.open('ranveer_jaiswal.pdf', '_blank'), icon: "fas fa-file-pdf text-red-500", badge: "PDF", tech: ["Full Stack", "MERN", "Resume"] },
    { title: "GitHub Profile (Rvjais)", category: "Link", desc: "Explore open-source repositories and contributions on GitHub", action: () => window.open('https://github.com/Rvjais', '_blank'), icon: "fab fa-github text-white", badge: "GITHUB", tech: ["Open Source", "Repos"] }
];

let selectedSpotlightIndex = 0;

function toggleSpotlight() {
    const overlay = document.getElementById('spotlight-overlay');
    if (!overlay) return;

    if (overlay.classList.contains('is-active')) {
        closeSpotlight();
    } else {
        openSpotlight();
    }
}

function openSpotlight() {
    const overlay = document.getElementById('spotlight-overlay');
    const input = document.getElementById('spotlight-input');
    if (!overlay) return;

    overlay.classList.add('is-active');
    selectedSpotlightIndex = 0;
    if (input) {
        input.value = '';
        input.focus();
    }
    renderSpotlightResults('');
}

function closeSpotlight() {
    const overlay = document.getElementById('spotlight-overlay');
    if (overlay) {
        overlay.classList.remove('is-active');
    }
}

function clearSpotlightInput() {
    const input = document.getElementById('spotlight-input');
    if (input) {
        input.value = '';
        input.focus();
        selectedSpotlightIndex = 0;
        renderSpotlightResults('');
    }
}

function renderSpotlightResults(query) {
    const resultsContainer = document.getElementById('spotlight-results');
    const clearBtn = document.getElementById('spotlight-clear-btn');
    if (!resultsContainer) return;

    if (clearBtn) {
        clearBtn.classList.toggle('hidden', !query);
    }

    const trimmed = query.toLowerCase().trim();
    const filtered = searchIndex.filter(item => {
        if (!trimmed) return true;
        return item.title.toLowerCase().includes(trimmed) || 
               item.desc.toLowerCase().includes(trimmed) || 
               item.category.toLowerCase().includes(trimmed) ||
               (item.tech && item.tech.some(t => t.toLowerCase().includes(trimmed)));
    }).slice(0, 8);

    if (filtered.length === 0) {
        resultsContainer.innerHTML = `<div class="p-6 text-center text-gray-400 text-xs">No matching results for "<span class="text-white">${query}</span>"</div>`;
        renderSpotlightPreview(null);
        return;
    }

    if (selectedSpotlightIndex >= filtered.length) {
        selectedSpotlightIndex = 0;
    }

    resultsContainer.innerHTML = filtered.map((item, index) => `
        <div class="spotlight-result-item ${index === selectedSpotlightIndex ? 'selected' : ''}" data-index="${index}" onclick="executeSpotlightAction(${index})" onmouseenter="selectedSpotlightIndex = ${index}; updateSpotlightSelection();">
            <div class="flex items-center space-x-3 truncate">
                <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm shrink-0">
                    <i class="${item.icon}"></i>
                </div>
                <div class="text-left truncate">
                    <div class="text-xs font-semibold text-white truncate">${item.title}</div>
                    <div class="text-[11px] text-gray-400 truncate">${item.desc}</div>
                </div>
            </div>
            <div class="flex items-center space-x-1.5 shrink-0 ml-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-gray-300 border border-white/15 uppercase">${item.badge || item.category}</span>
            </div>
        </div>
    `).join('');

    renderSpotlightPreview(filtered[selectedSpotlightIndex]);
}

function renderSpotlightPreview(item) {
    const previewEl = document.getElementById('spotlight-preview-pane');
    if (!previewEl) return;

    if (!item) {
        previewEl.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-center text-gray-500 py-8">
                <i class="fas fa-search text-3xl mb-2 opacity-40"></i>
                <p class="text-xs">Type above to search applications, code and projects</p>
            </div>
        `;
        return;
    }

    previewEl.innerHTML = `
        <div class="space-y-4">
            <div class="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-2xl shadow-lg">
                <i class="${item.icon}"></i>
            </div>
            <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-blue-400 px-2 py-0.5 rounded bg-blue-500/15 border border-blue-400/25">${item.badge || item.category}</span>
                <h3 class="text-base font-bold text-white mt-2 leading-snug">${item.title}</h3>
                <p class="text-xs text-gray-300 mt-2 leading-relaxed">${item.desc}</p>
            </div>
            ${item.tech && item.tech.length > 0 ? `
                <div class="pt-2 border-t border-white/10">
                    <span class="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Tech & Environment</span>
                    <div class="flex flex-wrap gap-1 mt-1.5">
                        ${item.tech.map(t => `<span class="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-200 border border-white/10">${t}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
        <div class="pt-4 border-t border-white/10">
            <button onclick="executeSpotlightAction(${selectedSpotlightIndex})" class="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-md transition active:scale-95">
                <span>Launch</span>
                <i class="fas fa-arrow-right text-[10px]"></i>
            </button>
        </div>
    `;
}

function executeSpotlightAction(index) {
    const input = document.getElementById('spotlight-input');
    const query = input ? input.value.toLowerCase().trim() : '';
    const filtered = searchIndex.filter(item => {
        if (!query) return true;
        return item.title.toLowerCase().includes(query) || 
               item.desc.toLowerCase().includes(query) || 
               item.category.toLowerCase().includes(query) ||
               (item.tech && item.tech.some(t => t.toLowerCase().includes(query)));
    }).slice(0, 8);

    if (filtered[index]) {
        filtered[index].action();
        closeSpotlight();
    }
}

// --- Mobile iOS 18 Control Center Toggle & Actions ---
function toggleMobileControlCenter(e) {
    if (e) e.stopPropagation();
    const iosCc = document.getElementById('ios-control-center');
    if (!iosCc) return;
    const isOpen = iosCc.classList.contains('is-open');
    if (isOpen) {
        closeControlCenter();
    } else {
        closeAppleMenu();
        closeSpotlight();
        closeMissionControl();
        closeIosAppSwitcher();
        iosCc.classList.add('is-open');
    }
}

function handleIosCcBackdropClick(e) {
    if (!e.target.closest('.ios-cc-scroll-body')) {
        closeControlCenter();
    }
}

let iosAirplaneActive = false;
function toggleIosAirplane() {
    iosAirplaneActive = !iosAirplaneActive;
    const btn = document.getElementById('ios-cc-airplane-btn');
    if (btn) {
        btn.classList.toggle('is-active-orange', iosAirplaneActive);
    }
    showToast(iosAirplaneActive ? 'Airplane Mode: On' : 'Airplane Mode: Off', 'fas fa-plane');
}

let iosAirDropState = 1; // 0: Off, 1: Contacts Only, 2: Everyone
function toggleIosAirDrop() {
    iosAirDropState = (iosAirDropState + 1) % 3;
    const btn = document.getElementById('ios-cc-airdrop-btn');
    const labels = ['AirDrop: Receiving Off', 'AirDrop: Contacts Only', 'AirDrop: Everyone for 10 min'];
    if (btn) {
        btn.classList.toggle('is-active-blue', iosAirDropState > 0);
    }
    showToast(labels[iosAirDropState], 'fas fa-satellite-dish');
}

let iosOrientationLocked = true;
function toggleIosOrientationLock() {
    iosOrientationLocked = !iosOrientationLocked;
    const btn = document.getElementById('ios-cc-rotation-btn');
    if (btn) {
        btn.classList.toggle('is-active-red', iosOrientationLocked);
    }
    showToast(iosOrientationLocked ? 'Portrait Orientation Lock: On' : 'Portrait Orientation Lock: Off', 'fas fa-lock');
}

let iosSilentMode = false;
function toggleIosSilentMode() {
    iosSilentMode = !iosSilentMode;
    const btn = document.getElementById('ios-cc-silent-btn');
    if (btn) {
        btn.classList.toggle('is-active-red', iosSilentMode);
    }
    showToast(iosSilentMode ? 'Silent Mode: On' : 'Silent Mode: Off', 'fas fa-bell-slash');
}

let iosPowerMode = false;
function toggleIosPowerMode() {
    iosPowerMode = !iosPowerMode;
    const btn = document.getElementById('ios-cc-power-btn');
    if (btn) {
        btn.classList.toggle('is-active-orange', iosPowerMode);
    }
    showToast(iosPowerMode ? 'Low Power Mode: On' : 'Low Power Mode: Off', 'fas fa-battery-half');
}

let iosRecordingActive = false;
function toggleIosRecording() {
    iosRecordingActive = !iosRecordingActive;
    const btn = document.getElementById('ios-cc-record-btn');
    if (btn) {
        btn.classList.toggle('is-active-red', iosRecordingActive);
    }
    showToast(iosRecordingActive ? 'Screen Recording Started' : 'Screen Recording Saved to Photos', 'far fa-circle-dot');
}

function prevTrack() {
    showToast('Previous Track • Starboy', 'fas fa-backward-step');
}

function nextTrack() {
    showToast('Next Track • Blinding Lights', 'fas fa-forward-step');
}

// --- Calculator Engine ---
let calcCurrent = '0';
let calcPrevious = null;
let calcOperator = null;
let calcShouldResetDisplay = false;

function updateCalcDisplay() {
    const disp = document.getElementById('calc-display');
    const hist = document.getElementById('calc-history');
    if (disp) {
        disp.innerText = calcCurrent;
    }
    if (hist) {
        hist.innerText = calcPrevious !== null && calcOperator !== null ? `${calcPrevious} ${calcOperator}` : '';
    }
}

function handleCalcDigit(digit) {
    if (calcShouldResetDisplay) {
        calcCurrent = digit === '.' ? '0.' : digit;
        calcShouldResetDisplay = false;
    } else {
        if (digit === '.') {
            if (!calcCurrent.includes('.')) calcCurrent += '.';
        } else {
            calcCurrent = calcCurrent === '0' ? digit : calcCurrent + digit;
        }
    }
    updateCalcDisplay();
}

function handleCalcOp(op) {
    if (calcOperator !== null && !calcShouldResetDisplay) {
        handleCalcEqual();
    }
    calcPrevious = calcCurrent;
    calcOperator = op;
    calcShouldResetDisplay = true;
    updateCalcDisplay();
}

function handleCalcEqual() {
    if (calcOperator === null || calcPrevious === null) return;
    const prev = parseFloat(calcPrevious);
    const curr = parseFloat(calcCurrent);
    let result = 0;

    switch (calcOperator) {
        case '+': result = prev + curr; break;
        case '-': result = prev - curr; break;
        case '*': result = prev * curr; break;
        case '/': result = curr === 0 ? 'Error' : prev / curr; break;
    }

    if (typeof result === 'number') {
        calcCurrent = (Math.round(result * 100000000) / 100000000).toString();
    } else {
        calcCurrent = result;
    }

    calcPrevious = null;
    calcOperator = null;
    calcShouldResetDisplay = true;
    updateCalcDisplay();
}

function handleCalcClear() {
    calcCurrent = '0';
    calcPrevious = null;
    calcOperator = null;
    calcShouldResetDisplay = false;
    updateCalcDisplay();
}

function handleCalcNegate() {
    if (calcCurrent === '0' || calcCurrent === 'Error') return;
    calcCurrent = (parseFloat(calcCurrent) * -1).toString();
    updateCalcDisplay();
}

function handleCalcPercent() {
    if (calcCurrent === 'Error') return;
    calcCurrent = (parseFloat(calcCurrent) / 100).toString();
    updateCalcDisplay();
}

// --- Notes Engine ---
const DEFAULT_NOTES = [
    {
        id: 'arch',
        title: 'Full Stack & MERN Architecture',
        date: 'Oct 16',
        preview: 'Microservices, React 19, Node.js RESTful APIs & AWS Cloud...',
        pinned: true,
        content: `
            <div class="space-y-4 text-sm text-gray-200">
                <div class="flex items-center space-x-2 pb-2 border-b border-white/10">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">ARCHITECTURE NOTE</span>
                    <span class="text-xs text-gray-400">Ranveer Jaiswal • Full Stack Developer</span>
                </div>
                <h2 class="text-xl font-bold text-white">Full Stack & MERN Production Guidelines</h2>
                <p class="text-gray-300 leading-relaxed">Key architectural patterns used across production projects at Branding Pioneers and open source releases:</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div class="p-3 rounded-xl bg-white/5 border border-white/10">
                        <h4 class="font-bold text-sky-400 text-xs mb-1">React 19 & Next.js</h4>
                        <p class="text-[11px] text-gray-300">Server Components (RSC), Suspense streaming, optimistic mutations, and custom hooks with zero-latency state synchronization.</p>
                    </div>
                    <div class="p-3 rounded-xl bg-white/5 border border-white/10">
                        <h4 class="font-bold text-emerald-400 text-xs mb-1">Node.js, Express & Microservices</h4>
                        <p class="text-[11px] text-gray-300">Rate-limiting, JWT authentication, connection pooling, and resilient worker queues for handling concurrent workloads.</p>
                    </div>
                    <div class="p-3 rounded-xl bg-white/5 border border-white/10">
                        <h4 class="font-bold text-amber-400 text-xs mb-1">Docker & Cloud DevOps</h4>
                        <p class="text-[11px] text-gray-300">Multi-stage Dockerfile builds, Docker Compose orchestration, AWS EC2, S3 bucket storage, and CloudFront caching.</p>
                    </div>
                    <div class="p-3 rounded-xl bg-white/5 border border-white/10">
                        <h4 class="font-bold text-purple-400 text-xs mb-1">Databases: MongoDB & PostgreSQL</h4>
                        <p class="text-[11px] text-gray-300">Aggregations, Prisma ORM schema indexing, atomic transactions, and automated database backups.</p>
                    </div>
                </div>
            </div>
        `
    },
    {
        id: 'veer-music',
        title: 'Veer Music (Nothing OS Expo App)',
        date: 'Oct 15',
        preview: 'Expo React Native client with yt-dlp range proxy backend...',
        pinned: true,
        content: `
            <div class="space-y-4 text-sm text-gray-200">
                <div class="flex items-center space-x-2 pb-2 border-b border-white/10">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300">MOBILE APP</span>
                    <span class="text-xs text-gray-400">React Native Expo 54</span>
                </div>
                <h2 class="text-xl font-bold text-white">Veer Music Engineering Journal</h2>
                <p class="text-gray-300 leading-relaxed">Built for Nothing OS with authentic dot-matrix typography, a physics-based 33 RPM spinning vinyl disc, and real-time LRC karaoke lyrics synced with audio scrub position.</p>
                <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-xs text-gray-300">
                    <div><strong>Backend:</strong> Node.js HTTP byte-range proxy caching audio segments using yt-dlp.</div>
                    <div><strong>Audio Engine:</strong> Expo AV with background lock-screen notification controls.</div>
                    <div><strong>Offline Storage:</strong> 200MB Least Recently Used (LRU) audio cache.</div>
                </div>
            </div>
        `
    },
    {
        id: 'webrip',
        title: 'WebRip Scraping Engine',
        date: 'Oct 12',
        preview: 'BFS deep crawl website to ZIP archive with SSE progress...',
        pinned: false,
        content: `
            <div class="space-y-4 text-sm text-gray-200">
                <div class="flex items-center space-x-2 pb-2 border-b border-white/10">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300">CLI & WEBSCRAPING</span>
                    <span class="text-xs text-gray-400">Playwright & Node.js</span>
                </div>
                <h2 class="text-xl font-bold text-white">WebRip Scraper Design</h2>
                <p class="text-gray-300 leading-relaxed">Engineered a complete offline website archiving system. Performs BFS graph traversals, rewrites asset links to relative paths, and outputs a downloadable ZIP archive with real-time SSE progress indicators.</p>
            </div>
        `
    },
    {
        id: 'scratchpad',
        title: '✏️ Interactive Scratchpad (Auto-Saved)',
        date: 'Live',
        preview: 'Type developer thoughts, notes or interview feedback...',
        pinned: false,
        isScratchpad: true
    }
];

let currentSelectedNoteId = 'arch';

function initNotesApp() {
    renderNotesList();
    selectNote('arch');
}

function renderNotesList(filter = '') {
    const listEl = document.getElementById('notes-list-container');
    if (!listEl) return;

    const filtered = DEFAULT_NOTES.filter(n => {
        if (!filter) return true;
        return n.title.toLowerCase().includes(filter.toLowerCase()) || n.preview.toLowerCase().includes(filter.toLowerCase());
    });

    listEl.innerHTML = filtered.map(note => `
        <div class="notes-item ${note.id === currentSelectedNoteId ? 'active' : ''}" onclick="selectNote('${note.id}')">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-white truncate">${note.pinned ? '<i class="fas fa-thumbtack text-[9px] text-amber-400 mr-1"></i>' : ''}${note.title}</span>
                <span class="text-[10px] text-gray-400 shrink-0 ml-1">${note.date}</span>
            </div>
            <p class="text-[11px] text-gray-400 truncate mt-0.5">${note.preview}</p>
        </div>
    `).join('');
}

function selectNote(noteId) {
    currentSelectedNoteId = noteId;
    const pane = document.getElementById('note-view-pane');
    if (!pane) return;

    renderNotesList(document.getElementById('notes-search-input') ? document.getElementById('notes-search-input').value : '');

    const note = DEFAULT_NOTES.find(n => n.id === noteId);
    if (!note) return;

    if (note.isScratchpad) {
        const savedText = localStorage.getItem('ranveer_notes_scratchpad') || 'Type your notes, ideas, or feedback for Ranveer here... (Auto-saved)';
        pane.innerHTML = `
            <div class="h-full flex flex-col justify-between">
                <div class="flex items-center justify-between pb-3 border-b border-white/10">
                    <div>
                        <h2 class="text-lg font-bold text-white flex items-center"><i class="fas fa-edit text-amber-400 mr-2 text-sm"></i> Developer Scratchpad</h2>
                        <span class="text-[11px] text-gray-400">Auto-saved to your browser's local storage</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="copyScratchpad()" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-white transition flex items-center space-x-1">
                            <i class="fas fa-copy text-[10px]"></i>
                            <span>Copy</span>
                        </button>
                        <button onclick="clearScratchpad()" class="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-xs text-red-300 transition">
                            Clear
                        </button>
                    </div>
                </div>
                <textarea id="scratchpad-textarea" class="flex-1 w-full bg-transparent p-3 text-sm text-gray-100 font-mono focus:outline-none resize-none mt-2 leading-relaxed" placeholder="Type notes here..." oninput="localStorage.setItem('ranveer_notes_scratchpad', this.value)">${savedText}</textarea>
            </div>
        `;
    } else {
        pane.innerHTML = note.content;
    }
}

function filterNotes(val) {
    renderNotesList(val);
}

function createNewNote() {
    selectNote('scratchpad');
    const ta = document.getElementById('scratchpad-textarea');
    if (ta) {
        ta.focus();
        showToast('Switched to Developer Scratchpad', 'fas fa-pen');
    }
}

function copyScratchpad() {
    const ta = document.getElementById('scratchpad-textarea');
    if (ta) {
        navigator.clipboard.writeText(ta.value).then(() => {
            showToast('Note copied to clipboard!', 'fas fa-check');
        });
    }
}

function clearScratchpad() {
    const ta = document.getElementById('scratchpad-textarea');
    if (ta) {
        ta.value = '';
        localStorage.removeItem('ranveer_notes_scratchpad');
        showToast('Scratchpad cleared', 'fas fa-trash');
    }
}

// ==========================================================================
// macOS 26 Tahoe Calendar Engine
// ==========================================================================
let calCurrentYear = new Date().getFullYear();
let calCurrentMonth = new Date().getMonth(); // 0-indexed (0 = Jan)
let calSelectedDate = new Date();

const CALENDAR_AGENDA_DATA = {
    defaultEvents: [
        { time: "09:30 AM", title: "Daily Engineering Sync", desc: "Branding Pioneers • Task Tracker & Sprint Progress", color: "bg-[#ff3b30]" },
        { time: "11:00 AM", title: "MERN Stack Code Review", desc: "Babel AST Visualizer & NPM package optimization", color: "bg-blue-500" },
        { time: "02:30 PM", title: "Docker Container Deploy", desc: "AWS EC2 & Redis Cache configuration for microservices", color: "bg-emerald-500" },
        { time: "05:00 PM", title: "Full Stack System Architecture", desc: "PostgreSQL Prisma schema migrations & API latency checks", color: "bg-purple-500" },
        { time: "07:30 PM", title: "SRChess Community Match", desc: "Real-time WebSockets & Stockfish AI match with dev community", color: "bg-amber-500" }
    ]
};

function updateCalendarDatesDisplay(now = new Date()) {
    const daysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysShort = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = daysFull[now.getDay()];
    const dayShort = daysShort[now.getDay()];
    const dateNum = now.getDate();
    const monthName = monthsFull[now.getMonth()];
    const yearNum = now.getFullYear();

    // App Window: Left sidebar big date card
    const calDayNameEl = document.getElementById('cal-today-dayname');
    if (calDayNameEl) calDayNameEl.innerText = dayName;

    const calDateNumEl = document.getElementById('cal-today-datenumber');
    if (calDateNumEl) calDateNumEl.innerText = dateNum;

    const calMonthYearEl = document.getElementById('cal-today-monthyear');
    if (calMonthYearEl) calMonthYearEl.innerText = `${monthName} ${yearNum}`;

    // Desktop Shortcut Icon
    const deskCalDayEl = document.getElementById('desk-cal-day');
    if (deskCalDayEl) deskCalDayEl.innerText = dayShort;

    const deskCalDateEl = document.getElementById('desk-cal-date');
    if (deskCalDateEl) deskCalDateEl.innerText = dateNum;

    // iOS Home Screen Icon
    const iosCalDayEl = document.getElementById('ios-home-cal-day');
    if (iosCalDayEl) iosCalDayEl.innerText = dayShort;

    const iosCalDateEl = document.getElementById('ios-home-cal-date');
    if (iosCalDateEl) iosCalDateEl.innerText = dateNum;
}

function renderCalendarGrid() {
    const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Update Header and Window Title
    const monthTitleEl = document.getElementById('cal-month-title');
    if (monthTitleEl) {
        monthTitleEl.innerText = `${monthsFull[calCurrentMonth]} ${calCurrentYear}`;
    }

    const gridEl = document.getElementById('cal-days-grid');
    if (!gridEl) return;

    const today = new Date();
    const firstDayIndex = new Date(calCurrentYear, calCurrentMonth, 1).getDay();
    const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(calCurrentYear, calCurrentMonth, 0).getDate();

    let gridHtml = '';

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const prevDayNum = prevMonthDays - i;
        gridHtml += `
            <div class="cal-day-cell other-month" onclick="calendarPrevMonth()">
                <div class="cal-day-num">${prevDayNum}</div>
            </div>
        `;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = (day === today.getDate() && calCurrentMonth === today.getMonth() && calCurrentYear === today.getFullYear());
        const isSelected = (calSelectedDate && day === calSelectedDate.getDate() && calCurrentMonth === calSelectedDate.getMonth() && calCurrentYear === calSelectedDate.getFullYear());

        let dotsHtml = '';
        if (day % 3 === 0 || isToday) {
            dotsHtml = `
                <div class="cal-day-dots">
                    <span class="cal-event-dot dot-work"></span>
                    <span class="cal-event-dot dot-dev"></span>
                    ${day % 2 === 0 ? '<span class="cal-event-dot dot-interview"></span>' : ''}
                </div>
            `;
        }

        gridHtml += `
            <div class="cal-day-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" onclick="selectCalendarDate(${day})">
                <div class="cal-day-num">${day}</div>
                ${dotsHtml}
            </div>
        `;
    }

    // Next month leading days (fill out remaining cells to 35 or 42)
    const totalCells = firstDayIndex + daysInMonth;
    const remainingCells = (totalCells <= 35 ? 35 : 42) - totalCells;
    for (let j = 1; j <= remainingCells; j++) {
        gridHtml += `
            <div class="cal-day-cell other-month" onclick="calendarNextMonth()">
                <div class="cal-day-num">${j}</div>
            </div>
        `;
    }

    gridEl.innerHTML = gridHtml;
    renderCalendarAgenda(calSelectedDate || today);
}

function selectCalendarDate(day) {
    calSelectedDate = new Date(calCurrentYear, calCurrentMonth, day);
    renderCalendarGrid();
}

function calendarGoToday() {
    const now = new Date();
    calCurrentYear = now.getFullYear();
    calCurrentMonth = now.getMonth();
    calSelectedDate = new Date();
    renderCalendarGrid();
    updateCalendarDatesDisplay(now);
    showToast('Navigated to Today', 'far fa-calendar-check');
}

function calendarPrevMonth() {
    calCurrentMonth--;
    if (calCurrentMonth < 0) {
        calCurrentMonth = 11;
        calCurrentYear--;
    }
    renderCalendarGrid();
}

function calendarNextMonth() {
    calCurrentMonth++;
    if (calCurrentMonth > 11) {
        calCurrentMonth = 0;
        calCurrentYear++;
    }
    renderCalendarGrid();
}

function renderCalendarAgenda(date) {
    const agendaEl = document.getElementById('cal-agenda-list');
    if (!agendaEl) return;

    const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const formatted = `${daysShort[date.getDay()]}, ${monthsShort[date.getMonth()]} ${date.getDate()}`;
    const events = CALENDAR_AGENDA_DATA.defaultEvents;

    agendaEl.innerHTML = `
        <div class="text-[11px] font-semibold text-gray-400 mb-2 pb-1 border-b border-white/10 flex items-center justify-between">
            <span>${formatted}</span>
            <span class="text-[10px] text-red-400 font-mono">${events.length} Events</span>
        </div>
        ${events.map(ev => `
            <div class="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer" onclick="showToast('${ev.title}', 'far fa-calendar')">
                <div class="flex items-center space-x-2">
                    <span class="w-2 h-2 rounded-full ${ev.color} shrink-0"></span>
                    <span class="text-xs font-bold text-white truncate">${ev.title}</span>
                </div>
                <div class="text-[10px] text-gray-400 mt-1 pl-4 flex items-center justify-between">
                    <span>${ev.desc}</span>
                    <span class="font-mono text-gray-500 shrink-0 ml-1">${ev.time}</span>
                </div>
            </div>
        `).join('')}
    `;
}

// --- Terminal System Simulation ---
const fileSystem = {
    "about_developer.txt": "Ranveer Jaiswal\nFULL STACK / MERN DEVELOPER\nLocation: Gurgaon, India\nPhone: +91 9648165493\nEmail: ranveerjais9984@gmail.com\nCurrent Role: Full Stack App/Web Developer at Branding Pioneers",
    "skills.txt": "[Databases]            MongoDB, PostgreSQL, Prisma\n[Frameworks/Libs]      React.js, Next.js, Tailwind CSS, Bootstrap, Astro, Express\n[Languages]            JavaScript, C++, Java, Python, PHP\n[DevOps & Cloud]       Docker, AWS (EC2, S3, Lambda, CloudFront)\n[Tools & Platforms]    React Native, Ionic Framework, GitHub, Postman, Twilio\n[Soft Skills]          Critical Thinking, Collaboration, Problem Solving, Teamwork, Adaptability",

    "experience.txt": "1. Full Stack App/Web Developer (Full-time) | Branding Pioneers (Mar 2026 - Present, Hybrid Gurgaon)\n   - Developed multiple client websites to enhance online presence.\n   - Created internal tools and automation solutions streamlining workflows.\n   - Implemented an Employee Task Tracker, increasing efficiency by 50%.\n   - Stack: React, Next.js, Astro, PHP, Express, React Native\n\n2. Full Stack / MERN Developer Intern | Branding Pioneers (Sep 2025 - Mar 2026, On-site Gurgaon)\n   - Developed multi-module internal platforms and client projects with Node.js, Express, React.\n   - Engineered custom App Scripts, WhatsApp automation, and internal APIs.\n   - Achieved 60% reduction in manual work across departments.",
    "education.txt": "Krishnarpit Institute of Technology | Prayagraj\nDegree: Bachelor of Pharmacy (B. Pharm) (2021 - 2025)\nCGPA: 7.0 / 10",
    "projects": {
        "fullstack_visualiser.txt": "> fullstack-code-visualiser (MERN Stack Visualizer)\n  NPM:       https://www.npmjs.com/package/fullstack-code-visualiser\n  Repo:      https://github.com/Rvjais/fullstack-code-visualiser\n  CLI:       npm install -g fullstack-code-visualiser && mern-visualizer scan\n  Stack:     React, Node.js, Express, Fastify, Next.js, MongoDB, Babel AST\n  Desc:      Automated full-stack architecture mapping and observability tool. Parses ASTs and monitors live traffic to generate interactive graphs from UI down to MongoDB schemas.",
        "pioneeros.txt": "> PioneerOS (Jan 2023 - Oct 2023)\n  Stack: React, Next.js, Node.js, Prisma, PostgreSQL\n  Desc:  Multi-module internal platform featuring project management, messaging, and responsive dashboards. Queue system implemented for multi-user performance.",
        "hr_buddy.txt": "> HR-Buddy (AI Onboarding System)\n  Live Demo: https://hr-buddy-beta.vercel.app/\n  Stack:     React, Node.js\n  Desc:      AI-driven employee onboarding quiz system with integrated anti-cheat mechanism for candidate pre-assessments.",
        "srchess.txt": "> SRChess (Interactive Chess Platform)\n  Live Demo: https://srchess.vercel.app/\n  Stack:     React, Tailwind CSS, Game Logic\n  Desc:      Responsive interactive online chess web application featuring custom board logic and real-time move validation.",
        "rain_crm.txt": "> Rain CRM (Jan 2023 - Oct 2023)\n  Stack: React, Node.js, Express, MongoDB\n  Desc:  Full-featured CRM with AI WhatsApp bots for numerical extraction to spreadsheets, in-app Twilio calling, and web-form-to-WhatsApp automation. Native AI email client prioritizing messages to WhatsApp.",
        "stock_mgmt.txt": "> Stock Management System (Qt / C++)\n  Desc:  Robust GUI-based hobby project built using Qt library, focused on object-oriented programming, file handling, and efficient data structuring.",
        "nothing_veer.txt": "> Veer Music — Nothing OS Music App\n  Repo: https://github.com/Rvjais/Nothing-Veer\n  Stack: Expo 54, React Native 0.81, Node 22, yt-dlp, Zustand\n  Desc: Nothing OS-style YouTube Music client + proxy. Vinyl player, synced LRC lyrics tap-to-seek, downloads + smart cache, offline mode, AMOLED + Glyph EQ. Features save data, enable sing-along, offline metro use.",
        "ranveer_echo.txt": "> RANVEER H.U.D. — Desktop AI Assistant\n  Repo: https://github.com/Rvjais/Ranveer_Echo\n  Stack: Tauri v2, Rust Tokio, Vanilla JS, OpenCV, Ollama\n  Desc: Jarvis-style assistant. ReAct chat, voice wake-word Ranveer + PTT, face LBPH + hand pinch, SQLite memory, computer control, Kasa smart-home, DEPLOY agent queue.",
        "web_ripper.txt": "> WebRip — Full Website Scraper\n  Repo: https://github.com/Rvjais/Web-Scrapper\n  Stack: Python 3.11, Flask, Playwright Chromium, Gunicorn Gevent\n  Desc: BFS crawl to offline ZIP. 3 modes full/single/discover, SPA DOM snapshot, anti-bot CDP + cookies, utm strip + relink, live SSE, Render deploy.",
        "srchess_rebuild.txt": "> SR Chess Academy — 3D Rebuild\n  Repo: https://github.com/Rvjais/Srchess\n  Live: https://srchess.vercel.app/\n  Stack: Vanilla JS, Vite 8, Three.js 0.185\n  Desc: 25 pages + 17 blogs + GLB hero scroll phases, GM coach slider, shop cart Rs localStorage, 10-Q stress test, OTP mock. For WIM Shivika Rohilla academy.",
        "textlens.txt": "> TextLens — Privacy OCR Sheet\n  Repo: https://github.com/Rvjais/OCR-SHEET\n  Live: https://ocr-sheet-topaz.vercel.app\n  Stack: Vanilla JS, FastAPI, PaddleOCRv5, Docker\n  Desc: Batch image/PDF to text. Browser Tesseract printed + backend handwriting, hybrid PDF merge, confidence <85 flagged, DeepSeek invoice to JSON/CSV, no-logging privacy.",
        "aicrmz.txt": "> AICRMZ — WhatsApp AI CRM\n  Repo: https://github.com/Rvjais/AI-CRM\n  Live: https://in.aicrmz.com API https://api.aicrmz.com\n  Stack: React 19, Express 4, MongoDB Atlas, Baileys 6.7, Socket.io\n  Desc: Multi-tenant WhatsApp via QR. AI auto-reply + sentiment, campaigns queue, follow-ups, CSV import, Gmail/Sheets, Twilio + Bolna voice, Cloudinary, Ionic mobile."
    },
    "contact.txt": "Email:    ranveerjais9984@gmail.com\nPhone:    +91 9648165493\nLocation: Gurgaon, India\nResume:   ranveer_jaiswal.pdf\nGitHub:   github.com/Rvjais\nLinkedIn: linkedin.com"
};

let currentDir = fileSystem;
let currentPath = "~";

function executeTerminalCommand(cmdLine) {
    const termOutput = document.getElementById('term-output');
    const terminalBody = document.getElementById('terminal-body');
    if (!termOutput) return;

    const trimmed = cmdLine.trim();
    termOutput.innerHTML += `<div class="mt-1"><span class="text-blue-400 font-bold">guest@dev:${currentPath}$</span> <span class="text-white">${trimmed}</span></div>`;

    if (trimmed) {
        processCommand(trimmed);
    }

    setTimeout(() => {
        if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
    }, 10);
}

function processCommand(cmdStr) {
    const termOutput = document.getElementById('term-output');
    const args = cmdStr.split(' ').filter(Boolean);
    const cmd = args[0].toLowerCase();
    const arg = args[1];

    switch(cmd) {
        case 'help':
            termOutput.innerHTML += `<div class="text-gray-300 ml-3 my-2 space-y-1 text-xs md:text-sm">
                <div><span class="text-green-400 font-semibold w-20 inline-block">ls</span>- List files & directories</div>
                <div><span class="text-green-400 font-semibold w-20 inline-block">cd</span>- Navigate directory (e.g. cd projects, cd ..)</div>
                <div><span class="text-green-400 font-semibold w-20 inline-block">cat</span>- Read file content (e.g. cat skills.txt)</div>
                <div><span class="text-green-400 font-semibold w-20 inline-block">open</span>- Open GUI app (e.g. open about, open contact)</div>
                <div><span class="text-green-400 font-semibold w-20 inline-block">clear</span>- Clear terminal screen</div>
                <div><span class="text-green-400 font-semibold w-20 inline-block">whoami</span>- Display current active user</div>
            </div>`;
            break;

        case 'ls':
            let output = '<div class="flex flex-wrap gap-4 ml-3 my-1">';
            for (const key in currentDir) {
                if (typeof currentDir[key] === 'object') {
                    output += `<span class="text-blue-400 font-semibold flex items-center cursor-pointer hover:underline" onclick="runQuickCommand('cd ${key}')"><i class="fas fa-folder mr-1.5"></i>${key}/</span>`;
                } else {
                    output += `<span class="text-gray-300 flex items-center cursor-pointer hover:text-white" onclick="runQuickCommand('cat ${key}')"><i class="fas fa-file-code mr-1.5 text-gray-500"></i>${key}</span>`;
                }
            }
            output += '</div>';
            termOutput.innerHTML += output;
            break;

        case 'cd':
            if (!arg || arg === '~' || arg === '/') {
                currentDir = fileSystem;
                currentPath = "~";
                updatePrompt();
            } else if (arg === '..') {
                currentDir = fileSystem;
                currentPath = "~";
                updatePrompt();
            } else if (currentDir[arg] && typeof currentDir[arg] === 'object') {
                currentDir = currentDir[arg];
                currentPath = `~/${arg}`;
                updatePrompt();
            } else {
                termOutput.innerHTML += `<div class="text-red-400 ml-3 my-1">cd: no such file or directory: ${arg}</div>`;
            }
            break;

        case 'cat':
            if (!arg) {
                termOutput.innerHTML += `<div class="text-red-400 ml-3 my-1">cat: specify a filename to view</div>`;
            } else if (currentDir[arg] && typeof currentDir[arg] === 'string') {
                const formatted = currentDir[arg].replace(/\n/g, '<br>');
                termOutput.innerHTML += `<div class="text-green-300 ml-3 my-1 border-l-2 border-emerald-500/60 pl-3 py-1 bg-white/5 rounded-r">${formatted}</div>`;
            } else if (currentDir[arg] && typeof currentDir[arg] === 'object') {
                termOutput.innerHTML += `<div class="text-yellow-400 ml-3 my-1">cat: ${arg}: Is a directory. Use 'cd ${arg}' instead.</div>`;
            } else {
                termOutput.innerHTML += `<div class="text-red-400 ml-3 my-1">cat: ${arg}: No such file</div>`;
            }
            break;

        case 'open':
            if (['about', 'projects', 'skills', 'contact', 'gallery'].includes(arg)) {
                openApp(arg);
                termOutput.innerHTML += `<div class="text-blue-300 ml-3 my-1">Launching application: ${arg}...</div>`;
            } else if (['readme', 'visualizer', 'fullstack-code-visualiser'].includes(arg)) {
                openReadmeModal('fullstack-code-visualiser');
                termOutput.innerHTML += `<div class="text-emerald-300 ml-3 my-1">Opening fullstack-code-visualiser README...</div>`;
            } else if (['folder', 'projects-folder'].includes(arg)) {
                openFolderModal();
                termOutput.innerHTML += `<div class="text-amber-300 ml-3 my-1">Opening Projects Folder...</div>`;
            } else {
                termOutput.innerHTML += `<div class="text-red-400 ml-3 my-1">open: available targets: about, projects, skills, contact, gallery, readme, folder</div>`;
            }
            break;

        case 'clear':
            termOutput.innerHTML = '';
            break;

        case 'whoami':
            termOutput.innerHTML += `<div class="text-yellow-300 ml-3 my-1">ranveer_jaiswal (Full Stack / MERN Developer — Branding Pioneers, Gurgaon)</div>`;
            break;

        default:
            termOutput.innerHTML += `<div class="text-red-400 ml-3 my-1">zsh: command not found: ${cmd}. Type 'help' for available commands.</div>`;
    }
}

function updatePrompt() {
    const promptEl = document.getElementById('term-prompt');
    if (promptEl) {
        promptEl.innerHTML = `guest@dev:${currentPath}$`;
    }
}

// --- README Viewer System ---
const projectReadmes = {
    "fullstack-code-visualiser": {
        title: "fullstack-code-visualiser",
        subtitle: "npm install -g fullstack-code-visualiser",
        npmUrl: "https://www.npmjs.com/package/fullstack-code-visualiser",
        githubUrl: "https://github.com/Rvjais/fullstack-code-visualiser",
        content: `
            <h1>fullstack-code-visualiser</h1>
            <p><strong>Automated MERN & Full-Stack Architecture Mapping and Observability Tool</strong></p>
            <blockquote>
                Published on npm as <code>fullstack-code-visualiser</code>. Built by Ranveer Jaiswal. Automatically parses codebases using Abstract Syntax Trees (AST) and observes live server traffic to generate real-time interactive architecture graphs from the UI layer down to the database schema.
            </blockquote>

            <h2>🚀 Key Features</h2>
            <ul>
                <li><strong>Universal Framework Support:</strong> Works out-of-the-box with Express, Fastify, Next.js, React, and MongoDB schemas.</li>
                <li><strong>UI-to-API Linkage:</strong> Automatically detects and visually maps which React/Next.js frontend components trigger specific backend API route handlers.</li>
                <li><strong>Live Pulse Traffic Engine:</strong> Visually highlights and animates routing nodes in real time as requests strike your server.</li>
                <li><strong>Deep Trace Path Highlighting:</strong> Click any component, route, or database model to trace its complete downstream dependency pathway (<code>UI ➔ Route ➔ Controller ➔ DB</code>).</li>
                <li><strong>Live Database Schema Inference:</strong> Scans database collections, models, and relations via the optional <code>--db</code> parameter.</li>
                <li><strong>Dead Route & Ghost Code Detection:</strong> Instantly pinpoints orphan routes, unlinked handlers, and unused API endpoints.</li>
            </ul>

            <h2>📦 Quick Start & Installation</h2>
            <p>Install the package globally from npm using Node.js / npm:</p>
            <pre>npm install -g fullstack-code-visualiser</pre>

            <h2>⚡ Scanning a Full-Stack Project</h2>
            <p>Navigate to your repository or workspace directory and launch the scanner:</p>
            <pre>cd /path/to/your/mern-project
mern-visualizer scan</pre>

            <p>To include database schema analysis:</p>
            <pre>mern-visualizer scan --db</pre>

            <h2>🌐 Interactive Visualization Dashboard</h2>
            <p>Once the scanner finishes its AST analysis, launch or open your browser at:</p>
            <pre>http://localhost:3000</pre>

            <h2>🛠️ Technical Architecture & Stack</h2>
            <ul>
                <li><strong>AST Parser:</strong> Babel Parser (<code>@babel/parser</code>, <code>@babel/traverse</code>) for static JavaScript and TypeScript AST inspection.</li>
                <li><strong>Runtime Tracer:</strong> Lightweight Express/Fastify middleware hook for capturing live route executions without overhead.</li>
                <li><strong>Visualization Core:</strong> Interactive graph layout engine with dynamic node physics, zoom, pan, and cluster filtering.</li>
                <li><strong>Database Inspection:</strong> Mongoose schema introspection and automated schema extraction.</li>
            </ul>

            <h2>🔗 Project Links</h2>
            <p>
                • <strong>NPM Package:</strong> <a href="https://www.npmjs.com/package/fullstack-code-visualiser" target="_blank" class="text-blue-400 hover:underline">npmjs.com/package/fullstack-code-visualiser</a><br>
                • <strong>GitHub Repository:</strong> <a href="https://github.com/Rvjais/fullstack-code-visualiser" target="_blank" class="text-blue-400 hover:underline">github.com/Rvjais/fullstack-code-visualiser</a><br>
                • <strong>Author:</strong> Ranveer Jaiswal (<a href="https://github.com/Rvjais" target="_blank" class="text-blue-400 hover:underline">@Rvjais</a>)
            </p>
        `
    },
    "nothing-veer": {
        title: "Nothing-Veer — Veer Music",
        subtitle: "Expo + yt-dlp Range Proxy Music App",
        npmUrl: "",
        githubUrl: "https://github.com/Rvjais/Nothing-Veer",
        content: `
            <h1>Veer Music — Nothing OS Style Music App</h1>
            <p><strong>Audiophile YouTube Music Client & yt-dlp Range Proxy built with React Native Expo 54 and Node.js 22.</strong></p>

            <div class="mb-3">
                <span class="readme-hero-badge bg-red-500/20 text-red-400 border border-red-500/30"><i class="fas fa-music mr-1"></i> React Native Expo</span>
                <span class="readme-hero-badge bg-zinc-800 text-gray-200 border border-zinc-700"><i class="fas fa-circle-notch mr-1"></i> Nothing OS Dot-Matrix</span>
                <span class="readme-hero-badge bg-purple-500/20 text-purple-300 border border-purple-500/30"><i class="fas fa-sliders-h mr-1"></i> Opus 160k / AAC 128k</span>
                <span class="readme-hero-badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><i class="fas fa-download mr-1"></i> Smart Offline Cache</span>
                <span class="readme-hero-badge bg-blue-500/20 text-blue-300 border border-blue-500/30"><i class="fab fa-youtube mr-1"></i> YouTube Session Sync</span>
            </div>

            <blockquote>
                Engineered with a minimalist Nothing OS aesthetic (Obsidian AMOLED and Ghost White Liquid Glass). Combines a physical vinyl turntable player with real-time synchronized LRC lyrics, multi-lingual font rendering, lossless/high-bitrate Opus streaming, and smart offline caching for metro and airplane travel.
            </blockquote>

            <h2>📸 Visual Screenshot Showcase & Architecture</h2>
            <p class="text-xs text-gray-400">Click any screenshot to zoom and inspect the UI layout in detail.</p>

            <div class="readme-screenshot-grid">
                <!-- Screen 1: Vinyl Player -->
                <div class="readme-screenshot-card">
                    <div class="readme-screenshot-img-wrap" onclick="openGalleryLightbox('proj-veer-1')">
                        <img src="assets/VEER-MUSIC/Screenshot_20261016-113318.png" alt="Veer Music Vinyl Player" loading="lazy">
                    </div>
                    <div class="readme-screenshot-caption">
                        <h4><span><i class="fas fa-record-vinyl text-red-500 mr-1.5"></i> Vinyl Turntable Player</span> <span class="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-mono">NOW PLAYING</span></h4>
                        <p>Interactive rotating vinyl disc with dynamic album art center label, real-time scrubber timeline, quick-add playlist, heart favorite, and 1-tap lyrics karaoke toggle.</p>
                    </div>
                </div>

                <!-- Screen 2: Synced Lyrics -->
                <div class="readme-screenshot-card">
                    <div class="readme-screenshot-img-wrap" onclick="openGalleryLightbox('proj-veer-2')">
                        <img src="assets/VEER-MUSIC/Screenshot_20261016-113332.png" alt="Veer Music Synchronized Lyrics" loading="lazy">
                    </div>
                    <div class="readme-screenshot-caption">
                        <h4><span><i class="fas fa-microphone-alt text-purple-400 mr-1.5"></i> Real-Time Synced Lyrics</span> <span class="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">LRC KARAOKE</span></h4>
                        <p>Word-for-word and line-by-line live synchronized lyrics with active glowing highlight. Supports multi-lingual Hindi/Urdu/English unicode glyphs with tap-to-seek timestamp jumping.</p>
                    </div>
                </div>

                <!-- Screen 3: Home Dashboard -->
                <div class="readme-screenshot-card">
                    <div class="readme-screenshot-img-wrap" onclick="openGalleryLightbox('proj-veer-3')">
                        <img src="assets/VEER-MUSIC/Screenshot_20261016-113243.png" alt="Veer Music Home Dashboard" loading="lazy">
                    </div>
                    <div class="readme-screenshot-caption">
                        <h4><span><i class="fas fa-home text-blue-400 mr-1.5"></i> Home Dashboard</span> <span class="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">DISCOVERY</span></h4>
                        <p>Signature Nothing OS dot-matrix dashboard with live YouTube session connection, "12 Saved • Offline ready" counter, and Fresh & Trending Quick Picks carousel.</p>
                    </div>
                </div>

                <!-- Screen 4: Search & Discovery -->
                <div class="readme-screenshot-card">
                    <div class="readme-screenshot-img-wrap" onclick="openGalleryLightbox('proj-veer-4')">
                        <img src="assets/VEER-MUSIC/Screenshot_20261016-113255.png" alt="Veer Music Search" loading="lazy">
                    </div>
                    <div class="readme-screenshot-caption">
                        <h4><span><i class="fas fa-search text-emerald-400 mr-1.5"></i> Search & 1-Tap Download</span> <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">FAST CACHE</span></h4>
                        <p>Instant typeahead search with filter pills for SONGS, ALBUMS, ARTISTS. Features direct 1-tap download buttons right on the search results for instantaneous offline saving.</p>
                    </div>
                </div>

                <!-- Screen 5: Settings & Bitrate Selection -->
                <div class="readme-screenshot-card">
                    <div class="readme-screenshot-img-wrap" onclick="openGalleryLightbox('proj-veer-5')">
                        <img src="assets/VEER-MUSIC/Screenshot_20261016-113305.png" alt="Veer Music Settings" loading="lazy">
                    </div>
                    <div class="readme-screenshot-caption">
                        <h4><span><i class="fas fa-sliders-h text-amber-400 mr-1.5"></i> Audiophile Bitrates & Themes</span> <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">SETTINGS</span></h4>
                        <p>Granular stream bitrate selector: High Quality (Opus 160kbps / AAC 128kbps), Balanced (128kbps), and Data Saver (Opus 70kbps). Theme switcher for Dark AMOLED Obsidian Black vs Ghost White.</p>
                    </div>
                </div>

                <!-- Screen 6: Metadata & Source -->
                <div class="readme-screenshot-card">
                    <div class="readme-screenshot-img-wrap" onclick="openGalleryLightbox('proj-veer-6')">
                        <img src="assets/VEER-MUSIC/Screenshot_20261016-113321.png" alt="Veer Music Track Details" loading="lazy">
                    </div>
                    <div class="readme-screenshot-caption">
                        <h4><span><i class="fas fa-info-circle text-sky-400 mr-1.5"></i> Track Metadata & Source</span> <span class="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">ID3 & YOUTUBE</span></h4>
                        <p>Full metadata inspector with high-res cover art, artist credits, duration, YouTube Video ID (e.g. Q2U8Qk80-Es), global stream catalog reference, and native OS share integration.</p>
                    </div>
                </div>
            </div>

            <h2>✨ Comprehensive Feature Breakdown</h2>
            <div class="readme-feature-grid">
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-red-500/20 text-red-400"><i class="fas fa-compact-disc"></i></div>
                        <h4>Vinyl Turntable UI Physics</h4>
                    </div>
                    <p>Smooth 33 RPM rotating vinyl disc animation synced with audio playback state. Center album label dynamically loads high-resolution artwork with subtle ambient shadow lighting.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-purple-500/20 text-purple-400"><i class="fas fa-align-left"></i></div>
                        <h4>Synchronized LRC Karaoke Lyrics</h4>
                    </div>
                    <p>Integrated with LRCLIB & YouTube subtitle streams to render timed lyrics. Active vocal phrases highlight with an electric glow, and tapping any verse scrubs track position instantly.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-amber-500/20 text-amber-400"><i class="fas fa-wave-square"></i></div>
                        <h4>Triple-Tier Audiophile Bitrates</h4>
                    </div>
                    <p>Choose between Studio High Quality (Opus 160kbps / AAC 128kbps) for Hi-Fi listening, Balanced (128kbps), or Data Saver (Opus 70kbps) to conserve cellular data while roaming.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-emerald-500/20 text-emerald-400"><i class="fas fa-cloud-download-alt"></i></div>
                        <h4>Smart LRU Cache & Offline Storage</h4>
                    </div>
                    <p>Persistent 1-click track downloads alongside an automatic 50MB/200MB/500MB Least Recently Used (LRU) buffer for uninterrupted listening in underground subways or flights.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-blue-500/20 text-blue-400"><i class="fab fa-youtube"></i></div>
                        <h4>YouTube Session Cookie Proxy</h4>
                    </div>
                    <p>Optional YouTube cookie persistence via secure WebView handshake, preventing 401/403 bot blocks and granting access to personalized algorithmic recommendations and playlists.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-zinc-500/20 text-gray-300"><i class="fas fa-moon"></i></div>
                        <h4>AMOLED Obsidian & Ghost White</h4>
                    </div>
                    <p>True #000000 black theme maximizes battery life on OLED displays, paired with Nothing OS dot-matrix typography and minimalist geometric glyphs.</p>
                </div>
            </div>

            <h2>🚀 Installation & Local Development</h2>
            <p>To run both the React Native Expo client and Node.js backend proxy locally:</p>
            <pre># 1. Start Node.js yt-dlp Range Proxy Backend
cd backend
npm install
npm start

# 2. Start Expo React Native Frontend
cd ../frontend
npm install
npx expo start</pre>

            <h2>🔗 Repository & Links</h2>
            <p>
                • <strong>GitHub Repository:</strong> <a href="https://github.com/Rvjais/Nothing-Veer" target="_blank" class="text-blue-400 hover:underline">github.com/Rvjais/Nothing-Veer</a><br>
                • <strong>Developer:</strong> Ranveer Jaiswal (<a href="https://github.com/Rvjais" target="_blank" class="text-blue-400 hover:underline">@Rvjais</a>)
            </p>
        `
    },
    "ranveer-echo": {
        title: "Ranveer_Echo — H.U.D. Assistant",
        subtitle: "Tauri v2 + Rust + Python vision",
        npmUrl: "",
        githubUrl: "https://github.com/Rvjais/Ranveer_Echo",
        content: `
            <h1>RANVEER H.U.D. — Jarvis Desktop Assistant</h1>
            <p><strong>Tauri 1100x720 HUD. ReAct chat, voice, face + hands, memory, computer control.</strong></p>
            <h2>✨ Features & How they help</h2>
            <ul>
                <li><strong>Streaming ReAct chat:</strong> 3-step tool loop — weather + open maps in one prompt.</li>
                <li><strong>Voice wake-word Ranveer + SPACE PTT:</strong> SAPI barge-in — hands-free cooking/coding.</li>
                <li><strong>Face LBPH + hand pinch:</strong> Auto-login, touchless click for presentations.</li>
                <li><strong>SQLite memory:</strong> Remembers birthday/projects — export to Desktop JSON.</li>
                <li><strong>Computer control:</strong> Open/type/click/screenshot/volume/files/browser/reminders.</li>
                <li><strong>Kasa + DEPLOY agent:</strong> Lights + background task queue while you work.</li>
            </ul>
            <h2>🚀 Run</h2>
            <pre>pip install -r requirements.txt\nollama pull qwen3-vl:2b\nnpm install\nnpx tauri dev</pre>
            <p>• <strong>GitHub:</strong> <a href="https://github.com/Rvjais/Ranveer_Echo" target="_blank" class="text-blue-400 hover:underline">Rvjais/Ranveer_Echo</a></p>
        `
    },
    "web-ripper": {
        title: "Web-Scrapper — WebRip",
        subtitle: "Flask + Playwright BFS to ZIP Cloner",
        npmUrl: "",
        githubUrl: "https://github.com/Rvjais/Web-Scrapper",
        content: `
            <h1>WebRip — Full-Spectrum Website Scraper & Offline Cloner</h1>
            <p><strong>High-performance BFS Web Crawler and Offline Archive Generator built with Python 3.11, Flask, Playwright Chromium, and Server-Sent Events (SSE).</strong></p>

            <div class="mb-3">
                <span class="readme-hero-badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><i class="fas fa-spider mr-1"></i> BFS Deep Crawler</span>
                <span class="readme-hero-badge bg-blue-500/20 text-blue-300 border border-blue-500/30"><i class="fas fa-window-restore mr-1"></i> Playwright Chromium SPA</span>
                <span class="readme-hero-badge bg-amber-500/20 text-amber-300 border border-amber-500/30"><i class="fas fa-shield-alt mr-1"></i> Anti-Bot CDP :9222</span>
                <span class="readme-hero-badge bg-purple-500/20 text-purple-300 border border-purple-500/30"><i class="fas fa-file-archive mr-1"></i> Offline ZIP & Asset Rewriter</span>
                <span class="readme-hero-badge bg-teal-500/20 text-teal-300 border border-teal-500/30"><i class="fas fa-stream mr-1"></i> Live SSE Progress Stream</span>
            </div>

            <blockquote>
                Scrape any website, page by page. Clones entire modern web applications—including JavaScript SPAs (React, Vue, Next.js)—by executing headless browser automation, remapping relative hyperlinks, and packaging assets into an offline-browseable ZIP bundle with zero server dependencies.
            </blockquote>

            <h2>📸 Visual Screenshot Showcase & Architecture</h2>
            <p class="text-xs text-gray-400">Click either screenshot to inspect the dark and light console interfaces.</p>

            <div class="readme-screenshot-grid">
                <!-- Screen 1: Dark Mode -->
                <div class="readme-screenshot-card">
                    <div class="readme-screenshot-img-wrap" onclick="openGalleryLightbox('proj-webrip-1')">
                        <img src="assets/Web-Scrapper/darkmode.png" alt="WebRip Dark Mode Console" loading="lazy">
                    </div>
                    <div class="readme-screenshot-caption">
                        <h4><span><i class="fas fa-moon text-emerald-400 mr-1.5"></i> Dark Mode Scraper Console</span> <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">OBSIDIAN NEON</span></h4>
                        <p>Main extraction dashboard showing Crawl Mode (Full Site, Single Page, Discover Links), BFS Depth limits (0-20), Max Pages (1-5000), Content Extractors (HTML, Media, CSS/JS, Fonts), and real-time SSE progress telemetry.</p>
                    </div>
                </div>

                <!-- Screen 2: Light Mode -->
                <div class="readme-screenshot-card">
                    <div class="readme-screenshot-img-wrap" onclick="openGalleryLightbox('proj-webrip-2')">
                        <img src="assets/Web-Scrapper/lightmode.png" alt="WebRip Light Mode Console" loading="lazy">
                    </div>
                    <div class="readme-screenshot-caption">
                        <h4><span><i class="fas fa-sun text-amber-400 mr-1.5"></i> Light Mode Interface</span> <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">HIGH CONTRAST</span></h4>
                        <p>Clean high-contrast theme showing single-click ZIP archive packaging, Playwright rendering toggle, anti-bot Cloudflare manual challenge wait solver, and real-time download logs.</p>
                    </div>
                </div>
            </div>

            <h2>✨ Deep Architectural Capabilities</h2>
            <div class="readme-feature-grid">
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-emerald-500/20 text-emerald-400"><i class="fas fa-sitemap"></i></div>
                        <h4>BFS Deep Crawl Algorithm</h4>
                    </div>
                    <p>Breadth-First Search (BFS) spider traverses internal links level by level. Enforces configurable depth limits (0 to 20 tiers) and page limits (up to 5,000 pages) to prevent infinite loops or crawler traps.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-blue-500/20 text-blue-400"><i class="fas fa-code"></i></div>
                        <h4>Headless Playwright Chromium (SPA Fix)</h4>
                    </div>
                    <p>Solves the blank-screen issue in dynamic JavaScript SPAs (React, Angular, Vue, Next.js). Automatically scrolls down the page to trigger lazy-loaded assets and captures the fully rendered post-hydration DOM snapshot.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-amber-500/20 text-amber-400"><i class="fas fa-user-shield"></i></div>
                        <h4>Anti-Bot & Cloudflare Bypass (CDP :9222)</h4>
                    </div>
                    <p>Connects via Chrome DevTools Protocol to your running local browser. Injects authenticated session cookies and pauses the crawler to let you solve Turnstile/Cloudflare captchas before resuming automation.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-purple-500/20 text-purple-400"><i class="fas fa-link"></i></div>
                        <h4>100% Offline URL & Asset Rewriting</h4>
                    </div>
                    <p>Rewrites internal hyperlinks to relative paths with clean <code>a__b.html</code> slugging. Rewrites image <code>srcset</code> attributes and CSS <code>url(...)</code> references so the site works straight out of the ZIP file without any server.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-teal-500/20 text-teal-400"><i class="fas fa-satellite-dish"></i></div>
                        <h4>Real-Time SSE Telemetry Stream</h4>
                    </div>
                    <p>Uses Server-Sent Events to stream live download stats, active queue count, bandwidth usage, and console logging directly into the web UI without polling.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-indigo-500/20 text-indigo-400"><i class="fas fa-file-archive"></i></div>
                        <h4>One-Click Offline ZIP Bundle</h4>
                    </div>
                    <p>Compacts all extracted HTML, CSS, JavaScript, media, and fonts into a portable ZIP archive. Includes bundled <code>serve.py</code> and <code>OPEN_SITE.bat</code> scripts for instant one-click local previews.</p>
                </div>
            </div>

            <h2>🚀 Installation & Quick Start</h2>
            <p>Run WebRip locally on Python 3.11+:</p>
            <pre># 1. Clone repository and install dependencies
git clone https://github.com/Rvjais/Web-Scrapper.git
cd Web-Scrapper
pip install -r requirements.txt

# 2. Install Playwright Chromium headless engine
python -m playwright install chromium

# 3. Launch the web application
python app.py
# Open http://localhost:5000 in your browser</pre>

            <h2>🔗 Repository & Links</h2>
            <p>
                • <strong>GitHub Repository:</strong> <a href="https://github.com/Rvjais/Web-Scrapper" target="_blank" class="text-blue-400 hover:underline">github.com/Rvjais/Web-Scrapper</a><br>
                • <strong>Developer:</strong> Ranveer Jaiswal (<a href="https://github.com/Rvjais" target="_blank" class="text-blue-400 hover:underline">@Rvjais</a>)
            </p>
        `
    },
    "srchess": {
        title: "Srchess — Academy 3D Rebuild",
        subtitle: "Vite + Three.js static site",
        npmUrl: "https://github.com/Rvjais/Srchess",
        githubUrl: "https://github.com/Rvjais/Srchess",
        content: `
            <h1>SR Chess Academy — 3D Rebuild</h1>
            <p><strong>25 pages + 17 blogs + GLB hero for WIM Shivika Rohilla academy.</strong></p>
            <h2>✨ Features & How they help</h2>
            <ul>
                <li><strong>3D hero scroll phases:</strong> King/Queen intro-hold-outro — longer stay + trials.</li>
                <li><strong>148K sessions + founder WIM:</strong> Trust numbers — parent conversion.</li>
                <li><strong>GM coach slider:</strong> Tejas Bakre + IMs — 1-click trial.</li>
                <li><strong>Shop cart Rs localStorage:</strong> Boards/books — extra revenue.</li>
                <li><strong>10-Q stress test:</strong> Parent/child PSS — mental-toughness differentiator.</li>
                <li><strong>Blog + gallery + OTP mock:</strong> SEO traffic + low-friction login.</li>
            </ul>
            <h2>🚀 Run</h2>
            <pre>cd chess-homepage\nnpm install\nnpm run dev</pre>
            <p>• <strong>GitHub:</strong> <a href="https://github.com/Rvjais/Srchess" target="_blank" class="text-blue-400 hover:underline">Rvjais/Srchess</a> • <strong>Live:</strong> <a href="https://srchess.vercel.app/" target="_blank" class="text-blue-400 hover:underline">srchess.vercel.app</a></p>
        `
    },
    "textlens": {
        title: "TextLens — OCR-SHEET",
        subtitle: "FastAPI + PaddleOCRv5 privacy OCR",
        npmUrl: "https://github.com/Rvjais/OCR-SHEET",
        githubUrl: "https://github.com/Rvjais/OCR-SHEET",
        content: `
            <h1>TextLens — Privacy Image/PDF to Text</h1>
            <p><strong>Batch OCR in-browser + local backend. No external API. DeepSeek invoice table.</strong></p>
            <h2>✨ Features & How they help</h2>
            <ul>
                <li><strong>Batch + cancel-keeps-done:</strong> 50-page ledger in one go.</li>
                <li><strong>Printed in-browser Tesseract:</strong> Bills stay on PC — sensitive safe.</li>
                <li><strong>Handwriting PaddleOCRv5:</strong> Reads pen totals/Hindi — normal OCR misses.</li>
                <li><strong>Hybrid PDF merge:</strong> Printed + handwritten suffix — no re-type.</li>
                <li><strong>Confidence &lt;85 flagged:</strong> Accountant checks red words only.</li>
                <li><strong>Format to Table JSON/CSV:</strong> Paste to Tally/Excel — 15 min saved/invoice.</li>
            </ul>
            <h2>🚀 Run</h2>
            <pre>pip install -r requirements.txt\npython server.py --download-models\npython server.py</pre>
            <p>• <strong>GitHub:</strong> <a href="https://github.com/Rvjais/OCR-SHEET" target="_blank" class="text-blue-400 hover:underline">Rvjais/OCR-SHEET</a></p>
        `
    },
    "aicrmz": {
        title: "AICRMZ — WhatsApp AI CRM",
        subtitle: "MERN + Baileys multi-tenant",
        npmUrl: "https://github.com/Rvjais/AI-CRM",
        githubUrl: "https://github.com/Rvjais/AI-CRM",
        content: `
            <h1>AICRMZ — AI WhatsApp Business CRM</h1>
            <p><strong>QR Baileys + AI reply, campaigns, follow-ups, Gmail/Sheets, Twilio/Bolna voice.</strong></p>
            <h2>✨ Features & How they help (ROI)</h2>
            <ul>
                <li><strong>QR + live Socket chat:</strong> No official API cost — reply in seconds.</li>
                <li><strong>AI auto-reply + sentiment:</strong> 24/7 answers, angry flagged before churn.</li>
                <li><strong>Bulk campaigns queue:</strong> 5000 contacts 1-click — 10x reach.</li>
                <li><strong>Auto follow-ups:</strong> No-reply nudge — +20% closures.</li>
                <li><strong>CSV + Forms + Groups:</strong> Excel to WhatsApp in 2 min, Insta bio to inbox.</li>
                <li><strong>Twilio + Bolna voice:</strong> AI COD confirm — cuts RTO, saves telecaller.</li>
            </ul>
            <h2>🚀 Run</h2>
            <pre>cd AI-CRM/server\nnpm install\nnpm run dev\ncd ../client\nnpm run dev</pre>
            <p>• <strong>GitHub:</strong> <a href="https://github.com/Rvjais/AI-CRM" target="_blank" class="text-blue-400 hover:underline">Rvjais/AI-CRM</a> • Live in.aicrmz.com</p>
        `
    }
};

function openReadmeModal(projectId = 'fullstack-code-visualiser') {
    const overlay = document.getElementById('readme-modal-overlay');
    const titleEl = document.getElementById('readme-title');
    const subtitleEl = document.getElementById('readme-subtitle');
    const bodyEl = document.getElementById('readme-body');
    const npmBtn = document.getElementById('readme-npm-btn');
    const githubBtn = document.getElementById('readme-github-btn');

    const data = projectReadmes[projectId] || projectReadmes['fullstack-code-visualiser'];

    if (titleEl) titleEl.innerText = data.title;
    if (subtitleEl) subtitleEl.innerText = data.subtitle;
    if (bodyEl) bodyEl.innerHTML = data.content;
    
    if (npmBtn) {
        if (data.npmUrl) {
            npmBtn.style.display = 'inline-flex';
            npmBtn.href = data.npmUrl;
            if (data.npmLabel) {
                npmBtn.innerHTML = data.npmLabel;
            } else if (data.npmUrl.includes('npmjs')) {
                npmBtn.innerHTML = '<i class="fab fa-npm mr-1.5"></i> npm';
            } else {
                npmBtn.innerHTML = '<i class="fas fa-external-link-alt mr-1.5"></i> Live Demo';
            }
        } else {
            npmBtn.style.display = 'none';
        }
    }
    
    if (githubBtn) {
        if (data.githubUrl) {
            githubBtn.style.display = 'inline-flex';
            githubBtn.href = data.githubUrl;
        } else {
            githubBtn.style.display = 'none';
        }
    }

    if (overlay) {
        overlay.classList.add('is-active');
    }
}

function closeReadmeModal() {
    const overlay = document.getElementById('readme-modal-overlay');
    if (overlay) {
        overlay.classList.remove('is-active');
    }
}

// --- iOS Folder Modal System ---
function openFolderModal() {
    const overlay = document.getElementById('folder-modal-overlay');
    if (overlay) {
        overlay.classList.add('is-active');
    }
}

function closeFolderModal() {
    const overlay = document.getElementById('folder-modal-overlay');
    if (overlay) {
        overlay.classList.remove('is-active');
    }
}

function openSkillsFolderModal() {
    const overlay = document.getElementById('skills-folder-modal-overlay');
    if (overlay) {
        overlay.classList.add('is-active');
    }
}

function closeSkillsFolderModal() {
    const overlay = document.getElementById('skills-folder-modal-overlay');
    if (overlay) {
        overlay.classList.remove('is-active');
    }
}

// --- macOS & iOS Photos / Gallery System ---
const initialGalleryItems = [
    {
        id: "proj-veer-1",
        type: "photo",
        title: "Veer Music — Vinyl Turntable Player",
        desc: "Rotating vinyl turntable animation with dynamic album art center badge, 1-tap lyrics karaoke toggle & Nothing OS controls",
        src: "assets/VEER-MUSIC/Screenshot_20261016-113318.png",
        date: "Oct 2026"
    },
    {
        id: "proj-veer-2",
        type: "photo",
        title: "Veer Music — Real-Time Synced Lyrics",
        desc: "Live synchronized line-by-line LRC scrolling lyrics with active glowing highlight, multi-lingual Hindi/Urdu unicode support, and tap-to-seek",
        src: "assets/VEER-MUSIC/Screenshot_20261016-113332.png",
        date: "Oct 2026"
    },
    {
        id: "proj-veer-3",
        type: "photo",
        title: "Veer Music — Home Dashboard",
        desc: "Nothing OS dot-matrix dashboard with YouTube session connection, 12 Saved offline counter, and Fresh & Trending quick picks carousel",
        src: "assets/VEER-MUSIC/Screenshot_20261016-113243.png",
        date: "Oct 2026"
    },
    {
        id: "proj-veer-4",
        type: "photo",
        title: "Veer Music — Instant Search & 1-Tap Download",
        desc: "Real-time search with Songs, Albums, Artists filter pills and direct 1-tap offline download buttons",
        src: "assets/VEER-MUSIC/Screenshot_20261016-113255.png",
        date: "Oct 2026"
    },
    {
        id: "proj-veer-5",
        type: "photo",
        title: "Veer Music — Audiophile Bitrates & Themes",
        desc: "Dark AMOLED Obsidian Black vs Ghost White Liquid Glass themes, YouTube cookie auth, and Opus 160kbps studio stream quality",
        src: "assets/VEER-MUSIC/Screenshot_20261016-113305.png",
        date: "Oct 2026"
    },
    {
        id: "proj-veer-6",
        type: "photo",
        title: "Veer Music — Track Details & Metadata Inspector",
        desc: "Detailed track metadata breakdown with cover art, YouTube Video ID (Q2U8Qk80-Es), global audio source, and native share sheet",
        src: "assets/VEER-MUSIC/Screenshot_20261016-113321.png",
        date: "Oct 2026"
    },
    {
        id: "proj-webrip-1",
        type: "photo",
        title: "WebRip — Dark Mode Scraper Console",
        desc: "Obsidian Neon scraping console with BFS crawl depth (0-20), max page limiter (1-5000), asset checkboxes, and real-time SSE progress stream",
        src: "assets/Web-Scrapper/darkmode.png",
        date: "Oct 2026"
    },
    {
        id: "proj-webrip-2",
        type: "photo",
        title: "WebRip — Light Mode Scraper & Exporter",
        desc: "High-contrast light mode view with 1-click ZIP export, Playwright Chromium SPA rendering toggle, and anti-bot Cloudflare solver",
        src: "assets/Web-Scrapper/lightmode.png",
        date: "Oct 2026"
    },
    {
        id: "img-1",
        type: "photo",
        title: "Ranveer Jaiswal — Portrait",
        desc: "Profile portrait of Ranveer Jaiswal (Full Stack Developer)",
        src: "profile.png",
        date: "Oct 2026"
    },
    {
        id: "img-2",
        type: "photo",
        title: "Developer Workspace & macOS Tahoe",
        desc: "Engineering setup with dual monitors and devOS terminal",
        src: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1000&q=80",
        date: "Sep 2026"
    },
    {
        id: "img-3",
        type: "photo",
        title: "Full-Stack Architecture & Code Graph",
        desc: "Abstract Syntax Tree (AST) routing map and database flow",
        src: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80",
        date: "Aug 2026"
    },
    {
        id: "vid-1",
        type: "video",
        title: "Interactive System Demo Video",
        desc: "Live runtime traffic demonstration and UI component sync",
        src: "https://www.w3schools.com/html/mov_bbb.mp4",
        date: "Jul 2026"
    }
];

let galleryItems = [];
let currentGalleryFilter = 'all';

function initGallery() {
    // Load persisted user uploads from localStorage
    try {
        const stored = localStorage.getItem('ranveer_gallery_uploads');
        if (stored) {
            const parsed = JSON.parse(stored);
            galleryItems = [...parsed, ...initialGalleryItems];
        } else {
            galleryItems = [...initialGalleryItems];
        }
    } catch(e) {
        galleryItems = [...initialGalleryItems];
    }

    renderGallery();
    setupGalleryDragDrop();
}

function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    const countEl = document.getElementById('gallery-item-count');
    if (!grid) return;

    const filtered = galleryItems.filter(item => {
        if (currentGalleryFilter === 'all') return true;
        if (currentGalleryFilter === 'photos') return item.type === 'photo';
        if (currentGalleryFilter === 'videos') return item.type === 'video';
        return true;
    });

    if (countEl) {
        countEl.innerText = `${filtered.length} item${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-16 text-center text-gray-500">
                <i class="fas fa-images text-4xl mb-3 text-gray-600 block"></i>
                <p class="text-sm font-medium">No ${currentGalleryFilter} found</p>
                <p class="text-xs text-gray-500 mt-1">Upload images or videos above to populate this view</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(item => `
        <div class="gallery-card group" onclick="openGalleryLightbox('${item.id}')">
            ${item.type === 'video' ? `
                <video src="${item.src}" muted playsinline class="pointer-events-none"></video>
                <div class="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition">
                    <div class="w-9 h-9 rounded-full bg-white/80 text-black flex items-center justify-center shadow-md">
                        <i class="fas fa-play text-xs ml-0.5"></i>
                    </div>
                </div>
            ` : `
                <img src="${item.src}" alt="${item.title}" loading="lazy">
            `}
            <div class="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-90 group-hover:opacity-100 transition">
                <span class="text-xs font-semibold text-white block truncate leading-tight">${item.title}</span>
                <span class="text-[10px] text-gray-300 block truncate mt-0.5">${item.date || 'Uploaded'}</span>
            </div>
            ${item.isCustom ? `
                <button onclick="event.stopPropagation(); deleteGalleryItem('${item.id}')" class="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition" title="Delete media">
                    <i class="fas fa-trash-alt text-[10px]"></i>
                </button>
            ` : ''}
        </div>
    `).join('');
}

function filterGallery(filterType, clickedBtn) {
    currentGalleryFilter = filterType;
    const btns = document.querySelectorAll('.gallery-tab-btn');
    btns.forEach(b => b.classList.remove('active'));
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
    renderGallery();
}

function handleGalleryUpload(files) {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isVideo && !isImage) {
            showToast("Unsupported file format. Please upload images or videos.", "fas fa-exclamation-triangle");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const newItem = {
                id: "user-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6),
                type: isVideo ? "video" : "photo",
                title: file.name,
                desc: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
                src: e.target.result,
                date: "Just now",
                isCustom: true
            };

            galleryItems.unshift(newItem);
            saveCustomUploads();
            renderGallery();
            showToast(`Uploaded ${file.name} to Gallery!`, "fas fa-check-circle");
        };

        reader.readAsDataURL(file);
    });
}

function saveCustomUploads() {
    try {
        const customItems = galleryItems.filter(i => i.isCustom);
        localStorage.setItem('ranveer_gallery_uploads', JSON.stringify(customItems));
    } catch(err) {
        console.warn("Storage quota limit reached for local base64 storage:", err);
    }
}

function deleteGalleryItem(id) {
    galleryItems = galleryItems.filter(i => i.id !== id);
    saveCustomUploads();
    renderGallery();
    showToast("Media item removed from gallery.", "fas fa-trash");
}

function clearCustomUploads() {
    if (confirm("Reset gallery to default showcase items?")) {
        localStorage.removeItem('ranveer_gallery_uploads');
        galleryItems = [...initialGalleryItems];
        renderGallery();
        showToast("Gallery reset to default.", "fas fa-undo");
    }
}

function setupGalleryDragDrop() {
    const dropzone = document.getElementById('gallery-dropzone');
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleGalleryUpload(files);
    });
}

function openGalleryLightbox(itemId) {
    const item = galleryItems.find(i => i.id === itemId);
    if (!item) return;

    const overlay = document.getElementById('gallery-lightbox');
    const container = document.getElementById('lightbox-container');
    if (!overlay || !container) return;

    if (item.type === 'video') {
        container.innerHTML = `
            <video src="${item.src}" controls autoplay class="max-h-[75vh] max-w-full rounded-t-xl bg-black"></video>
            <div class="p-4 bg-[#181920] w-full text-left border-t border-white/10">
                <h3 class="text-sm font-bold text-white">${item.title}</h3>
                <p class="text-xs text-gray-400 mt-1">${item.desc}</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <img src="${item.src}" alt="${item.title}" class="max-h-[75vh] max-w-full object-contain rounded-t-xl bg-black">
            <div class="p-4 bg-[#181920] w-full text-left border-t border-white/10">
                <h3 class="text-sm font-bold text-white">${item.title}</h3>
                <p class="text-xs text-gray-400 mt-1">${item.desc}</p>
            </div>
        `;
    }

    overlay.classList.add('is-active');
}

function closeGalleryLightbox() {
    const overlay = document.getElementById('gallery-lightbox');
    const container = document.getElementById('lightbox-container');
    if (container) {
        const vid = container.querySelector('video');
        if (vid) vid.pause();
    }
    if (overlay) {
        overlay.classList.remove('is-active');
    }
}



// --- Initialize Event Listeners on DOM Load ---
document.addEventListener('DOMContentLoaded', () => {
    // Setup desktop window dragging & resizing
    setupWindowDragging();
    setupWindowResizing();
    setupDesktopIconDragging();
    initGallery();

    // Setup terminal keyboard listener
    const termInput = document.getElementById('term-input');
    if (termInput) {
        termInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const cmd = this.value;
                this.value = '';
                executeTerminalCommand(cmd);
            }
        });
    }

    // Spotlight Input listener
    const spotlightInput = document.getElementById('spotlight-input');
    if (spotlightInput) {
        spotlightInput.addEventListener('input', function() {
            selectedSpotlightIndex = 0;
            renderSpotlightResults(this.value);
        });

        spotlightInput.addEventListener('keydown', function(e) {
            const results = document.querySelectorAll('.spotlight-result-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedSpotlightIndex = Math.min(results.length - 1, selectedSpotlightIndex + 1);
                updateSpotlightSelection();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedSpotlightIndex = Math.max(0, selectedSpotlightIndex - 1);
                updateSpotlightSelection();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                executeSpotlightAction(selectedSpotlightIndex);
            } else if (e.key === 'Escape') {
                closeSpotlight();
            }
        });
    }

    function updateSpotlightSelection() {
        const items = document.querySelectorAll('.spotlight-result-item');
        items.forEach((item, idx) => {
            if (idx === selectedSpotlightIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
        const input = document.getElementById('spotlight-input');
        const query = input ? input.value.toLowerCase().trim() : '';
        const filtered = searchIndex.filter(item => {
            if (!query) return true;
            return item.title.toLowerCase().includes(query) || 
                   item.desc.toLowerCase().includes(query) || 
                   item.category.toLowerCase().includes(query) ||
                   (item.tech && item.tech.some(t => t.toLowerCase().includes(query)));
        }).slice(0, 8);
        if (filtered[selectedSpotlightIndex]) {
            renderSpotlightPreview(filtered[selectedSpotlightIndex]);
        }
    }

    // Global keyboard shortcut for Spotlight, Calculator, and Escape for modals
    document.addEventListener('keydown', (e) => {
        // Calculator keyboard handler
        const calcApp = document.getElementById('app-calculator');
        if (calcApp && calcApp.classList.contains('is-open')) {
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handleCalcDigit(e.key);
                return;
            } else if (e.key === '.') {
                e.preventDefault();
                handleCalcDigit('.');
                return;
            } else if (e.key === '+') {
                e.preventDefault();
                handleCalcOp('+');
                return;
            } else if (e.key === '-') {
                e.preventDefault();
                handleCalcOp('-');
                return;
            } else if (e.key === '*' || e.key === 'x' || e.key === 'X') {
                e.preventDefault();
                handleCalcOp('*');
                return;
            } else if (e.key === '/') {
                e.preventDefault();
                handleCalcOp('/');
                return;
            } else if (e.key === 'Enter' || e.key === '=') {
                e.preventDefault();
                handleCalcEqual();
                return;
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                if (calcCurrent.length > 1 && calcCurrent !== 'Error') {
                    calcCurrent = calcCurrent.slice(0, -1);
                } else {
                    calcCurrent = '0';
                }
                updateCalcDisplay();
                return;
            } else if (e.key === 'c' || e.key === 'C') {
                handleCalcClear();
                return;
            }
        }

        if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.code === 'Space')) {
            e.preventDefault();
            toggleSpotlight();
        } else if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
            closeSpotlight();
            closeReadmeModal();
            closeFolderModal();
            closeSkillsFolderModal();
            closeGalleryLightbox();
            closeMissionControl();
            closeIosAppSwitcher();
            closeAppleMenu();
            closeControlCenter();
            closeAboutThisMac();
            closeApp('calculator');
            closeApp('notes');
            closeApp('calendar');
        }
    });

    // Outside click to close macOS 26 Tahoe Apple Menu and Control Center
    document.addEventListener('click', (e) => {
        const appleMenu = document.getElementById('macos-apple-menu');
        if (appleMenu && appleMenu.classList.contains('is-open')) {
            if (!e.target.closest('#macos-apple-menu') && !e.target.closest('.fa-apple')) {
                closeAppleMenu();
            }
        }
        const cc = document.getElementById('macos-control-center');
        if (cc && cc.classList.contains('is-open')) {
            if (!e.target.closest('#macos-control-center') && !e.target.closest('#mac-control-center-btn') && !e.target.closest('#mac-clock')) {
                closeControlCenter();
            }
        }
    });

    // Initialize authentic gestures
    initIosHomeGestures();
    initDesktopMissionControlGestures();

    // Initialize macOS 26 Tahoe Physics Dock
    initMacOSDock();

    // Initialize iOS 18 Control Center Vertical Sliders
    initIosControlCenterSliders();

    // Initialize Tahoe Calendar dates & monthly grid
    if (typeof updateCalendarDatesDisplay === 'function') updateCalendarDatesDisplay();
    if (typeof renderCalendarGrid === 'function') renderCalendarGrid();

    // Ensure all overlays and dropdowns are strictly closed on initial page load
    closeMissionControl();
    closeIosAppSwitcher();
    closeSkillsFolderModal();
    closeAppleMenu();
    closeControlCenter();
    closeAboutThisMac();
});

// ==========================================================================
// iOS 18 Mobile Gestures & Multitasking App Switcher Core
// ==========================================================================

const APP_METADATA = {
    'about': {
        title: 'Safari',
        subtitle: 'About Ranveer Jaiswal',
        icon: 'fab fa-safari',
        iconColor: 'bg-gradient-to-tr from-sky-400 to-blue-600 text-white',
        badge: 'Profile & Bio'
    },
    'projects': {
        title: 'Terminal',
        subtitle: 'devOS — Projects & Architecture',
        icon: 'fas fa-terminal',
        iconColor: 'bg-black text-green-400 border border-gray-700',
        badge: 'Portfolio CLI'
    },
    'skills': {
        title: 'Settings',
        subtitle: 'System Skills & Tech Stack',
        icon: 'fas fa-gear',
        iconColor: 'bg-gradient-to-b from-gray-200 to-gray-400 text-gray-800',
        badge: 'Full Stack'
    },
    'contact': {
        title: 'Mail',
        subtitle: 'New Message — Ranveer Jaiswal',
        icon: 'fas fa-envelope',
        iconColor: 'bg-gradient-to-tr from-sky-400 to-blue-600 text-white',
        badge: 'Connect'
    },
    'gallery': {
        title: 'Photos',
        subtitle: 'Media Gallery & Uploads',
        icon: 'fas fa-images',
        iconColor: 'bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 text-white',
        badge: 'Gallery Hub'
    },
    'calculator': {
        title: 'Calculator',
        subtitle: 'Arithmetic & Decimal Math Engine',
        icon: 'fas fa-calculator',
        iconColor: 'bg-gradient-to-b from-amber-500 to-orange-600 text-white',
        badge: 'Utility'
    },
    'notes': {
        title: 'Notes',
        subtitle: "Ranveer's DevPad & Engineering Journal",
        icon: 'fas fa-note-sticky',
        iconColor: 'bg-gradient-to-b from-amber-300 to-yellow-500 text-amber-900',
        badge: 'DevPad'
    },
    'calendar': {
        title: 'Calendar',
        subtitle: 'Events, Agenda & Sprint Schedule',
        icon: 'far fa-calendar-alt',
        iconColor: 'bg-gradient-to-b from-red-500 to-rose-600 text-white',
        badge: 'Tahoe Calendar'
    }
};

function initIosHomeGestures() {
    const indicatorZone = document.getElementById('ios-global-home-indicator');
    if (!indicatorZone) return;

    let touchStartY = 0;
    let touchStartX = 0;
    let touchStartTime = 0;
    let currentDeltaY = 0;
    let isTracking = false;
    let holdTimer = null;
    let holdTriggered = false;
    let activeAppEl = null;

    function handleStart(clientY, clientX) {
        touchStartY = clientY;
        touchStartX = clientX;
        touchStartTime = Date.now();
        currentDeltaY = 0;
        isTracking = true;
        holdTriggered = false;

        // Find active open app
        activeAppEl = document.querySelector('.app-window.is-open');

        // Check for pull-up and hold (> 320ms while lifted up)
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => {
            if (isTracking && currentDeltaY > 30) {
                holdTriggered = true;
                if (navigator.vibrate) navigator.vibrate(30);
                if (activeAppEl) {
                    activeAppEl.style.transform = '';
                    activeAppEl.style.borderRadius = '';
                    activeAppEl.style.transition = '';
                }
                openIosAppSwitcher();
            }
        }, 320);
    }

    function handleMove(clientY) {
        if (!isTracking) return;
        currentDeltaY = touchStartY - clientY; // positive when dragging up

        if (currentDeltaY > 8) {
            const homeBar = document.getElementById('ios-global-home-bar');
            if (homeBar) homeBar.classList.add('active-pull');

            if (activeAppEl && !holdTriggered) {
                const scale = Math.max(0.82, 1 - (currentDeltaY * 0.0009));
                const translateY = -Math.min(180, currentDeltaY * 0.6);
                const borderRadius = Math.min(36, 12 + currentDeltaY * 0.25);
                activeAppEl.style.transform = `scale(${scale}) translateY(${translateY}px)`;
                activeAppEl.style.borderRadius = `${borderRadius}px`;
                activeAppEl.style.transition = 'none';
            }
        }
    }

    function handleEnd() {
        if (!isTracking) return;
        isTracking = false;
        clearTimeout(holdTimer);

        const homeBar = document.getElementById('ios-global-home-bar');
        if (homeBar) homeBar.classList.remove('active-pull');

        // If this touch was the pull-and-hold that triggered the switcher to open,
        // releasing the finger MUST leave the switcher open!
        if (holdTriggered) {
            return;
        }

        // If the switcher was ALREADY open before this gesture,
        // any new upward swipe or tap on the home bar returns Home!
        if (isIosSwitcherOpen) {
            if (Date.now() - switcherOpenedTime < 400) {
                return;
            }
            closeIosAppSwitcher();
            return;
        }

        const elapsed = Date.now() - touchStartTime;
        const velocity = currentDeltaY / (elapsed || 1);

        if (activeAppEl) {
            if (currentDeltaY > 35 || velocity > 0.28 || (elapsed < 260 && Math.abs(currentDeltaY) < 12)) {
                // User pulled up or tapped to go to Home Screen!
                activeAppEl.style.transform = '';
                activeAppEl.style.borderRadius = '';
                activeAppEl.style.transition = '';
                const appId = activeAppEl.id.replace('app-', '');
                closeApp(appId);
            } else {
                // Snap back into full-screen
                activeAppEl.style.transition = 'transform 0.24s cubic-bezier(0.32, 0.72, 0, 1), border-radius 0.24s ease';
                activeAppEl.style.transform = 'scale(1) translateY(0)';
                activeAppEl.style.borderRadius = '0';
                setTimeout(() => {
                    if (activeAppEl) {
                        activeAppEl.style.transform = '';
                        activeAppEl.style.borderRadius = '';
                        activeAppEl.style.transition = '';
                    }
                }, 250);
            }
        }
    }

    // Direct click/tap on home indicator returns Home immediately
    indicatorZone.addEventListener('click', (e) => {
        // Prevent synthetic click right after hold-to-open gesture
        if (Date.now() - switcherOpenedTime < 450) {
            return;
        }
        if (isIosSwitcherOpen) {
            closeIosAppSwitcher();
            return;
        }
        const currentActive = document.querySelector('.app-window.is-open');
        if (currentActive) {
            const appId = currentActive.id.replace('app-', '');
            closeApp(appId);
        }
    });

    // Touch event listeners
    indicatorZone.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            handleStart(e.touches[0].clientY, e.touches[0].clientX);
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (isTracking && e.touches.length === 1) {
            handleMove(e.touches[0].clientY);
        }
    }, { passive: true });

    window.addEventListener('touchend', () => {
        handleEnd();
    }, { passive: true });

    window.addEventListener('touchcancel', () => {
        handleEnd();
    }, { passive: true });

    // Mouse drag support for easy testing in responsive browser mode
    indicatorZone.addEventListener('mousedown', (e) => {
        handleStart(e.clientY, e.clientX);
        const onMouseMove = (ev) => handleMove(ev.clientY);
        const onMouseUp = () => {
            handleEnd();
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    });
}

function openIosAppSwitcher() {
    if (window.innerWidth >= 768) return; // Mobile only
    const switcher = document.getElementById('ios-app-switcher');
    if (!switcher) return;

    switcherOpenedTime = Date.now();
    isIosSwitcherOpen = true;
    switcher.style.display = 'flex';
    void switcher.offsetWidth;
    switcher.classList.add('is-active');
    switcher.style.opacity = '1';
    switcher.style.pointerEvents = 'auto';
    renderIosSwitcherCards();
}

function closeIosAppSwitcher() {
    isIosSwitcherOpen = false;
    const switcher = document.getElementById('ios-app-switcher');
    if (switcher) {
        switcher.classList.remove('is-active');
        switcher.style.display = 'none';
        switcher.style.opacity = '0';
        switcher.style.pointerEvents = 'none';
    }
}

function handleIosSwitcherBackdropClick(e) {
    if (!e.target.closest('.ios-switcher-item') && !e.target.closest('button')) {
        closeIosAppSwitcher();
    }
}

function renderIosSwitcherCards() {
    const cardsContainer = document.getElementById('ios-switcher-cards');
    const countBadge = document.getElementById('ios-switcher-count');
    if (!cardsContainer) return;

    // Use running apps, or if none running, show recent portfolio apps
    let appsToShow = runningApps.length > 0 ? [...runningApps] : ['about', 'projects', 'skills', 'contact', 'gallery'];

    if (countBadge) {
        countBadge.innerText = `${appsToShow.length} active`;
    }

    cardsContainer.innerHTML = '';

    appsToShow.forEach((appId, index) => {
        const meta = APP_METADATA[appId] || {
            title: appId,
            subtitle: appId,
            icon: 'fas fa-window-maximize',
            iconColor: 'bg-blue-500 text-white',
            badge: 'App'
        };

        const itemContainer = document.createElement('div');
        itemContainer.className = 'ios-switcher-item group';
        itemContainer.dataset.appId = appId;
        itemContainer.style.zIndex = (index + 10).toString();

        // Top App Icon + Label (Clean iOS 18 style floating above card)
        const pill = document.createElement('div');
        pill.className = 'ios-switcher-item-pill';
        pill.innerHTML = `
            <div class="ios-switcher-item-icon ${meta.iconColor}">
                <i class="${meta.icon}"></i>
            </div>
            <span class="ios-switcher-item-title">${meta.title}</span>
        `;

        // Card frame
        const card = document.createElement('div');
        card.className = 'ios-switcher-card';

        // Dynamic Island notch on card
        const notch = document.createElement('div');
        notch.className = 'ios-card-dynamic-island';

        // Card body preview
        const body = document.createElement('div');
        body.className = 'ios-switcher-card-body';
        
        let previewHtml = '';
        if (appId === 'about') {
            // Authentic Apple Safari design from reference screenshot
            previewHtml = `
                <div class="h-full flex flex-col justify-between bg-white text-gray-900 pt-8 px-4 pb-3 select-none text-center">
                    <div>
                        <div class="text-[10px] font-semibold text-blue-600 hover:underline">Explore Portfolio ›</div>
                        <h2 class="text-2xl font-black text-gray-900 tracking-tight mt-0.5">Ranveer Jaiswal</h2>
                        
                        <div class="flex items-center justify-center space-x-3.5 mt-2.5 text-[10px] text-gray-700 font-medium">
                            <div class="flex flex-col items-center">
                                <div class="w-8 h-10 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 mb-1 shadow-xs">
                                    <i class="fab fa-react text-base"></i>
                                </div>
                                <span>Full Stack</span>
                            </div>
                            <div class="flex flex-col items-center">
                                <div class="w-8 h-10 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 mb-1 shadow-xs">
                                    <i class="fab fa-docker text-base"></i>
                                </div>
                                <span>Docker</span>
                            </div>
                            <div class="flex flex-col items-center">
                                <div class="w-8 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 mb-1 shadow-xs">
                                    <i class="fab fa-aws text-base"></i>
                                </div>
                                <span>AWS</span>
                            </div>
                        </div>

                        <div class="text-left mt-3.5 px-1">
                            <div class="text-xs font-bold text-gray-900">Explore the lineup.</div>
                            <div class="text-[10px] text-blue-600 font-medium">Compare all stack & projects ›</div>
                        </div>

                        <!-- Hero Showcase Card (Like iPhone 16 Pro hero in screenshot) -->
                        <div class="mt-2.5 p-3 rounded-2xl bg-gradient-to-b from-[#1c1c1e] to-black text-white text-left shadow-lg border border-gray-800">
                            <div class="flex items-center space-x-2.5 mb-2">
                                <img src="profile.png" alt="Profile" class="w-8 h-8 rounded-full object-cover object-top border border-white/20">
                                <div>
                                    <div class="text-xs font-bold text-white leading-tight">Branding Pioneers</div>
                                    <div class="text-[9px] text-gray-400">Software Developer (2025 - Present)</div>
                                </div>
                            </div>
                            <p class="text-[10px] text-gray-300 leading-relaxed">Full-stack web applications, AST tools, and automated HR workflows built with React, Node, Docker & AWS.</p>
                            <div class="flex items-center justify-center space-x-1.5 mt-2.5 text-[8px] text-gray-500">
                                <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
                                <span class="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                                <span class="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom Floating Safari Address Pill (Matches screenshot) -->
                    <div class="flex items-center justify-between px-3.5 py-2 bg-gray-100/95 border border-gray-300/80 rounded-full text-gray-600 text-xs shadow-sm mt-2">
                        <div class="flex items-center space-x-2.5 text-gray-400">
                            <i class="fas fa-chevron-left text-[10px]"></i>
                            <i class="fas fa-chevron-right text-[10px]"></i>
                        </div>
                        <div class="flex items-center space-x-1 font-semibold text-gray-800 text-[11px]">
                            <i class="fas fa-lock text-[9px] text-gray-500"></i>
                            <span>ranveer.dev</span>
                        </div>
                        <div class="flex items-center space-x-2.5 text-gray-400">
                            <i class="fas fa-arrow-up-from-bracket text-[10px]"></i>
                            <i class="fas fa-clone text-[10px]"></i>
                        </div>
                    </div>
                </div>
            `;
        } else if (appId === 'skills') {
            // Authentic iOS Inset Grouped Settings from right side of screenshot
            previewHtml = `
                <div class="h-full flex flex-col justify-between bg-[#f2f2f7] text-gray-900 pt-8 px-3.5 pb-3 select-none text-left">
                    <div class="space-y-2.5">
                        <div class="text-lg font-bold px-1 text-gray-900">Settings</div>
                        
                        <!-- Apple ID Profile Card -->
                        <div class="flex items-center space-x-2.5 p-2 bg-white rounded-xl shadow-xs border border-gray-200/70">
                            <img src="profile.png" alt="Profile" class="w-10 h-10 rounded-full object-cover object-top border border-gray-200 shadow-sm">
                            <div class="flex-1 min-w-0">
                                <div class="text-xs font-bold text-gray-900 truncate">Ranveer Jaiswal</div>
                                <div class="text-[10px] text-gray-500 truncate">Apple ID, Cloud, Full Stack Stack</div>
                            </div>
                            <i class="fas fa-chevron-right text-[10px] text-gray-400"></i>
                        </div>

                        <!-- Inset Group 1: Core Cloud & DevOps Stack -->
                        <div class="bg-white rounded-xl shadow-xs border border-gray-200/70 divide-y divide-gray-100 text-xs font-medium">
                            <div class="flex items-center justify-between p-2">
                                <div class="flex items-center space-x-2">
                                    <div class="w-6 h-6 rounded-md bg-[#2496ed] text-white flex items-center justify-center text-xs shadow-xs"><i class="fab fa-docker"></i></div>
                                    <span>Docker</span>
                                </div>
                                <div class="flex items-center space-x-1 text-gray-400 text-[11px]">
                                    <span class="text-blue-600 font-semibold text-[10px]">Compose</span>
                                    <i class="fas fa-chevron-right text-[9px]"></i>
                                </div>
                            </div>
                            <div class="flex items-center justify-between p-2">
                                <div class="flex items-center space-x-2">
                                    <div class="w-6 h-6 rounded-md bg-[#ff9900] text-white flex items-center justify-center text-xs shadow-xs"><i class="fab fa-aws"></i></div>
                                    <span>AWS Cloud</span>
                                </div>
                                <div class="flex items-center space-x-1 text-gray-400 text-[11px]">
                                    <span class="text-orange-600 font-semibold text-[10px]">EC2/S3</span>
                                    <i class="fas fa-chevron-right text-[9px]"></i>
                                </div>
                            </div>
                            <div class="flex items-center justify-between p-2">
                                <div class="flex items-center space-x-2">
                                    <div class="w-6 h-6 rounded-md bg-[#61dafb] text-gray-900 flex items-center justify-center text-xs shadow-xs"><i class="fab fa-react"></i></div>
                                    <span>React & Next.js</span>
                                </div>
                                <div class="flex items-center space-x-1 text-gray-400 text-[11px]">
                                    <span class="text-gray-500 text-[10px]">Advanced</span>
                                    <i class="fas fa-chevron-right text-[9px]"></i>
                                </div>
                            </div>
                            <div class="flex items-center justify-between p-2">
                                <div class="flex items-center space-x-2">
                                    <div class="w-6 h-6 rounded-md bg-[#68a063] text-white flex items-center justify-center text-xs shadow-xs"><i class="fab fa-node-js"></i></div>
                                    <span>Node & Express</span>
                                </div>
                                <div class="flex items-center space-x-1 text-gray-400 text-[11px]">
                                    <span class="text-gray-500 text-[10px]">REST APIs</span>
                                    <i class="fas fa-chevron-right text-[9px]"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Inset Group 2: Tools & DB -->
                        <div class="bg-white rounded-xl shadow-xs border border-gray-200/70 divide-y divide-gray-100 text-xs font-medium">
                            <div class="flex items-center justify-between p-2">
                                <div class="flex items-center space-x-2">
                                    <div class="w-6 h-6 rounded-md bg-[#f05032] text-white flex items-center justify-center text-xs shadow-xs"><i class="fab fa-git-alt"></i></div>
                                    <span>Git & GitHub</span>
                                </div>
                                <i class="fas fa-chevron-right text-[9px] text-gray-400"></i>
                            </div>
                            <div class="flex items-center justify-between p-2">
                                <div class="flex items-center space-x-2">
                                    <div class="w-6 h-6 rounded-md bg-[#47a248] text-white flex items-center justify-center text-xs shadow-xs"><i class="fas fa-database"></i></div>
                                    <span>MongoDB / SQL</span>
                                </div>
                                <i class="fas fa-chevron-right text-[9px] text-gray-400"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom Search Bar (Just like real iOS Settings) -->
                    <div class="flex items-center space-x-2 px-3 py-1.5 bg-gray-200/90 rounded-xl text-gray-500 text-xs shadow-xs mt-2">
                        <i class="fas fa-search text-[10px]"></i>
                        <span class="text-[11px] font-normal">Search Settings</span>
                    </div>
                </div>
            `;
        } else if (appId === 'projects') {
            // devOS Terminal & Projects View
            previewHtml = `
                <div class="h-full flex flex-col justify-between bg-[#0a0d14] text-white pt-8 px-3.5 pb-3 select-none text-left">
                    <div class="space-y-2.5">
                        <div class="flex items-center justify-between border-b border-white/10 pb-1.5">
                            <div class="flex items-center space-x-1.5">
                                <i class="fas fa-terminal text-emerald-400 text-xs"></i>
                                <span class="text-xs font-bold text-gray-200">devOS Terminal (zsh)</span>
                            </div>
                            <span class="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-semibold">ACTIVE</span>
                        </div>
                        <div class="font-mono text-[10px] space-y-2 text-gray-300">
                            <div><span class="text-emerald-400 font-semibold">ranveer@macbook:~$</span> ls -l projects/</div>
                            <div class="p-2 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                <div class="text-rose-400 font-semibold flex items-center justify-between">
                                    <span>📦 fullstack-code-visualiser</span>
                                    <span class="text-[9px] px-1 rounded bg-rose-500/20 text-rose-300">npm</span>
                                </div>
                                <div class="text-[9px] text-gray-400">100% AST visualization & fullstack mapping</div>
                            </div>
                            <div class="p-2 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                <div class="text-amber-400 font-semibold flex items-center justify-between">
                                    <span>🤖 hr-buddy</span>
                                    <span class="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300">Live</span>
                                </div>
                                <div class="text-[9px] text-gray-400">AI onboarding assistant with Gemini & Pinecone</div>
                            </div>
                            <div class="p-2 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                <div class="text-purple-400 font-semibold flex items-center justify-between">
                                    <span>♟️ srchess</span>
                                    <span class="text-[9px] px-1 rounded bg-purple-500/20 text-purple-300">Live</span>
                                </div>
                                <div class="text-[9px] text-gray-400">Real-time chess with Socket.io & Stockfish</div>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center justify-between px-3 py-1.5 bg-white/10 border border-white/15 rounded-xl text-gray-300 text-[10px] font-mono mt-2">
                        <span class="text-emerald-400">● 4 projects loaded</span>
                        <span class="text-gray-400">zsh 80x24</span>
                    </div>
                </div>
            `;
        } else if (appId === 'contact') {
            // Apple Mail New Message
            previewHtml = `
                <div class="h-full flex flex-col justify-between bg-[#1c1c1e] text-white pt-8 px-4 pb-3 select-none text-left">
                    <div class="space-y-2.5">
                        <div class="flex items-center justify-between border-b border-white/15 pb-2">
                            <span class="text-xs text-blue-400 font-medium">Cancel</span>
                            <span class="text-xs font-bold text-white">New Message</span>
                            <div class="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs shadow-md"><i class="fas fa-arrow-up"></i></div>
                        </div>
                        <div class="text-[11px] border-b border-white/10 pb-1.5 flex items-center">
                            <span class="text-gray-400 w-14">To:</span>
                            <span class="text-blue-300 font-mono text-[10px] truncate">ranveerjais9984@gmail.com</span>
                        </div>
                        <div class="text-[11px] border-b border-white/10 pb-1.5 flex items-center">
                            <span class="text-gray-400 w-14">Subject:</span>
                            <span class="text-gray-200 font-medium">Software Engineer Role / Project</span>
                        </div>
                        <div class="text-[10px] text-gray-400 leading-relaxed pt-1">
                            Hi Ranveer,<br><br>
                            We are impressed by your fullstack work on AST Visualizer, HR Buddy, and AWS/Docker infrastructure. Let's schedule a conversation!
                        </div>
                    </div>
                    <div class="flex items-center justify-between px-3 py-1.5 bg-white/10 border border-white/15 rounded-xl text-blue-300 text-[10px] font-semibold mt-2">
                        <span><i class="fas fa-paperclip mr-1"></i> Attach Resume</span>
                        <span>Apple Mail</span>
                    </div>
                </div>
            `;
        } else if (appId === 'calendar') {
            // iOS 18 Calendar Card Preview
            const now = new Date();
            const daysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            previewHtml = `
                <div class="h-full flex flex-col justify-between bg-[#1c1c1e] text-white pt-8 px-4 pb-3 select-none text-left">
                    <div class="space-y-3">
                        <div class="flex items-center justify-between border-b border-white/10 pb-2">
                            <div>
                                <span class="text-xs uppercase font-extrabold text-[#ff3b30] block">${daysFull[now.getDay()]}</span>
                                <span class="text-2xl font-black text-white leading-tight">${now.getDate()} ${monthsFull[now.getMonth()]}</span>
                            </div>
                            <div class="w-8 h-8 rounded-full bg-red-500/20 text-[#ff3b30] flex items-center justify-center font-bold text-sm">
                                <i class="far fa-calendar-alt"></i>
                            </div>
                        </div>
                        <div class="space-y-2 text-xs">
                            <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                <div class="flex items-center space-x-1.5 text-red-400 font-bold text-[11px]">
                                    <span class="w-2 h-2 rounded-full bg-red-500"></span>
                                    <span>Branding Pioneers Sync</span>
                                </div>
                                <div class="text-[10px] text-gray-400 pl-3.5">09:30 AM • Task Tracker & Workflows</div>
                            </div>
                            <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                <div class="flex items-center space-x-1.5 text-blue-400 font-bold text-[11px]">
                                    <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                                    <span>MERN Code Review</span>
                                </div>
                                <div class="text-[10px] text-gray-400 pl-3.5">11:00 AM • AST Visualizer npm v2</div>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center justify-between px-3 py-1.5 bg-white/10 border border-white/15 rounded-xl text-red-400 text-[10px] font-semibold mt-2">
                        <span>● Today</span>
                        <span>Calendar</span>
                    </div>
                </div>
            `;
        } else if (appId === 'calculator') {
            previewHtml = `
                <div class="h-full flex flex-col justify-between bg-black text-white pt-8 px-4 pb-3 select-none text-right font-mono">
                    <div class="space-y-3">
                        <div class="text-3xl font-light text-white pt-4">8,192</div>
                        <div class="grid grid-cols-4 gap-1.5 text-center text-xs font-semibold">
                            <div class="p-2 rounded-full bg-gray-500 text-black">C</div>
                            <div class="p-2 rounded-full bg-gray-500 text-black">±</div>
                            <div class="p-2 rounded-full bg-gray-500 text-black">%</div>
                            <div class="p-2 rounded-full bg-amber-500 text-white">÷</div>
                            <div class="p-2 rounded-full bg-gray-800 text-white">7</div>
                            <div class="p-2 rounded-full bg-gray-800 text-white">8</div>
                            <div class="p-2 rounded-full bg-gray-800 text-white">9</div>
                            <div class="p-2 rounded-full bg-amber-500 text-white">×</div>
                        </div>
                    </div>
                    <div class="flex items-center justify-between px-3 py-1.5 bg-white/10 border border-white/15 rounded-xl text-amber-400 text-[10px] font-semibold font-sans mt-2">
                        <span>Calculator</span>
                        <span>iOS 18</span>
                    </div>
                </div>
            `;
        } else if (appId === 'notes') {
            previewHtml = `
                <div class="h-full flex flex-col justify-between bg-[#1c1c1e] text-white pt-8 px-4 pb-3 select-none text-left">
                    <div class="space-y-2.5">
                        <div class="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                            <i class="fas fa-note-sticky"></i>
                            <span>Ranveer's DevPad</span>
                        </div>
                        <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1 text-xs">
                            <span class="text-[11px] font-bold text-amber-300 block">⚡ Full Stack Architecture:</span>
                            <span class="text-[10px] text-gray-400 block">REST APIs, JWT, Redis caching, Docker containerization.</span>
                        </div>
                    </div>
                    <div class="flex items-center justify-between px-3 py-1.5 bg-white/10 border border-white/15 rounded-xl text-amber-300 text-[10px] font-semibold mt-2">
                        <span>Auto-saved</span>
                        <span>Notes</span>
                    </div>
                </div>
            `;
        } else {
            // Apple Photos Gallery
            previewHtml = `
                <div class="h-full flex flex-col justify-between bg-black text-white pt-8 px-3.5 pb-3 select-none text-left">
                    <div class="space-y-2.5">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-white">Library</span>
                            <span class="text-[10px] text-blue-400 font-medium">Select</span>
                        </div>
                        <div class="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                            <div class="h-14 bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white"><i class="fas fa-image text-sm"></i></div>
                            <div class="h-14 bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white"><i class="fas fa-play text-sm"></i></div>
                            <div class="h-14 bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white"><i class="fas fa-images text-sm"></i></div>
                            <div class="h-14 bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white"><i class="fas fa-film text-sm"></i></div>
                            <div class="h-14 bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white"><i class="fas fa-camera text-sm"></i></div>
                            <div class="h-14 bg-gradient-to-tr from-fuchsia-500 to-pink-600 flex items-center justify-center text-white"><i class="fas fa-video text-sm"></i></div>
                        </div>
                    </div>
                    <div class="flex items-center justify-center space-x-3 py-1.5 px-3 bg-white/15 border border-white/20 rounded-full text-white text-[9px] font-semibold mt-2">
                        <span class="text-gray-400">Years</span>
                        <span class="text-gray-400">Months</span>
                        <span class="text-gray-400">Days</span>
                        <span class="bg-white/25 px-2 py-0.5 rounded-full text-white">All Photos</span>
                    </div>
                </div>
            `;
        }

        body.innerHTML = previewHtml;
        card.appendChild(notch);
        card.appendChild(body);

        itemContainer.appendChild(pill);
        itemContainer.appendChild(card);

        // Tap to open app
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            closeIosAppSwitcher();
            openApp(appId);
        });

        // Swipe UP on card to kill app (both touch & mouse drag)
        let cardStartY = 0;
        let cardDeltaY = 0;
        let isCardDragging = false;

        const onDragStart = (clientY) => {
            cardStartY = clientY;
            cardDeltaY = 0;
            isCardDragging = true;
        };

        const onDragMove = (clientY) => {
            if (!isCardDragging) return;
            cardDeltaY = cardStartY - clientY;
            if (cardDeltaY > 15) {
                itemContainer.style.transform = `translateY(-${cardDeltaY}px) scale(0.96)`;
                itemContainer.style.opacity = Math.max(0.2, 1 - cardDeltaY * 0.005);
            }
        };

        const onDragEnd = () => {
            if (!isCardDragging) return;
            isCardDragging = false;
            if (cardDeltaY > 75) {
                // Flick away to close app!
                itemContainer.classList.add('swiping-up');
                if (navigator.vibrate) navigator.vibrate(25);
                setTimeout(() => {
                    closeAppFromSwitcher(appId);
                }, 260);
            } else {
                itemContainer.style.transform = '';
                itemContainer.style.opacity = '';
            }
        };

        card.addEventListener('touchstart', (e) => onDragStart(e.touches[0].clientY), { passive: true });
        card.addEventListener('touchmove', (e) => onDragMove(e.touches[0].clientY), { passive: true });
        card.addEventListener('touchend', onDragEnd, { passive: true });

        // Mouse drag support for testing
        card.addEventListener('mousedown', (e) => {
            onDragStart(e.clientY);
            const onMouseMove = (ev) => onDragMove(ev.clientY);
            const onMouseUp = () => {
                onDragEnd();
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });

        cardsContainer.appendChild(itemContainer);
    });
}

function closeAppFromSwitcher(appId) {
    closeApp(appId);
    renderIosSwitcherCards();
    if (runningApps.length === 0) {
        setTimeout(() => {
            closeIosAppSwitcher();
        }, 150);
    }
}

function closeAllMobileApps() {
    const appsToClose = [...runningApps];
    appsToClose.forEach(id => closeApp(id));
    closeIosAppSwitcher();
    showToast('All apps closed', 'fas fa-check-circle');
}

// ==========================================================================
// macOS Tahoe Mission Control (Exposé) Core
// ==========================================================================

// ==========================================================================
// macOS 26 Tahoe Mission Control (Exposé) & Spaces Management
// ==========================================================================

let tahoeSpaces = [
    { id: 'space-1', name: 'Desktop 1', type: 'alpine', bg: 'var(--mac-bg)' },
    { id: 'space-2', name: 'Desktop 2 (Dev)', type: 'dev', bg: 'linear-gradient(135deg, #0b0f19 0%, #030712 100%)' }
];
let currentTahoeSpaceIdx = 0;

function renderMissionControlSpaces() {
    const container = document.getElementById('tahoe-spaces-container');
    if (!container) return;

    container.innerHTML = '';

    tahoeSpaces.forEach((space, index) => {
        const item = document.createElement('div');
        item.className = `tahoe-space-item ${index === currentTahoeSpaceIdx ? 'is-active' : ''}`;
        item.onclick = (e) => {
            e.stopPropagation();
            switchTahoeSpace(index);
        };

        const screen = document.createElement('div');
        screen.className = 'tahoe-space-screen';
        
        // Use active wallpaper for Desktop 1 or configured background
        if (index === 0) {
            screen.style.backgroundImage = typeof TAHOE_WALLPAPERS !== 'undefined' 
                ? `url('${TAHOE_WALLPAPERS[currentWallpaperIdx]}')` 
                : 'var(--mac-bg)';
        } else if (space.bg && space.bg.startsWith('url')) {
            screen.style.backgroundImage = space.bg;
        } else {
            screen.style.background = space.bg || 'linear-gradient(135deg, #111827 0%, #030712 100%)';
        }

        // Mini menubar line and mini dock
        const bar = document.createElement('div');
        bar.className = 'tahoe-space-screen-bar';
        const dock = document.createElement('div');
        dock.className = 'tahoe-space-screen-dock';
        screen.appendChild(bar);
        screen.appendChild(dock);

        // Close button for extra spaces (Desktop 2+)
        if (index > 0) {
            const closeBtn = document.createElement('div');
            closeBtn.className = 'tahoe-space-close';
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.title = 'Remove Desktop Space';
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                removeTahoeSpace(index);
            };
            item.appendChild(closeBtn);
        }

        const title = document.createElement('span');
        title.className = 'tahoe-space-title';
        title.innerText = space.name;

        item.appendChild(screen);
        item.appendChild(title);
        container.appendChild(item);
    });

    // Add Space Button if spaces < 6
    if (tahoeSpaces.length < 6) {
        const addBtn = document.createElement('div');
        addBtn.className = 'tahoe-space-add-btn';
        addBtn.title = 'Create New Desktop Space';
        addBtn.innerHTML = `
            <i class="fas fa-plus text-xs mb-0.5"></i>
            <span class="text-[10px] font-semibold">New Space</span>
        `;
        addBtn.onclick = (e) => {
            e.stopPropagation();
            addTahoeSpace();
        };
        container.appendChild(addBtn);
    }
}

function switchTahoeSpace(idx) {
    currentTahoeSpaceIdx = idx;
    renderMissionControlSpaces();
    showToast(`Switched to ${tahoeSpaces[idx].name}`, 'fas fa-desktop');
}

function addTahoeSpace() {
    const newIdx = tahoeSpaces.length + 1;
    tahoeSpaces.push({
        id: `space-${newIdx}`,
        name: `Desktop ${newIdx}`,
        type: 'custom',
        bg: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)'
    });
    currentTahoeSpaceIdx = tahoeSpaces.length - 1;
    renderMissionControlSpaces();
    showToast(`Created Desktop ${newIdx} Space`, 'fas fa-plus');
}

function removeTahoeSpace(idx) {
    if (tahoeSpaces.length <= 1) return;
    const removedName = tahoeSpaces[idx].name;
    tahoeSpaces.splice(idx, 1);
    if (currentTahoeSpaceIdx >= tahoeSpaces.length) {
        currentTahoeSpaceIdx = tahoeSpaces.length - 1;
    }
    renderMissionControlSpaces();
    showToast(`Closed ${removedName}`, 'fas fa-times');
}

function closeMissionControl() {
    isMissionControlOpen = false;
    document.body.classList.remove('tahoe-mc-mode');
    const missionControlEl = document.getElementById('macos-mission-control');
    if (missionControlEl) {
        missionControlEl.classList.remove('is-active');
        missionControlEl.style.display = 'none';
        missionControlEl.style.opacity = '0';
        missionControlEl.style.pointerEvents = 'none';
    }
}

function openMissionControl() {
    if (window.innerWidth < 768) return; // Desktop only
    const missionControlEl = document.getElementById('macos-mission-control');
    if (!missionControlEl) return;

    isMissionControlOpen = true;
    document.body.classList.add('tahoe-mc-mode');
    missionControlEl.style.display = 'flex';
    void missionControlEl.offsetWidth; // force reflow
    missionControlEl.classList.add('is-active');
    missionControlEl.style.opacity = '1';
    missionControlEl.style.pointerEvents = 'auto';

    renderMissionControlSpaces();
    renderMissionControlTiles();
}

function toggleMissionControl(forceState) {
    if (window.innerWidth < 768) return; // Desktop only

    if (forceState === true) {
        openMissionControl();
    } else if (forceState === false) {
        closeMissionControl();
    } else {
        if (isMissionControlOpen) {
            closeMissionControl();
        } else {
            openMissionControl();
        }
    }
}

function handleMissionControlBackdropClick(e) {
    // If the click did not land on a window card, pill, close button, space item, or interactive control, immediately exit Mission Control!
    if (!e.target.closest('.mission-window-card') && 
        !e.target.closest('.mission-window-pill') && 
        !e.target.closest('.mission-control-tile-close') && 
        !e.target.closest('.tahoe-spaces-shelf') && 
        !e.target.closest('.tahoe-mc-empty-palette') && 
        !e.target.closest('button')) {
        closeMissionControl();
    }
}

function renderMissionControlTiles() {
    const tilesContainer = document.getElementById('mission-control-tiles');
    if (!tilesContainer) return;

    tilesContainer.innerHTML = '';

    // Find all currently open windows
    const openWindows = document.querySelectorAll('.app-window.is-open');

    if (openWindows.length === 0) {
        // macOS Tahoe Clean Quick-Launch Matrix (Authentic Launchpad style, no clunky box)
        tilesContainer.innerHTML = `
            <div class="tahoe-mc-empty-palette" onclick="event.stopPropagation()">
                <div class="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-widest mb-1">
                    <i class="fab fa-apple text-sm"></i>
                    <span>macOS Tahoe 26.1 • ${tahoeSpaces[currentTahoeSpaceIdx] ? tahoeSpaces[currentTahoeSpaceIdx].name : 'Desktop 1'}</span>
                </div>
                <h2 class="text-xl font-bold text-white tracking-tight">Desktop Workspace Clean</h2>
                <p class="text-xs text-gray-300/80 max-w-md mt-1">No applications are open in this space. Click any app below to launch into your workspace:</p>
                
                <div class="tahoe-mc-app-grid">
                    <div class="tahoe-mc-app-item" onclick="event.stopPropagation(); toggleMissionControl(false); openApp('about')">
                        <div class="tahoe-mc-app-icon bg-gradient-to-tr from-sky-400 to-blue-600">
                            <i class="fab fa-safari"></i>
                        </div>
                        <span class="tahoe-mc-app-label">Safari</span>
                        <span class="tahoe-mc-app-sub">About Me</span>
                    </div>
                    <div class="tahoe-mc-app-item" onclick="event.stopPropagation(); toggleMissionControl(false); openApp('projects')">
                        <div class="tahoe-mc-app-icon bg-black text-green-400 border border-gray-700">
                            <i class="fas fa-terminal"></i>
                        </div>
                        <span class="tahoe-mc-app-label">Terminal</span>
                        <span class="tahoe-mc-app-sub">Projects</span>
                    </div>
                    <div class="tahoe-mc-app-item" onclick="event.stopPropagation(); toggleMissionControl(false); openSkillsFolderModal()">
                        <div class="tahoe-mc-app-icon bg-gradient-to-b from-gray-200 to-gray-400 text-gray-800">
                            <i class="fas fa-gear"></i>
                        </div>
                        <span class="tahoe-mc-app-label">Settings</span>
                        <span class="tahoe-mc-app-sub">Skills</span>
                    </div>
                    <div class="tahoe-mc-app-item" onclick="event.stopPropagation(); toggleMissionControl(false); openApp('contact')">
                        <div class="tahoe-mc-app-icon bg-gradient-to-tr from-sky-400 to-blue-600">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <span class="tahoe-mc-app-label">Mail</span>
                        <span class="tahoe-mc-app-sub">Contact</span>
                    </div>
                    <div class="tahoe-mc-app-item" onclick="event.stopPropagation(); toggleMissionControl(false); openApp('gallery')">
                        <div class="tahoe-mc-app-icon bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500">
                            <i class="fas fa-images"></i>
                        </div>
                        <span class="tahoe-mc-app-label">Photos</span>
                        <span class="tahoe-mc-app-sub">Gallery</span>
                    </div>
                    <div class="tahoe-mc-app-item" onclick="event.stopPropagation(); toggleMissionControl(false); openApp('calculator')">
                        <div class="tahoe-mc-app-icon bg-gradient-to-b from-amber-500 to-orange-600">
                            <i class="fas fa-calculator"></i>
                        </div>
                        <span class="tahoe-mc-app-label">Calculator</span>
                        <span class="tahoe-mc-app-sub">Math</span>
                    </div>
                    <div class="tahoe-mc-app-item" onclick="event.stopPropagation(); toggleMissionControl(false); openApp('notes')">
                        <div class="tahoe-mc-app-icon bg-gradient-to-b from-amber-300 to-yellow-500 text-amber-900">
                            <i class="fas fa-note-sticky"></i>
                        </div>
                        <span class="tahoe-mc-app-label">Notes</span>
                        <span class="tahoe-mc-app-sub">DevPad</span>
                    </div>
                    <div class="tahoe-mc-app-item" onclick="event.stopPropagation(); toggleMissionControl(false); openApp('calendar')">
                        <div class="tahoe-mc-app-icon bg-gradient-to-b from-red-500 to-rose-600">
                            <i class="far fa-calendar-alt"></i>
                        </div>
                        <span class="tahoe-mc-app-label">Calendar</span>
                        <span class="tahoe-mc-app-sub">Schedule</span>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // Size cards dynamically according to window count
    let cardWidth = '520px';
    let cardHeight = '340px';
    if (openWindows.length === 1) {
        cardWidth = '660px';
        cardHeight = '410px';
    } else if (openWindows.length === 2) {
        cardWidth = '540px';
        cardHeight = '350px';
    } else if (openWindows.length >= 4) {
        cardWidth = '460px';
        cardHeight = '295px';
    }

    openWindows.forEach(win => {
        const appId = win.id.replace('app-', '');
        const meta = (typeof APP_METADATA !== 'undefined' && APP_METADATA[appId]) || {
            title: appId,
            subtitle: appId,
            icon: 'fas fa-window-maximize',
            iconColor: 'bg-blue-500',
            badge: 'Window'
        };

        const itemContainer = document.createElement('div');
        itemContainer.className = 'mission-item-container';

        // Floating Title Pill ABOVE window (macOS Tahoe style)
        const pill = document.createElement('div');
        pill.className = 'mission-window-pill';
        pill.innerHTML = `<i class="${meta.icon} text-cyan-400"></i> <span class="font-bold text-white">${meta.title}</span> <span class="text-white/60 text-xs">— ${meta.subtitle}</span>`;

        // Native macOS Window Card
        const card = document.createElement('div');
        card.className = 'mission-window-card';
        card.style.width = cardWidth;
        card.style.height = cardHeight;

        // Window Titlebar with authentic traffic lights
        const titlebar = document.createElement('div');
        titlebar.className = 'h-9 px-3.5 bg-[#181b24] border-b border-white/10 flex items-center justify-between select-none';
        titlebar.innerHTML = `
            <div class="flex items-center space-x-2">
                <div class="mission-control-tile-close" title="Close Window"><i class="fas fa-times"></i></div>
                <div class="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] border border-[#dea123] opacity-80"></div>
                <div class="w-3.5 h-3.5 rounded-full bg-[#27c93f] border border-[#1aab29] opacity-80"></div>
            </div>
            <div class="text-xs font-semibold text-gray-300 flex items-center space-x-1.5">
                <i class="${meta.icon} text-xs text-blue-400"></i>
                <span>${meta.title}</span>
            </div>
            <div class="text-[10px] text-gray-400 font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10">macOS 26</div>
        `;

        // Red traffic light close handler directly closes the app from Mission Control
        const closeBtn = titlebar.querySelector('.mission-control-tile-close');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                closeApp(appId);
                renderMissionControlTiles();
                renderMissionControlSpaces();
            };
        }

        // Realistic app preview content
        const body = document.createElement('div');
        body.className = 'flex-1 overflow-hidden p-5 flex flex-col justify-between text-left';

        let bodyHtml = '';
        if (appId === 'about') {
            body.className += ' bg-gradient-to-b from-[#1b1e28] to-[#12141a] text-white';
            bodyHtml = `
                <div class="space-y-3">
                    <div class="flex items-center space-x-3.5 p-3 rounded-2xl bg-white/10 border border-white/10">
                        <img src="profile.png" alt="Profile" class="w-14 h-14 rounded-2xl object-cover object-top border-2 border-white/20 shadow-md">
                        <div>
                            <h3 class="text-base font-bold text-white leading-tight">Ranveer Jaiswal</h3>
                            <h4 class="text-xs text-blue-400 font-semibold mt-0.5">Full Stack / MERN Developer</h4>
                            <p class="text-[11px] text-gray-400 mt-1">Branding Pioneers (Gurgaon) • React, Node, Express, Docker, AWS</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="p-2.5 rounded-xl bg-white/5 border border-white/10">
                            <span class="text-[10px] text-emerald-400 font-semibold block uppercase">Branding Pioneers</span>
                            <span class="text-xs text-gray-300">Employee Task Tracker (50% efficiency boost)</span>
                        </div>
                        <div class="p-2.5 rounded-xl bg-white/5 border border-white/10">
                            <span class="text-[10px] text-blue-400 font-semibold block uppercase">B. Pharm (7.0 CGPA)</span>
                            <span class="text-xs text-gray-300">Krishnarpit Institute of Technology</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-gray-400">
                    <span><i class="fas fa-map-marker-alt text-red-400 mr-1"></i> Gurgaon, India</span>
                    <span class="text-blue-400 font-semibold">Click to focus window &rarr;</span>
                </div>
            `;
        } else if (appId === 'projects') {
            body.className += ' bg-[#090b10] text-gray-200 font-mono';
            bodyHtml = `
                <div class="space-y-2.5 text-xs">
                    <div class="flex items-center space-x-2 text-gray-500 pb-2 border-b border-gray-800">
                        <span class="text-emerald-400">ranveer@macbook:~/projects</span>
                        <span class="text-gray-600">(main)</span>
                        <span class="text-gray-400">$ ls -la</span>
                    </div>
                    <div class="space-y-1.5 text-xs">
                        <div class="flex items-center justify-between text-blue-300">
                            <span><i class="fab fa-npm text-red-500 mr-1.5"></i> fullstack-code-visualiser</span>
                            <span class="text-gray-500 font-sans text-[10px]">AST MERN Mapper</span>
                        </div>
                        <div class="flex items-center justify-between text-amber-300">
                            <span><i class="fas fa-user-check text-amber-400 mr-1.5"></i> hr-buddy</span>
                            <span class="text-gray-500 font-sans text-[10px]">AI Onboarding System</span>
                        </div>
                        <div class="flex items-center justify-between text-purple-300">
                            <span><i class="fas fa-chess-knight text-purple-400 mr-1.5"></i> srchess</span>
                            <span class="text-gray-500 font-sans text-[10px]">Multiplayer Chess</span>
                        </div>
                        <div class="flex items-center justify-between text-emerald-300">
                            <span><i class="fas fa-desktop text-emerald-400 mr-1.5"></i> pioneeros</span>
                            <span class="text-gray-500 font-sans text-[10px]">Queue Management</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-gray-800 text-[11px] text-gray-400">
                    <span class="text-emerald-400 flex items-center"><span class="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span> zsh running</span>
                    <span class="text-green-400 font-sans font-medium">Click to focus &rarr;</span>
                </div>
            `;
        } else if (appId === 'skills') {
            body.className += ' bg-gradient-to-b from-[#1c1e28] to-[#12141a] text-white';
            bodyHtml = `
                <div class="space-y-2">
                    <div class="text-[11px] font-bold uppercase tracking-wider text-gray-400">System Preferences • Tech Stack</div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <span class="flex items-center"><i class="devicon-javascript-plain colored mr-2 text-base"></i> JavaScript</span>
                            <span class="text-[10px] text-blue-300 font-semibold">ES6+</span>
                        </div>
                        <div class="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <span class="flex items-center"><i class="devicon-react-original colored mr-2 text-base"></i> React / Next</span>
                            <span class="text-[10px] text-blue-300 font-semibold">MERN</span>
                        </div>
                        <div class="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <span class="flex items-center"><i class="devicon-docker-plain colored mr-2 text-base"></i> Docker</span>
                            <span class="text-[10px] text-emerald-300 font-semibold">Advanced</span>
                        </div>
                        <div class="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <span class="flex items-center"><i class="devicon-amazonwebservices-plain-wordmark colored mr-2 text-base"></i> AWS Cloud</span>
                            <span class="text-[10px] text-amber-300 font-semibold">Proficient</span>
                        </div>
                        <div class="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <span class="flex items-center"><i class="devicon-mongodb-plain colored mr-2 text-base"></i> MongoDB</span>
                            <span class="text-[10px] text-emerald-300 font-semibold">NoSQL</span>
                        </div>
                        <div class="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <span class="flex items-center"><i class="devicon-postgresql-plain colored mr-2 text-base"></i> PostgreSQL</span>
                            <span class="text-[10px] text-blue-300 font-semibold">Prisma</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-gray-400">
                    <span>Full Stack Developer Environment</span>
                    <span class="text-blue-400 font-semibold">Click to focus &rarr;</span>
                </div>
            `;
        } else if (appId === 'contact') {
            body.className += ' bg-gradient-to-b from-[#1b1e27] to-[#111319] text-white';
            bodyHtml = `
                <div class="space-y-3">
                    <div class="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2 text-xs">
                        <div class="flex items-center justify-between border-b border-white/10 pb-2">
                            <span class="text-gray-400">To:</span>
                            <span class="text-blue-300 font-semibold">ranveerjais9984@gmail.com</span>
                        </div>
                        <div class="flex items-center justify-between border-b border-white/10 pb-2">
                            <span class="text-gray-400">Subject:</span>
                            <span class="text-gray-200">Software Developer Role / Collaboration</span>
                        </div>
                        <div class="text-[11px] text-gray-400 leading-relaxed">
                            Looking forward to discussing full-stack web and mobile engineering opportunities.
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-gray-400">
                    <span><i class="fas fa-phone text-emerald-400 mr-1"></i> +91 9648165493</span>
                    <span class="text-blue-400 font-semibold">Click to focus &rarr;</span>
                </div>
            `;
        } else if (appId === 'calculator') {
            body.className += ' bg-gradient-to-b from-[#1c1d22] to-[#121316] text-white';
            bodyHtml = `
                <div class="space-y-3">
                    <div class="p-3 bg-black/40 rounded-xl border border-white/10 text-right">
                        <span class="text-[10px] text-gray-500 block font-mono">1,024 × 8</span>
                        <span class="text-2xl font-light text-white font-mono tracking-tight">8,192</span>
                    </div>
                    <div class="grid grid-cols-4 gap-1.5 text-center text-xs font-semibold">
                        <div class="p-2 rounded-lg bg-gray-600/50 text-white">C</div>
                        <div class="p-2 rounded-lg bg-gray-600/50 text-white">±</div>
                        <div class="p-2 rounded-lg bg-gray-600/50 text-white">%</div>
                        <div class="p-2 rounded-lg bg-amber-500 text-white">÷</div>
                        <div class="p-2 rounded-lg bg-gray-700/60 text-white">7</div>
                        <div class="p-2 rounded-lg bg-gray-700/60 text-white">8</div>
                        <div class="p-2 rounded-lg bg-gray-700/60 text-white">9</div>
                        <div class="p-2 rounded-lg bg-amber-500 text-white">×</div>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-gray-400">
                    <span>macOS Calculator Engine</span>
                    <span class="text-amber-400 font-semibold">Click to focus &rarr;</span>
                </div>
            `;
        } else if (appId === 'notes') {
            body.className += ' bg-gradient-to-b from-[#1e1c18] to-[#14120e] text-white';
            bodyHtml = `
                <div class="space-y-2.5">
                    <div class="flex items-center space-x-2 text-amber-400 text-xs font-semibold pb-1.5 border-b border-white/10">
                        <i class="fas fa-note-sticky text-sm"></i>
                        <span>Ranveer's DevPad • Scratchpad</span>
                    </div>
                    <div class="space-y-1.5 text-xs text-gray-300">
                        <div class="p-2 rounded-lg bg-white/5 border border-white/10">
                            <span class="text-[11px] font-bold text-amber-300 block">⚡ Full Stack Architecture:</span>
                            <span class="text-[11px] text-gray-400">REST APIs, JWT, Redis caching, Docker containerization.</span>
                        </div>
                        <div class="p-2 rounded-lg bg-white/5 border border-white/10">
                            <span class="text-[11px] font-bold text-sky-300 block">📌 Branding Pioneers Milestones:</span>
                            <span class="text-[11px] text-gray-400">Built task tracking system boosting sprint turnaround by 50%.</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-gray-400">
                    <span>DevPad Auto-saved</span>
                    <span class="text-amber-400 font-semibold">Click to focus &rarr;</span>
                </div>
            `;
        } else if (appId === 'calendar') {
            body.className += ' bg-gradient-to-b from-[#1c1a24] to-[#121118] text-white';
            const now = new Date();
            const daysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            bodyHtml = `
                <div class="space-y-3">
                    <div class="flex items-center justify-between pb-2 border-b border-white/10">
                        <div class="flex items-center space-x-2.5">
                            <div class="w-10 h-10 rounded-xl bg-red-500/20 text-[#ff3b30] flex items-center justify-center text-lg">
                                <i class="far fa-calendar-alt"></i>
                            </div>
                            <div>
                                <span class="text-xs uppercase font-extrabold text-[#ff3b30] block">${daysFull[now.getDay()]}</span>
                                <span class="text-sm font-bold text-white">${monthsFull[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}</span>
                            </div>
                        </div>
                        <span class="text-[10px] font-mono text-gray-400 px-2 py-0.5 rounded bg-white/5 border border-white/10">macOS 26 Tahoe</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="p-2.5 rounded-xl bg-white/5 border border-white/10">
                            <span class="text-[10px] text-red-400 font-bold block uppercase">09:30 AM • Daily Sync</span>
                            <span class="text-xs text-gray-300">Branding Pioneers Task Tracker</span>
                        </div>
                        <div class="p-2.5 rounded-xl bg-white/5 border border-white/10">
                            <span class="text-[10px] text-blue-400 font-bold block uppercase">11:00 AM • Architecture</span>
                            <span class="text-xs text-gray-300">AST Code Visualizer Optimization</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-gray-400">
                    <span>Synchronized with Google & Apple Calendar</span>
                    <span class="text-red-400 font-semibold">Click to focus &rarr;</span>
                </div>
            `;
        } else {
            body.className += ' bg-gradient-to-b from-[#181a24] to-[#0f1118] text-white';
            bodyHtml = `
                <div class="space-y-2.5">
                    <div class="text-xs font-bold text-gray-300">Media Hub & Photos Library</div>
                    <div class="grid grid-cols-4 gap-2">
                        <div class="h-20 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 border border-white/20 flex items-center justify-center text-white"><i class="fas fa-image text-xl"></i></div>
                        <div class="h-20 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 border border-white/20 flex items-center justify-center text-white"><i class="fas fa-play text-xl"></i></div>
                        <div class="h-20 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 border border-white/20 flex items-center justify-center text-white"><i class="fas fa-images text-xl"></i></div>
                        <div class="h-20 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 border border-white/20 flex items-center justify-center text-white"><i class="fas fa-film text-xl"></i></div>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-gray-400">
                    <span>Uploaded gallery items</span>
                    <span class="text-pink-400 font-semibold">Click to focus &rarr;</span>
                </div>
            `;
        }

        body.innerHTML = bodyHtml;
        card.appendChild(titlebar);
        card.appendChild(body);

        // Click card to focus window and exit Mission Control immediately!
        card.onclick = () => {
            toggleMissionControl(false);
            bringToFront(win);
        };

        itemContainer.appendChild(pill);
        itemContainer.appendChild(card);
        tilesContainer.appendChild(itemContainer);
    });
}

function initDesktopMissionControlGestures() {
    // Multi-touch gestures (e.g. touchscreens / precision trackpads)
    let multiTouchStartY = 0;
    window.addEventListener('touchstart', (e) => {
        if (e.touches.length === 3) {
            multiTouchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        if (multiTouchStartY > 0 && e.changedTouches.length >= 1) {
            const delta = multiTouchStartY - e.changedTouches[0].clientY;
            if (delta > 50) {
                // 3 fingers swiped up!
                openMissionControl();
            } else if (delta < -50 && isMissionControlOpen) {
                // 3 fingers swiped down!
                closeMissionControl();
            }
            multiTouchStartY = 0;
        }
    }, { passive: true });

    // Keyboard shortcuts: F3 or Ctrl+ArrowUp or Cmd+ArrowUp, and unconditional Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F3' || ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp')) {
            e.preventDefault();
            toggleMissionControl();
        } else if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
            closeMissionControl();
            closeIosAppSwitcher();
            closeSkillsFolderModal();
            closeFolderModal();
            closeReadmeModal();
            closeGalleryLightbox();
            closeSpotlight();
            closeAppleMenu();
            closeControlCenter();
            closeAboutThisMac();
        } else if (isMissionControlOpen && (e.key === 'ArrowDown' || ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown'))) {
            e.preventDefault();
            closeMissionControl();
        }
    });
}

// ==========================================================================
// macOS 26 Tahoe Interactive Physics Dock (React-ported Cosine Magnification)
// ==========================================================================

const macDockApps = [
    {
        id: "about",
        name: "Finder",
        icon: "https://cdn.jim-nielsen.com/macos/1024/finder-2021-09-10.png?rf=1024",
        action: () => openApp('about')
    },
    {
        id: "projects",
        name: "Terminal",
        icon: "https://cdn.jim-nielsen.com/macos/1024/terminal-2021-06-03.png?rf=1024",
        action: () => openApp('projects')
    },
    {
        id: "nothing-veer",
        name: "Veer Music",
        icon: "https://cdn.jim-nielsen.com/macos/1024/music-2021-05-25.png?rf=1024",
        action: () => openReadmeModal('nothing-veer')
    },
    {
        id: "skills",
        name: "System Settings",
        icon: "https://cdn.jim-nielsen.com/macos/1024/system-preferences-2021-05-25.png?rf=1024",
        action: () => openSkillsFolderModal()
    },
    {
        id: "calculator",
        name: "Calculator",
        icon: "https://cdn.jim-nielsen.com/macos/1024/calculator-2021-04-29.png?rf=1024",
        action: () => openApp('calculator')
    },
    {
        id: "contact",
        name: "Mail",
        icon: "https://cdn.jim-nielsen.com/macos/1024/mail-2021-05-25.png?rf=1024",
        action: () => openApp('contact')
    },
    {
        id: "gallery",
        name: "Photos",
        icon: "https://cdn.jim-nielsen.com/macos/1024/photos-2021-05-28.png?rf=1024",
        action: () => openApp('gallery')
    },
    {
        id: "srchess",
        name: "Safari",
        icon: "https://cdn.jim-nielsen.com/macos/1024/safari-2021-06-02.png?rf=1024",
        action: () => window.open('https://srchess.vercel.app/', '_blank')
    },
    {
        id: "notes",
        name: "Notes",
        icon: "https://cdn.jim-nielsen.com/macos/1024/notes-2021-05-25.png?rf=1024",
        action: () => openApp('notes')
    },
    {
        id: "calendar",
        name: "Calendar",
        icon: "https://cdn.jim-nielsen.com/macos/1024/calendar-2021-04-29.png?rf=1024",
        action: () => openApp('calendar')
    },
    {
        id: "folder",
        name: "Projects",
        icon: "https://cdn.jim-nielsen.com/macos/1024/launchpad-2021-05-25.png?rf=1024",
        action: () => openFolderModal()
    }
];

let dockMouseX = null;
let dockCurrentScales = macDockApps.map(() => 1);
let dockCurrentPositions = [];
let dockAnimFrame = null;
let dockLastMouseMoveTime = 0;
let dockConfig = { baseIconSize: 64, maxScale: 1.8, effectWidth: 300 };

function getDockResponsiveConfig() {
    const smallerDimension = Math.min(window.innerWidth, window.innerHeight);
    if (smallerDimension < 480) {
        return {
            baseIconSize: Math.max(40, smallerDimension * 0.08),
            maxScale: 1.4,
            effectWidth: smallerDimension * 0.4
        };
    }
    if (smallerDimension < 768) {
        return {
            baseIconSize: Math.max(48, smallerDimension * 0.07),
            maxScale: 1.5,
            effectWidth: smallerDimension * 0.35
        };
    }
    if (smallerDimension < 1024) {
        return {
            baseIconSize: Math.max(56, smallerDimension * 0.06),
            maxScale: 1.6,
            effectWidth: smallerDimension * 0.3
        };
    }
    return {
        baseIconSize: Math.max(60, Math.min(76, smallerDimension * 0.05)),
        maxScale: 1.75,
        effectWidth: 280
    };
}

function calculateTargetMagnification(mousePosition, appsCount, baseIconSize, baseSpacing, effectWidth, maxScale, minScale) {
    if (mousePosition === null) {
        return Array(appsCount).fill(minScale);
    }
    return Array.from({ length: appsCount }, (_, index) => {
        const normalIconCenter = index * (baseIconSize + baseSpacing) + baseIconSize / 2;
        const minX = mousePosition - effectWidth / 2;
        const maxX = mousePosition + effectWidth / 2;

        if (normalIconCenter < minX || normalIconCenter > maxX) {
            return minScale;
        }

        const theta = ((normalIconCenter - minX) / effectWidth) * 2 * Math.PI;
        const cappedTheta = Math.min(Math.max(theta, 0), 2 * Math.PI);
        const scaleFactor = (1 - Math.cos(cappedTheta)) / 2;

        return minScale + scaleFactor * (maxScale - minScale);
    });
}

function calculateDockPositions(scales, baseIconSize, baseSpacing) {
    let currentX = 0;
    return scales.map(scale => {
        const scaledWidth = baseIconSize * scale;
        const centerX = currentX + scaledWidth / 2;
        currentX += scaledWidth + baseSpacing;
        return centerX;
    });
}

function initMacOSDock() {
    const dockContainer = document.getElementById('macos-dock');
    const dockInner = document.getElementById('macos-dock-inner');
    if (!dockContainer || !dockInner) return;

    dockConfig = getDockResponsiveConfig();
    const { baseIconSize, effectWidth, maxScale } = dockConfig;
    const minScale = 1.0;
    const baseSpacing = Math.max(4, baseIconSize * 0.08);

    dockCurrentScales = macDockApps.map(() => minScale);
    dockCurrentPositions = calculateDockPositions(dockCurrentScales, baseIconSize, baseSpacing);

    // Render DOM elements for each app
    dockInner.innerHTML = macDockApps.map((app, index) => {
        return `
            <div id="dock-item-${app.id}" class="absolute cursor-pointer flex flex-col items-center justify-end"
                 onclick="handleMacDockAppClick('${app.id}', ${index})"
                 style="transform-origin: bottom center; will-change: transform, left, width, height;"
                 title="${app.name}">
                <img id="dock-img-${app.id}" src="${app.icon}" alt="${app.name}" class="object-contain"
                     style="width: 100%; height: 100%; pointer-events: none;"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="hidden w-full h-full rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 items-center justify-center text-white text-xl font-bold shadow-md">
                    ${app.name.charAt(0)}
                </div>
                <div id="dock-dot-${app.id}" class="absolute w-1.5 h-1.5 rounded-full bg-white/90 shadow-sm"
                     style="bottom: -5px; left: 50%; transform: translateX(-50%); display: ${runningApps.includes(app.id) ? 'block' : 'none'};"></div>
            </div>
        `;
    }).join('');

    // Dock container styles matching user's React component
    const padding = Math.max(8, baseIconSize * 0.12);
    dockContainer.style.background = "rgba(45, 45, 45, 0.75)";
    dockContainer.style.borderRadius = `${Math.max(14, baseIconSize * 0.4)}px`;
    dockContainer.style.border = "1px solid rgba(255, 255, 255, 0.18)";
    dockContainer.style.boxShadow = `
        0 ${Math.max(4, baseIconSize * 0.1)}px ${Math.max(16, baseIconSize * 0.4)}px rgba(0, 0, 0, 0.4),
        0 ${Math.max(2, baseIconSize * 0.05)}px ${Math.max(8, baseIconSize * 0.2)}px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.15),
        inset 0 -1px 0 rgba(0, 0, 0, 0.2)
    `;
    dockContainer.style.padding = `${padding}px`;
    dockInner.style.height = `${baseIconSize}px`;

    // Mouse Listeners
    dockContainer.addEventListener('mousemove', (e) => {
        const now = performance.now();
        if (now - dockLastMouseMoveTime < 16) return;
        dockLastMouseMoveTime = now;
        const rect = dockContainer.getBoundingClientRect();
        dockMouseX = e.clientX - rect.left - padding;
        if (!dockAnimFrame) {
            dockAnimFrame = requestAnimationFrame(animateDockToTarget);
        }
    });

    dockContainer.addEventListener('mouseleave', () => {
        dockMouseX = null;
        if (!dockAnimFrame) {
            dockAnimFrame = requestAnimationFrame(animateDockToTarget);
        }
    });

    window.addEventListener('resize', () => {
        dockConfig = getDockResponsiveConfig();
        if (!dockAnimFrame) {
            dockAnimFrame = requestAnimationFrame(animateDockToTarget);
        }
    });

    // Start initial frame
    dockAnimFrame = requestAnimationFrame(animateDockToTarget);
}

function animateDockToTarget() {
    dockAnimFrame = null;
    const dockContainer = document.getElementById('macos-dock');
    if (!dockContainer) return;

    const { baseIconSize, effectWidth, maxScale } = dockConfig;
    const minScale = 1.0;
    const baseSpacing = Math.max(4, baseIconSize * 0.08);
    const padding = Math.max(8, baseIconSize * 0.12);

    const targetScales = calculateTargetMagnification(dockMouseX, macDockApps.length, baseIconSize, baseSpacing, effectWidth, maxScale, minScale);
    const targetPositions = calculateDockPositions(targetScales, baseIconSize, baseSpacing);
    const lerpFactor = dockMouseX !== null ? 0.2 : 0.12;

    let maxRight = 0;

    macDockApps.forEach((app, index) => {
        // Interpolate scale & position
        const scaleDiff = targetScales[index] - dockCurrentScales[index];
        dockCurrentScales[index] += scaleDiff * lerpFactor;

        const posDiff = targetPositions[index] - dockCurrentPositions[index];
        dockCurrentPositions[index] += posDiff * lerpFactor;

        const scale = dockCurrentScales[index];
        const position = dockCurrentPositions[index];
        const scaledSize = baseIconSize * scale;

        const el = document.getElementById(`dock-item-${app.id}`);
        if (el) {
            el.style.left = `${position - scaledSize / 2}px`;
            el.style.bottom = "0px";
            el.style.width = `${scaledSize}px`;
            el.style.height = `${scaledSize}px`;
            el.style.zIndex = Math.round(scale * 10);

            const img = document.getElementById(`dock-img-${app.id}`);
            if (img) {
                const shadowScale = scale > 1.2 ? Math.max(2, baseIconSize * 0.05) : Math.max(1, baseIconSize * 0.03);
                const blurScale = scale > 1.2 ? Math.max(4, baseIconSize * 0.1) : Math.max(2, baseIconSize * 0.06);
                const alpha = 0.2 + (scale - 1) * 0.15;
                img.style.filter = `drop-shadow(0 ${shadowScale}px ${blurScale}px rgba(0,0,0,${alpha}))`;
            }
        }

        const iconRight = position + scaledSize / 2;
        if (iconRight > maxRight) maxRight = iconRight;
    });

    // Update dynamic dock container width
    const contentWidth = maxRight > 0 ? maxRight : (macDockApps.length * (baseIconSize + baseSpacing) - baseSpacing);
    dockContainer.style.width = `${contentWidth + padding * 2}px`;

    // Check if still needing animation
    const scalesNeedUpdate = dockCurrentScales.some((scale, index) => Math.abs(scale - targetScales[index]) > 0.002);
    const positionsNeedUpdate = dockCurrentPositions.some((pos, index) => Math.abs(pos - targetPositions[index]) > 0.1);

    if (scalesNeedUpdate || positionsNeedUpdate || dockMouseX !== null) {
        dockAnimFrame = requestAnimationFrame(animateDockToTarget);
    }
}

function handleMacDockAppClick(appId, index) {
    const el = document.getElementById(`dock-item-${appId}`);
    if (el) {
        const bounceHeight = Math.max(-12, -dockConfig.baseIconSize * 0.22);
        el.style.transition = "transform 0.18s cubic-bezier(0.28, 0.84, 0.42, 1)";
        el.style.transform = `translateY(${bounceHeight}px)`;
        setTimeout(() => {
            el.style.transform = "translateY(0px)";
        }, 180);
    }

    const app = macDockApps[index];
    if (app && typeof app.action === 'function') {
        app.action();
    }
    updateMacOSDockOpenApps();
}

function updateMacOSDockOpenApps() {
    macDockApps.forEach(app => {
        const dot = document.getElementById(`dock-dot-${app.id}`);
        if (dot) {
            dot.style.display = runningApps.includes(app.id) ? 'block' : 'none';
        }
    });
}

// --- macOS 26 Tahoe Apple Menu, Control Center & System Profiler ---
function toggleAppleMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('macos-apple-menu');
    if (!menu) return;
    const isOpen = menu.classList.contains('is-open');
    closeControlCenter();
    if (isOpen) {
        menu.classList.remove('is-open');
    } else {
        menu.classList.add('is-open');
    }
}

function closeAppleMenu() {
    const menu = document.getElementById('macos-apple-menu');
    if (menu) menu.classList.remove('is-open');
}

function toggleControlCenter(e) {
    if (e) e.stopPropagation();
    const cc = document.getElementById('macos-control-center');
    const btn = document.getElementById('mac-control-center-btn');
    if (!cc) return;
    const isOpen = cc.classList.contains('is-open');
    closeAppleMenu();
    if (isOpen) {
        cc.classList.remove('is-open');
        if (btn) btn.classList.remove('active');
    } else {
        cc.classList.add('is-open');
        if (btn) btn.classList.add('active');
    }
}

function closeControlCenter() {
    const cc = document.getElementById('macos-control-center');
    const iosCc = document.getElementById('ios-control-center');
    const btn = document.getElementById('mac-control-center-btn');
    if (cc) cc.classList.remove('is-open');
    if (iosCc) iosCc.classList.remove('is-open');
    if (btn) btn.classList.remove('active');
}

function openAboutThisMac() {
    closeMissionControl();
    closeControlCenter();
    closeAppleMenu();
    const modal = document.getElementById('macos-about-mac-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('is-active');
    }
}

function closeAboutThisMac() {
    const modal = document.getElementById('macos-about-mac-modal');
    if (modal) {
        modal.classList.remove('is-active');
        modal.style.display = 'none';
    }
    closeAppleMenu();
    closeControlCenter();
}

function returnToDesktop() {
    closeAboutThisMac();
    closeMissionControl();
    closeControlCenter();
    closeAppleMenu();
    closeSpotlight();
    closeReadmeModal();
    closeFolderModal();
    closeSkillsFolderModal();
    closeGalleryLightbox();
    showToast('Desktop', 'fas fa-desktop');
}

// Control Center Toggles
let ccWifiActive = true;
function toggleCcWifi() {
    ccWifiActive = !ccWifiActive;
    const icon = document.getElementById('cc-wifi-icon');
    const label = document.getElementById('cc-wifi-label');
    const iosBtn = document.getElementById('ios-cc-wifi-btn');
    if (icon) {
        icon.className = ccWifiActive ? 'cc-toggle-icon bg-[#007aff] text-white' : 'cc-toggle-icon bg-white/10 text-gray-400';
    }
    if (label) {
        label.innerText = ccWifiActive ? 'Home_Fiber_5G' : 'Off';
        label.className = ccWifiActive ? 'text-[10px] text-blue-300' : 'text-[10px] text-gray-500';
    }
    if (iosBtn) {
        iosBtn.classList.toggle('is-active-blue', ccWifiActive);
    }
    showToast(ccWifiActive ? 'Wi-Fi: Connected to Home_Fiber_5G' : 'Wi-Fi: Disconnected', 'fas fa-wifi');
}

let ccBtActive = true;
function toggleCcBluetooth() {
    ccBtActive = !ccBtActive;
    const icon = document.getElementById('cc-bt-icon');
    const label = document.getElementById('cc-bt-label');
    const iosBtn = document.getElementById('ios-cc-bt-btn');
    if (icon) {
        icon.className = ccBtActive ? 'cc-toggle-icon bg-[#007aff] text-white' : 'cc-toggle-icon bg-white/10 text-gray-400';
    }
    if (label) {
        label.innerText = ccBtActive ? 'AirPods Pro' : 'Off';
        label.className = ccBtActive ? 'text-[10px] text-blue-300' : 'text-[10px] text-gray-500';
    }
    if (iosBtn) {
        iosBtn.classList.toggle('is-active-blue', ccBtActive);
    }
    showToast(ccBtActive ? 'Bluetooth: Connected to AirPods Pro' : 'Bluetooth: Off', 'fab fa-bluetooth-b');
}

let ccFocusActive = true;
function toggleCcFocus() {
    ccFocusActive = !ccFocusActive;
    const icon = document.getElementById('cc-focus-icon');
    const label = document.getElementById('cc-focus-label');
    const iosBtn = document.getElementById('ios-cc-focus-btn');
    if (icon) {
        icon.className = ccFocusActive ? 'cc-toggle-icon bg-indigo-600 text-white' : 'cc-toggle-icon bg-white/10 text-gray-400';
    }
    if (label) {
        label.innerText = ccFocusActive ? 'Developer' : 'Off';
        label.className = ccFocusActive ? 'text-[10px] text-indigo-300' : 'text-[10px] text-gray-500';
    }
    if (iosBtn) {
        iosBtn.classList.toggle('is-active-indigo', ccFocusActive);
    }
    showToast(ccFocusActive ? 'Focus: Developer Focus Enabled' : 'Focus: Disabled', 'fas fa-moon');
}

function handleBrightnessSlider(val) {
    document.body.style.filter = `brightness(${Math.max(60, val)}%)`;
    const iosFill = document.getElementById('ios-cc-bright-fill');
    if (iosFill) iosFill.style.height = `${val}%`;
}

function handleVolumeSlider(val) {
    const iosFill = document.getElementById('ios-cc-vol-fill');
    if (iosFill) iosFill.style.height = `${val}%`;
    showToast(`Volume: ${Math.round(val)}%`, val == 0 ? 'fas fa-volume-mute' : 'fas fa-volume-up');
}

let isPlayingMusic = true;
function togglePlayState() {
    isPlayingMusic = !isPlayingMusic;
    const btn = document.getElementById('cc-play-btn');
    const iosPlayBtn = document.getElementById('ios-cc-play-btn');
    if (btn) {
        btn.className = isPlayingMusic ? 'fas fa-pause text-[10px]' : 'fas fa-play text-[10px] ml-0.5';
    }
    if (iosPlayBtn) {
        iosPlayBtn.innerHTML = isPlayingMusic ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    }
    showToast(isPlayingMusic ? 'Veer Music: Playing' : 'Veer Music: Paused', 'fas fa-music');
}

function initIosControlCenterSliders() {
    const brightCapsule = document.getElementById('ios-cc-bright-capsule');
    const brightFill = document.getElementById('ios-cc-bright-fill');
    const volCapsule = document.getElementById('ios-cc-vol-capsule');
    const volFill = document.getElementById('ios-cc-vol-fill');

    function attachSlider(capsule, fill, onUpdate) {
        if (!capsule || !fill) return;

        let isDragging = false;

        const updateFromY = (clientY) => {
            const rect = capsule.getBoundingClientRect();
            let fraction = (rect.bottom - clientY) / rect.height;
            fraction = Math.max(0.05, Math.min(1, fraction));
            fill.style.height = `${fraction * 100}%`;
            onUpdate(fraction * 100);
        };

        capsule.addEventListener('pointerdown', (e) => {
            isDragging = true;
            try { capsule.setPointerCapture(e.pointerId); } catch(err) {}
            updateFromY(e.clientY);
        });

        capsule.addEventListener('pointermove', (e) => {
            if (isDragging) {
                updateFromY(e.clientY);
            }
        });

        const stopDrag = (e) => {
            if (isDragging) {
                isDragging = false;
                try { capsule.releasePointerCapture(e.pointerId); } catch(err) {}
            }
        };

        capsule.addEventListener('pointerup', stopDrag);
        capsule.addEventListener('pointercancel', stopDrag);
    }

    attachSlider(brightCapsule, brightFill, (val) => {
        handleBrightnessSlider(val);
    });

    attachSlider(volCapsule, volFill, (val) => {
        handleVolumeSlider(val);
    });
}

const TAHOE_WALLPAPERS = [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=85&w=2800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=85&w=2800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=85&w=2800&auto=format&fit=crop'
];
let currentWallpaperIdx = 0;

function setTahoeWallpaper(idx) {
    currentWallpaperIdx = idx % TAHOE_WALLPAPERS.length;
    document.body.style.backgroundImage = `url('${TAHOE_WALLPAPERS[currentWallpaperIdx]}')`;
    if (isMissionControlOpen) renderMissionControlSpaces();
    showToast('Applied macOS Tahoe Wallpaper', 'fas fa-image');
}

function cycleTahoeWallpaper() {
    setTahoeWallpaper((currentWallpaperIdx + 1) % TAHOE_WALLPAPERS.length);
}



