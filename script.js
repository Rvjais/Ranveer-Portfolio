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

    // Update iOS home bar theme
    const homeBar = document.getElementById('ios-global-home-bar');
    if (homeBar) {
        const activeTopApp = runningApps[runningApps.length - 1];
        if (activeTopApp && ['about', 'skills', 'contact'].includes(activeTopApp)) {
            homeBar.classList.add('dark');
        } else {
            homeBar.classList.remove('dark');
        }
    }

    // Refresh views if open
    if (isMissionControlOpen) renderMissionControlTiles();
    if (isIosSwitcherOpen) renderIosSwitcherCards();
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


// --- Spotlight Search System ---
const searchIndex = [
    { title: "About Ranveer Jaiswal", category: "Application", desc: "Full Stack & MERN Developer profile and background", action: () => openApp('about'), icon: "fas fa-user-astronaut text-blue-500" },
    { title: "Projects Folder", category: "Folder", desc: "Interactive iOS folder containing HR-Buddy, SRChess, Visualizer, PioneerOS", action: () => openFolderModal(), icon: "fas fa-folder text-amber-400", badge: "FOLDER" },
    { title: "Projects Showcase", category: "Application", desc: "Interactive devOS Terminal and Project Cards", action: () => { openApp('projects'); switchProjectsView('cards', null); }, icon: "fas fa-terminal text-green-400" },
    { title: "fullstack-code-visualiser (npm)", category: "Package", desc: "MERN Stack Visualizer & AST Architecture Tracer", action: () => openReadmeModal('fullstack-code-visualiser'), icon: "fab fa-npm text-red-500", badge: "README & NPM" },
    { title: "HR-Buddy (Live App)", category: "Project", desc: "AI onboarding quiz with anti-cheat mechanism (React, Node.js)", action: () => window.open('https://hr-buddy-beta.vercel.app/', '_blank'), icon: "fas fa-user-check text-amber-400", badge: "LIVE DEMO" },
    { title: "SRChess (Live App)", category: "Project", desc: "Full-stack interactive chess platform (React, WebSockets)", action: () => window.open('https://srchess.vercel.app/', '_blank'), icon: "fas fa-chess-knight text-purple-400", badge: "LIVE DEMO" },
    { title: "PioneerOS", category: "Project", desc: "Multi-module internal platform with project management & queue system", action: () => { openApp('projects'); switchProjectsView('cards', null); }, icon: "fas fa-desktop text-blue-400", badge: "PLATFORM" },
    { title: "Rain CRM", category: "Project", desc: "CRM with AI WhatsApp bots, Twilio calling & automated email client", action: () => { openApp('projects'); switchProjectsView('cards', null); }, icon: "fas fa-users-cog text-emerald-400", badge: "CRM" },
    { title: "Skills Folder (All Skills)", category: "Folder", desc: "Interactive folder listing Docker, AWS, React, Node.js, TypeScript & MongoDB", action: () => openSkillsFolderModal(), icon: "fas fa-layer-group text-blue-400", badge: "FOLDER" },
    { title: "System Settings (Skills)", category: "Application", desc: "Full-stack languages, frameworks, databases & tooling", action: () => openApp('skills'), icon: "fas fa-gear text-gray-400" },
    { title: "Photos & Videos (Gallery)", category: "Application", desc: "Personal media gallery, photos & video uploads", action: () => openApp('gallery'), icon: "fas fa-images text-pink-400" },
    { title: "Mail Composer (Contact)", category: "Application", desc: "Send an email or message directly to Ranveer", action: () => openApp('contact'), icon: "fas fa-envelope text-blue-400" },
    { title: "Docker (Containerization)", category: "DevOps", desc: "Docker Compose, Dockerfile, multi-stage builds & container workflows", action: () => { openSkillsFolderModal(); showToast('Docker: Containerization & Compose', 'fab fa-docker'); }, icon: "fab fa-docker text-[#2496ed]", badge: "DOCKER" },
    { title: "AWS (Amazon Web Services)", category: "Cloud", desc: "EC2, S3, Lambda, CloudFront, IAM & cloud deployment architecture", action: () => { openSkillsFolderModal(); showToast('AWS: Cloud Infrastructure & Services', 'fab fa-aws'); }, icon: "fab fa-aws text-[#ff9900]", badge: "AWS" },
    { title: "Branding Pioneers Experience", category: "Work", desc: "Full Stack App/Web Developer & Intern (Gurgaon, India)", action: () => { openApp('about'); switchAboutTab('exp', null); }, icon: "fas fa-briefcase text-blue-500" },
    { title: "Resume (PDF)", category: "Document", desc: "Official resume of Ranveer Jaiswal (ranveer_jaiswal.pdf)", action: () => window.open('ranveer_jaiswal.pdf', '_blank'), icon: "fas fa-file-pdf text-red-500", badge: "PDF" },
    { title: "Krishnarpit Institute of Technology", category: "Education", desc: "Bachelor of Pharmacy (B. Pharm), 2021-2025, CGPA 7.0/10", action: () => { openApp('about'); switchAboutTab('edu', null); }, icon: "fas fa-graduation-cap text-indigo-400" },
    { title: "GitHub Profile (Rvjais)", category: "Link", desc: "Explore open-source repositories and contributions on GitHub", action: () => window.open('https://github.com/Rvjais', '_blank'), icon: "fab fa-github text-white" },
    { title: "LinkedIn Profile", category: "Link", desc: "Connect professionally on LinkedIn", action: () => window.open('https://linkedin.com', '_blank'), icon: "fab fa-linkedin text-blue-500" }
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

function renderSpotlightResults(query) {
    const resultsContainer = document.getElementById('spotlight-results');
    if (!resultsContainer) return;

    const trimmed = query.toLowerCase().trim();
    const filtered = searchIndex.filter(item => {
        if (!trimmed) return true;
        return item.title.toLowerCase().includes(trimmed) || 
               item.desc.toLowerCase().includes(trimmed) || 
               item.category.toLowerCase().includes(trimmed);
    }).slice(0, 8);

    if (filtered.length === 0) {
        resultsContainer.innerHTML = `<div class="p-6 text-center text-gray-400 text-xs">No matching results for "<span class="text-white">${query}</span>"</div>`;
        return;
    }

    resultsContainer.innerHTML = filtered.map((item, index) => `
        <div class="spotlight-result-item ${index === selectedSpotlightIndex ? 'selected' : ''}" data-index="${index}" onclick="executeSpotlightAction(${index})">
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm shrink-0">
                    <i class="${item.icon}"></i>
                </div>
                <div class="text-left">
                    <div class="text-xs font-semibold text-white">${item.title}</div>
                    <div class="text-[11px] text-gray-400 line-clamp-1">${item.desc}</div>
                </div>
            </div>
            <div class="flex items-center space-x-2 shrink-0">
                ${item.badge ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">${item.badge}</span>` : ''}
                <span class="text-[10px] text-gray-500 font-medium uppercase">${item.category}</span>
            </div>
        </div>
    `).join('');
}

function executeSpotlightAction(index) {
    const input = document.getElementById('spotlight-input');
    const query = input ? input.value.toLowerCase().trim() : '';
    const filtered = searchIndex.filter(item => {
        if (!query) return true;
        return item.title.toLowerCase().includes(query) || 
               item.desc.toLowerCase().includes(query) || 
               item.category.toLowerCase().includes(query);
    }).slice(0, 8);

    if (filtered[index]) {
        filtered[index].action();
        closeSpotlight();
    }
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
        "stock_mgmt.txt": "> Stock Management System (Qt / C++)\n  Desc:  Robust GUI-based hobby project built using Qt library, focused on object-oriented programming, file handling, and efficient data structuring."
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
    if (npmBtn) npmBtn.href = data.npmUrl;
    if (githubBtn) githubBtn.href = data.githubUrl;

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
    }

    // Global keyboard shortcut for Spotlight: Cmd+K / Ctrl+K / Cmd+Space, and Escape for modals
    document.addEventListener('keydown', (e) => {
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
        }
    });

    // Hide desktop dock indicator dots initially
    ['about', 'projects', 'skills', 'contact', 'gallery'].forEach(id => {
        const dot = document.getElementById(`dot-${id}`);
        if (dot) dot.style.display = 'none';
    });

    // Initialize authentic gestures
    initIosHomeGestures();
    initDesktopMissionControlGestures();

    // Ensure all full-screen overlays are strictly closed on initial page load
    closeMissionControl();
    closeIosAppSwitcher();
    closeSkillsFolderModal();
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

function closeMissionControl() {
    isMissionControlOpen = false;
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
    missionControlEl.style.display = 'flex';
    void missionControlEl.offsetWidth; // force reflow
    missionControlEl.classList.add('is-active');
    missionControlEl.style.opacity = '1';
    missionControlEl.style.pointerEvents = 'auto';
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
    // If the click did not land on a window card, pill, close button or interactive control, immediately exit Mission Control!
    if (!e.target.closest('.mission-window-card') && !e.target.closest('.mission-window-pill') && !e.target.closest('.mission-control-tile-close') && !e.target.closest('button') && !e.target.closest('.mission-control-top-bar')) {
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
        tilesContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center text-center p-10 max-w-lg mx-auto bg-white/10 border border-white/20 rounded-3xl backdrop-blur-3xl text-white shadow-2xl">
                <div class="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center text-3xl mb-4 shadow-lg">
                    <i class="fas fa-table-cells-large"></i>
                </div>
                <h3 class="text-xl font-bold text-white mb-1">No Open Windows</h3>
                <p class="text-xs text-gray-300 mb-6">Launch an application from the Desktop or Dock to organize your workspace in Mission Control.</p>
                <div class="flex flex-wrap items-center justify-center gap-2">
                    <button onclick="event.stopPropagation(); toggleMissionControl(false); openApp('about')" class="px-3.5 py-1.5 rounded-xl bg-blue-600/40 hover:bg-blue-600/60 border border-blue-500/50 text-xs font-semibold text-blue-200 transition">About Me</button>
                    <button onclick="event.stopPropagation(); toggleMissionControl(false); openApp('projects')" class="px-3.5 py-1.5 rounded-xl bg-green-600/40 hover:bg-green-600/60 border border-green-500/50 text-xs font-semibold text-green-200 transition">Projects</button>
                    <button onclick="event.stopPropagation(); toggleMissionControl(false); openSkillsFolderModal()" class="px-3.5 py-1.5 rounded-xl bg-amber-600/40 hover:bg-amber-600/60 border border-amber-500/50 text-xs font-semibold text-amber-200 transition">Skills Folder</button>
                    <button onclick="event.stopPropagation(); toggleMissionControl(false); openApp('contact')" class="px-3.5 py-1.5 rounded-xl bg-indigo-600/40 hover:bg-indigo-600/60 border border-indigo-500/50 text-xs font-semibold text-indigo-200 transition">Contact</button>
                    <button onclick="event.stopPropagation(); toggleMissionControl(false); openApp('gallery')" class="px-3.5 py-1.5 rounded-xl bg-pink-600/40 hover:bg-pink-600/60 border border-pink-500/50 text-xs font-semibold text-pink-200 transition">Gallery</button>
                </div>
            </div>
        `;
        return;
    }

    // Size cards proportionally
    let cardWidth = '520px';
    let cardHeight = '340px';
    if (openWindows.length === 1) {
        cardWidth = '680px';
        cardHeight = '420px';
    } else if (openWindows.length >= 4) {
        cardWidth = '460px';
        cardHeight = '295px';
    }

    openWindows.forEach(win => {
        const appId = win.id.replace('app-', '');
        const meta = APP_METADATA[appId] || {
            title: appId,
            subtitle: appId,
            icon: 'fas fa-window-maximize',
            iconColor: 'bg-blue-500',
            badge: 'Window'
        };

        const itemContainer = document.createElement('div');
        itemContainer.className = 'mission-item-container';

        // Floating Title Pill ABOVE window (NEVER cut off)
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
                <div class="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] opacity-80"></div>
                <div class="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] opacity-80"></div>
            </div>
            <div class="text-xs font-semibold text-gray-300 flex items-center space-x-1.5">
                <i class="${meta.icon} text-xs text-blue-400"></i>
                <span>${meta.title}</span>
            </div>
            <div class="text-[10px] text-gray-400 font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10">macOS</div>
        `;

        // Red traffic light close handler
        const closeBtn = titlebar.querySelector('.mission-control-tile-close');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                closeApp(appId);
                renderMissionControlTiles();
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
        } else if (isMissionControlOpen && (e.key === 'ArrowDown' || ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown'))) {
            e.preventDefault();
            closeMissionControl();
        }
    });
}



