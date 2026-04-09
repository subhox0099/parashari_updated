/* ============================================
   ULTIMATE ASTRO SUPPORT ASSISTANT - NLP RESTORED
   ============================================ */

(function () {
    // Prevent multiple initializations (Singleton)
    if (window.AstroChatbotInitialized) return;
    window.AstroChatbotInitialized = true;

    const STATES = {
        AI_ASSIST: 'AI_ASSIST',
        ISSUE_FORM: 'ISSUE_FORM',
        COURSE_SEARCH: 'COURSE_SEARCH',
        ASTROLOGY_CHAT: 'ASTROLOGY_CHAT',
        ONBOARD_LANG: 'ONBOARD_LANG',
        ONBOARD_NAME: 'ONBOARD_NAME',
        IDLE: 'IDLE',
        REDIRECTING: 'REDIRECTING'
    };

    const CONFIG = {
        emailRecipient: 'musharraf.codes@gmail.com',
        typingSpeed: 600,
        maxHistory: 150,
        // Controls whether Gemini AI can be called in ASTROLOGY_CHAT mode.
        enableAI: true,
        courseMap: {
            'bnn': 'bnn-astrology.html',
            'lal kitab': 'lal-kitab.html',
            'kp': 'kp-astrology.html',
            'medical': 'medical-astrology.html',
            'palmistry': 'palmistry.html',
            'vastu': 'vastu.html',
            'numerology': 'numerology.html'
        },
        hinglishKeywords: [
            'jaise', 'kya', 'mujhe', 'kaise', 'kaha', 'madad', 'help', 'problem', 'hai',
            'ji', 'batao', 'kar', 'do', 'naam', 'kripya', 'shukriya', 'theek', 'hai', 'namaste', 'halo',
            'han', 'nahi', 'dikhao', 'batayein', 'batayiye', 'bhai', 'yaar', 'please', 'aap', 'pucho', 'karna'
        ]
    };

    // Load persisted state (Position only, fresh start for conversation)
    let chatData = {
        history: [],
        aiHistory: [],
        name: '',
        lang: '',
        state: STATES.AI_ASSIST,
        pos: JSON.parse(sessionStorage.getItem('astroChat_pos_v2')) || null,
        isOpen: false
    };

    // --- DOM Injection ---
    const injectHTML = `
        <div class="astro-chat-toggle" id="astroChatToggle" role="button" aria-label="Toggle Support Assistant">
            <div class="astro-toggle-badge">
                <i class="fas fa-comment-dots"></i>
            </div>
            <img src="assets/images-optimized/bot-namaste.webp" class="bot-img-default" alt="Support Robot">
            <img src="assets/images-optimized/bot-reading.webp" class="bot-img-active" alt="Active Chat">
        </div>
        <div class="astro-chat-container" id="astroChatContainer" role="dialog" aria-labelledby="chatHeaderTitle">
            <span class="astro-phone-side-btn astro-phone-side-btn-right"></span>
            <span class="astro-phone-side-btn astro-phone-side-btn-left-1"></span>
            <span class="astro-phone-side-btn astro-phone-side-btn-left-2"></span>

            <div class="astro-phone-screen" id="astroPhoneScreen">
                <div class="astro-dynamic-island" aria-hidden="true">
                    <div class="astro-island-dot"></div>
                    <div class="astro-island-camera"></div>
                </div>

                <div class="astro-chat-header" id="astroChatHeader">
                    <div class="astro-chat-header-actions">
                        <button id="astroChatNew" class="astro-btn-new" aria-label="Start new chat" title="New Chat">+</button>
                    </div>
                </div>
                <div class="astro-chat-messages" id="astroChatMessages"></div>
                <div class="astro-chat-input-wrapper" id="astroChatInputWrapper">
                    <input type="text" id="astroChatInput" placeholder="Type your message..." aria-label="Message Input">
                    <button id="astroChatSend" class="astro-chat-send" aria-label="Send Message"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', injectHTML);

    // --- DOM Elements ---
    const toggle = document.getElementById('astroChatToggle');
    const container = document.getElementById('astroChatContainer');
    const phoneScreen = document.getElementById('astroPhoneScreen');
    const header = document.getElementById('astroChatHeader');
    const messages = document.getElementById('astroChatMessages');
    const inputWrapper = document.getElementById('astroChatInputWrapper');
    const inputField = document.getElementById('astroChatInput');
    const sendBtn = document.getElementById('astroChatSend');
    const newChatBtn = document.getElementById('astroChatNew');

    // --- Core Logic & Helpers ---

    const getPhoneHeight = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isMobile = w <= 640;
        const isTablet = w <= 1024 && w > 640;

        // Match the behavior from your reference widget.
        let offset = 48 + 120 + 16 + 10;
        let maxHeight = 520;

        if (isMobile) {
            offset = 12 + 100 + 8 + 10;
            maxHeight = 460;
        } else if (isTablet) {
            offset = 24 + 120 + 16 + 10;
            maxHeight = 480;
        }
        return Math.min(maxHeight, h - offset);
    };

    function applyPhoneHeight() {
        if (!phoneScreen) return;
        const ph = getPhoneHeight();
        phoneScreen.style.height = `${ph}px`;
    }

    function save() {
        sessionStorage.setItem('astroChat_pos_v2', JSON.stringify(chatData.pos));
    }

    function detectLanguage(text) {
        const lower = text.toLowerCase();
        let score = 0;
        CONFIG.hinglishKeywords.forEach(kw => {
            if (lower.includes(kw)) score++;
        });
        if (score > 0) chatData.lang = 'hinglish';
        else chatData.lang = 'english';
        save();
    }

    function addMessage(text, isBot = true, options = null) {
        chatData.history.push({ text, isBot, options });
        renderMessage(text, isBot, options);
        save();
    }

    function renderMessage(text, isBot = true, options = null) {
        const div = document.createElement('div');
        div.className = `chat-bubble ${isBot ? 'bot-bubble' : 'user-bubble'}`;
        div.innerHTML = text;
        messages.appendChild(div);

        if (options && isBot && chatData.isOpen) {
            const btnGroup = document.createElement('div');
            btnGroup.className = 'chat-btn-group';
            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'chat-btn';
                btn.innerText = opt.label;
                btn.onclick = (e) => { e.stopPropagation(); opt.action(); };
                btnGroup.appendChild(btn);
            });
            messages.appendChild(btnGroup);
        }
        messages.scrollTop = messages.scrollHeight;
    }

    function rebuildHistory() {
        messages.innerHTML = '';
        chatData.history.forEach((m, index) => {
            const isLast = (index === chatData.history.length - 1);
            renderMessage(m.text, m.isBot, isLast ? m.options : null);
        });

        if ([STATES.AI_ASSIST, STATES.COURSE_SEARCH, STATES.ASTROLOGY_CHAT].includes(chatData.state)) {
            inputWrapper.classList.add('active');
        } else {
            inputWrapper.classList.remove('active');
        }
    }

    function showLangOptions() {
        chatData.state = STATES.ONBOARD_LANG;
        save();
        const langOptions = [
            {
                label: "English",
                action: async () => {
                    chatData.lang = 'english';
                    chatData.state = STATES.ONBOARD_NAME;
                    save();
                    await botSay(getT('askName'));
                    inputWrapper.classList.add('active');
                    inputField.focus();
                }
            },
            {
                label: "Hindi / Hinglish",
                action: async () => {
                    chatData.lang = 'hinglish';
                    chatData.state = STATES.ONBOARD_NAME;
                    save();
                    await botSay(getT('askName'));
                    inputWrapper.classList.add('active');
                    inputField.focus();
                }
            }
        ];
        botSay(chatData.lang === 'hinglish' ? "Kripya language choose karein:" : "Please choose your language:", langOptions);
    }

    function showMainMenu() {
        chatData.state = STATES.AI_ASSIST;
        save();
        const options = buildMainMenuOptions();
        botSay(chatData.lang === 'hinglish'
            ? `Dhanyavaad dear ${chatData.name || 'friend'}. Aapko kis cheez mein madad chahiye?`
            : `Thank you dear ${chatData.name || 'friend'}. How may I assist you today?`, options);
    }

    function getAiBaseUrlCandidates() {
        // Priority:
        // 1) same-origin (''), works when site is served by AB_AI (localhost:3000)
        // 2) window.BLOG_API_BASE_URL (already injected by backend for other APIs)
        // 3) localhost:3000 fallback (useful when frontend runs on 5173/other port)
        const candidates = [];

        if (location.protocol !== 'file:') candidates.push('');

        if (typeof window !== 'undefined' && window.BLOG_API_BASE_URL && typeof window.BLOG_API_BASE_URL === 'string') {
            candidates.push(window.BLOG_API_BASE_URL.replace(/\/$/, ''));
        }

        candidates.push('http://localhost:3000');

        // If opened via file://, same-origin is meaningless; keep only absolute URLs
        const filtered = location.protocol === 'file:'
            ? candidates.filter((c) => c && !c.startsWith('/'))
            : candidates;

        // De-dupe while preserving order
        return Array.from(new Set(filtered));
    }

    async function fetchWithTimeout(url, options, timeoutMs = 12000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, { ...options, signal: controller.signal });
        } finally {
            clearTimeout(id);
        }
    }

    async function callAstroAssistant(message) {
        if (!CONFIG.enableAI) {
            throw new Error('AI_DISABLED');
        }
        const bases = getAiBaseUrlCandidates();
        const payload = JSON.stringify({
            message,
            history: chatData.aiHistory,
            state: chatData.state,
            name: chatData.name,
            lang: chatData.lang
        });

        let lastErr = null;

        for (const base of bases) {
            const url = `${base}/api/astro-ai/assistant`;
            try {
                const res = await fetchWithTimeout(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload
                });

                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(data?.error || `AI request failed (HTTP ${res.status}) at ${url}`);
                }
                return data;
            } catch (err) {
                lastErr = err;
                // Try next base
            }
        }

        const hint = location.protocol === 'file:'
            ? "Open the site via `http://localhost:3000` (not by double-clicking the HTML file)."
            : "Make sure AB_AI backend is running on port 3000.";
        throw new Error(`Cannot reach AI server. ${hint}${lastErr?.message ? ` (${lastErr.message})` : ''}`);
    }

    // --- State Logic ---

    const T = {
        welcome: {
            en: "You are warmly welcomed to Parashari Indian Institute of Astrology and Research Center. We are delighted to assist you.",
            hi: "Parashari Indian Institute mein aapka swagat hai. Humein aapki sahayata karke khushi hogi."
        },
        askName: {
            en: "May I please know your good name?",
            hi: "Kripya aapka shubh naam batayein?"
        },
        menuText: (n) => ({
            en: `Thank you dear ${n}. How may I assist you today? Please choose an option below.`,
            hi: `Dhanyavaad dear ${n}. Main aapki kaise sahayata kar sakta hoon? Kripya niche diye gaye options mein se ek choose karein.`
        }),
        issueApology: (n) => ({
            en: `We are truly sorry to hear that you are facing difficulty on our platform, dear ${n}. Kindly fill the form below so we may assist you.`,
            hi: `Humein khed hai ki aap platform par problem face kar rahe hain, dear ${n}. Kripya niche diya gaya form fill karein.`
        }),
        successMsg: (n) => ({
            en: `Thank you dear ${n}. Your issue has been successfully submitted. Our support team will contact you very soon. We truly appreciate your patience.`,
            hi: `Dhanyavaad dear ${n}. Aapka issue successfully submit ho chuka hai. Hamari team jaldi hi aapse sampark karegi.`
        })
    };

    const getT = (key, arg = null) => {
        const obj = typeof T[key] === 'function' ? T[key](arg) : T[key];
        return chatData.lang === 'hinglish' ? obj.hi : obj.en;
    };

    async function botSay(text, options = null) {
        if (!chatData.isOpen) {
            chatData.history.push({ text, isBot: true, options });
            save();
            return;
        }
        addMessage(text, true, options);
    }

    function buildMainMenuOptions() {
        return [
            {
                label: chatData.lang === 'hinglish' ? 'Jyotish / Astrology Chat' : 'Astrology Chat',
                action: async () => {
                    chatData.state = STATES.ASTROLOGY_CHAT;
                    save();
                    inputWrapper.classList.add('active');
                    await botSay(chatData.lang === 'hinglish'
                        ? "Apna astrology sawaal likhiye (kundli, dasha, transit, remedies, etc.)."
                        : "Ask your astrology question (kundli, dasha, transit, remedies, etc.).");
                    inputField.focus();
                }
            },
            { label: chatData.lang === 'hinglish' ? 'Platform Samasya' : 'Platform Issue', action: startIssueForm },
            {
                label: chatData.lang === 'hinglish' ? 'Course Khojein' : 'Course Search',
                action: async () => {
                    chatData.state = STATES.COURSE_SEARCH;
                    save();
                    await botSay(chatData.lang === 'hinglish'
                        ? "Kaunsa course dhoondhna hai? (e.g. KP, Lal Kitab, Vastu, Numerology)"
                        : "Which course are you looking for? (e.g. KP, Lal Kitab, Vastu, Numerology)");
                    inputWrapper.classList.add('active');
                    inputField.focus();
                }
            },
            { label: chatData.lang === 'hinglish' ? 'Sabhi Courses' : 'Show All Courses', action: () => window.location.href = 'courses.html' },
            {
                label: chatData.lang === 'hinglish' ? 'Support Karein' : 'Contact Support', action: () => {
                    setTimeout(() => window.location.href = 'contact.html', 800);
                }
            }
        ];
    }

    async function aiSay(messageForAI = '') {
        if (!CONFIG.enableAI) {
            // Deterministic fallback: no AI calls (saves credits).
            const lower = String(messageForAI || '').toLowerCase();
            if (lower === 'start') {
                await botSay(getT('welcome'));
                showLangOptions();
                return;
            }
            if (lower === 'main_menu') {
                showMainMenu();
                return;
            }
            if (lower === 'platform_issue') {
                await botSay(getT('issueApology', chatData.name || ''));
                await startIssueForm({ skipAiIntro: true });
                return;
            }
            if (lower === 'course_search') {
                chatData.state = STATES.COURSE_SEARCH;
                save();
                await botSay(chatData.lang === 'hinglish'
                    ? "Kaunsa course dhoondhna hai? (e.g. KP, Lal Kitab, Vastu, Numerology)"
                    : "Which course are you looking for? (e.g. KP, Lal Kitab, Vastu, Numerology)");
                inputWrapper.classList.add('active');
                inputField.focus();
                return;
            }
            if (lower === 'issue_submitted') {
                await botSay(getT('successMsg', chatData.name || ''));
                showMainMenu();
                return;
            }
            await botSay(chatData.lang === 'hinglish'
                ? "AI abhi disabled hai (credits save karne ke liye). Support options use karein."
                : "AI is currently disabled to save credits. Please use the support options.");
            return;
        }
        // Keep user-facing chat history separate from model history
        // so we can clamp and maintain consistent behavior.
        let typingEl = null;
        try {
            const effectiveMessage = (messageForAI || "START").toString();

            // Show typing indicator during network wait (chat-only, not page loader)
            if (chatData.isOpen) {
                typingEl = document.createElement('div');
                typingEl.className = 'typing-indicator';
                typingEl.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
                messages.appendChild(typingEl);
                messages.scrollTop = messages.scrollHeight;
            }

            // Send history WITHOUT the current message; we append user+model turns after success.
            // Ensure history never starts with model (Gemini requirement).
            if (chatData.aiHistory.length > 0 && chatData.aiHistory[0]?.role === 'model') {
                chatData.aiHistory.unshift({ role: 'user', text: 'START' });
            }
            chatData.aiHistory = chatData.aiHistory.slice(-20);
            save();

            const data = await callAstroAssistant(effectiveMessage);

            // Apply extracted profile info
            if (data?.extractedLang) chatData.lang = data.extractedLang;
            if (data?.extractedName) chatData.name = data.extractedName;
            save();

            // Append the successful turn pair to model history (user -> model)
            chatData.aiHistory.push({ role: 'user', text: effectiveMessage });
            if (data?.reply) chatData.aiHistory.push({ role: 'model', text: String(data.reply) });
            chatData.aiHistory = chatData.aiHistory.slice(-20);
            save();

            const shouldShowMenu = Boolean(data?.showMenu);
            const intent = String(data?.intent || '');

            // Restore "old options method" UX for onboarding too
            if (intent === 'ASK_LANG') {
                const langOptions = [
                    { label: "English", action: async () => { chatData.lang = 'english'; save(); await aiSay('English'); } },
                    { label: "Hindi / Hinglish", action: async () => { chatData.lang = 'hinglish'; save(); await aiSay('Hinglish'); } }
                ];
                await botSay(String(data.reply || ''), langOptions);
                inputWrapper.classList.add('active'); // allow typing too
                inputField.focus();
                return;
            }

            // Trigger fixed actions based on intent
            if (intent === 'PLATFORM_ISSUE') {
                await botSay(String(data.reply || ''), null);
                return startIssueForm({ skipAiIntro: true });
            }
            if (intent === 'COURSE_SEARCH') {
                chatData.state = STATES.COURSE_SEARCH;
                save();
                await botSay(String(data.reply || ''), null);
                inputWrapper.classList.add('active');
                inputField.focus();
                return;
            }
            if (intent === 'SHOW_ALL_COURSES') {
                await botSay(String(data.reply || ''), null);
                return setTimeout(() => window.location.href = 'courses.html', 800);
            }
            if (intent === 'CONTACT_SUPPORT') {
                await botSay(String(data.reply || ''), null);
                return setTimeout(() => window.location.href = 'contact.html', 800);
            }

            const options = shouldShowMenu ? buildMainMenuOptions() : null;
            await botSay(String(data.reply || ''), options);
        } catch (err) {
            // Helpful for quick debugging in browser devtools
            try { console.error('Astro assistant error:', err); } catch { }

            const rawMsg = String(err && err.message ? err.message : '');
            if (rawMsg === 'AI_DISABLED') {
                await botSay(chatData.lang === 'hinglish'
                    ? "AI abhi disabled hai (credits save karne ke liye). Support options use karein."
                    : "AI is currently disabled to save credits. Please use the support options.");
                return;
            }
            const isRateLimited =
                rawMsg.includes('rate limited') ||
                rawMsg.includes('[429') ||
                rawMsg.includes('Too Many Requests') ||
                rawMsg.includes('quota');
            const isQuotaBilling =
                rawMsg.toLowerCase().includes('billing') ||
                rawMsg.toLowerCase().includes('quota/billing') ||
                rawMsg.toLowerCase().includes('quota') && rawMsg.toLowerCase().includes('enabled');

            let userText;
            if (isQuotaBilling) {
                userText = chatData.lang === 'hinglish'
                    ? "AI key ka quota/billing enable nahi hai. Google AI Studio / Cloud me billing & quota enable karke dobara try karein."
                    : "This Gemini API key/project has no quota/billing enabled. Enable billing & quota in Google AI Studio / Cloud, then try again.";
            } else if (isRateLimited) {
                userText = chatData.lang === 'hinglish'
                    ? "AI abhi thoda busy hai. Kripya 1 minute baad dubara try karein."
                    : "The AI is a bit busy right now. Please try again in about a minute.";
            } else {
                const hint = (location.protocol === 'file:')
                    ? (chatData.lang === 'hinglish'
                        ? "Tip: file ko directly open na karein—site ko http://localhost:3000 se run karein."
                        : "Tip: don’t open the HTML file directly—run the site via http://localhost:3000.")
                    : "";
                userText = chatData.lang === 'hinglish'
                    ? "AI se connect nahi ho pa raha. Kripya thoda baad mein try karein. " + hint
                    : "Unable to connect to AI right now. Please try again in a moment. " + hint;
            }

            await botSay(userText);
        } finally {
            if (typingEl && typingEl.parentNode) typingEl.remove();
        }
    }

    async function startWelcomeFlow() {
        if (chatData.history.length > 0) return;
        chatData.state = STATES.AI_ASSIST;
        save();
        inputWrapper.classList.add('active');
        await botSay(getT('welcome'));
        showLangOptions();
    }

    async function handleInput(val) {
        if (!val || chatData.state === STATES.IDLE) return;
        addMessage(val, false);
        inputField.value = '';

        // Astrology chat mode: only place where AI can be called (credits are spent only here).
        if (chatData.state === STATES.ASTROLOGY_CHAT) {
            if (!CONFIG.enableAI) {
                await botSay(chatData.lang === 'hinglish'
                    ? "Astrology AI abhi disabled hai. (Quota/billing enable hone ke baad main isko on kar dunga.)"
                    : "Astrology AI is currently disabled. (Once quota/billing is enabled, I can turn it on.)");
                showMainMenu();
                return;
            }
            await aiSay(val);
            return;
        }

        // Onboarding: capture name without AI calls
        if (chatData.state === STATES.ONBOARD_NAME) {
            chatData.name = val.trim().slice(0, 40);
            chatData.state = STATES.AI_ASSIST;
            save();
            showMainMenu();
            return;
        }

        // Local course redirect remains deterministic (fast + reliable),
        // but the prompt text / flow is AI-driven.
        if (chatData.state === STATES.COURSE_SEARCH) {
            const q = val.toLowerCase();
            let match = null;
            for (let k in CONFIG.courseMap) if (q.includes(k)) match = CONFIG.courseMap[k];

            if (match) {
                await botSay(chatData.lang === 'hinglish' ? "Redirect kar rahe hain..." : "Redirecting you now...");
                setTimeout(() => window.location.href = match, 1500);
            } else {
                await botSay(chatData.lang === 'hinglish'
                    ? "Course nahi mila. Kripya KP / Lal Kitab / Vastu / Numerology jaise keywords type karein, ya menu me 'Show All Courses' choose karein."
                    : "I couldn't find that course. Please type keywords like KP / Lal Kitab / Vastu / Numerology, or choose 'Show All Courses' from the menu.");
                showMainMenu();
            }
            return;
        }

        // Support intent shortcuts WITHOUT AI credits
        const lower = val.toLowerCase();
        if (lower.includes('platform') || lower.includes('issue') || lower.includes('problem') || lower.includes('error')) {
            await botSay(getT('issueApology', chatData.name || ''));
            await startIssueForm({ skipAiIntro: true });
            return;
        }
        if (lower.includes('course')) {
            chatData.state = STATES.COURSE_SEARCH;
            save();
            await botSay(chatData.lang === 'hinglish'
                ? "Kaunsa course dhoondhna hai? (e.g. KP, Lal Kitab, Vastu, Numerology)"
                : "Which course are you looking for? (e.g. KP, Lal Kitab, Vastu, Numerology)");
            inputWrapper.classList.add('active');
            inputField.focus();
            return;
        }
        if (lower.includes('contact') || lower.includes('support')) {
            await botSay(chatData.lang === 'hinglish'
                ? "Aapko Contact page par le ja rahe hain..."
                : "Taking you to the Contact page...");
            setTimeout(() => window.location.href = 'contact.html', 700);
            return;
        }

        // If AI is disabled, keep it simple and show menu again.
        if (!CONFIG.enableAI) {
            await botSay(chatData.lang === 'hinglish'
                ? "Support ke liye niche options use karein."
                : "Please use the options below for support.");
            showMainMenu();
            return;
        }

        // AI path (only when enabled)
        chatData.state = STATES.AI_ASSIST;
        save();
        await aiSay(val);
    }

    async function startIssueForm({ skipAiIntro = false } = {}) {
        // Prevent duplicates: if form is already on screen, just scroll to it.
        const existing = document.getElementById('astroIssueForm');
        if (existing) {
            existing.scrollIntoView({ block: 'nearest' });
            return;
        }

        chatData.state = STATES.ISSUE_FORM;
        save();
        // Only call AI for the intro if enabled and requested.
        if (!skipAiIntro && CONFIG.enableAI) {
            await aiSay("PLATFORM_ISSUE");
        }

        const countries = [
            { n: "India", c: "+91" }, { n: "USA", c: "+1" }, { n: "UK", c: "+44" },
            { n: "Australia", c: "+61" }, { n: "Canada", c: "+1" }, { n: "Germany", c: "+49" },
            { n: "France", c: "+33" }, { n: "UAE", c: "+971" }, { n: "Singapore", c: "+65" },
            { n: "Nepal", c: "+977" }, { n: "Sri Lanka", c: "+94" }, { n: "Bangladesh", c: "+880" },
            { n: "Pakistan", c: "+92" }, { n: "Saudi Arabia", c: "+966" }, { n: "Qatar", c: "+974" },
            { n: "Kuwait", c: "+965" }, { n: "Oman", c: "+968" }, { n: "Bahrain", c: "+973" },
            { n: "Malaysia", c: "+60" }, { n: "Thailand", c: "+66" }, { n: "Japan", c: "+81" },
            { n: "China", c: "+86" }, { n: "Russia", c: "+7" }, { n: "Brazil", c: "+55" },
            { n: "South Africa", c: "+27" }, { n: "Netherlands", c: "+31" }, { n: "Italy", c: "+39" },
            { n: "Spain", c: "+34" }, { n: "Sweden", c: "+46" }, { n: "Norway", c: "+47" }
        ].sort((a, b) => a.n.localeCompare(b.n));

        const optionsHtml = countries.map(ctry =>
            `<option value="${ctry.c}" ${ctry.c === '+91' ? 'selected' : ''}>${ctry.n} (${ctry.c})</option>`
        ).join('');

        const formDiv = document.createElement('div');
        formDiv.className = 'chat-bubble bot-bubble';
        formDiv.style.width = '100%';
        formDiv.innerHTML = `
            <form id="astroIssueForm" class="chat-form">
                <textarea name="description" class="form-textarea" placeholder="Describe issue (Max 200 chars)" maxlength="200" required></textarea>
                <div class="form-row">
                    <select name="code" class="form-select">
                        ${optionsHtml}
                    </select>
                    <input type="tel" name="phone" class="form-input" placeholder="Phone" required>
                </div>
                <input type="email" name="email" class="form-input" placeholder="Email" required>
                <button type="submit" id="issueSubmitBtn" class="form-btn">Submit Issue</button>
            </form>
        `;
        messages.appendChild(formDiv);
        messages.scrollTop = messages.scrollHeight;

        const issueForm = document.getElementById('astroIssueForm');
        issueForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('issueSubmitBtn');
            const formData = new FormData(e.target);

            btn.disabled = true;
            btn.innerText = 'Sending...';

            const payload = {
                Name: chatData.name,
                Email: formData.get('email'),
                Phone: formData.get('code') + " " + formData.get('phone'),
                Message: formData.get('description'),
                _subject: "New Platform Issue - AB_AI Chatbot",
                _captcha: "false"
            };

            try {
                const res = await fetch(`https://formsubmit.co/ajax/${CONFIG.emailRecipient}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    await botSay(getT('successMsg', chatData.name || ''));
                    setTimeout(() => {
                        formDiv.remove();
                        chatData.state = STATES.AI_ASSIST;
                        save();
                        showMainMenu();
                    }, 800);
                } else throw new Error();
            } catch {
                btn.disabled = false;
                btn.innerText = 'Error! Try Again';
            }
        };
    }

    // --- Floating & Drag Logic ---

    // --- Floating & Drag Logic ---
    function updateContainerPosition() {
        const tRect = toggle.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        const gap = 20;
        const padding = 20;
        const topHeaderHeight = 100;
        const headerClearance = window.innerWidth <= 600 ? topHeaderHeight : 280; // Adaptive clearance for mobile vs desktop

        // Default: Bottom aligned, side based on toggle position
        // If toggle is on right half: Container to left
        // If toggle is on left half: Container to right

        const isRightConfig = (tRect.left + tRect.width / 2) > window.innerWidth / 2;

        let targetLeft;
        if (isRightConfig) {
            targetLeft = tRect.left - cRect.width - gap;
            // Prevent going off-screen left
            if (targetLeft < padding) targetLeft = padding;
        } else {
            targetLeft = tRect.right + gap;
            // Prevent going off-screen right
            if (targetLeft + cRect.width > window.innerWidth - padding) {
                targetLeft = window.innerWidth - cRect.width - padding;
            }
        }

        // Align bottoms
        let targetTop = tRect.bottom - cRect.height;
        // Prevent going off-screen top
        if (targetTop < headerClearance) {
            targetTop = headerClearance;
        }
        // Prevent going off-screen bottom
        if (targetTop + cRect.height > window.innerHeight - padding) {
            targetTop = window.innerHeight - cRect.height - padding;
        }

        container.style.left = `${targetLeft}px`;
        container.style.top = `${targetTop}px`;
        container.style.right = 'auto';
        container.style.bottom = 'auto';
    }

    function setupDraggable(el, handle, storageKey, onUpdate) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        handle.style.cursor = 'move';

        const onStart = (e) => {
            isDragging = true;
            const event = e.type.includes('touch') ? e.touches[0] : e;
            startX = event.clientX;
            startY = event.clientY;
            initialX = el.offsetLeft;
            initialY = el.offsetTop;
            el.style.transition = 'none';
            if (el === toggle) {
                // When dragging toggle, update container too (smooth)
                container.style.transition = 'none';
            }
            // Explicitly lock the current left and top position before unsetting bottom and right. 
            // This prevents the element from jumping back to 0,0.
            el.style.left = initialX + 'px';
            el.style.top = initialY + 'px';
            el.style.bottom = 'auto';
            el.style.right = 'auto';
            if (!e.type.includes('touch')) e.preventDefault();
        };

        const onMove = (e) => {
            if (!isDragging) return;
            const event = e.type.includes('touch') ? e.touches[0] : e;

            // Prevent scrolling while dragging on touch devices
            if (e.type.includes('touch')) {
                e.preventDefault();
            }

            const dx = event.clientX - startX;
            const dy = event.clientY - startY;

            let x = initialX + dx;
            let y = initialY + dy;

            // Adaptive Vertical Constraints
            const topHeaderHeight = 100; // Account for mobile header thickness
            const minTop = window.innerWidth <= 600 ? topHeaderHeight : 280;
            const maxBottomPadding = window.innerWidth <= 600 ? 20 : 50;
            const maxTop = window.innerHeight - el.offsetHeight - maxBottomPadding;

            y = Math.max(minTop, Math.min(y, maxTop));
            x = Math.max(0, Math.min(x, window.innerWidth - el.offsetWidth));

            el.style.left = x + 'px';
            el.style.top = y + 'px';

            if (onUpdate) onUpdate();
        };

        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;

            const centerX = window.innerWidth / 2;
            const currentX = el.offsetLeft + (el.offsetWidth / 2);

            // Snap logic for Toggle
            if (el === toggle) {
                const padding = 40;
                let finalSide = currentX < centerX ? 'left' : 'right';
                let finalX = finalSide === 'left' ? padding : window.innerWidth - el.offsetWidth - padding;

                el.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                container.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'; /* Sync transition */

                el.style.left = finalX + 'px';

                // Save side and y position
                chatData[storageKey] = { side: finalSide, y: el.offsetTop };
                sessionStorage.setItem(`astroChat_${storageKey}_v2`, JSON.stringify(chatData[storageKey]));

                if (finalSide === 'left') {
                    toggle.classList.add('left-side');
                } else {
                    toggle.classList.remove('left-side');
                }

                // Update container final pos after snap
                // We need to wait for transition or just set it?
                // Setting it here might conflict with transition unless we calc target.
                // Let's use a timeout or requestAnimationFrame to keep updating?
                // Or simple: Set it once. 

                // Re-calibrating container position based on SNAP target
                // But updateContainerPosition uses getBoundingClientRect which is current.
                // So we need to wait for the snap to finish? 
                // Actually, if we set transition on both, and set target left/top on both, they animate together.

                // Let's manually invoke updateContainerPosition() but we need to know the FUTURE rect of toggle?
                // That's hard. 
                // Simpler: Just save, and let the loop handle it? 
                // Or: The updateContainerPosition relies on current toggle pos.
                // If toggle animates, container should animate to its target.

                // Hack: Trigger updateContainerPosition repeatedly during transition?
                // Better: Just let them be independent for the snap? 
                // No, they must move together.

                // If I set `container.style.left` NOW based on `finalX`, it will animate to it.
                // We can simulate the toggle rect.
                setTimeout(updateContainerPosition, 50); // Initial 
                setTimeout(updateContainerPosition, 500); // After transition
            }
        };

        handle.addEventListener('mousedown', onStart);
        handle.addEventListener('touchstart', onStart, { passive: true });
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchend', onEnd);
    }

    function restorePositions() {
        // Disable transitions to prevent layout thrashing and ensure getBoundingClientRect is correct immediately
        toggle.style.transition = 'none';
        container.style.transition = 'none';

        // Restore Toggle Position
        const data = JSON.parse(sessionStorage.getItem('astroChat_toggle_pos_v2'));
        if (data) {
            const sidePadding = window.innerWidth <= 600 ? 20 : 40;
            const x = data.side === 'left' ? sidePadding : window.innerWidth - toggle.offsetWidth - sidePadding;
            const topHeaderHeight = 100;
            const minAllowedTop = window.innerWidth <= 600 ? topHeaderHeight : 280;
            const y = Math.max(minAllowedTop, Math.min(data.y, window.innerHeight - toggle.offsetHeight - 100));

            toggle.style.left = x + 'px';
            toggle.style.top = y + 'px';
            toggle.style.right = 'auto';
            toggle.style.bottom = 'auto';

            if (data.side === 'left') {
                toggle.classList.add('left-side');
            } else {
                toggle.classList.remove('left-side');
            }
        }


        // Force reflow to ensure toggle position is applied before calculating container
        toggle.offsetHeight;

        // Update Container Position based on restored toggle
        updateContainerPosition();

        // Re-enable transitions after a short delay (optional, or let CSS handle subsequent interactions)
        // We don't necessarily need to re-enable inline transitions because CSS has default transitions.
        // However, if we drag again, setupDraggable handles transitions.
        // If we want smooth resize updates later, we might want them back.
        // But resize event fires continuously.

        // Let's clear the inline transition property so it reverts to CSS stylesheet (if any)
        setTimeout(() => {
            toggle.style.transition = '';
            container.style.transition = '';
        }, 50);
    }

    // Setup dragging for Toggle Only -> moving it updates container
    setupDraggable(toggle, toggle, 'toggle_pos', updateContainerPosition);

    // Listen for window resize
    window.addEventListener('resize', () => {
        applyPhoneHeight();
        restorePositions();
        updateContainerPosition();
    });

    // Initial positioning
    // We need to wait for layout? 
    // updateContainerPosition uses offsetWidth/Height which might be 0 if hidden?
    // Container is display:flex but opacity:0 and scale:0.8. Dimensions should be correct.
    // If display:none (mobile?), dimensions are 0.
    // But this script runs on load.

    // Ensure container has dimensions before calculating
    // It has fixed width/height in CSS.

    restorePositions();
    applyPhoneHeight();

    // --- Interactions ---

    function toggleChat() {
        chatData.isOpen = !chatData.isOpen;
        container.classList.toggle('open', chatData.isOpen);
        toggle.classList.toggle('active', chatData.isOpen);

        // Hide/Show badge
        const badge = document.querySelector('.astro-toggle-badge');
        if (badge) badge.style.display = chatData.isOpen ? 'none' : 'flex';

        if (chatData.isOpen) {
            rebuildHistory();
            restorePositions();
            if (chatData.history.length === 0) startWelcomeFlow();
            inputField.focus();
        }
    }

    toggle.onclick = (e) => {
        // Toggle if not dragged
        toggleChat();
    };
    sendBtn.onclick = () => handleInput(inputField.value.trim());
    inputField.onkeypress = (e) => { if (e.key === 'Enter') sendBtn.click(); };
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && chatData.isOpen) toggleChat(); });

    newChatBtn.onclick = () => {
        chatData.history = [];
        chatData.aiHistory = [];
        chatData.name = '';
        chatData.lang = '';
        chatData.state = STATES.AI_ASSIST;
        rebuildHistory();
        startWelcomeFlow();
    };

    restorePositions();

    // --- Floating Ticket Spawner ---
    function spawnTicket() {
        const tRect = toggle.getBoundingClientRect();

        // Ensure toggle is actually visible/mounted
        if (tRect.width === 0 && tRect.height === 0) return;

        const ticket = document.createElement('a');
        ticket.href = 'register.html';
        ticket.className = 'astro-floating-ticket';

        ticket.innerHTML = `
            <div class="ticket-text">REGISTER NOW</div>
        `;

        // Spawn from the center-top of the toggle
        const spawnX = tRect.left + (tRect.width / 2) - 65; // 65 is half of ticket width
        // Calculate bottom position based on the toggle's top
        const spawnBottom = window.innerHeight - tRect.top;

        ticket.style.setProperty('--start-x', spawnX + 'px');
        ticket.style.setProperty('--start-y', spawnBottom + 'px');

        // Add random horizontal drift (-40px to 40px)
        const drift = (Math.random() - 0.5) * 80;
        ticket.style.setProperty('--drift-x', drift + 'px');

        // Target Y: stop and fade out BELOW the navbar bottom
        // Measure actual header/navbar height so this works on all screen sizes
        const header = document.querySelector('header') || document.querySelector('nav');
        const navbarBottom = header ? header.getBoundingClientRect().bottom : 120;
        // End bottom position = distance from bottom of screen to navbar bottom, with 30px buffer
        const targetBottom = window.innerHeight - navbarBottom - 30;
        ticket.style.setProperty('--end-y', targetBottom + 'px');

        document.body.appendChild(ticket);

        // Remove after animation (7 seconds)
        setTimeout(() => {
            if (ticket.parentNode) ticket.remove();
        }, 7000);
    }

    // Spawn a ticket every 3 to 7 seconds randomly
    function scheduleNextTicket() {
        setTimeout(() => {
            spawnTicket();
            scheduleNextTicket();
        }, 3000 + Math.random() * 4000);
    }

    // Start Spawner
    scheduleNextTicket();

})();
