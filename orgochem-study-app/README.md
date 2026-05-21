# Orgo Study Hub - CHEM 121

A personal, Knowunity-style study app for **Stanford CHEM 121 (Organic Chemistry,
Autumn 2025)**, built around the course textbook *Jones & Fleming, Organic
Chemistry (5th Ed.)*.

It runs entirely in the browser with **no install and no internet** required, and
your progress is saved locally in the browser.

## How to open it

Just open `index.html` in any web browser (double-click it, or drag it into a
browser window). That's it.

If you prefer a local server (optional):

```bash
cd orgochem-study-app
python3 -m http.server 8000
# then visit http://localhost:8000
```

## What's inside

- **Study Plan** - a day-by-day plan from the first day of class through the
  final exam. Each study day shows what to read (mapped to Jones & Fleming
  chapters); click a day to see details, **add the exact page numbers**, mark it
  done, and jump straight into the matching flashcards or quiz. Midterms and the
  final are marked on their real dates, and the app tracks how many study days
  you've completed.
- **Flashcards** - ~70 cards across every topic, scheduled with **spaced
  repetition** (Again / Hard / Good / Easy). Each card comes back right before
  you'd forget it; a "due" count shows how many to review. Filter by topic or
  shuffle, and tap **Listen** to hear a card read aloud.
- **Quiz** - multiple-choice questions with instant explanations; answer choices
  are shuffled each time and your best score per topic is saved.
- **Reactions** - a searchable reference of ~37 reactions (reagents, product,
  type, and key notes).
- **Notes** - short topic summaries to skim before problem sets and exams, each
  with a **Listen** button for audio review.
- **AI Tools** - paste a chapter or your notes (or upload a PDF) and have Claude
  generate flashcards, a quiz, or a summary from it. Generated cards/quizzes drop
  straight into your decks. Requires your own Anthropic API key (see below).
- **Course** - syllabus essentials: instructors, textbook, exam schedule
  (with a countdown), grading breakdown, and key policies.

## Adding exact reading pages

Two ways:

1. **Per day in the app** - open any study day and type the pages into the
   "Pages to read" box. It's saved in your browser.
2. **In bulk** - the plan lives in `js/WEEKLY_PLAN` inside `js/data.js`. Each
   week has seven task strings (Mon-Sun). Edit the text or add page numbers there
   to change the plan permanently.

## AI Tools setup

The AI features call the Anthropic (Claude) API **directly from your browser**:

1. Get an API key at [console.anthropic.com](https://console.anthropic.com) and
   set a spending limit on it.
2. Open the **AI Tools** tab, paste the key, pick a model (Haiku is the cheapest
   and fastest; Opus is the most capable), and Save.
3. Paste a chapter/notes or upload a PDF, then click Generate flashcards,
   Generate quiz, or Summarize.

**Privacy/security:** your key is stored only in this browser (localStorage) and
sent straight to Anthropic - use this on your own device only. The same document
is sent with prompt caching, so summarizing then making flashcards/quizzes from
the same text reuses the cache and costs less. Everything except the AI tab works
fully offline with no key.

## Customizing content

All study material is plain data in `js/data.js`:

- `WEEKLY_PLAN` - the daily reading schedule
- `FLASHCARDS`, `QUIZ`, `REACTIONS`, `NOTES` - study content (add your own by
  appending to the arrays)
- `COURSE` - course info and exam dates

No build step - edit the file and refresh the page.
