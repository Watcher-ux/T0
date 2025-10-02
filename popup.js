// popup.js
const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');

// Language search filter
const langInput = document.getElementById('langSearch');
langInput.addEventListener('input', () => {
  const query = langInput.value.trim().toLowerCase();

  [...langSelectEl.options].forEach(option => {
    const label = option.textContent.toLowerCase();
    const value = option.value.toLowerCase(); 

    const isMatch = label.includes(query) || value.includes(query);
    option.hidden = !isMatch;
  });

  if (langSelectEl.selectedIndex === -1 || langSelectEl.options[langSelectEl.selectedIndex].hidden) {
    const firstVisibleOption = [...langSelectEl.options].find(opt => !opt.hidden);
    if (firstVisibleOption) {
      langSelectEl.value = firstVisibleOption.value;
    }
  }
});


// Language dropdown (BCP‑47 values)
const langSelectEl = document.getElementById('langSelect');
function getTargetLang() {
  return (langSelectEl && langSelectEl.value) ? langSelectEl.value : 'en';
}

//// To add a better scrolling options to select from dropdown menu here. 


// Progress helpers
const progressWrap = document.querySelector('.progress');
const progressBar = document.getElementById('progressBar');
function setProgress(pct) {
  progressWrap.hidden = false;
  progressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  if (pct >= 100) setTimeout(() => { progressWrap.hidden = true; setProgress(0); }, 400);
}

// Busy state
const copyBtn = document.getElementById('copy');
const clearBtn = document.getElementById('clear');
function setBusy(busy) {
  document.getElementById('summarize').disabled = busy;
  copyBtn.disabled = busy || !outputEl.textContent.trim();
  clearBtn.disabled = busy;
}

// Content fetch
async function fetchPageText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_TEXT' });
  return res?.text ?? '';
}

// Summarizer
async function summarizeText(session, text) {
  const schema = {
    type: 'object',
    properties: { summary: { type: 'string' } },
    required: ['summary'],
    additionalProperties: false
  };
  const prompt = `
Simplify the following text for a general audience at ~10th grade reading level.
Use sentences, avoid jargon, and preserve key facts and context.
Return only JSON: { "summary": "<concise simplified summary>" }.

Text:
${text}
`.trim();
  const raw = await session.prompt(prompt, { responseConstraint: schema, omitResponseConstraintInput: true });
  return JSON.parse(raw).summary;
}

// Copy and Clear
copyBtn.addEventListener('click', async () => {
  const txt = outputEl.textContent.trim();
  if (!txt) return;
  await navigator.clipboard.writeText(txt);
  copyBtn.textContent = 'Copied';
  setTimeout(() => (copyBtn.textContent = 'Copy'), 1000);
});
clearBtn.addEventListener('click', () => {
  outputEl.textContent = '';
  statusEl.textContent = 'Cleared';
  copyBtn.disabled = true;
});

// Main click flow: create model → create translator → fetch → summarize → translate
document.getElementById('summarize').addEventListener('click', async () => {
  try {
    setBusy(true);
    statusEl.textContent = 'Preparing...';

    // 1) Model session first (under user gesture); output language fixed to English
    const session = await LanguageModel.create({
      expectedInputs: [{ type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          setProgress(Math.round(e.loaded * 100));
          statusEl.textContent = `Model setup: ${Math.round(e.loaded * 100)}%`;
        });
      }
    });

    // 2) Pre-create translator if target ≠ 'en' (still under the same gesture)
    const targetLang = getTargetLang(); // e.g., 'en', 'hi', 'es', 'fr', 'zh-CN'
    let translatorPromise = null;
    if (targetLang !== 'en') {
      const avail = await Translator.availability({ sourceLanguage: 'en', targetLanguage: targetLang });
      if (avail !== 'unavailable') {
        translatorPromise = Translator.create({
          sourceLanguage: 'en',
          targetLanguage: targetLang,
          monitor(m) {
            m.addEventListener('downloadprogress', (e) => {
              setProgress(Math.round(e.loaded * 100));
              statusEl.textContent = `Translator setup: ${Math.round(e.loaded * 100)}%`;
            });
          }
        });
      }
    }

    // 3) Fetch text after setup has begun
    const text = await fetchPageText();
    if (!text) throw new Error('No text found on page');

    // 4) Summarize on-device (English)
    statusEl.textContent = 'Summarizing on-device...';
    const simplified = await summarizeText(session, text);

    // 5) Translate if needed using dropdown BCP‑47 value
    let finalText = simplified;
    if (targetLang !== 'en') {
      statusEl.textContent = 'Translating...';
      const translator = await translatorPromise;
      if (translator) finalText = await translator.translate(simplified);
    }

    // set RTL for languages like Arabic (if option has data-rtl="true")
    const isRTL = langSelectEl?.selectedOptions?.[0]?.dataset?.rtl === 'true';
    outputEl.dir = isRTL ? 'rtl' : 'ltr';

    // 6) Render
    outputEl.textContent = finalText;
    statusEl.textContent = 'Done';
    copyBtn.disabled = !outputEl.textContent.trim();
  } catch (e) {
    statusEl.textContent = `Error: ${e.message}`;
    console.error(e);
  } finally {
    setBusy(false);
    setProgress(100);
    setTimeout(() => setProgress(0), 400);
  }
});
