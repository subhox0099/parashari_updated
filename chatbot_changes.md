# Chatbot changes log

This file summarizes the changes made during the UI/UX + stability pass for the AB_AI chatbot.

## Files changed
- `Parashari-Indian-Institute-Of-Astrology-And-Research-center/AB_AI/assets/css/chatbot.css`
- `Parashari-Indian-Institute-Of-Astrology-And-Research-center/AB_AI/assets/js/chatbot.js`
- `Parashari-Indian-Institute-Of-Astrology-And-Research-center/AB_AI/routes/astroAi.js`
- `Parashari-Indian-Institute-Of-Astrology-And-Research-center/AB_AI/server.js` (CORS allowlist for dev/prod)
- `Parashari-Indian-Institute-Of-Astrology-And-Research-center/AB_AI/.env` (Gemini key present locally; do not commit)

## UI changes (CSS)
### Header buttons (New Chat / Exit)
- **Button styling refreshed** for a more modern interactive look:
  - Gradient backgrounds, subtle shadows, hover/active transforms, and `:focus-visible` outline.
- **Header click-through fix**:
  - `.astro-chat-header` uses `pointer-events: none` so the transparent header overlay does not block chat interaction.
  - `.astro-chat-header-actions` uses `pointer-events: auto` so only the buttons remain clickable.
- **Placement updates**:
  - Buttons were moved to top corners, then the exit button was removed (see JS changes).
  - New Chat was moved to the **top-right corner** and converted to icon-only **“+”**.
- **Size adjustments**:
  - New Chat and exit were reduced in size (before exit removal) for a tighter header.

### Background dim + zoom
- `.astro-chat-messages` background overlay gradient was **darkened** slightly to improve text/bubble contrast.
- Background image was **zoomed** by changing `background-size` to `130%` for a closer crop.

## Chatbot behavior changes (Frontend JS)
### Header actions
- **Exit (×) removed** from the injected HTML and its handler removed to avoid broken references.
- **New Chat** button text changed from `"New Chat +"` to **`"+"` only** (kept accessibility via `aria-label`/`title`).

### Typing indicator behavior
- Removed the **fake/static typing delay** that appeared before every bot message.
- Kept the **dynamic typing indicator** that appears only while waiting for the API response.

### Duplicate prevention (Platform issue form)
- Fixed duplicate form + repeated messages by:
  - Adding a guard: if `#astroIssueForm` already exists, do not inject it again (just scroll into view).
  - Preventing recursive AI calls: when `PLATFORM_ISSUE` intent triggers the form, the form opening does not re-call the AI intro.

### Credit-saving support flows + menu-gated AI
- Added onboarding states:
  - `ONBOARD_LANG`, `ONBOARD_NAME`
- Added an explicit mode:
  - `ASTROLOGY_CHAT`
- **Menu updated**:
  - Added **“Astrology Chat”** option.
  - Platform Issue / Course Search / Contact Support are **local deterministic flows** (no AI calls).
- **AI is only called in `ASTROLOGY_CHAT` mode** (after selecting “Astrology Chat”).

## Backend changes (Gemini)
### Better quota/billing error handling
- In `routes/astroAi.js`:
  - Added `isQuotaExceededError()` detection (common “quota/billing/limit:0” patterns).
  - When quota/billing is not enabled, the server returns a clearer **429** JSON error instead of retrying models repeatedly.

## CORS (backend)
- In `AB_AI/server.js`:
  - Updated CORS to allow:
    - **Any localhost port** for development (`http://localhost:*`)
    - A small set of production domains

## Notes / Known constraints
- If Gemini returns 429 with **quota exceeded / limit 0**, it is a **Google project billing/quota configuration issue**, not a code issue.
- `.env` contains a real API key in this workspace. Make sure it is **not committed** and consider rotating it after testing.

