# T0 — Offline Summarizer & Translator

T0 is a Chrome extension that summarizes and translates text entirely offline using Gemini Nano. It’s designed for privacy, speed, and convenience — no cloud calls, no tracking, no internet required.

## Features

- Offline text summarization
- Offline translation for supported languages
- Privacy-focused: all processing stays on the device
- Fast responses using on-device ML inference

## Installation

1. Download or clone the project.
2. Open Chrome and go to:
   chrome://extensions/
3. Enable Developer Mode.
4. Select “Load unpacked”.
5. Choose the extension folder.

## Requirements

- Chrome v127+
- Gemini Nano enabled:
  chrome://flags/#enable-enable-all-ml-models
- Device capable of local ML processing

## How to Use

1. Highlight text on any webpage.
2. Right-click and select:
   - Summarize with T0
   - Translate with T0
3. View the output in the popup panel.

## File Structure

T0/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
└── popup.css

## Supported Languages

- English
- French
- Spanish
- German
- Hindi
- Japanese
- and many more..

## Roadmap

- Auto-summary of full pages
- Direct copy text feature 

## Known Issues

- Very long text may take additional processing time.
- Translation accuracy may vary depending on context.
