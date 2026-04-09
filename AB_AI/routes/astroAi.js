const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

const ASTRO_KEYWORDS = [
  'astrology', 'astrolog', 'jyotish', 'ved', 'vedic', 'kundli', 'kundali', 'janam',
  'horoscope', 'rashifal', 'rashi', 'zodiac', 'nakshatra', 'dasha', 'mahadasha',
  'antardasha', 'gochar', 'transit', 'lagna', 'ascendant', 'navamsa', 'divisional chart',
  'birth chart', 'planet', 'graha', 'rahu', 'ketu', 'shani', 'saturn', 'guru', 'jupiter',
  'mangal', 'mars', 'budh', 'mercury', 'shukra', 'venus', 'surya', 'sun', 'chandra', 'moon',
  'house', 'bhava', 'yoga', 'dosha', 'manglik', 'mangal dosha', 'kaal sarp', 'kal sarp'
];

function isAstrologyRelated(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return false;
  return ASTRO_KEYWORDS.some((kw) => t.includes(kw));
}

const GREETING_KEYWORDS = [
  'hi', 'hii', 'hello', 'hey', 'good morning', 'good night', 'good evening', 'good afternoon',
  'namaste', 'pranam', 'salaam', 'assalam', 'thanks', 'thank you', 'shukriya', 'dhanyavad'
];

const SUPPORT_KEYWORDS = [
  'platform', 'issue', 'problem', 'error', 'login', 'sign in', 'signup', 'register', 'payment',
  'course', 'courses', 'search', 'support', 'contact', 'help', 'portal'
];

function isGreeting(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return false;
  return GREETING_KEYWORDS.some((kw) => t.includes(kw));
}

function isSupportRelated(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return false;
  return SUPPORT_KEYWORDS.some((kw) => t.includes(kw));
}

function isProfileInput(text) {
  const t = String(text || '').toLowerCase().trim();
  if (!t) return false;
  if (t === 'english' || t === 'hinglish' || t === 'hindi' || t === 'hindi/hinglish') return true;
  if (t.includes('my name is') || t.includes('i am ') || t.includes('mera naam') || t.includes('main ')) return true;
  // very short single token often used for name
  if (t.length >= 2 && t.length <= 20 && /^[a-z\s]+$/.test(t)) return true;
  return false;
}

function toGeminiHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((h) => h && (h.role === 'user' || h.role === 'model') && typeof h.text === 'string')
    .slice(-20)
    .map((h) => ({ role: h.role, parts: [{ text: h.text }] }));
}

function pickModel(genAI) {
  const modelCandidates = [
    process.env.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro'
  ].filter(Boolean);

  return { modelCandidates };
}

function isQuotaExceededError(err) {
  const msg = String(err?.message || '');
  return (
    msg.includes('exceeded your current quota') ||
    msg.includes('check your plan and billing details') ||
    msg.includes('Quota exceeded for metric') ||
    msg.includes('generate_content_free_tier') ||
    msg.includes('limit: 0')
  );
}

function extractJsonObject(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  // Find first JSON object in the text.
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  const slice = t.slice(first, last + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

router.post('/chat', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY on server.' });
    }

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const history = toGeminiHistory(req.body?.history);

    if (!message) return res.status(400).json({ error: 'Message is required.' });
    if (message.length > 2000) return res.status(400).json({ error: 'Message too long.' });

    if (!isAstrologyRelated(message)) {
      return res.json({
        blocked: true,
        reply:
          "I can only help with astrology-related questions (Jyotish/horoscope/kundli, planets, dashas, transits, remedies). Please ask something related to astrology."
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemInstruction = [
      'You are Parashari Astrology AI for Parashari Indian Institute of Astrology and Research Center.',
      'Allowed domain: astrology only (Jyotish, Vedic astrology, horoscope reading concepts, planets, houses, nakshatras, dashas, transits, yogas, doshas, and general astrology remedies).',
      'If the user asks for anything outside astrology, refuse briefly and ask them to rephrase into an astrology question.',
      'Be respectful, concise, and helpful. If birth details are required, ask for them (date, time, place).'
    ].join('\n');

    const { modelCandidates } = pickModel(genAI);

    let reply = '';
    let lastErr = null;

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction
        });
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(message);
        reply = result?.response?.text?.() || '';
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        const msg = String(e?.message || '');
        // If the project has no quota/billing, retries won't help.
        if (isQuotaExceededError(e)) break;
        // If the model name is invalid/not supported, try next candidate.
        if (msg.includes('models/') || msg.includes('not found') || msg.includes('ListModels')) continue;
        // If rate-limited on a model, try a different one.
        if (msg.includes('[429') || msg.includes('Too Many Requests') || msg.includes('quota')) continue;
        break;
      }
    }

    if (!reply) throw lastErr || new Error('Empty AI response');

    return res.json({ reply });
  } catch (err) {
    // Avoid leaking internals; keep a hint for debugging.
    console.error('astro-ai error:', err?.message || err);
    const msg = String(err?.message || '');
    if (isQuotaExceededError(err)) {
      return res.status(429).json({
        error:
          'Gemini API quota/billing is not enabled for this API key/project. Enable billing/quota in Google AI Studio / Google Cloud, then try again.'
      });
    }
    if (msg.includes('[429') || msg.includes('Too Many Requests') || msg.includes('quota')) {
      return res.status(429).json({ error: 'AI is rate limited right now. Please try again in a minute.' });
    }
    return res.status(500).json({ error: 'AI request failed.' });
  }
});

// AI assistant orchestration endpoint (astrology + the site's support menu only)
router.post('/assistant', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API_KEY on server.' });

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const history = toGeminiHistory(req.body?.history);
    const state = typeof req.body?.state === 'string' ? req.body.state : 'UNKNOWN';
    const name = typeof req.body?.name === 'string' ? req.body.name : '';
    const lang = typeof req.body?.lang === 'string' ? req.body.lang : '';

    if (message.length > 2000) return res.status(400).json({ error: 'Message too long.' });

    // Hard guard: only allow astrology + greetings + the fixed support flows.
    // If the user asks something else, we refuse (even if the model would answer).
    // Special case: allow empty/START to bootstrap the conversation.
    if (
      message &&
      message !== 'START' &&
      !isAstrologyRelated(message) &&
      !isGreeting(message) &&
      !isSupportRelated(message) &&
      !isProfileInput(message)
    ) {
      return res.json({
        blocked: true,
        reply:
          "I can help with astrology (Jyotish/horoscope/kundli) and Parashari platform support (course search, platform issue, contact support). Please ask within these topics.",
        intent: 'REFUSE'
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const { modelCandidates } = pickModel(genAI);

    const systemInstruction = [
      'You are Parashari AI Assistant for Parashari Indian Institute of Astrology and Research Center.',
      '',
      'Allowed scope ONLY:',
      '- Astrology only (Jyotish/Vedic astrology: planets, houses, rashis, nakshatras, dashas, transits, yogas, doshas, remedies).',
      '- Parashari website help ONLY for these actions: Platform Issue (open issue form), Course Search (ask course name), Show All Courses (link), Contact Support (link).',
      '',
      'You must be friendly and casual for greetings (hi/hello/good morning/night), but keep the conversation centered on astrology or the allowed support actions.',
      'If user asks outside allowed scope, refuse briefly and ask them to rephrase into an astrology question or choose a support option.',
      '',
      'Return ONLY strict JSON (no markdown, no extra text) with this schema:',
      '{',
      '  "reply": string,',
      '  "intent": "GREETING"|"ASK_LANG"|"SET_LANG"|"ASK_NAME"|"SET_NAME"|"MAIN_MENU"|"ASTROLOGY_CHAT"|"PLATFORM_ISSUE"|"COURSE_SEARCH"|"SHOW_ALL_COURSES"|"CONTACT_SUPPORT"|"REFUSE",',
      '  "extractedName": string|null,',
      '  "extractedLang": "english"|"hinglish"|"hindi"|null,',
      '  "showMenu": boolean',
      '}',
      '',
      `Current UI state: ${state}`,
      `Known user name: ${name || '(unknown)'}`,
      `Preferred language: ${lang || '(unknown)'}`,
      '',
      'Notes:',
      '- If language is unknown, ask language first (intent ASK_LANG, showMenu false).',
      '- If name is unknown, ask name next (intent ASK_NAME, showMenu false).',
      '- Otherwise show MAIN_MENU with showMenu true (unless the user is clearly asking an astrology question).',
      '- When user asks for a support action, set intent accordingly and showMenu false (the UI will handle navigation/forms).'
    ].join('\n');

    let raw = '';
    let lastErr = null;

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction
        });
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(message || 'START');
        raw = result?.response?.text?.() || '';
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        const msg = String(e?.message || '');
        // If the project has no quota/billing, retries won't help.
        if (isQuotaExceededError(e)) break;
        if (msg.includes('models/') || msg.includes('not found') || msg.includes('ListModels')) continue;
        // If rate-limited on a model, try a different one.
        if (msg.includes('[429') || msg.includes('Too Many Requests') || msg.includes('quota')) continue;
        break;
      }
    }

    if (!raw) throw lastErr || new Error('Empty AI response');

    const parsed = extractJsonObject(raw);
    if (!parsed || typeof parsed.reply !== 'string') {
      return res.status(500).json({ error: 'AI response parse failed.' });
    }

    // Normalize + clamp
    const normalizedLang =
      parsed.extractedLang === 'english'
        ? 'english'
        : (parsed.extractedLang === 'hinglish' || parsed.extractedLang === 'hindi')
          ? 'hinglish'
          : null;

    const safe = {
      reply: String(parsed.reply || '').slice(0, 4000),
      intent: String(parsed.intent || 'ASTROLOGY_CHAT'),
      extractedName: typeof parsed.extractedName === 'string' ? parsed.extractedName.slice(0, 30) : null,
      extractedLang: normalizedLang,
      showMenu: Boolean(parsed.showMenu)
    };

    return res.json(safe);
  } catch (err) {
    console.error('astro-assistant error:', err?.message || err);
    const msg = String(err?.message || '');
    if (isQuotaExceededError(err)) {
      return res.status(429).json({
        error:
          'Gemini API quota/billing is not enabled for this API key/project. Enable billing/quota in Google AI Studio / Google Cloud, then try again.'
      });
    }
    if (msg.includes('[429') || msg.includes('Too Many Requests') || msg.includes('quota')) {
      return res.status(429).json({ error: 'AI is rate limited right now. Please try again in a minute.' });
    }
    return res.status(500).json({ error: 'AI request failed.' });
  }
});

module.exports = router;

