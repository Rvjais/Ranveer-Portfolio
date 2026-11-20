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
let dynamicViewportTicking = false;
let lastVh = 0;

function updateDynamicViewport() {
    if (dynamicViewportTicking) return;
    dynamicViewportTicking = true;
    requestAnimationFrame(() => {
        const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const vh = height * 0.01;
        if (Math.abs(vh - lastVh) > 0.05) {
            lastVh = vh;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }
        dynamicViewportTicking = false;
    });
}
window.addEventListener('resize', updateDynamicViewport, { passive: true });
window.addEventListener('orientationchange', updateDynamicViewport, { passive: true });
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateDynamicViewport, { passive: true });
    window.visualViewport.addEventListener('scroll', updateDynamicViewport, { passive: true });
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
        macClockEl.textContent = `${dayStr} ${monthStr} ${dateNum} ${displayHours}:${minsFormatted} ${ampm}`;
    }

    // Desktop clock widget + lock screen (function declarations, safe to call this early)
    updateWidgetClock(now);
    updateLockScreenClock(now);

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
const isDesktop = () => window.innerWidth >= 768;
let focusedAppId = null;

const APP_DISPLAY_NAMES = {
    about: 'Safari', projects: 'Terminal', skills: 'System Settings', contact: 'Mail',
    gallery: 'Photos', calculator: 'Calculator', notes: 'Notes', calendar: 'Calendar', finder: 'Finder'
};

function getAppTheme(appId) {
    const app = document.getElementById(`app-${appId}`);
    return (app && app.dataset.theme) || 'dark';
}

// iOS status bar + home indicator follow the colour of the top-most app
function syncMobileChrome() {
    const topApp = focusedAppId || runningApps[runningApps.length - 1];
    const light = !!topApp && document.getElementById(`app-${topApp}`)?.classList.contains('is-open') && getAppTheme(topApp) === 'light';
    const homeBar = document.getElementById('ios-global-home-bar');
    if (homeBar) homeBar.classList.toggle('dark', light);
    const mobileNav = document.querySelector('nav.mobile-only');
    if (mobileNav) mobileNav.classList.toggle('light-theme', light);
}

function setHash(hash) {
    try {
        const url = hash ? `#${hash}` : window.location.pathname + window.location.search;
        history.replaceState(null, '', url);
    } catch (e) { /* file:// or sandboxed — ignore */ }
}

// Place a newly opened desktop window: centred in the free area, cascading like macOS
function placeNewWindow(app) {
    const menubar = 28, dockReserve = 96;
    const w = app.offsetWidth, h = app.offsetHeight;
    const others = document.querySelectorAll('.app-window.is-open').length - 1;
    const step = (Math.max(0, others) % 6) * 26;
    let left = Math.round((window.innerWidth - w) / 2) - 60 + step;
    let top = Math.round(menubar + (window.innerHeight - menubar - dockReserve - h) / 2) - 20 + step;
    left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
    top = Math.max(menubar + 8, Math.min(window.innerHeight - h - 8, top));
    app.style.left = `${left}px`;
    app.style.top = `${top}px`;
    app.style.transform = 'none';
}

function openApp(appId) {
    const app = document.getElementById(`app-${appId}`);
    if (!app) return;

    const wasRunning = runningApps.includes(appId);
    const wasVisible = app.classList.contains('is-open');
    if (!wasRunning) runningApps.push(appId);

    // Reset any interactive drag transforms on mobile
    if (!isDesktop()) {
        app.style.transform = '';
        app.style.borderRadius = '';
        app.style.transition = '';
    }

    app.classList.remove('closing', 'genie-closing', 'win-closing');
    app.classList.add('is-open');

    // Desktop positioning (first open only — remembers where the user left it)
    if (isDesktop() && !app.dataset.placed) {
        placeNewWindow(app);
        app.dataset.placed = '1';
    }

    bringToFront(app);

    if (!wasRunning && typeof bounceDockIcon === 'function') bounceDockIcon(appId);
    if (typeof trackRecent === 'function') trackRecent(`app:${appId}`);

    // App-specific initialization
    if (appId === 'notes' && typeof initNotesApp === 'function' && !wasVisible) initNotesApp();
    if (appId === 'calculator' && typeof updateCalcDisplay === 'function') updateCalcDisplay();
    if (appId === 'calendar') {
        if (typeof renderCalendarGrid === 'function') renderCalendarGrid();
        if (typeof updateCalendarDatesDisplay === 'function') updateCalendarDatesDisplay();
    }
    if (appId === 'finder' && typeof renderFinder === 'function') renderFinder();

    // Focus the terminal input on desktop only (avoids popping the iOS keyboard)
    if (appId === 'projects' && isDesktop()) {
        setTimeout(() => {
            const input = document.getElementById('term-input');
            const terminalVisible = !document.getElementById('projects-view-terminal')?.classList.contains('hidden');
            if (input && terminalVisible) input.focus({ preventScroll: true });
        }, 200);
    }

    if (appId !== 'finder') setHash(appId);
    syncMobileChrome();

    if (isMissionControlOpen) renderMissionControlTiles();
    if (isIosSwitcherOpen) renderIosSwitcherCards();
    if (typeof updateMacOSDockOpenApps === 'function') updateMacOSDockOpenApps();
}

function focusTopmostWindow() {
    const wins = [...document.querySelectorAll('.app-window.is-open')]
        .filter(w => !w.classList.contains('genie-closing') && !w.classList.contains('win-closing') && !w.classList.contains('closing'));
    document.querySelectorAll('.app-window.is-focused').forEach(w => w.classList.remove('is-focused'));
    if (!wins.length) {
        focusedAppId = null;
    } else {
        wins.sort((a, b) => (parseInt(a.style.zIndex, 10) || 0) - (parseInt(b.style.zIndex, 10) || 0));
        const top = wins[wins.length - 1];
        top.classList.add('is-focused');
        focusedAppId = top.id.replace('app-', '');
    }
    if (typeof updateMenubarAppName === 'function') updateMenubarAppName();
    syncMobileChrome();
    setHash(focusedAppId && focusedAppId !== 'finder' ? focusedAppId : '');
}

function closeApp(appId) {
    const app = document.getElementById(`app-${appId}`);
    if (!app) return;
    if (!app.classList.contains('is-open') && !runningApps.includes(appId)) return;

    runningApps = runningApps.filter(id => id !== appId);
    app.style.borderRadius = '';
    app.classList.remove('is-focused');

    if (!isDesktop()) {
        app.style.transform = '';
        app.classList.add('closing');
        setTimeout(() => app.classList.remove('is-open', 'closing'), 220);
    } else if (app.classList.contains('is-open')) {
        app.classList.add('win-closing');
        setTimeout(() => app.classList.remove('is-open', 'win-closing'), 180);
    }

    if (appId === 'notes') app.classList.remove('notes-detail');
    if (focusedAppId === appId) focusedAppId = null;
    focusTopmostWindow();

    if (isMissionControlOpen) renderMissionControlTiles();
    if (isIosSwitcherOpen) renderIosSwitcherCards();
    if (typeof updateMacOSDockOpenApps === 'function') updateMacOSDockOpenApps();
}

function minimizeApp(appId) {
    const app = document.getElementById(`app-${appId}`);
    if (!app || !app.classList.contains('is-open')) return;
    app.classList.remove('is-focused');

    if (isDesktop()) {
        // Genie toward this app's Dock icon (falls back to Dock centre)
        const rect = app.getBoundingClientRect();
        const dockEl = document.getElementById(`dock-item-${appId}`) || document.getElementById('macos-dock');
        if (dockEl) {
            const d = dockEl.getBoundingClientRect();
            app.style.setProperty('--genie-x', `${Math.round(d.left + d.width / 2 - (rect.left + rect.width / 2))}px`);
            app.style.setProperty('--genie-y', `${Math.round(d.top + d.height / 2 - rect.bottom)}px`);
        }
        app.classList.add('genie-closing');
        setTimeout(() => app.classList.remove('is-open', 'genie-closing'), 480);
    } else {
        app.classList.remove('is-open');
    }
    if (focusedAppId === appId) focusedAppId = null;
    focusTopmostWindow();
    if (isMissionControlOpen) renderMissionControlTiles();
    // Dock dot remains visible: the app is still running
}

function maximizeApp(appId) {
    if (!isDesktop()) return;
    const app = document.getElementById(`app-${appId}`);
    if (!app) return;

    if (!maximizedStates[appId]) {
        maximizedStates[appId] = {
            top: app.style.top,
            left: app.style.left,
            width: app.style.width,
            height: app.style.height
        };
        app.classList.add('is-maximized');
        bringToFront(app);
    } else {
        app.classList.remove('is-maximized');
        app.style.top = maximizedStates[appId].top;
        app.style.left = maximizedStates[appId].left;
        app.style.width = maximizedStates[appId].width || '';
        app.style.height = maximizedStates[appId].height || '';
        delete maximizedStates[appId];
    }
}

function bringToFront(appElement) {
    if (!appElement) return;
    highestZIndex++;
    appElement.style.zIndex = highestZIndex;
    document.querySelectorAll('.app-window.is-focused').forEach(w => {
        if (w !== appElement) w.classList.remove('is-focused');
    });
    if (appElement.classList.contains('is-open')) {
        appElement.classList.add('is-focused');
        focusedAppId = appElement.id.replace('app-', '');
    }
    if (typeof updateMenubarAppName === 'function') updateMenubarAppName();
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

// --- Notification banners (macOS: top-right stack • iOS: top banner) ---
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

const NOTIF_TINTS = [
    [/whatsapp|check|circle-check/, 'linear-gradient(180deg,#34c759,#248a3d)'],
    [/exclamation|triangle|trash|times|xmark/, 'linear-gradient(180deg,#ff6961,#d70015)'],
    [/npm|pdf|file-pdf/, 'linear-gradient(180deg,#ff6b6b,#c81e1e)'],
    [/docker|aws|cloud/, 'linear-gradient(180deg,#5ac8fa,#0071e3)'],
    [/music|record-vinyl/, 'linear-gradient(180deg,#ff6b88,#fa233b)'],
    [/calendar|clock/, 'linear-gradient(180deg,#ff6b5f,#e0261b)'],
    [/moon|focus/, 'linear-gradient(180deg,#7d7aff,#5856d6)'],
    [/github/, 'linear-gradient(180deg,#2d333b,#0d1117)'],
    [/image|images|photo/, 'linear-gradient(180deg,#ff9f0a,#ff375f)'],
    [/terminal|code/, 'linear-gradient(180deg,#3a3a3e,#0d0d0f)']
];

function notify({ title, body = '', icon = 'fas fa-bell', iconBg, action = null, duration = 4200 } = {}) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Keep the stack short, like macOS
    const existing = container.querySelectorAll('.notif:not(.leaving)');
    if (existing.length >= 3) dismissNotif(existing[0]);

    const bg = iconBg || (NOTIF_TINTS.find(([re]) => re.test(icon)) || [null, 'linear-gradient(180deg,#5ac8fa,#0a7aff)'])[1];
    const el = document.createElement('div');
    el.className = `notif${action ? ' is-actionable' : ''}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `
        <button class="notif-close" aria-label="Dismiss"><i class="fas fa-xmark"></i></button>
        <div class="notif-icon" style="background:${bg}"><i class="${escapeHtml(icon)}"></i></div>
        <div class="notif-body">
            <div class="notif-head"><span class="notif-title">${escapeHtml(title)}</span><span class="notif-time">now</span></div>
            ${body ? `<div class="notif-text">${escapeHtml(body)}</div>` : ''}
        </div>`;
    el.querySelector('.notif-close').addEventListener('click', (e) => { e.stopPropagation(); dismissNotif(el); });
    el.addEventListener('click', () => {
        if (action) { try { action(); } catch (err) { console.warn(err); } }
        dismissNotif(el);
    });

    let timer = setTimeout(() => dismissNotif(el), duration);
    el.addEventListener('mouseenter', () => clearTimeout(timer));
    el.addEventListener('mouseleave', () => { timer = setTimeout(() => dismissNotif(el), 1800); });

    container.appendChild(el);
}

function dismissNotif(el) {
    if (!el || el.classList.contains('leaving')) return;
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 280);
}

// Backwards-compatible helper used across the site: "Title: body" splits into a two-line banner
function showToast(message, icon = 'fas fa-info-circle') {
    const msg = String(message);
    const idx = msg.indexOf(': ');
    let title, body;
    if (idx > 0 && idx <= 36) {
        title = msg.slice(0, idx);
        body = msg.slice(idx + 2);
    } else {
        title = focusedAppId ? (APP_DISPLAY_NAMES[focusedAppId] || 'Ranveer’s Mac') : 'Ranveer’s Mac';
        body = msg;
    }
    notify({ title, body, icon, duration: 3200 });
}

// --- Contact Form Sending Simulation ---
function handleSend() {
    const subj = document.getElementById('contact-subj').value.trim();
    const msg = document.getElementById('contact-msg').value.trim();

    if (!subj || !msg) {
        notify({ title: 'Mail', body: 'Add a subject and a message first.', icon: 'fas fa-triangle-exclamation' });
        (!subj ? document.getElementById('contact-subj') : document.getElementById('contact-msg')).focus();
        return;
    }

    // Hand off to the visitor's mail app so the message really reaches Ranveer
    const href = `mailto:ranveerjais9984@gmail.com?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(msg)}`;
    window.location.href = href;
    notify({ title: 'Mail', body: 'Opening your mail app with this message ready to send.', icon: 'fas fa-paper-plane' });
}

// --- Desktop Window Dragging & Resizing ---
// One shared set of document listeners drives whichever window is being dragged/resized.
let winDrag = null;   // { win, offsetX, offsetY }
let winResize = null; // { win, startX, startY, startW, startH, minW, minH }

function setupWindowDragging() {
    document.querySelectorAll('.app-window').forEach(win => {
        const header = win.querySelector('.app-header');
        if (!header) return;

        win.addEventListener('mousedown', () => {
            if (isDesktop()) bringToFront(win);
        });

        header.addEventListener('mousedown', (e) => {
            if (!isDesktop() || e.button !== 0) return;
            if (e.target.closest('.traffic-btn, button, a, input, label, .safari-url')) return;

            const appId = win.id.replace('app-', '');
            // Dragging a zoomed window un-zooms it under the cursor (macOS behaviour)
            if (win.classList.contains('is-maximized')) {
                const ratio = (e.clientX) / window.innerWidth;
                maximizeApp(appId);
                const w = win.offsetWidth;
                win.style.left = `${Math.round(e.clientX - w * ratio)}px`;
                win.style.top = `${Math.max(28, e.clientY - 20)}px`;
            }

            const rect = win.getBoundingClientRect();
            win.style.transform = 'none';
            win.style.left = `${rect.left}px`;
            win.style.top = `${rect.top}px`;
            winDrag = { win, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
            win.classList.add('dragging');
            document.body.style.cursor = 'default';
            e.preventDefault();
        });

        header.addEventListener('dblclick', (e) => {
            if (!isDesktop()) return;
            if (e.target.closest('.traffic-btn, button, a, input, label')) return;
            maximizeApp(win.id.replace('app-', ''));
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (winDrag) {
            const { win, offsetX, offsetY } = winDrag;
            const w = win.offsetWidth;
            const left = Math.max(100 - w, Math.min(window.innerWidth - 100, e.clientX - offsetX));
            const top = Math.max(28, Math.min(window.innerHeight - 60, e.clientY - offsetY));
            win.style.left = `${left}px`;
            win.style.top = `${top}px`;
        } else if (winResize) {
            const r = winResize;
            const rect = r.win.getBoundingClientRect();
            const newW = Math.max(r.minW, Math.min(window.innerWidth - rect.left - 4, r.startW + (e.clientX - r.startX)));
            const newH = Math.max(r.minH, Math.min(window.innerHeight - rect.top - 4, r.startH + (e.clientY - r.startY)));
            r.win.style.width = `${newW}px`;
            r.win.style.height = `${newH}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (winDrag) {
            winDrag.win.classList.remove('dragging');
            winDrag = null;
            document.body.style.cursor = '';
        }
        if (winResize) {
            winResize.win.classList.remove('resizing');
            winResize = null;
        }
    });
}

function setupWindowResizing() {
    document.querySelectorAll('.app-window').forEach(win => {
        const handle = win.querySelector('.window-resize-handle');
        if (!handle) return;
        handle.addEventListener('mousedown', (e) => {
            if (!isDesktop() || win.classList.contains('is-maximized')) return;
            e.preventDefault();
            e.stopPropagation();
            bringToFront(win);
            const cs = getComputedStyle(win);
            const rect = win.getBoundingClientRect();
            win.style.transform = 'none';
            win.style.left = `${rect.left}px`;
            win.style.top = `${rect.top}px`;
            winResize = {
                win,
                startX: e.clientX,
                startY: e.clientY,
                startW: rect.width,
                startH: rect.height,
                minW: parseFloat(cs.minWidth) || 320,
                minH: parseFloat(cs.minHeight) || 260
            };
            win.classList.add('resizing');
        });
    });
}

// --- Desktop icons: macOS-style columns from the top-right, selection, free dragging ---
function layoutDesktopIcons(force = false) {
    if (!isDesktop()) return;
    const icons = [...document.querySelectorAll('#desktop-icons-container .desktop-shortcut')];
    const top0 = 40, colW = 96, rowH = 104, right0 = 16;
    const bottomLimit = window.innerHeight - 112; // keep clear of the Dock
    const perCol = Math.max(1, Math.floor((bottomLimit - top0) / rowH));
    icons.forEach((icon, i) => {
        if (icon.dataset.userPlaced && !force) return;
        if (force) delete icon.dataset.userPlaced;
        const col = Math.floor(i / perCol);
        const row = i % perCol;
        icon.style.right = 'auto';
        icon.style.left = `${window.innerWidth - right0 - colW * (col + 1) + (colW - 88) / 2}px`;
        icon.style.top = `${top0 + row * rowH}px`;
    });
}

function clearDesktopSelection() {
    document.querySelectorAll('.desktop-shortcut.selected').forEach(el => el.classList.remove('selected'));
}

function setupDesktopIconDragging() {
    const shortcuts = document.querySelectorAll('.desktop-shortcut');
    let active = null; // { icon, startX, startY, initialLeft, initialTop, moved }

    shortcuts.forEach(icon => {
        icon.addEventListener('mousedown', (e) => {
            if (!isDesktop() || e.button !== 0) return;
            clearDesktopSelection();
            icon.classList.add('selected');
            const rect = icon.getBoundingClientRect();
            icon.style.left = `${rect.left}px`;
            icon.style.top = `${rect.top}px`;
            icon.style.right = 'auto';
            delete icon.dataset.dragged;
            active = { icon, startX: e.clientX, startY: e.clientY, initialLeft: rect.left, initialTop: rect.top, moved: false };
            e.preventDefault();
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (!active) return;
        const dx = e.clientX - active.startX;
        const dy = e.clientY - active.startY;
        if (!active.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
            active.moved = true;
            active.icon.dataset.dragged = 'true';
            active.icon.classList.add('dragging');
        }
        if (!active.moved) return;
        active.icon.style.left = `${Math.max(6, Math.min(window.innerWidth - 94, active.initialLeft + dx))}px`;
        active.icon.style.top = `${Math.max(34, Math.min(window.innerHeight - 120, active.initialTop + dy))}px`;
    });

    document.addEventListener('mouseup', () => {
        if (!active) return;
        const { icon, moved } = active;
        icon.classList.remove('dragging');
        if (moved) {
            icon.dataset.userPlaced = '1';
            setTimeout(() => { delete icon.dataset.dragged; }, 120);
        }
        active = null;
    });

    // Clicking empty desktop clears the selection
    const container = document.getElementById('desktop-icons-container');
    if (container) {
        container.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.desktop-shortcut')) clearDesktopSelection();
        });
    }

    layoutDesktopIcons();
    window.addEventListener('resize', () => layoutDesktopIcons(), { passive: true });
}


// --- Spotlight Search System (macOS Tahoe & iOS) ---
const searchIndex = [
    { title: "About Ranveer Jaiswal", category: "Application", desc: "Full Stack & MERN Developer profile, bio, experience and education", action: () => openApp('about'), icon: "fas fa-user-astronaut text-blue-400", badge: "APP", tech: ["Profile", "Bio", "Gurgaon", "Experience", "Education"] },
    { title: "Resume (PDF)", category: "Document", desc: "Official resume of Ranveer Jaiswal (ranveer_jaiswal.pdf)", action: () => openResume(), icon: "fas fa-file-pdf text-red-500", badge: "PDF", tech: ["Full Stack", "MERN", "Resume", "CV"] },
    { title: "Contact — New Message", category: "Application", desc: "Email Ranveer directly — opens your mail app with the message ready", action: () => openApp('contact'), icon: "fas fa-envelope text-blue-400", badge: "MAIL", tech: ["Email", "Hire", "Message", "Phone"] },
    { title: "Finder — All Projects", category: "Folder", desc: "Browse all 14 projects with previews, tags and links", action: () => openFinder('projects'), icon: "fas fa-folder text-sky-400", badge: "FINDER", tech: ["14 Projects", "Tags", "Preview"] },
    { title: "Projects Showcase (Cards)", category: "Application", desc: "Project cards with live demos, READMEs and repositories", action: () => { openApp('projects'); switchProjectsView('cards', null); }, icon: "fas fa-table-cells-large text-blue-400", badge: "APP", tech: ["Cards", "Live Demo", "GitHub"] },
    { title: "devOS Terminal", category: "Application", desc: "Explore the portfolio with ls, cd, cat, open and neofetch", action: () => { openApp('projects'); switchProjectsView('terminal', null); }, icon: "fas fa-terminal text-green-400", badge: "APP", tech: ["Terminal", "zsh", "CLI"] },
    { title: "fullstack-code-visualiser (npm)", category: "Package", desc: "MERN stack visualiser & AST architecture tracer published on npm", action: () => openReadmeModal('fullstack-code-visualiser'), icon: "fab fa-npm text-red-500", badge: "NPM", tech: ["React", "Node.js", "Babel AST", "MongoDB"] },
    { title: "Veer Music — Nothing OS App", category: "Project", desc: "Expo music client + yt-dlp proxy, vinyl player, synced LRC lyrics", action: () => openReadmeModal('nothing-veer'), icon: "fas fa-music text-red-400", badge: "MOBILE", tech: ["React Native", "Expo 54", "yt-dlp", "LRU Cache"] },
    { title: "HR-Buddy — AI Onboarding", category: "Project", desc: "AI onboarding quiz with anti-cheat mechanism (React, Node.js)", action: () => openReadmeModal('hr-buddy'), icon: "fas fa-user-check text-amber-400", badge: "LIVE", tech: ["React", "Node.js", "AI Quiz"] },
    { title: "SRChess — Chess Platform", category: "Project", desc: "Interactive chess web app with board logic & move validation", action: () => openReadmeModal('srchess-platform'), icon: "fas fa-chess-knight text-purple-400", badge: "LIVE", tech: ["React", "Tailwind", "Board Logic"] },
    { title: "RANVEER H.U.D. Assistant", category: "Project", desc: "Tauri + Rust desktop assistant: voice, face & hand gestures, PC control", action: () => openReadmeModal('ranveer-echo'), icon: "fas fa-robot text-cyan-400", badge: "DESKTOP", tech: ["Tauri", "Rust", "AI", "OpenCV"] },
    { title: "WebRip Scraper", category: "Project", desc: "BFS website → offline ZIP with Playwright and live SSE progress", action: () => openReadmeModal('web-ripper'), icon: "fas fa-spider text-teal-400", badge: "TOOL", tech: ["Python", "Playwright", "Flask", "BFS Crawler"] },
    { title: "SR Chess Academy — 3D", category: "Project", desc: "25-page academy rebuild with a Three.js 3D hero, shop & quiz", action: () => openReadmeModal('srchess'), icon: "fas fa-chess-board text-amber-400", badge: "WEB", tech: ["Vite", "Three.js", "Vanilla JS"] },
    { title: "PioneerOS", category: "Project", desc: "Multi-module internal platform with project management & queue system", action: () => openReadmeModal('pioneeros'), icon: "fas fa-desktop text-blue-400", badge: "PLATFORM", tech: ["Next.js", "Prisma", "PostgreSQL"] },
    { title: "Rain CRM", category: "Project", desc: "CRM with AI WhatsApp bots, Twilio calling & AI email client", action: () => openReadmeModal('rain-crm'), icon: "fas fa-users-gear text-emerald-400", badge: "CRM", tech: ["React", "Twilio", "WhatsApp", "MongoDB"] },
    { title: "TextLens OCR Sheet", category: "Project", desc: "Image/PDF to text, PaddleOCR handwriting + invoice table parser", action: () => openReadmeModal('textlens'), icon: "fas fa-file-lines text-indigo-400", badge: "AI TOOL", tech: ["PaddleOCR", "Python", "FastAPI", "AI"] },
    { title: "Chatbot Studio", category: "Project", desc: "AI bot manager — create AI chatbots for websites and embed them as a chat widget", action: () => openReadmeModal('chatbot-studio'), icon: "fas fa-comments text-violet-400", badge: "SAAS", tech: ["AI", "Chatbots", "Widget", "SaaS"] },
    { title: "LibReady — PDF & EPUB Reader", category: "Project", desc: "Offline Flutter book library & reader for Android and iOS with page-curl turns", action: () => openReadmeModal('libready'), icon: "fas fa-book-open text-amber-500", badge: "MOBILE", tech: ["Flutter", "Dart", "SQLite", "Mobile", "EPUB"] },
    { title: "AICRMZ WhatsApp CRM", category: "Project", desc: "Baileys QR CRM, AI auto-replies, campaigns & voice follow-ups", action: () => openReadmeModal('aicrmz'), icon: "fab fa-whatsapp text-green-400", badge: "WHATSAPP", tech: ["Baileys", "Node.js", "AI", "Campaigns"] },
    { title: "Stock Management System", category: "Project", desc: "Qt / C++ GUI app focused on OOP, file handling and data structures", action: () => openReadmeModal('stock-mgmt'), icon: "fas fa-boxes-stacked text-cyan-400", badge: "C++", tech: ["C++", "Qt", "OOP"] },
    { title: "Skills — Finder", category: "Folder", desc: "Languages, frameworks, databases, DevOps & tools with levels", action: () => openFinder('skills'), icon: "fas fa-layer-group text-blue-400", badge: "SKILLS", tech: ["Docker", "AWS", "React", "Node", "TypeScript", "MongoDB"] },
    { title: "System Settings — Skill Levels", category: "Application", desc: "Full-stack languages, frameworks, databases & tooling with levels", action: () => openApp('skills'), icon: "fas fa-gear text-gray-400", badge: "APP", tech: ["DevOps", "Databases", "Frontend"] },
    { title: "Photos", category: "Application", desc: "Project screenshots and media gallery", action: () => openApp('gallery'), icon: "fas fa-images text-pink-400", badge: "APP", tech: ["Photos", "Screenshots", "Uploads"] },
    { title: "Notes — DevPad", category: "Application", desc: "Engineering notes & an auto-saved scratchpad", action: () => openApp('notes'), icon: "fas fa-note-sticky text-yellow-400", badge: "APP", tech: ["Notes", "Scratchpad"] },
    { title: "Calendar", category: "Application", desc: "Monthly calendar with a sample developer agenda", action: () => openApp('calendar'), icon: "far fa-calendar text-red-500", badge: "APP", tech: ["Calendar", "Schedule", "Agenda"] },
    { title: "Calculator", category: "Application", desc: "Keyboard-friendly calculator", action: () => openApp('calculator'), icon: "fas fa-calculator text-amber-400", badge: "APP", tech: ["Math", "Keypad"] },
    { title: "Launchpad", category: "Application", desc: "Every app and project on one screen", action: () => openLaunchpad(), icon: "fas fa-rocket text-gray-300", badge: "F4", tech: ["Apps", "Grid"] },
    { title: "GitHub Profile (Rvjais)", category: "Link", desc: "Explore open-source repositories and contributions on GitHub", action: () => window.open('https://github.com/Rvjais', '_blank', 'noopener'), icon: "fab fa-github text-white", badge: "GITHUB", tech: ["Open Source", "Repos"] },
    { title: "Keyboard Shortcuts", category: "Help", desc: "⌘K Spotlight • F3 Mission Control • F4 Launchpad • Esc closes", action: () => openReadmeModal('shortcuts'), icon: "fas fa-keyboard text-gray-300", badge: "HELP", tech: ["Shortcuts", "Help"] }
];

let selectedSpotlightIndex = 0;

function getSpotlightMatches(query) {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return searchIndex.slice(0, 9);
    const scored = searchIndex.map(item => {
        const title = item.title.toLowerCase();
        let score = 0;
        if (title.startsWith(q)) score += 6;
        else if (title.includes(q)) score += 4;
        if (item.desc.toLowerCase().includes(q)) score += 2;
        if (item.category.toLowerCase().includes(q)) score += 1;
        if (item.tech && item.tech.some(t => t.toLowerCase().includes(q))) score += 3;
        return { item, score };
    }).filter(r => r.score > 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 9).map(r => r.item);
}

function toggleSpotlight() {
    const overlay = document.getElementById('spotlight-overlay');
    if (!overlay) return;
    if (overlay.classList.contains('is-active')) closeSpotlight();
    else openSpotlight();
}

function openSpotlight() {
    const overlay = document.getElementById('spotlight-overlay');
    const input = document.getElementById('spotlight-input');
    if (!overlay) return;
    closeAllMenus();
    overlay.classList.add('is-active');
    selectedSpotlightIndex = 0;
    if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 30);
    }
    renderSpotlightResults('');
}

function closeSpotlight() {
    const overlay = document.getElementById('spotlight-overlay');
    if (overlay) overlay.classList.remove('is-active');
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
    if (clearBtn) clearBtn.classList.toggle('hidden', !query);

    const filtered = getSpotlightMatches(query);
    if (filtered.length === 0) {
        resultsContainer.innerHTML = `<div class="p-6 text-center text-gray-400 text-xs">No results for “<span class="text-white">${escapeHtml(query)}</span>”. Try “react”, “ai”, “python” or “resume”.</div>`;
        renderSpotlightPreview(null);
        return;
    }
    if (selectedSpotlightIndex >= filtered.length) selectedSpotlightIndex = 0;

    const header = query.trim() ? '' : `<div class="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Suggestions</div>`;
    resultsContainer.innerHTML = header + filtered.map((item, index) => `
        <div class="spotlight-result-item ${index === selectedSpotlightIndex ? 'selected' : ''}" data-index="${index}" onclick="executeSpotlightAction(${index})" onmouseenter="selectedSpotlightIndex = ${index}; updateSpotlightSelection(false);">
            <div class="flex items-center space-x-3 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm shrink-0">
                    <i class="${item.icon}"></i>
                </div>
                <div class="text-left min-w-0">
                    <div class="text-[13px] font-semibold text-white truncate">${escapeHtml(item.title)}</div>
                    <div class="text-[11px] text-gray-400 truncate">${escapeHtml(item.desc)}</div>
                </div>
            </div>
            <span class="hidden sm:inline px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-gray-300 border border-white/15 uppercase shrink-0 ml-2">${escapeHtml(item.badge || item.category)}</span>
        </div>
    `).join('');

    renderSpotlightPreview(filtered[selectedSpotlightIndex]);
}

function updateSpotlightSelection(scroll = true) {
    const items = document.querySelectorAll('.spotlight-result-item');
    items.forEach((item, idx) => {
        const on = idx === selectedSpotlightIndex;
        item.classList.toggle('selected', on);
        if (on && scroll) item.scrollIntoView({ block: 'nearest' });
    });
    const input = document.getElementById('spotlight-input');
    const filtered = getSpotlightMatches(input ? input.value : '');
    if (filtered[selectedSpotlightIndex]) renderSpotlightPreview(filtered[selectedSpotlightIndex]);
}

function renderSpotlightPreview(item) {
    const previewEl = document.getElementById('spotlight-preview-pane');
    if (!previewEl) return;

    if (!item) {
        previewEl.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-center text-gray-500 py-8">
                <i class="fas fa-magnifying-glass text-3xl mb-2 opacity-40"></i>
                <p class="text-xs">Search apps, projects, skills and documents</p>
            </div>`;
        return;
    }

    previewEl.innerHTML = `
        <div class="space-y-4">
            <div class="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-2xl shadow-lg">
                <i class="${item.icon}"></i>
            </div>
            <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-blue-300 px-2 py-0.5 rounded bg-blue-500/15 border border-blue-400/25">${escapeHtml(item.badge || item.category)}</span>
                <h3 class="text-base font-bold text-white mt-2 leading-snug">${escapeHtml(item.title)}</h3>
                <p class="text-xs text-gray-300 mt-2 leading-relaxed">${escapeHtml(item.desc)}</p>
            </div>
            ${item.tech && item.tech.length ? `
                <div class="pt-2 border-t border-white/10">
                    <span class="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Keywords</span>
                    <div class="flex flex-wrap gap-1 mt-1.5">
                        ${item.tech.map(t => `<span class="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-200 border border-white/10">${escapeHtml(t)}</span>`).join('')}
                    </div>
                </div>` : ''}
        </div>
        <div class="pt-4 border-t border-white/10">
            <button onclick="executeSpotlightAction(${selectedSpotlightIndex})" class="w-full py-2 px-3 rounded-xl bg-[#0a84ff] hover:bg-[#3b9bff] text-white font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-md transition active:scale-95">
                <span>Open</span>
                <i class="fas fa-arrow-right text-[10px]"></i>
            </button>
        </div>`;
}

function executeSpotlightAction(index) {
    const input = document.getElementById('spotlight-input');
    const filtered = getSpotlightMatches(input ? input.value : '');
    if (filtered[index]) {
        closeSpotlight();
        filtered[index].action();
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
    const win = document.getElementById('app-notes');
    if (win) win.classList.remove('notes-detail');
    updateNotesBackLabel();
    renderNotesList();
    selectNote(currentSelectedNoteId || 'arch');
}

function updateNotesBackLabel() {
    const label = document.getElementById('notes-back-label');
    const win = document.getElementById('app-notes');
    if (label && win) label.textContent = win.classList.contains('notes-detail') ? 'Notes' : 'Back';
}

// iOS: "‹ Notes" returns to the list; from the list it goes Home
function notesBack() {
    const win = document.getElementById('app-notes');
    if (win && !isDesktop() && win.classList.contains('notes-detail')) {
        win.classList.remove('notes-detail');
        updateNotesBackLabel();
        return;
    }
    closeApp('notes');
}

function renderNotesList(filter = '') {
    const listEl = document.getElementById('notes-list-container');
    if (!listEl) return;

    const filtered = DEFAULT_NOTES.filter(n => {
        if (!filter) return true;
        return n.title.toLowerCase().includes(filter.toLowerCase()) || n.preview.toLowerCase().includes(filter.toLowerCase());
    });

    if (!filtered.length) {
        listEl.innerHTML = `<div class="text-center text-xs text-gray-500 py-8">No notes match “${escapeHtml(filter)}”</div>`;
        return;
    }

    listEl.innerHTML = filtered.map(note => `
        <div class="notes-item ${note.id === currentSelectedNoteId ? 'active' : ''}" onclick="selectNote('${note.id}', true)">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-white truncate">${note.pinned ? '<i class="fas fa-thumbtack text-[9px] text-amber-400 mr-1"></i>' : ''}${note.title}</span>
                <span class="text-[10px] text-gray-400 shrink-0 ml-1">${note.date}</span>
            </div>
            <p class="text-[11px] text-gray-400 truncate mt-0.5">${note.preview}</p>
        </div>
    `).join('');
}

function selectNote(noteId, fromUser = false) {
    currentSelectedNoteId = noteId;
    const pane = document.getElementById('note-view-pane');
    if (!pane) return;

    if (fromUser && !isDesktop()) {
        const win = document.getElementById('app-notes');
        if (win) win.classList.add('notes-detail');
        updateNotesBackLabel();
    }

    renderNotesList(document.getElementById('notes-search-input') ? document.getElementById('notes-search-input').value : '');

    const note = DEFAULT_NOTES.find(n => n.id === noteId);
    if (!note) return;

    if (note.isScratchpad) {
        let savedText = '';
        try { savedText = localStorage.getItem('ranveer_notes_scratchpad') || ''; } catch (e) { /* storage blocked */ }
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
                <textarea id="scratchpad-textarea" class="flex-1 w-full bg-transparent p-3 text-sm text-gray-100 font-mono focus:outline-none resize-none mt-2 leading-relaxed" placeholder="Type your notes, ideas or feedback for Ranveer here… (auto-saved in this browser)" oninput="try { localStorage.setItem('ranveer_notes_scratchpad', this.value) } catch (e) {}">${escapeHtml(savedText)}</textarea>
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
    selectNote('scratchpad', true);
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
        try { localStorage.removeItem('ranveer_notes_scratchpad'); } catch (e) { /* storage blocked */ }
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

    // Dock / Launchpad / Finder calendar icons and the desktop calendar widget
    document.querySelectorAll('.js-cal-day').forEach(el => { if (el.textContent !== dayShort) el.textContent = dayShort; });
    document.querySelectorAll('.js-cal-date').forEach(el => { if (el.textContent !== String(dateNum)) el.textContent = dateNum; });
    const wDay = document.getElementById('wcal-day');
    if (wDay && wDay.textContent !== dayName) wDay.textContent = dayName;
    const wDate = document.getElementById('wcal-date');
    if (wDate && wDate.textContent !== String(dateNum)) wDate.textContent = dateNum;
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
    "skills.txt": "[Databases]            MongoDB, PostgreSQL, Prisma\n[Frameworks/Libs]      React.js, Next.js, Tailwind CSS, Bootstrap, Astro, Express\n[Languages]            JavaScript, C++, Java, Python, PHP, Dart\n[DevOps & Cloud]       Docker, AWS (EC2, S3, Lambda, CloudFront)\n[Tools & Platforms]    React Native, Flutter, Ionic Framework, GitHub, Postman, Twilio\n[Soft Skills]          Critical Thinking, Collaboration, Problem Solving, Teamwork, Adaptability",

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
        "chatbot_studio.txt": "> Chatbot Studio — AI Chatbot Builder for Websites\n  App:  https://app.chatbotstudio.tech/login\n  Desc: AI bot manager. Create multiple AI chatbots for different websites and embed each one on any site as a chat widget.",
        "libready.txt": "> LibReady — Offline PDF & EPUB Library (Book-Library)\n  Repo: https://github.com/Rvjais/Book-Library\n  Site: https://libready.vercel.app\n  Stack: Flutter, Dart, SQLite (sqflite), custom EPUB parser\n  Desc: Private, offline library and reader for Android & iOS. Wooden shelves with covers from page 1, page-curl / flip / slide page turns, bookmarks, contents, in-book search, Paper / Sepia / Night / Black themes. No account, no server, no network.",
        "aicrmz.txt": "> AICRMZ — WhatsApp AI CRM\n  Repo: https://github.com/Rvjais/AI-CRM\n  Live: https://in.aicrmz.com API https://api.aicrmz.com\n  Stack: React 19, Express 4, MongoDB Atlas, Baileys 6.7, Socket.io\n  Desc: Multi-tenant WhatsApp via QR. AI auto-reply + sentiment, campaigns queue, follow-ups, CSV import, Gmail/Sheets, Twilio + Bolna voice, Cloudinary, Ionic mobile."
    },
    "contact.txt": "Email:    ranveerjais9984@gmail.com\nPhone:    +91 9648165493\nLocation: Gurgaon, India\nResume:   ranveer_jaiswal.pdf\nGitHub:   github.com/Rvjais\nLinkedIn: linkedin.com/in/ranveer-jaiswal-966289238"
};

let currentDir = fileSystem;
let currentPath = "~";
const termHistory = [];
let termHistoryIdx = -1;

const TERMINAL_COMMANDS = ['help', 'ls', 'cd', 'cat', 'open', 'clear', 'whoami', 'neofetch', 'pwd', 'date', 'echo', 'history', 'resume', 'exit'];
const OPEN_TARGETS = {
    about: () => openApp('about'), projects: () => { openApp('projects'); switchProjectsView('cards', null); },
    skills: () => openApp('skills'), contact: () => openApp('contact'), mail: () => openApp('contact'),
    gallery: () => openApp('gallery'), photos: () => openApp('gallery'), notes: () => openApp('notes'),
    calendar: () => openApp('calendar'), calculator: () => openApp('calculator'),
    finder: () => openFinder('projects'), launchpad: () => openLaunchpad(), resume: () => openResume(),
    github: () => window.open('https://github.com/Rvjais', '_blank', 'noopener'),
    readme: () => openReadmeModal('fullstack-code-visualiser'), visualizer: () => openReadmeModal('fullstack-code-visualiser'),
    'fullstack-code-visualiser': () => openReadmeModal('fullstack-code-visualiser'), folder: () => openFolderModal()
};

function termPrint(html, cls = 'text-gray-300 ml-3 my-1') {
    const termOutput = document.getElementById('term-output');
    if (termOutput) termOutput.insertAdjacentHTML('beforeend', `<div class="${cls}">${html}</div>`);
}

function executeTerminalCommand(cmdLine) {
    const termOutput = document.getElementById('term-output');
    const terminalBody = document.getElementById('terminal-body');
    if (!termOutput) return;

    const trimmed = cmdLine.trim();
    termOutput.insertAdjacentHTML('beforeend', `<div class="mt-1"><span class="text-blue-400 font-bold">guest@dev:${escapeHtml(currentPath)}$</span> <span class="text-white">${escapeHtml(trimmed)}</span></div>`);

    if (trimmed) {
        if (termHistory[termHistory.length - 1] !== trimmed) termHistory.push(trimmed);
        termHistoryIdx = termHistory.length;
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

    switch (cmd) {
        case 'help':
            termPrint(`<div class="space-y-1 text-xs md:text-sm">
                ${[
                    ['ls', 'List files & directories'],
                    ['cd', 'Change directory (cd projects, cd ..)'],
                    ['cat', 'Read a file (cat skills.txt)'],
                    ['open', 'Open an app (open finder | about | contact | resume | github)'],
                    ['neofetch', 'System summary'],
                    ['whoami', 'Who is Ranveer?'],
                    ['history', 'Previously run commands'],
                    ['clear', 'Clear the screen'],
                    ['exit', 'Close the terminal']
                ].map(([c, d]) => `<div><span class="text-green-400 font-semibold w-24 inline-block">${c}</span>${d}</div>`).join('')}
                <div class="text-gray-500 pt-1">Tip: ↑/↓ recall history • Tab autocompletes</div>
            </div>`, 'text-gray-300 ml-3 my-2');
            break;

        case 'ls': {
            let output = '<div class="flex flex-wrap gap-x-4 gap-y-1">';
            for (const key in currentDir) {
                if (typeof currentDir[key] === 'object') {
                    output += `<span class="text-blue-400 font-semibold flex items-center cursor-pointer hover:underline" onclick="runQuickCommand('cd ${key}')"><i class="fas fa-folder mr-1.5"></i>${key}/</span>`;
                } else {
                    output += `<span class="text-gray-300 flex items-center cursor-pointer hover:text-white" onclick="runQuickCommand('cat ${key}')"><i class="fas fa-file-code mr-1.5 text-gray-500"></i>${key}</span>`;
                }
            }
            termPrint(output + '</div>');
            break;
        }

        case 'cd':
            if (!arg || arg === '~' || arg === '/' || arg === '..') {
                currentDir = fileSystem;
                currentPath = "~";
                updatePrompt();
            } else if (currentDir[arg.replace(/\/$/, '')] && typeof currentDir[arg.replace(/\/$/, '')] === 'object') {
                const dir = arg.replace(/\/$/, '');
                currentDir = currentDir[dir];
                currentPath = `~/${dir}`;
                updatePrompt();
            } else {
                termPrint(`cd: no such file or directory: ${escapeHtml(arg)}`, 'text-red-400 ml-3 my-1');
            }
            break;

        case 'cat':
            if (!arg) {
                termPrint('cat: specify a filename — try <span class="text-white">ls</span> first', 'text-red-400 ml-3 my-1');
            } else if (typeof (currentDir[arg] ?? (currentDir === fileSystem ? fileSystem.projects[arg] : undefined)) === 'string') {
                // Files in projects/ are readable from ~ too, so the quick chips work anywhere
                const formatted = escapeHtml(currentDir[arg] ?? fileSystem.projects[arg])
                    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" class="underline decoration-dotted hover:text-white">$1</a>')
                    .replace(/\n/g, '<br>');
                termPrint(formatted, 'text-green-300 ml-3 my-1 border-l-2 border-emerald-500/60 pl-3 py-1 bg-white/5 rounded-r');
            } else if (currentDir[arg] && typeof currentDir[arg] === 'object') {
                termPrint(`cat: ${escapeHtml(arg)}: Is a directory. Use 'cd ${escapeHtml(arg)}' instead.`, 'text-yellow-400 ml-3 my-1');
            } else {
                termPrint(`cat: ${escapeHtml(arg)}: No such file`, 'text-red-400 ml-3 my-1');
            }
            break;

        case 'open': {
            const target = (arg || '').toLowerCase();
            if (OPEN_TARGETS[target]) {
                OPEN_TARGETS[target]();
                termPrint(`Opening ${escapeHtml(target)}…`, 'text-blue-300 ml-3 my-1');
            } else {
                termPrint(`open: try one of — ${Object.keys(OPEN_TARGETS).filter(k => !['mail', 'photos', 'readme', 'visualizer', 'folder'].includes(k)).join(', ')}`, 'text-red-400 ml-3 my-1');
            }
            break;
        }

        case 'neofetch':
            termPrint(`<div class="flex flex-col sm:flex-row gap-4 items-start">
                <pre class="text-emerald-400 font-bold leading-tight text-[11px] m-0">   ____    _
  |  _ \\  | |
  | |_) |_| |
  |  _ &lt;|_  |
  |_| \\_\\ |_|</pre>
                <div class="text-xs md:text-sm space-y-0.5">
                    <div><span class="text-emerald-400 font-bold">ranveer</span>@<span class="text-emerald-400 font-bold">portfolio</span></div>
                    <div class="text-gray-600">-------------------</div>
                    <div><span class="text-blue-400">Role</span>: Full Stack / MERN Developer</div>
                    <div><span class="text-blue-400">Company</span>: Branding Pioneers (Gurgaon)</div>
                    <div><span class="text-blue-400">Stack</span>: React, Next.js, Node.js, Express, MongoDB, PostgreSQL</div>
                    <div><span class="text-blue-400">Also</span>: React Native, Docker, AWS, Python, C++</div>
                    <div><span class="text-blue-400">Projects</span>: 14 (1 published npm package)</div>
                    <div><span class="text-blue-400">Contact</span>: ranveerjais9984@gmail.com</div>
                    <div class="pt-1 flex gap-1">${['#ff5f57', '#febc2e', '#28c840', '#0a84ff', '#bf5af2', '#64d2ff'].map(c => `<span style="background:${c}" class="inline-block w-4 h-3 rounded-sm"></span>`).join('')}</div>
                </div>
            </div>`, 'text-gray-300 ml-3 my-2');
            break;

        case 'pwd':
            termPrint(currentPath.replace('~', '/Users/guest'));
            break;

        case 'date':
            termPrint(escapeHtml(new Date().toString()));
            break;

        case 'echo':
            termPrint(escapeHtml(args.slice(1).join(' ')));
            break;

        case 'history':
            termPrint(termHistory.map((h, i) => `<div><span class="text-gray-500 inline-block w-8">${i + 1}</span>${escapeHtml(h)}</div>`).join(''));
            break;

        case 'resume':
            openResume();
            termPrint('Opening ranveer_jaiswal.pdf…', 'text-blue-300 ml-3 my-1');
            break;

        case 'sudo':
            termPrint('guest is not in the sudoers file. This incident will be reported. 😄', 'text-yellow-300 ml-3 my-1');
            break;

        case 'exit':
            closeApp('projects');
            break;

        case 'clear':
            termOutput.innerHTML = '';
            break;

        case 'whoami':
            termPrint('ranveer_jaiswal — Full Stack / MERN Developer at Branding Pioneers, Gurgaon', 'text-yellow-300 ml-3 my-1');
            break;

        default:
            termPrint(`zsh: command not found: ${escapeHtml(cmd)}. Type 'help' for available commands.`, 'text-red-400 ml-3 my-1');
    }
}

function terminalAutocomplete(input) {
    const value = input.value;
    const parts = value.split(' ');
    if (parts.length === 1) {
        const matches = TERMINAL_COMMANDS.filter(c => c.startsWith(parts[0].toLowerCase()));
        if (matches.length === 1) input.value = matches[0] + ' ';
        else if (matches.length > 1) termPrint(matches.join('   '), 'text-gray-400 ml-3 my-1');
        return;
    }
    const partial = parts[parts.length - 1];
    const pool = parts[0] === 'open' ? Object.keys(OPEN_TARGETS) : Object.keys(currentDir);
    const matches = pool.filter(k => k.startsWith(partial));
    if (matches.length === 1) {
        parts[parts.length - 1] = matches[0];
        input.value = parts.join(' ');
    } else if (matches.length > 1) {
        termPrint(matches.join('   '), 'text-gray-400 ml-3 my-1');
    }
}

function updatePrompt() {
    const promptEl = document.getElementById('term-prompt');
    if (promptEl) promptEl.textContent = `guest@dev:${currentPath}$`;
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
        npmUrl: "",
        liveUrl: "https://srchess.vercel.app/",
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
        npmUrl: "",
        liveUrl: "https://ocr-sheet-topaz.vercel.app",
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
        npmUrl: "",
        liveUrl: "https://in.aicrmz.com",
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
    },
    "hr-buddy": {
        title: "HR-Buddy — AI Onboarding System",
        subtitle: "Live demo • React + Node.js",
        npmUrl: "",
        liveUrl: "https://hr-buddy-beta.vercel.app/",
        githubUrl: "https://github.com/Rvjais",
        content: `
            <h1>HR-Buddy — AI Onboarding System</h1>
            <p><strong>AI-driven employee onboarding quiz with an integrated anti-cheat mechanism.</strong></p>
            <blockquote>Runs structured initial assessments of candidates before onboarding, so HR teams can screen faster and trust the results.</blockquote>
            <h2>✨ What it does</h2>
            <ul>
                <li><strong>AI onboarding quiz:</strong> Structured pre-assessment of candidates prior to onboarding.</li>
                <li><strong>Anti-cheat mechanism:</strong> Keeps the screening honest and cheat-resistant.</li>
                <li><strong>Live and deployed:</strong> Try it at <a href="https://hr-buddy-beta.vercel.app/" target="_blank" rel="noopener" class="text-blue-400 hover:underline">hr-buddy-beta.vercel.app</a>.</li>
            </ul>
            <h2>🛠️ Stack</h2>
            <p><code>React</code> <code>Node.js</code></p>
        `
    },
    "srchess-platform": {
        title: "SRChess — Interactive Chess Platform",
        subtitle: "Live demo • React + Tailwind CSS",
        npmUrl: "",
        liveUrl: "https://srchess.vercel.app/",
        githubUrl: "https://github.com/Rvjais",
        content: `
            <h1>SRChess — Interactive Chess Platform</h1>
            <p><strong>Responsive, interactive chess web application built with modern React.</strong></p>
            <h2>✨ What it does</h2>
            <ul>
                <li><strong>Custom piece logic:</strong> Every piece's movement rules implemented from scratch.</li>
                <li><strong>Real-time board rendering:</strong> Smooth, responsive board that works on mobile.</li>
                <li><strong>Move validation:</strong> Illegal moves are rejected before they reach the board.</li>
            </ul>
            <h2>🛠️ Stack</h2>
            <p><code>React</code> <code>Tailwind CSS</code> <code>Game logic</code></p>
            <p>• <strong>Live:</strong> <a href="https://srchess.vercel.app/" target="_blank" rel="noopener" class="text-blue-400 hover:underline">srchess.vercel.app</a></p>
        `
    },
    "pioneeros": {
        title: "PioneerOS — Internal Platform",
        subtitle: "React • Next.js • Node.js • Prisma • PostgreSQL",
        npmUrl: "",
        githubUrl: "https://github.com/Rvjais",
        content: `
            <h1>PioneerOS</h1>
            <p><strong>Multi-module internal platform for project management, messaging and dashboards.</strong></p>
            <h2>✨ What it does</h2>
            <ul>
                <li><strong>Project management:</strong> One place for teams to plan and track work.</li>
                <li><strong>Real-time messaging:</strong> Built-in team communication.</li>
                <li><strong>Responsive dashboards:</strong> Usable on desktop and mobile.</li>
                <li><strong>Asynchronous queue system:</strong> Keeps the platform fast with many concurrent users.</li>
            </ul>
            <h2>🛠️ Stack</h2>
            <p><code>React</code> <code>Next.js</code> <code>Node.js</code> <code>Prisma</code> <code>PostgreSQL</code></p>
        `
    },
    "rain-crm": {
        title: "Rain CRM — AI WhatsApp & Calling CRM",
        subtitle: "React • Node.js • Express • MongoDB",
        npmUrl: "",
        githubUrl: "https://github.com/Rvjais",
        content: `
            <h1>Rain CRM</h1>
            <p><strong>Full-featured CRM with AI WhatsApp bots, in-app calling and an AI email client.</strong></p>
            <h2>✨ What it does</h2>
            <ul>
                <li><strong>AI WhatsApp bots:</strong> Extract numbers from conversations straight into spreadsheets.</li>
                <li><strong>In-app Twilio calling:</strong> Call leads without leaving the CRM.</li>
                <li><strong>Web-form automation:</strong> Form submissions flow straight to WhatsApp.</li>
                <li><strong>AI email client:</strong> Prioritises important messages and forwards them to WhatsApp, so leads are never missed.</li>
            </ul>
            <h2>🛠️ Stack</h2>
            <p><code>React</code> <code>Node.js</code> <code>Express</code> <code>MongoDB</code> <code>Twilio</code></p>
        `
    },
    "stock-mgmt": {
        title: "Stock Management System",
        subtitle: "C++ • Qt GUI",
        npmUrl: "",
        githubUrl: "https://github.com/Rvjais",
        content: `
            <h1>Stock Management System</h1>
            <p><strong>A GUI-based hobby project built with the Qt library.</strong></p>
            <h2>✨ Focus areas</h2>
            <ul>
                <li><strong>Object-oriented design:</strong> Clean class structure for products and inventory.</li>
                <li><strong>Custom file handling:</strong> Stock persists between sessions without a database.</li>
                <li><strong>Efficient data structuring:</strong> Fast lookups and updates for shop stock.</li>
            </ul>
            <h2>🛠️ Stack</h2>
            <p><code>C++</code> <code>Qt</code> <code>OOP</code> <code>File I/O</code></p>
        `
    },
    "chatbot-studio": {
        title: "Chatbot Studio — AI Chatbot Builder",
        subtitle: "AI bot manager • embeddable website widget",
        npmUrl: "",
        liveUrl: "https://app.chatbotstudio.tech/login",
        liveLabel: "Open App",
        githubUrl: "",
        content: `
            <h1>Chatbot Studio</h1>
            <p><strong>An AI bot manager for websites: create different AI chatbots and add any of them to a website as a chat widget.</strong></p>

            <div class="mb-3">
                <span class="readme-hero-badge bg-violet-500/20 text-violet-300 border border-violet-500/30"><i class="fas fa-robot mr-1"></i> AI chatbots</span>
                <span class="readme-hero-badge bg-sky-500/20 text-sky-300 border border-sky-500/30"><i class="fas fa-layer-group mr-1"></i> Multiple bots</span>
                <span class="readme-hero-badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><i class="fas fa-code mr-1"></i> Embeddable widget</span>
            </div>

            <blockquote>
                Build a separate AI bot for each website, then drop it onto that site as a chat widget, so every site gets its own assistant without building a chatbot from scratch.
            </blockquote>

            <h2>✨ What it does</h2>
            <div class="readme-feature-grid">
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-violet-500/20 text-violet-400"><i class="fas fa-robot"></i></div>
                        <h4>Create multiple AI bots</h4>
                    </div>
                    <p>Set up different AI chatbots, each one for a different website.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-emerald-500/20 text-emerald-400"><i class="fas fa-window-maximize"></i></div>
                        <h4>Use it as a website widget</h4>
                    </div>
                    <p>Embed any bot on a website as a chat widget so visitors can talk to it right on the page.</p>
                </div>
            </div>

            <h2>🔗 Links</h2>
            <p>• <strong>App:</strong> <a href="https://app.chatbotstudio.tech/login" target="_blank" rel="noopener" class="text-blue-400 hover:underline">app.chatbotstudio.tech</a></p>
        `
    },
    "libready": {
        title: "LibReady — PDF & EPUB Library",
        subtitle: "Flutter • Android & iOS • offline",
        npmUrl: "",
        liveUrl: "https://libready.vercel.app",
        liveLabel: "Website",
        githubUrl: "https://github.com/Rvjais/Book-Library",
        content: `
            <h1>LibReady — Offline PDF &amp; EPUB Library</h1>
            <p><strong>A private, offline library and reader for PDF and EPUB books, built with Flutter for Android and iOS.</strong></p>

            <div class="mb-3">
                <span class="readme-hero-badge bg-sky-500/20 text-sky-300 border border-sky-500/30"><i class="fas fa-mobile-screen mr-1"></i> Flutter • Android &amp; iOS</span>
                <span class="readme-hero-badge bg-amber-500/20 text-amber-300 border border-amber-500/30"><i class="fas fa-book mr-1"></i> PDF + EPUB 2/3</span>
                <span class="readme-hero-badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><i class="fas fa-lock mr-1"></i> 100% offline &amp; private</span>
                <span class="readme-hero-badge bg-purple-500/20 text-purple-300 border border-purple-500/30"><i class="fas fa-database mr-1"></i> SQLite storage</span>
            </div>

            <blockquote>
                Books live on a wooden shelf, spines out, with the date you last read them written above each cover. Open a book and the page peels over with a real page-curl animation. Nothing leaves your device — there is no account, no server and no network access.
            </blockquote>

            <h2>📸 Screenshots</h2>
            <p class="text-xs text-gray-400">Click any screenshot to zoom in. Use ← / → to flip through them.</p>

            <div class="readme-screenshot-grid">
                <div class="readme-screenshot-card">
                    <div class="readme-screenshot-img-wrap" onclick="openGalleryLightbox('proj-libready-1')">
                        <img src="assets/LibReady/library.webp" alt="LibReady wooden library shelf" loading="lazy">
                    </div>
                    <div class="readme-screenshot-caption">
                        <h4><span><i class="fas fa-book text-amber-400 mr-1.5"></i> Wooden Library Shelf</span> <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">LIBRARY</span></h4>
                        <p>Covers generated from the first page of each book, with the last-read date above every cover and All / Reading / Finished / Favourites filters.</p>
                    </div>
                </div>
                <div class="readme-screenshot-card">
                    <div class="readme-screenshot-img-wrap" onclick="openGalleryLightbox('proj-libready-2')">
                        <img src="assets/LibReady/spines.webp" alt="LibReady spine shelf view" loading="lazy">
                    </div>
                    <div class="readme-screenshot-caption">
                        <h4><span><i class="fas fa-grip-lines-vertical text-orange-400 mr-1.5"></i> Spines-Out Shelf</span> <span class="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono">SHELVES</span></h4>
                        <p>An alternate shelf layout with books standing spines-out; the shelf layout adapts to phone and tablet widths.</p>
                    </div>
                </div>
                <div class="readme-screenshot-card">
                    <div class="readme-screenshot-img-wrap" onclick="openGalleryLightbox('proj-libready-3')">
                        <img src="assets/LibReady/reader.webp" alt="LibReady reader" loading="lazy">
                    </div>
                    <div class="readme-screenshot-caption">
                        <h4><span><i class="fas fa-book-open text-sky-400 mr-1.5"></i> Full-Screen Reader</span> <span class="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">READER</span></h4>
                        <p>Tap the centre for the toolbar, swipe or tap the edges to turn pages. Progress is saved automatically when you leave.</p>
                    </div>
                </div>
                <div class="readme-screenshot-card">
                    <div class="readme-screenshot-img-wrap" onclick="openGalleryLightbox('proj-libready-4')">
                        <img src="assets/LibReady/settings.webp" alt="LibReady reading settings" loading="lazy">
                    </div>
                    <div class="readme-screenshot-caption">
                        <h4><span><i class="fas fa-sliders text-purple-400 mr-1.5"></i> Themes &amp; Page Turns</span> <span class="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">SETTINGS</span></h4>
                        <p>Paper, Sepia, Night and Black themes; font size, line height and margins; page curl, book flip, slide, fade or instant page turns.</p>
                    </div>
                </div>
                <div class="readme-screenshot-card">
                    <div class="readme-screenshot-img-wrap" onclick="openGalleryLightbox('proj-libready-5')">
                        <img src="assets/LibReady/contents.webp" alt="LibReady table of contents" loading="lazy">
                    </div>
                    <div class="readme-screenshot-caption">
                        <h4><span><i class="fas fa-list text-emerald-400 mr-1.5"></i> Contents &amp; Search</span> <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">EPUB</span></h4>
                        <p>Table of contents, bookmarks with notes, in-book search with result snippets and jump-to-page.</p>
                    </div>
                </div>
            </div>

            <h2>✨ Features</h2>
            <div class="readme-feature-grid">
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-amber-500/20 text-amber-400"><i class="fas fa-file-import"></i></div>
                        <h4>Smart Import</h4>
                    </div>
                    <p>Import several files at once with progress, and duplicate detection by file fingerprint so the same book is never added twice.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-sky-500/20 text-sky-400"><i class="fas fa-code"></i></div>
                        <h4>Custom EPUB Engine</h4>
                    </div>
                    <p>Hand-written container / OPF / spine / nav / NCX parser; reflowable text is paginated on-device and keeps your place after typography changes.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-rose-500/20 text-rose-400"><i class="fas fa-file-pdf"></i></div>
                        <h4>Native PDF Rendering</h4>
                    </div>
                    <p>Zoom controls with neighbour-page prefetching and an LRU page cache for smooth reading.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-purple-500/20 text-purple-400"><i class="fas fa-scroll"></i></div>
                        <h4>Real Page-Curl Animation</h4>
                    </div>
                    <p>The current page is snapshotted and animated over the incoming page, so the next page is already rendered underneath.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-emerald-500/20 text-emerald-400"><i class="fas fa-gauge"></i></div>
                        <h4>Reading Dashboard</h4>
                    </div>
                    <p>Continue-reading card with one-tap resume, reading and finished shelves, plus reading and storage statistics.</p>
                </div>
                <div class="readme-feature-item">
                    <div class="readme-feature-item-header">
                        <div class="feat-icon bg-zinc-500/20 text-gray-300"><i class="fas fa-user-shield"></i></div>
                        <h4>Private by Design</h4>
                    </div>
                    <p>Books, covers, bookmarks and progress stay in the app's local storage. No analytics, accounts, ads, cloud sync or network requests.</p>
                </div>
            </div>

            <h2>🚀 Run it</h2>
            <pre>flutter pub get
flutter run
flutter build apk --release   # installable Android APK</pre>

            <h2>🔗 Links</h2>
            <p>
                • <strong>Website:</strong> <a href="https://libready.vercel.app" target="_blank" rel="noopener" class="text-blue-400 hover:underline">libready.vercel.app</a><br>
                • <strong>GitHub:</strong> <a href="https://github.com/Rvjais/Book-Library" target="_blank" rel="noopener" class="text-blue-400 hover:underline">Rvjais/Book-Library</a>
            </p>
        `
    },
    "shortcuts": {
        title: "Keyboard Shortcuts",
        subtitle: "Help • Ranveer's Mac",
        npmUrl: "",
        githubUrl: "",
        content: `
            <h1>Keyboard Shortcuts & Tips</h1>
            <h2>⌨️ Everywhere</h2>
            <ul>
                <li><code>⌘ K</code> or <code>Ctrl Space</code> — Spotlight search (apps, projects, skills, resume)</li>
                <li><code>F3</code> or <code>Ctrl ↑</code> — Mission Control</li>
                <li><code>F4</code> — Launchpad</li>
                <li><code>Esc</code> — Close menus, sheets and overlays</li>
            </ul>
            <h2>🪟 Windows</h2>
            <ul>
                <li>Drag the title bar to move • double-click it to zoom</li>
                <li>Drag the bottom-right corner to resize</li>
                <li>Yellow light minimizes to the Dock • red closes</li>
                <li>Right-click the desktop for wallpaper, widgets and Clean Up</li>
            </ul>
            <h2>💻 Terminal</h2>
            <ul>
                <li><code>help</code>, <code>ls</code>, <code>cd projects</code>, <code>cat aicrmz.txt</code>, <code>neofetch</code>, <code>open finder</code></li>
                <li><code>↑</code> / <code>↓</code> recall history • <code>Tab</code> autocompletes</li>
            </ul>
            <h2>📱 On a phone</h2>
            <ul>
                <li>Tap the bottom bar (or swipe up) to go Home • swipe up and hold for recent apps</li>
                <li>Tap the status icons (top-right) for Control Center • tap the Dynamic Island</li>
            </ul>
            <h2>🔗 Shareable links</h2>
            <p>Every app has its own link — e.g. <code>#about</code>, <code>#projects</code>, <code>#contact</code>, <code>#finder/skills</code> or <code>#readme/nothing-veer</code>.</p>
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
    const iconEl = document.getElementById('readme-icon');

    if (!projectReadmes[projectId]) projectId = 'fullstack-code-visualiser';
    const data = projectReadmes[projectId];

    if (titleEl) titleEl.textContent = data.title;
    if (subtitleEl) subtitleEl.textContent = data.subtitle;
    if (bodyEl) {
        bodyEl.innerHTML = data.content;
        bodyEl.scrollTop = 0;
    }

    // Header icon matches the project's app icon
    if (iconEl) {
        const proj = (typeof PORTFOLIO_PROJECTS !== 'undefined') && PORTFOLIO_PROJECTS.find(p => p.readme === projectId);
        iconEl.style.background = proj ? proj.bg : 'linear-gradient(180deg,#636366,#2c2c2e)';
        iconEl.innerHTML = `<i class="${proj ? proj.icon : (projectId === 'shortcuts' ? 'fas fa-keyboard' : 'fas fa-book-open')}"></i>`;
    }

    // Primary action: npm package, otherwise a live demo
    if (npmBtn) {
        const isNpm = !!data.npmUrl && data.npmUrl.includes('npmjs');
        const href = isNpm ? data.npmUrl : (data.liveUrl || '');
        if (href) {
            npmBtn.style.display = 'inline-flex';
            npmBtn.href = href;
            npmBtn.innerHTML = isNpm ? '<i class="fab fa-npm"></i> <span>npm</span>' : `<i class="fas fa-arrow-up-right-from-square"></i> <span>${escapeHtml(data.liveLabel || 'Live Demo')}</span>`;
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
        closeAllMenus();
        overlay.classList.add('is-active');
    }
    setHash(`readme/${projectId}`);
    if (typeof trackRecent === 'function' && projectId !== 'shortcuts') trackRecent(`readme:${projectId}`);
}

function closeReadmeModal() {
    const overlay = document.getElementById('readme-modal-overlay');
    if (overlay && overlay.classList.contains('is-active')) {
        overlay.classList.remove('is-active');
        setHash(focusedAppId && focusedAppId !== 'finder' ? focusedAppId : '');
    }
}

// --- Folders: Finder windows on macOS, springboard folders on iOS ---
function openFolderModal() {
    if (isDesktop()) { openFinder('projects'); return; }
    const overlay = document.getElementById('folder-modal-overlay');
    if (overlay) overlay.classList.add('is-active');
}

function closeFolderModal() {
    const overlay = document.getElementById('folder-modal-overlay');
    if (overlay) overlay.classList.remove('is-active');
}

function openSkillsFolderModal() {
    if (isDesktop()) { openFinder('skills'); return; }
    const overlay = document.getElementById('skills-folder-modal-overlay');
    if (overlay) overlay.classList.add('is-active');
}

function closeSkillsFolderModal() {
    const overlay = document.getElementById('skills-folder-modal-overlay');
    if (overlay) overlay.classList.remove('is-active');
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
        id: "proj-libready-1", type: "photo", title: "LibReady — Wooden Library Shelf", desc: "Books stand on dark wood shelves with covers generated from page 1 and the last-read date above each one", src: "assets/LibReady/library.webp", date: "Nov 2026"
    },
    {
        id: "proj-libready-2", type: "photo", title: "LibReady — Spine Shelf View", desc: "Alternate shelf layout showing books spines-out, with Reading / Finished / Favourites filters", src: "assets/LibReady/spines.webp", date: "Nov 2026"
    },
    {
        id: "proj-libready-3", type: "photo", title: "LibReady — Reader", desc: "Full-screen reader with text selection actions, bookmarks and a toolbar for contents, search and appearance", src: "assets/LibReady/reader.webp", date: "Nov 2026"
    },
    {
        id: "proj-libready-4", type: "photo", title: "LibReady — Reading Settings", desc: "Paper, Sepia, Night and Black themes, page textures, typography controls and page-turn styles (curl, flip, slide, fade, instant)", src: "assets/LibReady/settings.webp", date: "Nov 2026"
    },
    {
        id: "proj-libready-5", type: "photo", title: "LibReady — Table of Contents", desc: "EPUB contents sheet with chapter search and page numbers", src: "assets/LibReady/contents.webp", date: "Nov 2026"
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
        <div class="gallery-card group" onclick="openGalleryLightbox('${item.id}', 'gallery')">
            ${item.type === 'video' ? `
                <video src="${item.src}" muted playsinline class="pointer-events-none"></video>
                <div class="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition">
                    <div class="w-9 h-9 rounded-full bg-white/80 text-black flex items-center justify-center shadow-md">
                        <i class="fas fa-play text-xs ml-0.5"></i>
                    </div>
                </div>
            ` : `
                <img src="${item.src}" alt="${escapeHtml(item.title)}" loading="lazy">
            `}
            <div class="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-90 group-hover:opacity-100 transition">
                <span class="text-xs font-semibold text-white block truncate leading-tight">${escapeHtml(item.title)}</span>
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
        try { localStorage.removeItem('ranveer_gallery_uploads'); } catch (e) { /* storage blocked */ }
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

let lightboxList = [];
let lightboxIndex = 0;

// context 'gallery' = current Photos filter; otherwise siblings sharing the id prefix (e.g. proj-veer-*)
function openGalleryLightbox(itemId, context) {
    const item = galleryItems.find(i => i.id === itemId);
    if (!item) return;

    if (context === 'gallery') {
        lightboxList = galleryItems.filter(i => currentGalleryFilter === 'all' || (currentGalleryFilter === 'photos' ? i.type === 'photo' : i.type === 'video'));
    } else {
        const prefix = itemId.replace(/-\d+$/, '-');
        lightboxList = galleryItems.filter(i => i.id.startsWith(prefix));
        if (!lightboxList.length) lightboxList = [item];
    }
    lightboxIndex = Math.max(0, lightboxList.findIndex(i => i.id === itemId));
    renderLightboxItem();

    const overlay = document.getElementById('gallery-lightbox');
    if (overlay) overlay.classList.add('is-active');
}

function renderLightboxItem() {
    const container = document.getElementById('lightbox-container');
    const counter = document.getElementById('lightbox-counter');
    const item = lightboxList[lightboxIndex];
    if (!container || !item) return;

    const media = item.type === 'video'
        ? `<video src="${item.src}" controls autoplay playsinline class="max-h-[72vh] max-w-full rounded-t-xl bg-black"></video>`
        : `<img src="${item.src}" alt="${escapeHtml(item.title)}" class="max-h-[72vh] max-w-full object-contain rounded-t-xl bg-black">`;
    container.innerHTML = `
        ${media}
        <div class="p-4 bg-[#1c1c1f] w-full text-left border-t border-white/10">
            <h3 class="text-sm font-bold text-white">${escapeHtml(item.title)}</h3>
            <p class="text-xs text-gray-400 mt-1">${escapeHtml(item.desc)}</p>
        </div>`;

    const multi = lightboxList.length > 1;
    document.querySelectorAll('#gallery-lightbox .lightbox-nav').forEach(b => { b.style.display = multi ? '' : 'none'; });
    if (counter) {
        counter.textContent = multi ? `${lightboxIndex + 1} of ${lightboxList.length}` : '';
        counter.style.display = multi ? '' : 'none';
    }
}

function stepLightbox(delta) {
    if (lightboxList.length < 2) return;
    const vid = document.querySelector('#lightbox-container video');
    if (vid) vid.pause();
    lightboxIndex = (lightboxIndex + delta + lightboxList.length) % lightboxList.length;
    renderLightboxItem();
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
function handleCalculatorKey(e) {
    const k = e.key;
    if (k >= '0' && k <= '9') handleCalcDigit(k);
    else if (k === '.' || k === ',') handleCalcDigit('.');
    else if (k === '+' || k === '-' || k === '/') handleCalcOp(k);
    else if (k === '*' || k === 'x' || k === 'X') handleCalcOp('*');
    else if (k === 'Enter' || k === '=') handleCalcEqual();
    else if (k === '%') handleCalcPercent();
    else if (k === 'Backspace') {
        calcCurrent = (calcCurrent.length > 1 && calcCurrent !== 'Error') ? calcCurrent.slice(0, -1) : '0';
        updateCalcDisplay();
    } else if (k === 'c' || k === 'C' || k === 'Delete') handleCalcClear();
    else return false;
    return true;
}

// Escape closes the top-most transient layer (never app windows)
function handleEscape() {
    const lightbox = document.getElementById('gallery-lightbox');
    if (lightbox && lightbox.classList.contains('is-active')) { closeGalleryLightbox(); return; }
    const menuOpen = document.querySelector('#mb-dropdown.is-open, #ctx-menu.is-open');
    if (menuOpen) { closeAllMenus(); return; }
    closeSpotlight();
    closeReadmeModal();
    closeFolderModal();
    closeSkillsFolderModal();
    closeMissionControl();
    closeLaunchpad();
    closeIosAppSwitcher();
    closeControlCenter();
    closeAboutThisMac();
}

document.addEventListener('DOMContentLoaded', () => {
    setupWindowDragging();
    setupWindowResizing();
    setupDesktopIconDragging();
    initGallery();

    // Terminal: Enter runs • ↑/↓ history • Tab completes
    const termInput = document.getElementById('term-input');
    if (termInput) {
        termInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                const cmd = this.value;
                this.value = '';
                executeTerminalCommand(cmd);
            } else if (e.key === 'ArrowUp' && termHistory.length) {
                e.preventDefault();
                termHistoryIdx = Math.max(0, termHistoryIdx - 1);
                this.value = termHistory[termHistoryIdx] || '';
            } else if (e.key === 'ArrowDown' && termHistory.length) {
                e.preventDefault();
                termHistoryIdx = Math.min(termHistory.length, termHistoryIdx + 1);
                this.value = termHistory[termHistoryIdx] || '';
            } else if (e.key === 'Tab') {
                e.preventDefault();
                terminalAutocomplete(this);
            }
        });
    }

    // Spotlight input
    const spotlightInput = document.getElementById('spotlight-input');
    if (spotlightInput) {
        spotlightInput.addEventListener('input', function () {
            selectedSpotlightIndex = 0;
            renderSpotlightResults(this.value);
        });
        spotlightInput.addEventListener('keydown', function (e) {
            const count = getSpotlightMatches(this.value).length;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedSpotlightIndex = Math.min(count - 1, selectedSpotlightIndex + 1);
                updateSpotlightSelection();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedSpotlightIndex = Math.max(0, selectedSpotlightIndex - 1);
                updateSpotlightSelection();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                executeSpotlightAction(selectedSpotlightIndex);
            } else if (e.key === 'Escape') {
                e.stopPropagation();
                closeSpotlight();
            }
        });
    }

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        const typing = e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]');

        const lock = document.getElementById('lock-screen');
        if (lock && lock.classList.contains('is-active')) {
            e.preventDefault();
            unlockScreen();
            return;
        }

        const lightbox = document.getElementById('gallery-lightbox');
        if (lightbox && lightbox.classList.contains('is-active') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            stepLightbox(e.key === 'ArrowLeft' ? -1 : 1);
            return;
        }

        if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.code === 'Space')) {
            e.preventDefault();
            toggleSpotlight();
            return;
        }

        if (e.key === 'F4') {
            e.preventDefault();
            toggleLaunchpad();
            return;
        }

        if (e.key === 'Escape' || e.key === 'Esc') {
            handleEscape();
            return;
        }

        // Calculator keys only when Calculator is the focused window and nothing else has focus
        const calcApp = document.getElementById('app-calculator');
        if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && focusedAppId === 'calculator' && calcApp && calcApp.classList.contains('is-open')) {
            if (handleCalculatorKey(e)) e.preventDefault();
            return;
        }

        // Finder: Enter opens the selected item
        if (!typing && focusedAppId === 'finder' && e.key === 'Enter' && finderState.selected) {
            e.preventDefault();
            finderOpen(finderState.selected);
        }
    });

    // Outside click closes menus and Control Center
    document.addEventListener('mousedown', (e) => {
        if (!e.target.closest('#mb-dropdown, #ctx-menu, #mac-menubar .mb-item')) closeAllMenus();
        const cc = document.getElementById('macos-control-center');
        if (cc && cc.classList.contains('is-open') && !e.target.closest('#macos-control-center, #mac-control-center-btn, #mac-menubar .mb-status')) {
            closeControlCenter();
        }
    });

    initIosHomeGestures();
    initDesktopMissionControlGestures();
    initMacOSDock();
    initIosControlCenterSliders();
    initMenubar();
    initWidgets();
    initFinder();
    renderWallpaperThumbs();
    restoreWallpaper();

    if (typeof updateCalendarDatesDisplay === 'function') updateCalendarDatesDisplay();
    if (typeof renderCalendarGrid === 'function') renderCalendarGrid();

    // Ensure every overlay starts closed
    closeMissionControl();
    closeIosAppSwitcher();
    closeSkillsFolderModal();
    closeAllMenus();
    closeControlCenter();
    closeAboutThisMac();

    window.addEventListener('hashchange', handleDeepLink);
    runBootSequence();
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
    },
    'finder': {
        title: 'Finder',
        subtitle: 'Projects, Skills & Documents',
        icon: 'fas fa-folder-open',
        iconColor: 'bg-gradient-to-b from-sky-400 to-blue-600 text-white',
        badge: 'Files'
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
        } else if (appId === 'finder') {
            previewHtml = `
                <div class="h-full flex flex-col bg-[#f5f5f7] text-gray-900 pt-8 px-3.5 pb-3 select-none text-left">
                    <div class="text-lg font-bold px-1">Projects</div>
                    <div class="grid grid-cols-3 gap-3 mt-3">
                        ${(typeof PORTFOLIO_PROJECTS !== 'undefined' ? PORTFOLIO_PROJECTS.slice(0, 9) : []).map(p => `
                            <div class="flex flex-col items-center gap-1">
                                <div class="app-icon" style="width:44px;height:44px;background:${p.bg}"><i class="${p.icon}"></i></div>
                                <span class="text-[9px] text-gray-700 truncate max-w-full">${escapeHtml(p.name)}</span>
                            </div>`).join('')}
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
                    <div class="tahoe-mc-app-item" onclick="event.stopPropagation(); toggleMissionControl(false); openFinder('projects')">
                        <div class="tahoe-mc-app-icon bg-gradient-to-b from-sky-400 to-blue-600">
                            <i class="fas fa-folder-open"></i>
                        </div>
                        <span class="tahoe-mc-app-label">Finder</span>
                        <span class="tahoe-mc-app-sub">Projects</span>
                    </div>
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
        } else if (appId === 'finder') {
            body.className += ' bg-[#f5f5f7] text-gray-900';
            bodyHtml = `
                <div class="grid grid-cols-6 gap-3">
                    ${(typeof PORTFOLIO_PROJECTS !== 'undefined' ? PORTFOLIO_PROJECTS : []).map(p => `
                        <div class="flex flex-col items-center gap-1 min-w-0">
                            <div class="app-icon" style="width:46px;height:46px;background:${p.bg}"><i class="${p.icon}"></i></div>
                            <span class="text-[10px] text-gray-700 truncate max-w-full">${escapeHtml(p.name)}</span>
                        </div>`).join('')}
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-black/10 text-xs text-gray-500">
                    <span>${typeof PORTFOLIO_PROJECTS !== 'undefined' ? PORTFOLIO_PROJECTS.length : 12} items</span>
                    <span class="text-blue-600 font-semibold">Click to focus &rarr;</span>
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

    // Keyboard shortcuts: F3 or Ctrl/Cmd+ArrowUp toggles; ArrowDown exits (Escape is handled globally)
    window.addEventListener('keydown', (e) => {
        const typing = e.target && e.target.closest && e.target.closest('input, textarea');
        if (e.key === 'F3' || ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp' && !typing)) {
            e.preventDefault();
            toggleMissionControl();
        } else if (isMissionControlOpen && (e.key === 'ArrowDown' || ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown'))) {
            e.preventDefault();
            closeMissionControl();
        }
    });
}

// ==========================================================================
// macOS Dock • Menu bar • Finder • Launchpad • Widgets • System chrome
// ==========================================================================

// ---------- Portfolio data (single source for Finder, Launchpad, menus, widgets) ----------
const PORTFOLIO_PROJECTS = [
    { id: 'chatbot-studio', name: 'Chatbot Studio', kind: 'SaaS • AI chatbots', icon: 'fas fa-comments', bg: 'linear-gradient(180deg,#38bdf8,#7c3aed)', tags: ['AI', 'Chatbots', 'Widget'], desc: 'AI bot manager for creating multiple AI chatbots for different websites and embedding each one on any site as a chat widget.', readme: 'chatbot-studio', live: 'https://app.chatbotstudio.tech/login', featured: true },
    { id: 'fullstack-code-visualiser', name: 'Code Visualiser', kind: 'npm package • CLI', icon: 'fab fa-npm', bg: 'linear-gradient(180deg,#f87171,#be123c)', tags: ['npm', 'React', 'Node.js', 'Express', 'MongoDB'], desc: 'Published npm CLI that parses ASTs and live traffic to map UI → API → database as an interactive graph.', readme: 'fullstack-code-visualiser', npm: 'https://www.npmjs.com/package/fullstack-code-visualiser', repo: 'https://github.com/Rvjais/fullstack-code-visualiser', featured: true },
    { id: 'libready', name: 'LibReady', kind: 'Mobile app • Flutter', icon: 'fas fa-book-open', bg: 'linear-gradient(180deg,#c2410c,#713f12)', tags: ['Flutter', 'Dart', 'Mobile', 'SQLite'], desc: 'Private, offline PDF & EPUB library and reader for Android & iOS with wooden shelves, page-curl page turns, bookmarks and in-book search.', readme: 'libready', live: 'https://libready.vercel.app', repo: 'https://github.com/Rvjais/Book-Library', featured: true },
    { id: 'hr-buddy', name: 'HR-Buddy', kind: 'Web app • Live', icon: 'fas fa-user-check', bg: 'linear-gradient(180deg,#fbbf24,#ea580c)', tags: ['React', 'Node.js', 'AI'], desc: 'AI-driven onboarding quiz with an anti-cheat mechanism for structured candidate pre-assessment.', readme: 'hr-buddy', live: 'https://hr-buddy-beta.vercel.app/', repo: 'https://github.com/Rvjais' },
    { id: 'nothing-veer', name: 'Veer Music', kind: 'Mobile app • Expo', icon: 'fas fa-record-vinyl', bg: 'linear-gradient(180deg,#3f3f46,#991b1b)', tags: ['React Native', 'Mobile', 'Node.js'], desc: 'Nothing OS-style YouTube Music client with a vinyl player, synced LRC lyrics and a smart offline cache.', readme: 'nothing-veer', repo: 'https://github.com/Rvjais/Nothing-Veer' },
    { id: 'aicrmz', name: 'AICRMZ', kind: 'SaaS • WhatsApp CRM', icon: 'fab fa-whatsapp', bg: 'linear-gradient(180deg,#4ade80,#047857)', tags: ['React', 'Node.js', 'Express', 'MongoDB', 'AI', 'Mobile'], desc: 'Multi-tenant WhatsApp CRM via QR with AI auto-replies, sentiment, campaigns and voice follow-ups.', readme: 'aicrmz', live: 'https://in.aicrmz.com', repo: 'https://github.com/Rvjais/AI-CRM' },
    { id: 'ranveer-echo', name: 'Ranveer H.U.D.', kind: 'Desktop app • Tauri', icon: 'fas fa-robot', bg: 'linear-gradient(180deg,#22d3ee,#1e40af)', tags: ['Tauri', 'Rust', 'Python', 'AI'], desc: 'Jarvis-style desktop assistant: voice wake-word, face & hand gestures, SQLite memory and PC control.', readme: 'ranveer-echo', repo: 'https://github.com/Rvjais/Ranveer_Echo' },
    { id: 'web-ripper', name: 'WebRip', kind: 'Web tool • Python', icon: 'fas fa-spider', bg: 'linear-gradient(180deg,#2dd4bf,#047857)', tags: ['Python', 'Playwright', 'Flask'], desc: 'BFS crawler that clones websites — including SPAs — into offline ZIP archives with live SSE progress.', readme: 'web-ripper', repo: 'https://github.com/Rvjais/Web-Scrapper' },
    { id: 'textlens', name: 'TextLens', kind: 'Web app • OCR', icon: 'fas fa-file-lines', bg: 'linear-gradient(180deg,#818cf8,#6d28d9)', tags: ['Python', 'FastAPI', 'Docker', 'AI'], desc: 'Privacy-first batch OCR for images and PDFs with handwriting support and invoice-to-table extraction.', readme: 'textlens', live: 'https://ocr-sheet-topaz.vercel.app', repo: 'https://github.com/Rvjais/OCR-SHEET' },
    { id: 'srchess-platform', name: 'SRChess', kind: 'Web app • Live', icon: 'fas fa-chess-knight', bg: 'linear-gradient(180deg,#a855f7,#4338ca)', tags: ['React', 'Tailwind'], desc: 'Responsive chess web app with custom piece logic, real-time board rendering and move validation.', readme: 'srchess-platform', live: 'https://srchess.vercel.app/', repo: 'https://github.com/Rvjais' },
    { id: 'srchess', name: 'SR Chess 3D', kind: 'Website • Three.js', icon: 'fas fa-chess-board', bg: 'linear-gradient(180deg,#f59e0b,#6b21a8)', tags: ['Vite', 'Three.js'], desc: '25-page chess academy rebuild with a Three.js 3D hero, coach slider, shop cart and quiz.', readme: 'srchess', live: 'https://srchess.vercel.app/', repo: 'https://github.com/Rvjais/Srchess' },
    { id: 'pioneeros', name: 'PioneerOS', kind: 'Internal platform', icon: 'fas fa-desktop', bg: 'linear-gradient(180deg,#38bdf8,#1d4ed8)', tags: ['React', 'Next.js', 'Node.js', 'Prisma', 'PostgreSQL'], desc: 'Multi-module internal platform with project management, real-time messaging, dashboards and a queue system.', readme: 'pioneeros', repo: 'https://github.com/Rvjais' },
    { id: 'rain-crm', name: 'Rain CRM', kind: 'CRM suite', icon: 'fas fa-users-gear', bg: 'linear-gradient(180deg,#34d399,#0f766e)', tags: ['React', 'Node.js', 'Express', 'MongoDB', 'AI'], desc: 'CRM with AI WhatsApp bots, in-app Twilio calling, web-form automation and an AI email client.', readme: 'rain-crm', repo: 'https://github.com/Rvjais' },
    { id: 'stock-mgmt', name: 'Stock Manager', kind: 'Desktop app • Qt', icon: 'fas fa-boxes-stacked', bg: 'linear-gradient(180deg,#0891b2,#1e3a8a)', tags: ['C++', 'Qt'], desc: 'Qt GUI stock management app focused on OOP, file handling and efficient data structures.', readme: 'stock-mgmt', repo: 'https://github.com/Rvjais' }
];

const SKILLS_LIST = [
    { name: 'JavaScript', icon: 'devicon-javascript-plain colored', group: 'Language', level: 'Advanced', desc: 'Modern ES6+, async/await and the event loop — behind every project here.', match: ['React', 'Node.js'] },
    { name: 'TypeScript', icon: 'devicon-typescript-plain colored', group: 'Language', level: '', desc: 'Type safety, interfaces and generics.' },
    { name: 'Python', icon: 'devicon-python-plain colored', group: 'Language', level: 'Intermediate', desc: 'Scripting, automation and AI tooling.', match: ['Python'] },
    { name: 'C++', icon: 'devicon-cplusplus-plain colored', group: 'Language', level: 'Proficient', desc: 'OOP, data structures and Qt desktop GUIs.', match: ['C++'] },
    { name: 'Java', icon: 'devicon-java-plain colored', group: 'Language', level: 'Proficient', desc: 'OOP and software architecture.' },
    { name: 'PHP', icon: 'devicon-php-plain colored', group: 'Language', level: 'Proficient', desc: 'Backend development for client websites.' },
    { name: 'React', icon: 'devicon-react-original colored', group: 'Framework', level: 'Advanced', desc: 'Components, hooks and state management.', match: ['React'] },
    { name: 'Next.js', icon: 'devicon-nextjs-plain', group: 'Framework', level: 'Advanced', desc: 'SSR, SSG, the App Router and full-stack apps.', match: ['Next.js'] },
    { name: 'Node.js', icon: 'devicon-nodejs-plain colored', group: 'Runtime', level: 'Advanced', desc: 'REST APIs, microservices and authentication.', match: ['Node.js'] },
    { name: 'Express', icon: 'devicon-express-original', group: 'Framework', level: 'Advanced', desc: 'REST APIs and middleware.', match: ['Express'] },
    { name: 'React Native', icon: 'devicon-react-original colored', group: 'Mobile', level: 'Proficient', desc: 'Cross-platform iOS & Android apps — plus Ionic.', match: ['React Native'] },
    { name: 'Flutter & Dart', icon: 'devicon-flutter-plain colored', group: 'Mobile', level: '', desc: 'Cross-platform Android & iOS apps with Flutter and Dart.', match: ['Flutter'] },
    { name: 'Tailwind CSS', icon: 'devicon-tailwindcss-original colored', group: 'Styling', level: 'Advanced', desc: 'Responsive UI systems (and Bootstrap).', match: ['Tailwind'] },
    { name: 'Astro', icon: 'devicon-astro-plain', group: 'Framework', level: 'Proficient', desc: 'Content-driven client websites.' },
    { name: 'MongoDB', icon: 'devicon-mongodb-plain colored', group: 'Database', level: 'Advanced', desc: 'NoSQL documents, aggregations and Mongoose schemas.', match: ['MongoDB'] },
    { name: 'PostgreSQL', icon: 'devicon-postgresql-plain colored', group: 'Database', level: 'Advanced', desc: 'Relational modelling, complex queries and joins.', match: ['PostgreSQL'] },
    { name: 'Prisma', icon: 'devicon-prisma-original', group: 'ORM', level: 'Advanced', desc: 'Type-safe ORM and schema migrations.', match: ['Prisma'] },
    { name: 'Docker', icon: 'devicon-docker-plain colored', group: 'DevOps', level: 'Advanced', desc: 'Containerization, Dockerfiles and Compose.', match: ['Docker'] },
    { name: 'AWS', icon: 'devicon-amazonwebservices-plain-wordmark colored', bg: 'linear-gradient(180deg,#ffffff,#e5e5ea)', group: 'Cloud', level: 'Proficient', desc: 'EC2, S3, Lambda and CloudFront.' },
    { name: 'Git & GitHub', icon: 'devicon-git-plain colored', group: 'Tools', level: 'Advanced', desc: 'Version control, CI/CD and code reviews — plus Postman for APIs.' },
    { name: 'Twilio & WhatsApp', icon: 'devicon-twilio-original colored', bg: 'linear-gradient(180deg,#ffffff,#e5e5ea)', group: 'Automation', level: 'Advanced', desc: 'Calling, WhatsApp bots and Google Apps Script automation.' },
    { name: 'AST Tooling', icon: 'devicon-babel-plain colored', group: 'Tools', level: '', desc: 'Babel parser for codebase mapping.', match: ['npm'] }
];

const PORTFOLIO_APPS = [
    { id: 'finder', name: 'Finder', icon: 'finder', desc: 'Browse projects, skills and documents.', open: () => openFinder('projects') },
    { id: 'about', name: 'About Me', icon: 'safari', desc: 'Profile, experience and education.', open: () => openApp('about') },
    { id: 'projects', name: 'Terminal', icon: 'terminal', desc: 'devOS shell — try help, ls, neofetch.', open: () => { openApp('projects'); switchProjectsView('terminal', null); } },
    { id: 'cards', name: 'Project Cards', icon: 'cards', desc: 'Every project with demos and repos.', open: () => { openApp('projects'); switchProjectsView('cards', null); } },
    { id: 'contact', name: 'Mail', icon: 'mail', desc: 'Send Ranveer a message.', open: () => openApp('contact') },
    { id: 'notes', name: 'Notes', icon: 'notes', desc: 'Engineering notes and a scratchpad.', open: () => openApp('notes') },
    { id: 'calendar', name: 'Calendar', icon: 'calendar', desc: 'Month view with a sample dev agenda.', open: () => openApp('calendar') },
    { id: 'gallery', name: 'Photos', icon: 'photos', desc: 'Project screenshots and media.', open: () => openApp('gallery') },
    { id: 'music', name: 'Veer Music', icon: 'music', desc: 'The Nothing OS-style music app.', open: () => openReadmeModal('nothing-veer') },
    { id: 'calculator', name: 'Calculator', icon: 'calculator', desc: 'Keyboard-friendly calculator.', open: () => openApp('calculator') },
    { id: 'skills', name: 'System Settings', icon: 'settings', desc: 'Skill levels by category.', open: () => openApp('skills') }
];

// ---------- Helpers ----------
function openResume() {
    window.open('ranveer_jaiswal.pdf', '_blank', 'noopener');
    trackRecent('doc:resume');
}

function copyText(text, okMsg) {
    const done = () => notify({ title: 'Copied', body: okMsg || text, icon: 'fas fa-check' });
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done).catch(() => notify({ title: 'Copy this', body: text, icon: 'fas fa-copy', duration: 8000 }));
    } else {
        notify({ title: 'Copy this', body: text, icon: 'fas fa-copy', duration: 8000 });
    }
}

function copyPortfolioLink(hash) {
    copyText(window.location.origin + window.location.pathname + (hash ? `#${hash}` : ''), 'Link copied to clipboard');
}

function showDesktop() {
    [...runningApps].forEach(id => {
        const el = document.getElementById(`app-${id}`);
        if (el && el.classList.contains('is-open')) minimizeApp(id);
    });
}

let recentKeys = [];
try { recentKeys = JSON.parse(localStorage.getItem('rj_recents') || '[]').filter(k => typeof k === 'string').slice(0, 12); } catch (e) { recentKeys = []; }

function trackRecent(key) {
    recentKeys = [key, ...recentKeys.filter(k => k !== key)].slice(0, 12);
    try { localStorage.setItem('rj_recents', JSON.stringify(recentKeys)); } catch (e) { /* storage blocked */ }
    if (finderState.loc === 'recents' && document.getElementById('app-finder')?.classList.contains('is-open')) renderFinder();
}

function openProject(p) {
    trackRecent(`p:${p.id}`);
    if (p.readme) openReadmeModal(p.readme);
    else if (p.live) window.open(p.live, '_blank', 'noopener');
}

const todayParts = () => {
    const now = new Date();
    return { day: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()], date: now.getDate() };
};

// Self-contained icons (no external images that can 404)
function appIconHTML(kind) {
    const t = todayParts();
    switch (kind) {
        case 'finder': return '<div class="app-icon icon-finder"><i class="fas fa-folder-open"></i></div>';
        case 'launchpad': return `<div class="app-icon icon-launchpad"><span class="lp-dots">${['#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#64d2ff', '#0a84ff', '#5e5ce6', '#bf5af2', '#ff375f'].map(c => `<span style="background:${c}"></span>`).join('')}</span></div>`;
        case 'safari': return '<div class="app-icon icon-safari"><i class="fas fa-compass"></i></div>';
        case 'terminal': return '<div class="app-icon icon-terminal"><span class="term-glyph"><b>&gt;</b>_</span></div>';
        case 'cards': return '<div class="app-icon" style="background:linear-gradient(180deg,#5e5ce6,#3634a3)"><i class="fas fa-table-cells-large"></i></div>';
        case 'notes': return '<div class="app-icon icon-notes"></div>';
        case 'calendar': return `<div class="app-icon icon-calendar"><span class="ic-cal-day js-cal-day">${t.day}</span><span class="ic-cal-date js-cal-date">${t.date}</span></div>`;
        case 'photos': return '<div class="app-icon icon-photos"><span class="ic-petals"></span></div>';
        case 'mail': return '<div class="app-icon icon-mail"><i class="fas fa-envelope"></i></div>';
        case 'music': return '<div class="app-icon icon-music"><i class="fas fa-music"></i></div>';
        case 'calculator': return '<div class="app-icon icon-calculator"><i class="fas fa-calculator"></i></div>';
        case 'settings': return '<div class="app-icon icon-settings"><i class="fas fa-gear"></i></div>';
        case 'github': return '<div class="app-icon icon-github"><i class="fab fa-github"></i></div>';
        case 'resume': return '<div class="app-icon icon-doc"><svg viewBox="0 0 48 60"><use href="#ico-pdf"/></svg></div>';
        case 'trash': return '<div class="app-icon icon-trash"><svg viewBox="0 0 48 56"><use href="#ico-trash"/></svg></div>';
        case 'markdown': return '<div class="app-icon" style="background:linear-gradient(180deg,#fafafa,#d1d1d6);color:#3a3a3c"><i class="fab fa-markdown"></i></div>';
        default: return '<div class="app-icon icon-finder"><i class="fas fa-cube"></i></div>';
    }
}
const projectIconHTML = (p) => `<div class="app-icon" style="background:${p.bg}"><i class="${p.icon}"></i></div>`;
const skillIconHTML = (s) => `<div class="app-icon icon-skill"${s.bg ? ` style="background:${s.bg}"` : ''}><i class="${s.icon}"></i></div>`;

// ---------- Dock ----------
const macDockApps = [
    { id: 'finder', name: 'Finder', icon: 'finder', appId: 'finder', action: () => openFinder() },
    { id: 'launchpad', name: 'Launchpad', icon: 'launchpad', action: () => toggleLaunchpad() },
    { id: 'about', name: 'About Me', icon: 'safari', appId: 'about', action: () => openApp('about') },
    { id: 'projects', name: 'Projects — Terminal', icon: 'terminal', appId: 'projects', action: () => openApp('projects') },
    { id: 'notes', name: 'Notes', icon: 'notes', appId: 'notes', action: () => openApp('notes') },
    { id: 'calendar', name: 'Calendar', icon: 'calendar', appId: 'calendar', action: () => openApp('calendar') },
    { id: 'gallery', name: 'Photos', icon: 'photos', appId: 'gallery', action: () => openApp('gallery') },
    { id: 'contact', name: 'Contact — Mail', icon: 'mail', appId: 'contact', action: () => openApp('contact') },
    { id: 'music', name: 'Veer Music', icon: 'music', action: () => openReadmeModal('nothing-veer') },
    { id: 'calculator', name: 'Calculator', icon: 'calculator', appId: 'calculator', action: () => openApp('calculator') },
    { id: 'skills', name: 'Skills — System Settings', icon: 'settings', appId: 'skills', action: () => openApp('skills') },
    { id: 'sep', type: 'sep' },
    { id: 'resume', name: 'Resume.pdf', icon: 'resume', action: () => openResume() },
    { id: 'trash', name: 'Trash', icon: 'trash', action: () => notify({ title: 'Trash', body: 'Empty — every project here shipped. 🚀', icon: 'fas fa-trash-can', iconBg: 'linear-gradient(180deg,#8e8e93,#48484a)' }) }
];

let dockConfig = { base: 56, maxScale: 1.55, effect: 280 };
let dockMouseX = null;
let dockScales = macDockApps.map(() => 1);
let dockLefts = [];
let dockAnimFrame = null;
let dockLastWidth = 0;
let dockHoverIdx = -1;

function getDockResponsiveConfig() {
    const h = window.innerHeight, w = window.innerWidth;
    const appCount = macDockApps.filter(a => a.type !== 'sep').length;
    let base = h < 700 ? 44 : h < 820 ? 50 : 56;
    const fitBase = Math.floor((w - 80) / (appCount * 1.12 + 0.6));
    base = Math.max(34, Math.min(base, fitBase));
    return { base, maxScale: base < 44 ? 1.4 : 1.55, effect: base * 5.2 };
}
const dockSpacing = () => Math.max(4, Math.round(dockConfig.base * 0.1));
const dockPadding = () => Math.max(6, Math.round(dockConfig.base * 0.13));
const dockItemWidth = (item) => (item.type === 'sep' ? Math.round(dockConfig.base * 0.32) : dockConfig.base);
function dockStaticWidth() {
    return macDockApps.reduce((sum, item) => sum + dockItemWidth(item), 0) + dockSpacing() * (macDockApps.length - 1);
}

function dockTargetScales() {
    if (dockMouseX === null) return macDockApps.map(() => 1);
    const sp = dockSpacing();
    const half = dockConfig.effect / 2;
    let x = 0;
    return macDockApps.map(item => {
        const w = dockItemWidth(item);
        const centre = x + w / 2;
        x += w + sp;
        if (item.type === 'sep') return 1;
        const d = Math.abs(centre - dockMouseX);
        if (d >= half) return 1;
        const f = (1 - Math.cos((1 - d / half) * Math.PI)) / 2;
        return 1 + f * (dockConfig.maxScale - 1);
    });
}

function initMacOSDock() {
    const dock = document.getElementById('macos-dock');
    const inner = document.getElementById('macos-dock-inner');
    if (!dock || !inner) return;

    inner.innerHTML = macDockApps.map((item, i) => item.type === 'sep'
        ? `<div class="dock-sep" id="dock-item-${item.id}" data-idx="${i}"></div>`
        : `<div class="dock-item" id="dock-item-${item.id}" data-idx="${i}" role="button" tabindex="0" aria-label="${escapeHtml(item.name)}">
                <div class="dock-bounce">${appIconHTML(item.icon)}</div>
                <span class="dock-dot"></span>
           </div>`).join('');

    inner.addEventListener('click', (e) => {
        const el = e.target.closest('.dock-item');
        if (el) handleMacDockAppClick(+el.dataset.idx);
    });
    inner.addEventListener('keydown', (e) => {
        const el = e.target.closest('.dock-item');
        if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleMacDockAppClick(+el.dataset.idx); }
    });

    dock.addEventListener('mousemove', (e) => {
        const staticLeft = window.innerWidth / 2 - dockStaticWidth() / 2;
        dockMouseX = e.clientX - staticLeft;
        const el = e.target.closest('.dock-item');
        dockHoverIdx = el ? +el.dataset.idx : -1;
        if (!dockAnimFrame) dockAnimFrame = requestAnimationFrame(animateDock);
    }, { passive: true });

    dock.addEventListener('mouseleave', () => {
        dockMouseX = null;
        dockHoverIdx = -1;
        const tip = document.getElementById('dock-tooltip');
        if (tip) tip.classList.remove('visible');
        if (!dockAnimFrame) dockAnimFrame = requestAnimationFrame(animateDock);
    }, { passive: true });

    window.addEventListener('resize', () => {
        applyDockConfig();
    }, { passive: true });

    applyDockConfig();
    updateMacOSDockOpenApps();
}

function applyDockConfig() {
    dockConfig = getDockResponsiveConfig();
    const dock = document.getElementById('macos-dock');
    const inner = document.getElementById('macos-dock-inner');
    if (!dock || !inner) return;
    const pad = dockPadding();
    dock.style.padding = `${pad}px ${pad}px ${pad + 2}px`;
    dock.style.borderRadius = `${Math.round(dockConfig.base * 0.42)}px`;
    inner.style.height = `${dockConfig.base}px`;
    macDockApps.forEach(item => {
        const el = document.getElementById(`dock-item-${item.id}`);
        if (!el) return;
        el.style.width = `${dockItemWidth(item)}px`;
        el.style.height = `${dockConfig.base}px`;
    });
    dockScales = macDockApps.map(() => 1);
    dockLefts = [];
    if (!dockAnimFrame) dockAnimFrame = requestAnimationFrame(animateDock);
}

function animateDock() {
    dockAnimFrame = null;
    const dock = document.getElementById('macos-dock');
    if (!dock) return;
    const targets = dockTargetScales();
    const lerp = dockMouseX !== null ? 0.24 : 0.16;
    const sp = dockSpacing();
    let x = 0;
    let settled = true;

    macDockApps.forEach((item, i) => {
        dockScales[i] += (targets[i] - dockScales[i]) * lerp;
        if (Math.abs(targets[i] - dockScales[i]) > 0.002) settled = false;
        else dockScales[i] = targets[i];
        const w = dockItemWidth(item);
        const s = dockScales[i];
        // Visual left edge = x; compensate for scaling around the bottom-centre origin
        const translate = x - w / 2 + (w * s) / 2;
        dockLefts[i] = x;
        x += w * s + sp;
        const el = document.getElementById(`dock-item-${item.id}`);
        if (el) {
            el.style.transform = `translate3d(${translate.toFixed(2)}px,0,0) scale(${s.toFixed(4)})`;
            el.style.zIndex = String(Math.round(s * 10));
        }
    });

    const width = Math.round(x - sp);
    if (Math.abs(width - dockLastWidth) >= 1) {
        dockLastWidth = width;
        document.getElementById('macos-dock-inner').style.width = `${width}px`;
    }

    // Tooltip follows the hovered (magnified) icon
    const tip = document.getElementById('dock-tooltip');
    if (tip) {
        const item = macDockApps[dockHoverIdx];
        const el = item && item.type !== 'sep' ? document.getElementById(`dock-item-${item.id}`) : null;
        if (el && dockMouseX !== null) {
            const r = el.getBoundingClientRect();
            tip.textContent = item.name;
            tip.style.left = `${r.left + r.width / 2}px`;
            tip.style.top = `${r.top - 38}px`;
            tip.classList.add('visible');
        } else {
            tip.classList.remove('visible');
        }
    }

    if (!settled || dockMouseX !== null) dockAnimFrame = requestAnimationFrame(animateDock);
}

function handleMacDockAppClick(index) {
    const item = macDockApps[index];
    if (!item || item.type === 'sep') return;
    const alreadyRunning = item.appId && runningApps.includes(item.appId);
    if (!item.appId && item.id !== 'trash' && item.id !== 'launchpad') bounceDockIcon(item.id, true);
    if (typeof item.action === 'function') item.action();
    if (alreadyRunning) {
        const win = document.getElementById(`app-${item.appId}`);
        if (win) bringToFront(win);
    }
    updateMacOSDockOpenApps();
}

function bounceDockIcon(id, byItemId = false) {
    const item = byItemId ? macDockApps.find(a => a.id === id) : macDockApps.find(a => a.appId === id);
    if (!item) return;
    const el = document.querySelector(`#dock-item-${item.id} .dock-bounce`);
    if (!el || el.classList.contains('bouncing')) return;
    el.classList.add('bouncing');
    el.addEventListener('animationend', () => el.classList.remove('bouncing'), { once: true });
}

function updateMacOSDockOpenApps() {
    macDockApps.forEach(item => {
        const el = document.getElementById(`dock-item-${item.id}`);
        if (el && item.appId) el.classList.toggle('is-running', runningApps.includes(item.appId));
    });
}

// ---------- Menu bar & menus ----------
let openMenuName = null;
let currentMenuItems = [];
let currentCtxItems = [];

function currentAppName() {
    return focusedAppId ? (APP_DISPLAY_NAMES[focusedAppId] || 'Finder') : 'Finder';
}

function updateMenubarAppName() {
    const el = document.getElementById('mb-app-name');
    if (el) el.textContent = currentAppName();
}

const ALL_PROJECTS_MENU = () => PORTFOLIO_PROJECTS.map(p => ({ label: p.name, icon: p.icon, action: () => openProject(p) }));

const MENUS = {
    apple: () => [
        { label: 'About This Mac', action: openAboutThisMac },
        { sep: true },
        { label: 'System Settings…', action: () => openApp('skills') },
        { label: 'Launchpad', shortcut: 'F4', action: openLaunchpad },
        { sep: true },
        { label: 'Mission Control', shortcut: 'F3', action: () => toggleMissionControl(true) },
        { label: 'Spotlight', shortcut: '⌘K', action: openSpotlight },
        { label: 'Next Wallpaper', action: cycleTahoeWallpaper },
        { sep: true },
        { label: 'Lock Screen', shortcut: '⌃⌘Q', action: lockScreen },
        { label: 'Restart…', action: () => window.location.reload() }
    ],
    app: () => {
        const name = currentAppName();
        const id = focusedAppId;
        const meta = id && APP_METADATA[id];
        return [
            { label: `About ${name}`, action: () => (!id || id === 'finder') ? openAboutThisMac() : notify({ title: name, body: meta ? meta.subtitle : name, icon: meta ? meta.icon : 'fas fa-circle-info' }) },
            { sep: true },
            { label: `Hide ${name}`, shortcut: '⌘H', disabled: !id, action: () => minimizeApp(id) },
            { label: 'Hide Others', shortcut: '⌥⌘H', disabled: runningApps.length < 2, action: () => runningApps.filter(a => a !== id).forEach(minimizeApp) },
            { sep: true },
            { label: `Quit ${name}`, shortcut: '⌘Q', disabled: !id, action: () => closeApp(id) }
        ];
    },
    about: () => [
        { label: 'Overview', icon: 'fas fa-id-card', action: () => { openApp('about'); switchAboutTab('intro', null); } },
        { label: 'Experience', icon: 'fas fa-briefcase', action: () => { openApp('about'); switchAboutTab('exp', null); } },
        { label: 'Education', icon: 'fas fa-graduation-cap', action: () => { openApp('about'); switchAboutTab('edu', null); } },
        { sep: true },
        { label: 'Resume (PDF)', icon: 'fas fa-file-pdf', action: openResume },
        { label: 'GitHub Profile', icon: 'fab fa-github', action: () => window.open('https://github.com/Rvjais', '_blank', 'noopener') },
        { label: 'Copy Link to Portfolio', icon: 'fas fa-link', action: () => copyPortfolioLink('') }
    ],
    projects: () => [
        { label: 'Open in Finder', icon: 'fas fa-folder-open', action: () => openFinder('projects') },
        { label: 'Project Cards', icon: 'fas fa-table-cells-large', action: () => { openApp('projects'); switchProjectsView('cards', null); } },
        { label: 'Terminal', icon: 'fas fa-terminal', action: () => { openApp('projects'); switchProjectsView('terminal', null); } },
        { sep: true },
        { header: 'All Projects' },
        ...ALL_PROJECTS_MENU()
    ],
    skills: () => [
        { label: 'Skill Levels', icon: 'fas fa-gear', action: () => openApp('skills') },
        { label: 'Browse Skills in Finder', icon: 'fas fa-layer-group', action: () => openFinder('skills') },
        { sep: true },
        { header: 'Core Stack' },
        ...['React', 'Next.js', 'Node.js', 'MongoDB', 'PostgreSQL', 'Docker', 'AWS'].map(n => {
            const s = SKILLS_LIST.find(x => x.name === n);
            return { label: n, shortcut: s && s.level ? s.level : '', icon: 'fas fa-circle-check', action: () => { openFinder('skills'); setTimeout(() => finderSelect(`s:${n}`), 60); } };
        })
    ],
    contact: () => [
        { label: 'New Message…', icon: 'fas fa-pen-to-square', action: () => openApp('contact') },
        { sep: true },
        { label: 'Copy Email Address', icon: 'fas fa-at', action: () => copyText('ranveerjais9984@gmail.com', 'ranveerjais9984@gmail.com') },
        { label: 'Call +91 96481 65493', icon: 'fas fa-phone', action: () => { window.location.href = 'tel:+919648165493'; } },
        { label: 'GitHub', icon: 'fab fa-github', action: () => window.open('https://github.com/Rvjais', '_blank', 'noopener') },
        { label: 'LinkedIn', icon: 'fab fa-linkedin', action: () => window.open('https://www.linkedin.com/in/ranveer-jaiswal-966289238', '_blank', 'noopener') }
    ],
    window: () => {
        const items = [
            { label: 'Minimize', disabled: !focusedAppId, action: () => minimizeApp(focusedAppId) },
            { label: 'Zoom', disabled: !focusedAppId, action: () => maximizeApp(focusedAppId) },
            { sep: true },
            { label: 'Mission Control', shortcut: 'F3', action: () => toggleMissionControl(true) },
            { label: 'Show Desktop', disabled: !runningApps.length, action: showDesktop },
            { label: 'Bring All to Front', disabled: !runningApps.length, action: () => [...runningApps].forEach(id => openApp(id)) }
        ];
        if (runningApps.length) {
            items.push({ sep: true });
            runningApps.forEach(id => items.push({ label: APP_DISPLAY_NAMES[id] || id, checked: id === focusedAppId, action: () => openApp(id) }));
        }
        return items;
    },
    help: () => [
        { label: 'Keyboard Shortcuts', icon: 'fas fa-keyboard', action: () => openReadmeModal('shortcuts') },
        { label: 'Terminal Commands', icon: 'fas fa-terminal', action: () => { openApp('projects'); switchProjectsView('terminal', null); runQuickCommand('help'); } },
        { sep: true },
        { label: 'View Portfolio Source', icon: 'fab fa-github', action: () => window.open('https://github.com/Rvjais/Ranveer-Portfolio', '_blank', 'noopener') }
    ]
};

function renderMenuHTML(items) {
    return items.map((it, i) => {
        if (it.sep) return '<div class="macos-dropdown-divider"></div>';
        if (it.header) return `<div class="macos-dropdown-header">${escapeHtml(it.header)}</div>`;
        return `<div class="macos-dropdown-item${it.disabled ? ' is-disabled' : ''}" role="menuitem" data-mi="${i}" aria-disabled="${it.disabled ? 'true' : 'false'}">
            <span class="mi-check">${it.checked ? '<i class="fas fa-check"></i>' : ''}</span>
            ${it.icon ? `<i class="mi-icon ${it.icon}"></i>` : ''}
            <span class="mi-label">${escapeHtml(it.label)}</span>
            ${it.shortcut ? `<span class="mi-shortcut">${escapeHtml(it.shortcut)}</span>` : ''}
        </div>`;
    }).join('');
}

function openMenu(name, anchor) {
    const dd = document.getElementById('mb-dropdown');
    if (!dd || !MENUS[name]) return;
    document.getElementById('ctx-menu')?.classList.remove('is-open');
    closeControlCenter();
    currentMenuItems = MENUS[name]();
    dd.innerHTML = renderMenuHTML(currentMenuItems);
    dd.classList.add('is-open');
    const r = anchor.getBoundingClientRect();
    dd.style.left = `${Math.max(6, Math.min(r.left, window.innerWidth - dd.offsetWidth - 6))}px`;
    document.querySelectorAll('#mac-menubar .mb-item.is-active').forEach(b => b.classList.remove('is-active'));
    anchor.classList.add('is-active');
    openMenuName = name;
}

function closeAllMenus() {
    document.getElementById('mb-dropdown')?.classList.remove('is-open');
    document.getElementById('ctx-menu')?.classList.remove('is-open');
    document.querySelectorAll('#mac-menubar .mb-item.is-active').forEach(b => b.classList.remove('is-active'));
    openMenuName = null;
}

// Back-compat names used elsewhere
function closeAppleMenu() { closeAllMenus(); }
function toggleAppleMenu(e) {
    if (e) e.stopPropagation();
    const btn = document.querySelector('#mac-menubar [data-menu="apple"]');
    if (openMenuName === 'apple') closeAllMenus();
    else if (btn) openMenu('apple', btn);
}

function initMenubar() {
    document.querySelectorAll('#mac-menubar .mb-item[data-menu]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (openMenuName === btn.dataset.menu) closeAllMenus();
            else openMenu(btn.dataset.menu, btn);
        });
        btn.addEventListener('mouseenter', () => {
            if (openMenuName && openMenuName !== btn.dataset.menu) openMenu(btn.dataset.menu, btn);
        });
    });

    const bindMenu = (el, getItems) => el && el.addEventListener('click', (e) => {
        const row = e.target.closest('[data-mi]');
        if (!row) return;
        const it = getItems()[+row.dataset.mi];
        if (!it || it.disabled) return;
        closeAllMenus();
        if (typeof it.action === 'function') it.action();
    });
    bindMenu(document.getElementById('mb-dropdown'), () => currentMenuItems);
    bindMenu(document.getElementById('ctx-menu'), () => currentCtxItems);

    updateMenubarAppName();
}

// ---------- Desktop right-click menu ----------
function openDesktopContextMenu(e) {
    if (!isDesktop()) return;
    const target = e.target instanceof Element ? e.target : document.body;
    if (target.closest('.app-window, #desktop-widgets')) return;
    e.preventDefault();
    closeAllMenus();
    const icon = target.closest('.desktop-shortcut');
    const widgetsHidden = document.body.classList.contains('widgets-hidden');
    currentCtxItems = [
        ...(icon ? [{ label: 'Open', action: () => icon.click() }, { sep: true }] : []),
        { label: 'New Message to Ranveer…', icon: 'fas fa-pen-to-square', action: () => openApp('contact') },
        { label: 'Open Projects in Finder', icon: 'fas fa-folder-open', action: () => openFinder('projects') },
        { sep: true },
        { label: 'Get Info', icon: 'fas fa-circle-info', action: openAboutThisMac },
        { label: 'Change Wallpaper', icon: 'fas fa-image', action: cycleTahoeWallpaper },
        { label: widgetsHidden ? 'Show Widgets' : 'Hide Widgets', icon: 'fas fa-table-cells', action: toggleWidgets },
        { sep: true },
        { label: 'Clean Up', icon: 'fas fa-broom', action: () => layoutDesktopIcons(true) },
        { label: 'Keyboard Shortcuts', icon: 'fas fa-keyboard', action: () => openReadmeModal('shortcuts') }
    ];
    const menu = document.getElementById('ctx-menu');
    if (!menu) return;
    menu.innerHTML = renderMenuHTML(currentCtxItems);
    menu.classList.add('is-open');
    menu.style.left = `${Math.min(e.clientX, window.innerWidth - menu.offsetWidth - 6)}px`;
    menu.style.top = `${Math.min(e.clientY, window.innerHeight - menu.offsetHeight - 6)}px`;
}

// ---------- Control Center, About This Mac ----------
function toggleControlCenter(e) {
    if (e) e.stopPropagation();
    const cc = document.getElementById('macos-control-center');
    const btn = document.getElementById('mac-control-center-btn');
    if (!cc) return;
    const isOpen = cc.classList.contains('is-open');
    closeAllMenus();
    cc.classList.toggle('is-open', !isOpen);
    if (btn) btn.classList.toggle('is-active', !isOpen);
}

function closeControlCenter() {
    document.getElementById('macos-control-center')?.classList.remove('is-open');
    document.getElementById('ios-control-center')?.classList.remove('is-open');
    document.getElementById('mac-control-center-btn')?.classList.remove('is-active');
}

function openAboutThisMac() {
    closeMissionControl();
    closeControlCenter();
    closeAllMenus();
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
}

function returnToDesktop() {
    closeAboutThisMac();
    closeMissionControl();
    closeControlCenter();
    closeAllMenus();
    closeSpotlight();
    closeReadmeModal();
    closeFolderModal();
    closeSkillsFolderModal();
    closeGalleryLightbox();
}

// Control Center toggles
let ccWifiActive = true;
function toggleCcWifi() {
    ccWifiActive = !ccWifiActive;
    const icon = document.getElementById('cc-wifi-icon');
    const label = document.getElementById('cc-wifi-label');
    const iosBtn = document.getElementById('ios-cc-wifi-btn');
    if (icon) icon.className = ccWifiActive ? 'cc-toggle-icon bg-[#007aff] text-white' : 'cc-toggle-icon bg-white/10 text-gray-400';
    if (label) {
        label.innerText = ccWifiActive ? 'Home_Fiber_5G' : 'Off';
        label.className = ccWifiActive ? 'text-[10px] text-blue-300' : 'text-[10px] text-gray-500';
    }
    if (iosBtn) iosBtn.classList.toggle('is-active-blue', ccWifiActive);
    showToast(ccWifiActive ? 'Wi-Fi: Connected to Home_Fiber_5G' : 'Wi-Fi: Disconnected', 'fas fa-wifi');
}

let ccBtActive = true;
function toggleCcBluetooth() {
    ccBtActive = !ccBtActive;
    const icon = document.getElementById('cc-bt-icon');
    const label = document.getElementById('cc-bt-label');
    const iosBtn = document.getElementById('ios-cc-bt-btn');
    if (icon) icon.className = ccBtActive ? 'cc-toggle-icon bg-[#007aff] text-white' : 'cc-toggle-icon bg-white/10 text-gray-400';
    if (label) {
        label.innerText = ccBtActive ? 'AirPods Pro' : 'Off';
        label.className = ccBtActive ? 'text-[10px] text-blue-300' : 'text-[10px] text-gray-500';
    }
    if (iosBtn) iosBtn.classList.toggle('is-active-blue', ccBtActive);
    showToast(ccBtActive ? 'Bluetooth: Connected to AirPods Pro' : 'Bluetooth: Off', 'fab fa-bluetooth-b');
}

let ccFocusActive = true;
function toggleCcFocus() {
    ccFocusActive = !ccFocusActive;
    const icon = document.getElementById('cc-focus-icon');
    const label = document.getElementById('cc-focus-label');
    const iosBtn = document.getElementById('ios-cc-focus-btn');
    if (icon) icon.className = ccFocusActive ? 'cc-toggle-icon bg-indigo-600 text-white' : 'cc-toggle-icon bg-white/10 text-gray-400';
    if (label) {
        label.innerText = ccFocusActive ? 'Developer' : 'Off';
        label.className = ccFocusActive ? 'text-[10px] text-indigo-300' : 'text-[10px] text-gray-500';
    }
    if (iosBtn) iosBtn.classList.toggle('is-active-indigo', ccFocusActive);
    showToast(ccFocusActive ? 'Focus: Developer focus on' : 'Focus: Off', 'fas fa-moon');
}

// Brightness dims an overlay (filtering <body> broke backdrop blur and fixed positioning)
function handleBrightnessSlider(val) {
    const v = Math.max(30, Math.min(100, Number(val)));
    const overlay = document.getElementById('brightness-overlay');
    if (overlay) overlay.style.opacity = ((100 - v) / 100 * 0.75).toFixed(3);
    const iosFill = document.getElementById('ios-cc-bright-fill');
    if (iosFill) iosFill.style.height = `${v}%`;
}

let volumeToastTimer = null;
function handleVolumeSlider(val) {
    const v = Math.round(Number(val));
    const iosFill = document.getElementById('ios-cc-vol-fill');
    if (iosFill) iosFill.style.height = `${v}%`;
    clearTimeout(volumeToastTimer);
    volumeToastTimer = setTimeout(() => showToast(`Volume: ${v}%`, v === 0 ? 'fas fa-volume-xmark' : 'fas fa-volume-high'), 350);
}

let isPlayingMusic = true;
function togglePlayState() {
    isPlayingMusic = !isPlayingMusic;
    const btn = document.getElementById('cc-play-btn');
    const iosPlayBtn = document.getElementById('ios-cc-play-btn');
    if (btn) btn.className = isPlayingMusic ? 'fas fa-pause text-[10px]' : 'fas fa-play text-[10px] ml-0.5';
    if (iosPlayBtn) iosPlayBtn.innerHTML = isPlayingMusic ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    showToast(isPlayingMusic ? 'Veer Music: Playing' : 'Veer Music: Paused', 'fas fa-music');
}

function initIosControlCenterSliders() {
    const attachSlider = (capsule, fill, onUpdate) => {
        if (!capsule || !fill) return;
        let dragging = false;
        const updateFromY = (clientY) => {
            const rect = capsule.getBoundingClientRect();
            const fraction = Math.max(0.05, Math.min(1, (rect.bottom - clientY) / rect.height));
            fill.style.height = `${fraction * 100}%`;
            onUpdate(fraction * 100);
        };
        capsule.addEventListener('pointerdown', (e) => {
            dragging = true;
            try { capsule.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
            updateFromY(e.clientY);
        });
        capsule.addEventListener('pointermove', (e) => { if (dragging) updateFromY(e.clientY); });
        const stop = (e) => {
            if (!dragging) return;
            dragging = false;
            try { capsule.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
        };
        capsule.addEventListener('pointerup', stop);
        capsule.addEventListener('pointercancel', stop);
    };
    attachSlider(document.getElementById('ios-cc-bright-capsule'), document.getElementById('ios-cc-bright-fill'), handleBrightnessSlider);
    attachSlider(document.getElementById('ios-cc-vol-capsule'), document.getElementById('ios-cc-vol-fill'), handleVolumeSlider);
}

// ---------- Wallpapers ----------
const TAHOE_WALLPAPERS = [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=85&w=2800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=85&w=2800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=85&w=2800&auto=format&fit=crop'
];
const WALLPAPER_NAMES = ['Valley', 'Midnight', 'Alpine'];
let currentWallpaperIdx = 0;

function setTahoeWallpaper(idx, silent = false) {
    currentWallpaperIdx = ((idx % TAHOE_WALLPAPERS.length) + TAHOE_WALLPAPERS.length) % TAHOE_WALLPAPERS.length;
    document.body.style.backgroundImage = `url('${TAHOE_WALLPAPERS[currentWallpaperIdx]}'), var(--wallpaper-fallback)`;
    try { localStorage.setItem('rj_wallpaper', String(currentWallpaperIdx)); } catch (e) { /* storage blocked */ }
    document.querySelectorAll('.cc-wall').forEach((el, i) => el.classList.toggle('active', i === currentWallpaperIdx));
    if (isMissionControlOpen) renderMissionControlSpaces();
    if (!silent) showToast(`Wallpaper: ${WALLPAPER_NAMES[currentWallpaperIdx]}`, 'fas fa-image');
}

function cycleTahoeWallpaper() {
    setTahoeWallpaper(currentWallpaperIdx + 1);
}

function renderWallpaperThumbs() {
    const wrap = document.getElementById('cc-wallpapers');
    if (!wrap) return;
    wrap.innerHTML = TAHOE_WALLPAPERS.map((url, i) => `
        <button type="button" onclick="setTahoeWallpaper(${i})" aria-label="${WALLPAPER_NAMES[i]} wallpaper">
            <span class="cc-wall${i === currentWallpaperIdx ? ' active' : ''}" style="display:block;background-image:url('${url.replace('w=2800', 'w=320')}')"></span>
            <span class="cc-wall-name">${WALLPAPER_NAMES[i]}</span>
        </button>`).join('');
}

function restoreWallpaper() {
    let idx = 0;
    try { idx = parseInt(localStorage.getItem('rj_wallpaper') || '0', 10) || 0; } catch (e) { idx = 0; }
    if (idx && isDesktop()) setTahoeWallpaper(idx, true);
    try { if (localStorage.getItem('rj_widgets_hidden') === '1') document.body.classList.add('widgets-hidden'); } catch (e) { /* noop */ }
}

// ---------- Finder ----------
const finderState = { loc: 'projects', tag: null, selected: null, view: 'icons', history: [], future: [] };
let finderItemsCache = [];

const FINDER_LOCATIONS = {
    recents: { title: 'Recents', icon: 'fas fa-clock-rotate-left' },
    projects: { title: 'Projects', icon: 'fas fa-folder' },
    skills: { title: 'Skills', icon: 'fas fa-layer-group' },
    applications: { title: 'Applications', icon: 'fas fa-rocket' },
    documents: { title: 'Documents', icon: 'fas fa-file-lines' }
};

const FINDER_TAGS = [
    { name: 'Live demo', color: '#ff453a', test: p => !!p.live },
    { name: 'React', color: '#0a84ff', test: p => p.tags.includes('React') },
    { name: 'Node.js', color: '#30d158', test: p => p.tags.includes('Node.js') },
    { name: 'Python', color: '#ffd60a', test: p => p.tags.includes('Python') },
    { name: 'AI', color: '#bf5af2', test: p => p.tags.includes('AI') },
    { name: 'Mobile', color: '#ff9f0a', test: p => p.tags.includes('Mobile') }
];

function projectFinderItem(p) {
    const actions = [];
    if (p.readme) actions.push({ label: 'Open README', icon: 'fas fa-book-open', primary: true, run: () => openProject(p) });
    if (p.live) actions.push({ label: 'Live Demo', icon: 'fas fa-arrow-up-right-from-square', primary: !p.readme, run: () => window.open(p.live, '_blank', 'noopener') });
    if (p.npm) actions.push({ label: 'npm Package', icon: 'fab fa-npm', run: () => window.open(p.npm, '_blank', 'noopener') });
    if (p.repo) actions.push({ label: 'GitHub', icon: 'fab fa-github', run: () => window.open(p.repo, '_blank', 'noopener') });
    return { id: `p:${p.id}`, name: p.name, kind: p.kind, iconHTML: projectIconHTML(p), desc: p.desc, tags: p.tags, actions, open: () => openProject(p) };
}

function skillFinderItem(s) {
    const used = s.match ? PORTFOLIO_PROJECTS.filter(p => p.tags.some(t => s.match.includes(t))).map(p => p.name) : [];
    return {
        id: `s:${s.name}`,
        name: s.name,
        kind: s.level ? `${s.group} • ${s.level}` : s.group,
        iconHTML: skillIconHTML(s),
        desc: s.desc + (used.length ? ` Used in: ${used.slice(0, 5).join(', ')}.` : ''),
        tags: s.level ? [s.level] : [],
        actions: [{ label: 'Show Skill Levels', icon: 'fas fa-gear', primary: true, run: () => openApp('skills') }],
        open: () => openApp('skills')
    };
}

function appFinderItem(a) {
    return { id: `a:${a.id}`, name: a.name, kind: 'Application', iconHTML: appIconHTML(a.icon), desc: a.desc, tags: [], actions: [{ label: 'Open', icon: 'fas fa-arrow-right', primary: true, run: a.open }], open: a.open };
}

const RESUME_ITEM = () => ({
    id: 'doc:resume', name: 'Resume.pdf', kind: 'PDF Document', iconHTML: appIconHTML('resume'),
    desc: 'Ranveer Jaiswal — Full Stack / MERN Developer. Experience, projects, skills and education.',
    tags: [], actions: [{ label: 'Open PDF', icon: 'fas fa-file-pdf', primary: true, run: openResume }], open: openResume
});

function readmeDocItem(p) {
    return {
        id: `d:${p.readme}`, name: `${p.name} — README.md`, kind: 'Markdown Document', iconHTML: appIconHTML('markdown'),
        desc: p.desc, tags: [], actions: [{ label: 'Open README', icon: 'fas fa-book-open', primary: true, run: () => openReadmeModal(p.readme) }],
        open: () => openReadmeModal(p.readme)
    };
}

function resolveRecent(key) {
    const [type, id] = key.split(/:(.+)/);
    if (type === 'app') { const a = PORTFOLIO_APPS.find(x => x.id === id); return a ? appFinderItem(a) : null; }
    if (type === 'p') { const p = PORTFOLIO_PROJECTS.find(x => x.id === id); return p ? projectFinderItem(p) : null; }
    if (type === 'readme') { const p = PORTFOLIO_PROJECTS.find(x => x.readme === id); return p ? projectFinderItem(p) : null; }
    if (type === 'doc' && id === 'resume') return RESUME_ITEM();
    return null;
}

function getFinderItems() {
    const { loc, tag } = finderState;
    let items = [];
    if (loc === 'projects') items = PORTFOLIO_PROJECTS.filter(p => tag === null || FINDER_TAGS[tag].test(p)).map(projectFinderItem);
    else if (loc === 'skills') items = SKILLS_LIST.map(skillFinderItem);
    else if (loc === 'applications') items = PORTFOLIO_APPS.map(appFinderItem);
    else if (loc === 'documents') items = [RESUME_ITEM(), ...PORTFOLIO_PROJECTS.filter(p => p.readme).map(readmeDocItem)];
    else if (loc === 'recents') {
        const seen = new Set();
        items = recentKeys.map(resolveRecent).filter(it => it && !seen.has(it.id) && seen.add(it.id));
    }
    const q = (document.getElementById('finder-search')?.value || '').trim().toLowerCase();
    if (q) items = items.filter(it => `${it.name} ${it.kind} ${(it.tags || []).join(' ')} ${it.desc || ''}`.toLowerCase().includes(q));
    return items;
}

function initFinder() {
    const tagsEl = document.getElementById('finder-tags');
    if (tagsEl) {
        tagsEl.innerHTML = FINDER_TAGS.map((t, i) => `<div class="finder-side-item" data-tag="${i}" onclick="openFinderTag(${i})"><span class="finder-tag-dot" style="background:${t.color}"></span>${escapeHtml(t.name)}</div>`).join('');
        // On phones the sidebar becomes one horizontal chip row
        if (!isDesktop()) tagsEl.style.display = 'contents';
    }
    const grid = document.getElementById('finder-grid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            const el = e.target.closest('.finder-item');
            if (!el) return;
            if (!isDesktop()) finderOpen(el.dataset.id);
            else finderSelect(el.dataset.id);
        });
        grid.addEventListener('dblclick', (e) => {
            const el = e.target.closest('.finder-item');
            if (el && isDesktop()) finderOpen(el.dataset.id);
        });
    }
}

function openFinder(loc) {
    const win = document.getElementById('app-finder');
    if (!win) return;
    if (!loc) {
        if (win.classList.contains('is-open')) { bringToFront(win); return; }
        loc = finderState.loc || 'projects';
    }
    if (!FINDER_LOCATIONS[loc]) loc = 'projects';
    navigateFinder(loc, null, win.classList.contains('is-open'));
    openApp('finder');
    setHash(`finder/${loc}`);
}

function openFinderTag(i) {
    navigateFinder('projects', i, true);
    const win = document.getElementById('app-finder');
    if (win && !win.classList.contains('is-open')) openApp('finder');
}

function navigateFinder(loc, tag = null, push = true) {
    if (push && (finderState.loc !== loc || finderState.tag !== tag)) {
        finderState.history.push({ loc: finderState.loc, tag: finderState.tag });
        finderState.future = [];
    }
    finderState.loc = loc;
    finderState.tag = tag;
    finderState.selected = null;
    const search = document.getElementById('finder-search');
    if (search) search.value = '';
    renderFinder();
    if (document.getElementById('app-finder')?.classList.contains('is-open')) setHash(`finder/${loc}`);
}

function finderGoBack() {
    const prev = finderState.history.pop();
    if (!prev) return;
    finderState.future.push({ loc: finderState.loc, tag: finderState.tag });
    Object.assign(finderState, { loc: prev.loc, tag: prev.tag, selected: null });
    renderFinder();
}

function finderGoForward() {
    const next = finderState.future.pop();
    if (!next) return;
    finderState.history.push({ loc: finderState.loc, tag: finderState.tag });
    Object.assign(finderState, { loc: next.loc, tag: next.tag, selected: null });
    renderFinder();
}

function setFinderView(view) {
    finderState.view = view;
    document.getElementById('finder-view-icons')?.classList.toggle('active', view === 'icons');
    document.getElementById('finder-view-list')?.classList.toggle('active', view === 'list');
    renderFinder();
}

function renderFinder() {
    const grid = document.getElementById('finder-grid');
    if (!grid) return;
    const { loc, tag } = finderState;
    const titleText = tag !== null ? FINDER_TAGS[tag].name : FINDER_LOCATIONS[loc].title;
    const titleEl = document.getElementById('finder-title');
    if (titleEl) titleEl.textContent = titleText;
    const titleIcon = document.getElementById('finder-title-icon');
    if (titleIcon) titleIcon.className = `${tag !== null ? 'fas fa-tag' : FINDER_LOCATIONS[loc].icon} text-[#0a84ff] hidden md:inline`;

    document.querySelectorAll('#finder-sidebar .finder-side-item[data-loc]').forEach(el => el.classList.toggle('active', tag === null && el.dataset.loc === loc));
    document.querySelectorAll('#finder-sidebar .finder-side-item[data-tag]').forEach(el => el.classList.toggle('active', tag !== null && +el.dataset.tag === tag));
    const back = document.getElementById('finder-back-btn');
    const fwd = document.getElementById('finder-fwd-btn');
    if (back) back.disabled = !finderState.history.length;
    if (fwd) fwd.disabled = !finderState.future.length;

    finderItemsCache = getFinderItems();
    if (finderState.selected && !finderItemsCache.some(i => i.id === finderState.selected)) finderState.selected = null;
    grid.classList.toggle('list-view', finderState.view === 'list');

    const q = (document.getElementById('finder-search')?.value || '').trim();
    grid.innerHTML = finderItemsCache.length
        ? finderItemsCache.map(it => `
            <div class="finder-item${it.id === finderState.selected ? ' selected' : ''}" data-id="${escapeHtml(it.id)}" role="option" aria-selected="${it.id === finderState.selected}" title="${escapeHtml(it.name)}">
                <div class="fi-icon">${it.iconHTML}</div>
                <div class="fi-name">${escapeHtml(it.name)}</div>
                <div class="fi-kind">${escapeHtml(it.kind)}</div>
            </div>`).join('')
        : `<div class="finder-empty">${q ? `No items match “${escapeHtml(q)}”` : (loc === 'recents' ? 'Projects and apps you open will appear here.' : 'This folder is empty.')}</div>`;

    updateFinderStatus();
    renderFinderPreview();
}

function updateFinderStatus() {
    const status = document.getElementById('finder-status');
    if (!status) return;
    const n = finderItemsCache.length;
    status.textContent = `${n} item${n === 1 ? '' : 's'}${finderState.selected ? ', 1 selected — double-click to open' : ''}`;
}

function finderSelect(id) {
    finderState.selected = id;
    document.querySelectorAll('#finder-grid .finder-item').forEach(el => {
        const on = el.dataset.id === id;
        el.classList.toggle('selected', on);
        el.setAttribute('aria-selected', on);
        if (on) el.scrollIntoView({ block: 'nearest' });
    });
    updateFinderStatus();
    renderFinderPreview();
}

function finderOpen(id) {
    const it = finderItemsCache.find(i => i.id === id);
    if (it && typeof it.open === 'function') it.open();
}

function renderFinderPreview() {
    const pane = document.getElementById('finder-preview');
    if (!pane) return;
    const it = finderItemsCache.find(i => i.id === finderState.selected);
    if (!it) {
        pane.innerHTML = `<div class="fp-empty"><i class="far fa-hand-pointer text-2xl mb-3 block opacity-40"></i>Select an item to preview it.<br>Double-click to open.</div>`;
        return;
    }
    pane.innerHTML = `
        <div class="fp-icon">${it.iconHTML}</div>
        <div class="fp-name">${escapeHtml(it.name)}</div>
        <div class="fp-kind">${escapeHtml(it.kind)}</div>
        ${it.desc ? `<p class="fp-desc">${escapeHtml(it.desc)}</p>` : ''}
        ${it.tags && it.tags.length ? `<div class="fp-tags">${it.tags.map(t => `<span class="fp-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        <div class="fp-actions">${it.actions.map((a, i) => `<button type="button" class="fp-btn${a.primary ? ' primary' : ''}" data-act="${i}"><i class="${a.icon}"></i>${escapeHtml(a.label)}</button>`).join('')}</div>`;
    pane.querySelectorAll('[data-act]').forEach(btn => {
        btn.addEventListener('click', () => it.actions[+btn.dataset.act].run());
    });
}

// ---------- Launchpad ----------
let launchpadEntries = [];

function openLaunchpad() {
    if (!isDesktop()) { openFolderModal(); return; }
    closeAllMenus();
    closeSpotlight();
    closeMissionControl();
    const lp = document.getElementById('launchpad');
    const input = document.getElementById('lp-search-input');
    if (!lp) return;
    lp.classList.add('is-active');
    if (input) input.value = '';
    renderLaunchpad('');
    setTimeout(() => input && input.focus(), 60);
}

function closeLaunchpad() {
    document.getElementById('launchpad')?.classList.remove('is-active');
}

function toggleLaunchpad() {
    const lp = document.getElementById('launchpad');
    if (lp && lp.classList.contains('is-active')) closeLaunchpad();
    else openLaunchpad();
}

function renderLaunchpad(query) {
    const grid = document.getElementById('launchpad-grid');
    if (!grid) return;
    const q = String(query || '').trim().toLowerCase();
    const apps = [
        ...PORTFOLIO_APPS.map(a => ({ name: a.name, html: appIconHTML(a.icon), run: a.open, section: 'Apps' })),
        { name: 'Resume.pdf', html: appIconHTML('resume'), run: openResume, section: 'Apps' },
        { name: 'GitHub', html: appIconHTML('github'), run: () => window.open('https://github.com/Rvjais', '_blank', 'noopener'), section: 'Apps' }
    ];
    const projects = PORTFOLIO_PROJECTS.map(p => ({ name: p.name, html: projectIconHTML(p), run: () => openProject(p), section: 'Projects', keywords: p.tags.join(' ') }));
    launchpadEntries = [...apps, ...projects].filter(e => !q || `${e.name} ${e.keywords || ''}`.toLowerCase().includes(q));

    if (!launchpadEntries.length) {
        grid.innerHTML = `<div class="lp-empty">No apps or projects match “${escapeHtml(query)}”</div>`;
        return;
    }
    let html = '';
    let lastSection = '';
    launchpadEntries.forEach((e, i) => {
        if (!q && e.section !== lastSection) { html += `<div class="lp-section">${e.section}</div>`; lastSection = e.section; }
        html += `<div class="lp-item" data-lp="${i}" role="button" tabindex="0">${e.html}<span>${escapeHtml(e.name)}</span></div>`;
    });
    grid.innerHTML = html;
    grid.querySelectorAll('[data-lp]').forEach(el => {
        const run = () => { closeLaunchpad(); launchpadEntries[+el.dataset.lp].run(); };
        el.addEventListener('click', run);
        el.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') run(); });
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target && e.target.id === 'lp-search-input' && launchpadEntries.length) {
        e.preventDefault();
        closeLaunchpad();
        launchpadEntries[0].run();
    }
});

// ---------- Widgets ----------
function initWidgets() {
    const face = document.getElementById('widget-clock-face');
    if (face && !face.querySelector('.tick')) {
        const ticks = Array.from({ length: 12 }, (_, i) => `<span class="tick${i % 3 === 0 ? ' major' : ''}" style="transform: rotate(${i * 30}deg)"></span>`).join('');
        face.insertAdjacentHTML('afterbegin', ticks);
    }
    const featured = document.getElementById('widget-featured');
    if (featured) {
        featured.innerHTML = PORTFOLIO_PROJECTS.filter(p => p.featured).map(p => `
            <div class="wf-item" onclick="openProject(PORTFOLIO_PROJECTS.find(x => x.id === '${p.id}'))" title="${escapeHtml(p.name)} — open README">
                ${projectIconHTML(p)}
                <div class="min-w-0">
                    <div class="wf-name">${escapeHtml(p.name)}</div>
                    <div class="wf-desc">${escapeHtml(p.kind)} • ${escapeHtml(p.tags.slice(0, 3).join(', '))}</div>
                </div>
            </div>`).join('');
    }
    updateWidgetClock(new Date());
}

function updateWidgetClock(now) {
    const h = document.getElementById('clk-h');
    if (!h) return;
    const sec = now.getSeconds(), min = now.getMinutes(), hr = now.getHours() % 12;
    h.style.transform = `rotate(${hr * 30 + min * 0.5}deg)`;
    document.getElementById('clk-m').style.transform = `rotate(${min * 6 + sec * 0.1}deg)`;
    document.getElementById('clk-s').style.transform = `rotate(${sec * 6}deg)`;
}

function toggleWidgets() {
    const hidden = document.body.classList.toggle('widgets-hidden');
    try { localStorage.setItem('rj_widgets_hidden', hidden ? '1' : '0'); } catch (e) { /* noop */ }
}

// ---------- Lock screen ----------
function updateLockScreenClock(now) {
    const t = document.getElementById('lock-time');
    if (!t) return;
    const h = now.getHours() % 12 || 12;
    t.textContent = `${h}:${String(now.getMinutes()).padStart(2, '0')}`;
    const d = document.getElementById('lock-date');
    if (d) d.textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function lockScreen() {
    closeAllMenus();
    closeControlCenter();
    updateLockScreenClock(new Date());
    document.getElementById('lock-screen')?.classList.add('is-active');
}

function unlockScreen() {
    document.getElementById('lock-screen')?.classList.remove('is-active');
}

// ---------- Boot, deep links & welcome ----------
function handleDeepLink() {
    let h = '';
    try { h = decodeURIComponent(window.location.hash.replace(/^#\/?/, '')); } catch (e) { h = ''; }
    if (!h) return false;
    const [a, b] = h.split('/');
    if (a === 'readme' && b && projectReadmes[b]) { openReadmeModal(b); return true; }
    if (a === 'finder') { openFinder(FINDER_LOCATIONS[b] ? b : 'projects'); return true; }
    if (a === 'launchpad') { openLaunchpad(); return true; }
    if (document.getElementById(`app-${a}`)) {
        openApp(a);
        if (a === 'about' && ['intro', 'exp', 'edu'].includes(b)) switchAboutTab(b, null);
        if (a === 'projects' && ['terminal', 'cards'].includes(b)) switchProjectsView(b, null);
        return true;
    }
    return false;
}

function showWelcome() {
    if (isDesktop()) {
        notify({
            title: 'Welcome to Ranveer’s Mac 👋',
            body: 'Click here for About Me, browse projects in Finder, or press ⌘K to search anything.',
            icon: 'fas fa-face-smile', iconBg: 'linear-gradient(180deg,#64d2ff,#0a6cff)',
            action: () => openApp('about'), duration: 9000
        });
    } else {
        notify({
            title: 'Hi, I’m Ranveer 👋',
            body: 'Tap an app to explore. Tap the bar at the bottom to come back Home.',
            icon: 'fas fa-face-smile', iconBg: 'linear-gradient(180deg,#64d2ff,#0a6cff)',
            action: () => openApp('about'), duration: 7000
        });
    }
}

function runBootSequence() {
    const boot = document.getElementById('boot-screen');
    let seen = false;
    try {
        seen = sessionStorage.getItem('rj_booted') === '1';
        sessionStorage.setItem('rj_booted', '1');
    } catch (e) { /* storage blocked */ }
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minMs = (seen || reduced) ? 250 : 1100;
    if (boot) boot.style.setProperty('--boot-ms', `${minMs}ms`);
    const start = performance.now();

    const finish = () => {
        if (!boot || boot.dataset.done) return;
        boot.dataset.done = '1';
        const wait = Math.max(0, minMs - (performance.now() - start));
        setTimeout(() => {
            boot.classList.add('boot-done');
            setTimeout(() => boot.remove(), 520);
            layoutDesktopIcons();
            const linked = handleDeepLink();
            if (!seen && !linked) setTimeout(showWelcome, 450);
        }, wait);
    };

    if (document.readyState === 'complete') finish();
    else {
        window.addEventListener('load', finish, { once: true });
        setTimeout(finish, 2600); // don't wait forever on a slow wallpaper download
    }
}
