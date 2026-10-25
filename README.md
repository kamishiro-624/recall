# Recall

Recall turns slide decks and notes into study cards, then schedules reviews with spaced repetition so you practice remembering instead of rereading.

Built for the TSA Software Development event. Everything runs in the browser. There is no server and no account. Files stay on the device unless you choose a cloud provider for the optional AI question writing, which sends the slide text (only the text) to that provider.

## Features

- **Cards from slide decks and documents.** Upload a `.pptx` or `.docx`. Recall reads slide text, tables, speaker notes and pictures, then proposes cards you review before adding.
- **AI-written questions (optional).** Instead of copying slide text, an AI model writes why/how, compare, connect, predict and apply questions as multiple choice (with plausible wrong answers), short answers or written explanations, as you choose, and flags slide mistakes for you to check. Pick the provider in Settings: Puter (default; free account, nothing to install, no key), Chrome's built-in on-device AI (free, no key, nothing leaves the device, but needs flags switched on and a desktop computer), Google Gemini with a free AI Studio key, or Claude with an Anthropic API key (no key needed inside Claude). Teachers can also generate a deck once and share the exported Recall JSON, so students need no AI at all. Everything is reviewed before it is added.
- **Import in three steps.** Add your material and see exactly what was read (slides, notes, pictures); choose ONE way to make cards (AI-written questions or automatic cards); then review with search and filters before adding. Progress bars show every slow step: reading files, writing questions with AI, downloading the on-device model and signing in.
- **Accounts and saving online (optional).** Cards always save on the device. Signing in (with a free Puter account, in a pop-up) also saves decks, cards, progress and settings to the person's own Puter storage, so they can open them on any computer. Changes from several devices are merged, and deletions carry over. API keys are never saved online. Use *Sign out and remove my cards from this device* on shared computers.
- **AI questions blended across lessons.** With several files loaded, each lesson gets its own share of questions (Automatic scales with how much content there is), the lessons are interleaved, and extra questions connect them. A coverage check lists slides that no question refers to and can write questions for them.
- **Ten themes and celebrations.** Match-my-device, Light, Dark, Matte black, Ocean, Violet, Rose, Paper, Sage and High contrast, from the *Theme* menu or Settings (remembered, and synced with an account). Correct answers get a pop and a burst, streaks show a counter, learning a card and finishing a session are celebrated with confetti and counting numbers, and optional sound effects can be switched on. Settings > Animations sets full, calm or off, and follows the device's reduced-motion setting by default.
- **Customizable home screen.** Today, progress by stage, streak, daily goal, review forecast, activity map, decks, trouble spots and a personal note. In *Customize*, drag sections (or use the arrows), give each a size (small, medium, large, full), hide or add them back, set options such as forecast length, or start from a ready-made layout. Rows always fill the width, so there are no gaps, and it collapses to one column on phones.
- **Explanations for every choice.** After a multiple-choice question is answered, each choice shows why it is right or wrong. The AI writes these with the question, teachers can type them when writing a card, and *Library > Add choice explanations* adds them to older cards.
- **Practice rounds.** *Practice* opens a set-up screen: choose which cards (all, learned, missed, not mastered, multiple choice), the order (random, hardest first, weakest first) and how many cards per round. Long sets are split into rounds, and each round shows its time and accuracy. Practice never changes the review schedule.
- **Accuracy and time left.** A running accuracy (and a hide/show link) sits above every study or practice card, and a before-practice summary shows this week's accuracy and the last practice run. A time estimate before and during every session is based on how fast you answer and updates as you go. The accuracy display can be switched off in Settings.
- **Safe deleting.** Delete one card or many at once in the Library (select, search and filter first). Every destructive action asks for confirmation first: deleting cards or decks, removing duplicates, replacing AI questions, resetting counters and clearing a shared computer.
- **One guided session.** Press *Start studying* on Today. Recall runs the reviews that are due, then teaches a few new cards and quizzes them, with a step tracker, a progress bar, a note after every answer, and a summary at the end that shows how far you are through the deck. *Practice* goes through every card without changing the schedule.
- **Learning stage and daily limits.** New cards are taught in lessons (in small batches), then quizzed until you answer correctly a set number of times before they join reviews. Settings control new cards per day, maximum reviews per day, learning steps, lesson batch size and shuffle.
- **Duplicate detection** when creating and importing (same prompt, same picture or audio), within a deck or across all decks, plus one-click cleanup in the Library.
- **Five card types.** Text, fill-in-the-blank (`{{c1::hidden words}}`), image, audio (upload or record) and multiple choice. A multiple-choice card is a flashcard whose answer is tapped instead of typed: it is graded automatically (correct = got it, wrong = missed, *I guessed* = shaky) and follows the same schedule. Short answers (a word or phrase) are checked against the typed answer for you.
- **Active recall.** You type an answer (or tap a choice) before the answer is revealed, then rate yourself *Missed*, *Shaky* or *Got it* (keys 1, 2, 3). Multiple choice is graded for you.
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
js/pace.js            time estimates from your pace, accuracy and the practice set-up/rounds
js/study.js           the guided study session: reviews, new cards, practice, scheduling, progress numbers
css/flow.css          styling for the Today card, session header, summary and settings sections
js/settings.js        daily limits, learning steps, duplicate scope
js/create.js          create and edit cards, image and audio capture
js/parsers.js         pptx, docx, csv/tsv, txt/md and json parsers; card generation
js/progress.js        progress bars used wherever something takes time
js/account.js         optional accounts: Puter sign-in, saving online, merging devices
js/ai.js              optional AI question writing: Puter, Chrome built-in, Gemini and Claude providers
js/import-view.js     import screen and the review-before-add list
js/library.js         library with search, filters, bulk delete and all exports
js/ui.js              confirmation dialog
js/theme.js           theme menu, theme picker and effects settings
js/fx.js              bursts, confetti, count-up numbers and sound effects
css/themes.css        the extra themes
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
- Without an account, data lives in the browser's IndexedDB on one device (use Recall JSON export to back up or move decks). With an account it is also saved to the person's Puter storage. Pictures and audio make saving slower.
- Microphone recording depends on browser permission.

## Ideas for next steps

Shared class decks and a teacher view, progress charts over time, PDF import, and letting the AI see slide pictures and diagrams.

## License

MIT. Replace the name in `LICENSE` with yours.
