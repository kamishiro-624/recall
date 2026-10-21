# Recall

Recall turns slide decks and notes into study cards, then schedules reviews with spaced repetition so you practice remembering instead of rereading.

Built for the TSA Software Development event. Everything runs in the browser. There is no server and no account. Files stay on the device unless you choose a cloud provider for the optional AI question writing, which sends the slide text (only the text) to that provider.

## Features

- **Cards from slide decks and documents.** Upload a `.pptx` or `.docx`. Recall reads slide text, tables, speaker notes and pictures, then proposes cards you review before adding.
- **AI-written questions (optional).** Instead of copying slide text, an AI model writes why/how, compare, connect, predict and apply questions with short model answers, and flags slide mistakes for you to check. Pick the provider in Settings: Puter (default; free account, nothing to install, no key), Chrome's built-in on-device AI (free, no key, nothing leaves the device, but needs flags switched on and a desktop computer), Google Gemini with a free AI Studio key, or Claude with an Anthropic API key (no key needed inside Claude). Teachers can also generate a deck once and share the exported Recall JSON, so students need no AI at all. Everything is reviewed before it is added.
- **Dashboard with modular widgets.** Reviews, lessons, daily progress, progress by stage, a 7-day review forecast, streak and accuracy, a 28-day activity map, decks, trouble spots and quick actions. Show, hide and reorder them with *Customize*.
- **Learning stage and daily limits.** New cards are taught in lessons (in small batches), then quizzed until you answer correctly a set number of times before they join reviews. Settings control new cards per day, maximum reviews per day, learning steps, lesson batch size and shuffle.
- **Duplicate detection** when creating and importing (same prompt, same picture or audio), within a deck or across all decks, plus one-click cleanup in the Library.
- **Four card types.** Text, fill-in-the-blank (`{{c1::hidden words}}`), image and audio (upload or record).
- **Active recall.** You type an answer before the answer is revealed, then rate yourself *Missed*, *Shaky* or *Got it* (keys 1, 2, 3).
- **Spaced repetition.** A five-box Leitner schedule with review gaps of 1, 3, 7 and 14 days. Missed cards return in 15 minutes.
- **Import:** `.pptx`, `.docx`, `.txt`, `.md`, `.csv`, `.tsv`, `.json`, pasted notes, Anki plain-text exports and Quizlet tab-separated paste.
- **Export:** Recall JSON (keeps media), CSV, Anki `.txt`, Quizlet `.txt`, Markdown and a printable HTML study sheet.
- Multiple decks, search, edit, light and dark themes, keyboard friendly, works on phones.

## Run locally

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

An internet connection is needed once per load for the JSZip library and Google Fonts (both from CDNs), and whenever you use a cloud AI provider.

## Deploy on GitHub Pages

1. Push this folder to a GitHub repository whose default branch is `main`.
2. In the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/pages.yml` publishes the site at `https://<user>.github.io/<repo>/`.

## Project structure

```
index.html            page shell, loads the scripts in order
css/styles.css        theme tokens (light and dark) and layout
css/forms.css         styling for inputs, drop-downs, text areas, file pickers and checkboxes
js/core.js            state, helpers, IndexedDB storage, card model, duplicate keys
js/download.js        file saving (browser download, or Claude artifact downloads)
js/shell.js           deck selector, tabs, router
js/dashboard.js       widget definitions, layout, customize mode
js/study.js           reviews, lessons (learning stage), practice, scheduling
js/settings.js        daily limits, learning steps, duplicate scope
js/create.js          create and edit cards, image and audio capture
js/parsers.js         pptx, docx, csv/tsv, txt/md and json parsers; card generation
js/ai.js              optional AI question writing: Puter, Chrome built-in, Gemini and Claude providers
js/import-view.js     import screen and the review-before-add list
js/library.js         library, search, progress boxes and all exports
js/app.js             boot
sample/               files to try the importers with
tools/bundle.py       builds a single-file version: python3 tools/bundle.py > recall.html
```

Scripts are plain files loaded in order (no bundler, no modules) so the app also works when opened straight from disk.

## How card generation works

Two ways. The AI option (above) writes concept questions. The built-in rules below need no account and no internet:

Slides and document sections are turned into cards by simple rules, not by an AI model:

- A slide or heading with body text becomes a *key points* card.
- A line like `Term: definition` (or with a dash) becomes a term card.
- A sentence of six or more words gets its longest word hidden as a fill-in card (up to two per slide).
- Slide pictures become image cards, answered with the slide title.

Because the rules are heuristic, every generated card is shown for review first.

## Known limits

- Legacy `.ppt` and `.doc` files and PDFs can't be read. Save as `.pptx` or `.docx`, or paste the text.
- Anki `.apkg` packages aren't supported. Use Anki's *Notes in Plain Text* export instead.
- Anki and Quizlet exports carry card text only. Recall JSON keeps images and audio.
- Data lives in the browser's IndexedDB on one device. Use Recall JSON export to back up or move decks.
- Microphone recording depends on browser permission.

## Ideas for next steps

Shared class decks and a teacher view, progress charts over time, PDF import, and letting the AI see slide pictures and diagrams.

## License

MIT. Replace the name in `LICENSE` with yours.
