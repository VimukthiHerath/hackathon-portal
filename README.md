# Open.Hack.

An open-source hackathon platform with **no backend** — or rather, GitHub
*is* the backend. Hosting, database, compute, auth, and the submission form
are all GitHub features wired together. No server to run, no database to
provision, no hosting bill.

- **Hosting** → GitHub Pages
- **Database** → JSON files, committed to git
- **Compute (grading)** → GitHub Actions
- **Auth** → GitHub accounts (participants just need one)
- **Submission form** → a GitHub Issue Form
- **Storage for problems/answers** → a second, private GitHub repo

If you're a participant looking to submit a solution, see
**[the live submission guide](https://YOUR-USERNAME.github.io/hackathon-portal/submit.html)**
on the portal itself — this README is for whoever is **running** an event.

---

## Table of contents

- [How it works](#how-it-works)
- [Quick start: setting up your own event](#quick-start-setting-up-your-own-event)
- [Registering participants](#registering-participants)
- [Adding questions](#adding-questions)
- [Releasing a question](#releasing-a-question)
- [Running the event](#running-the-event)
- [Limitations](#limitations)
- [Security notes](#security-notes)
- [Troubleshooting](#troubleshooting)

---

## How it works

This project is **two repositories that talk to each other**:

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│   hackathon-portal (PUBLIC) │        │   hackathon-tests (PRIVATE)   │
│                              │        │                              │
│  the live website            │        │  real test cases (answers)   │
│  questions.json (unlock      │        │  evaluate.py (grading logic) │
│    flags + safe metadata)    │◄──────►│  team_mapping.json           │
│  leaderboard.json            │  PAT   │  release_question.py         │
│  released problem statements │        │  new_question.py             │
│  released starter packs      │        │                              │
│  Auto Grader Action          │        │  never exposed to the public │
└─────────────────────────────┘        └──────────────────────────────┘
```

**Why two repos?** `hackathon-portal` is public — anything committed to it
is instantly fetchable by direct URL, whether or not the website *displays*
it as locked. The real test cases (i.e. the answer key) can never live
there. `hackathon-tests` stays private and holds anything a participant
shouldn't be able to see before a question goes live.

**The submission flow, end to end:**

1. A participant opens a GitHub Issue on `hackathon-portal` using the
   "Submit Solution" issue form, picks their question from a dropdown, and
   attaches a `.zip`.
2. That triggers `.github/workflows/grade.yml` in `hackathon-portal`.
3. The workflow checks `questions.json` — if the question isn't
   `unlocked: true`, it comments "not available" and closes the issue.
4. If unlocked, it checks out `hackathon-tests` (using a PAT stored as a
   secret) to get the real test cases, runs `evaluate.py` against the
   submission, and gets back a score.
5. It commits the updated score into `leaderboard.json` (with a
   fetch/retry loop so concurrent submissions from different teams don't
   clobber each other), then comments the result back on the issue and
   closes it.
6. The website re-reads `questions.json` and `leaderboard.json` on every
   page load — no refresh needed, no server, no database.

---

## Quick start: setting up your own event

### 1. Get both repos

Use **"Use this template"** on both repos (or fork them) into your own
account/org:

- `hackathon-portal` → keep **public** (it's the website)
- `hackathon-tests` → keep **private** (it holds the answers)

Keep the default names (`hackathon-portal`, `hackathon-tests`) unless you
enjoy find-and-replace — the default scripts and workflow assume those
exact names sitting next to each other.

### 2. Turn on GitHub Pages

In `hackathon-portal` → **Settings → Pages** → deploy from the `main`
branch, root folder. Your site will be live at
`https://YOUR-USERNAME.github.io/hackathon-portal/`.

### 3. Let the Action push to the leaderboard

In `hackathon-portal` → **Settings → Actions → General → Workflow
permissions**, select **"Read and write permissions"**. Without this, the
grader can run tests but can't commit the score back.

### 4. Connect the two repos

The grader needs to read the private repo's test cases:

1. Create a **fine-grained Personal Access Token** on the account that owns
   `hackathon-tests`, scoped to just that repo, with **read-only
   Contents** permission.
2. In `hackathon-portal` → **Settings → Secrets and variables → Actions →
   New repository secret**, name it `PRIVATE_REPO_TOKEN`, paste the token.

### 5. Rewire the hardcoded bits

A handful of places hardcode the original owner/repo — update these to
yours:

| File | What to change |
|---|---|
| `assets/js/common.js` | `const REPO = { owner: '...', name: 'hackathon-portal' }` |
| `.github/workflows/grade.yml` | `repository: '<owner>/hackathon-tests'` under **Checkout Private Engine** |
| `README.md` (this file) | the `YOUR-USERNAME.github.io` links above |

### 6. Reset the demo data

This template ships with sample questions/scores from testing. Before a
real event:

- `questions.json` → reset to `[]`
- `leaderboard.json` → reset to `{}`
- `hackathon-tests/team_mapping.json` → reset to `{}` (see next section)
- Delete the sample `Q*` folders/zips if you don't want them

### 7. (Optional) Set the contest window

`assets/js/common.js` has a `CONTEST_WINDOW` you can fill in to show a
countdown on the home page:

```js
const CONTEST_WINDOW = { start: '2026-08-01T09:00:00+05:30', end: '2026-08-01T21:00:00+05:30' };
```

Leave both as `null` (the default) to omit the countdown entirely.

---

## Registering participants

There's no signup form — a participant's identity *is* their GitHub
username, and the grader maps that username to a team.

In `hackathon-tests/team_mapping.json`, add one line per participant:

```json
{
  "github-username-lowercase": "Team Name",
  "another-username": "Team Name"
}
```

- Keys must be lowercase GitHub usernames (the grader lowercases before
  matching).
- Multiple usernames can point at the same team.
- Anyone whose username isn't in this file gets their submission rejected
  with "Unregistered GitHub user."
- You can add participants at any time, including mid-event — just commit
  the update to the private repo.

---

## Adding questions

Every question is staged **privately first**, in `hackathon-tests`, and
only made public at the moment you're ready to reveal it. A question has
two halves:

```
hackathon-tests/Q<id>/
  private/
    config.json         ← title, points, time limit, expected filename
    tests/1/input.txt    ← real test input
    tests/1/output.txt   ← real expected output
    tests/2/...          ← as many test cases as you want
  public/
    README.md            ← the actual problem statement participants read
    starter/solution.py  ← starter code participants download
```

Nothing under `public/` is safe to publish until you're ready to unlock
it — copying it into `hackathon-portal` *is* the unlock.

### Option A — scaffold it with a script

```
cd hackathon-tests
python3 new_question.py --id Q5 --title "Two Sum Variant" --points 100 --summary "One-line teaser shown on the portal"
```

This creates the `Q5/private/` and `Q5/public/` skeleton (with `TODO`
placeholders) and registers Q5 in the public `questions.json` as
`unlocked: false` — safe to do immediately, since only the title/points/
summary go public, not the actual problem.

Then fill in the placeholders by hand: real test cases in
`Q5/private/tests/*/`, the real problem statement in
`Q5/public/README.md`, and starter code in `Q5/public/starter/`.

### Option B — do it by hand

If your test cases come from somewhere else (e.g. a lecturer's existing
problem set), just create the same files yourself:

1. `hackathon-tests/Q5/private/config.json`:
   ```json
   { "title": "Two Sum Variant", "points": 100, "time_limit_seconds": 2, "submission_filename": "solution.py" }
   ```
2. `hackathon-tests/Q5/private/tests/1/input.txt` and `.../output.txt` — one
   folder per test case.
3. `hackathon-tests/Q5/public/README.md` — the problem statement.
4. `hackathon-tests/Q5/public/starter/solution.py` — starter code.
5. Register it (still locked) in `hackathon-portal/questions.json`:
   ```json
   { "id": "Q5", "title": "Two Sum Variant", "points": 100, "unlocked": false, "summary": "One-line teaser" }
   ```

At this point Q5 shows on the site as "Locked" with nothing solvable
leaked — everything real is still sitting in the private repo.

---

## Releasing a question

Releasing is the moment a question actually goes live: the real problem
statement and starter code become public, and the lock flips off. **These
two things must happen in the same commit** — that's the whole lesson
this project is built around. If the files land in the public repo even a
few minutes before the "locked" flag flips, anyone browsing the repo
directly (not just the website) can already see them, unlock flag or not.

### Option A — the script (recommended)

```
cd hackathon-tests
python3 release_question.py --id Q5
```

This does all of it atomically: copies `Q5/public/` into
`hackathon-portal/questions/Q5/`, builds `Q5_Starter_Pack.zip`, flips
`unlocked` to `true` in `questions.json`, adds the `"Q5: ..."` option to
the submission dropdown, and commits everything together in
`hackathon-portal` — **without pushing**. Review the commit with
`git show`, then `git push` yourself when you actually want it live.

### Option B — by hand (e.g. entirely through github.com)

1. Copy `hackathon-tests/Q5/public/README.md` → new file
   `hackathon-portal/questions/Q5/README.md`.
2. Copy `hackathon-tests/Q5/public/starter/solution.py` → new file
   `hackathon-portal/questions/Q5/starter/solution.py`.
3. Zip the contents of `Q5/public/starter/` into `Q5_Starter_Pack.zip` and
   upload it to the root of `hackathon-portal`.
4. In `questions.json`, flip Q5's `"unlocked": false` to `true`.
5. In `.github/ISSUE_TEMPLATE/submit.yml`, add `- "Q5: Two Sum Variant"` to
   the dropdown options.
6. Commit **all of the above together** (one commit, one push) — never
   push the files first and the unlock flag later, or vice versa.

---

## Running the event

- **Unlocking questions live**: release questions as the event progresses
  by repeating the release step above whenever you want the next problem
  to open.
- **Watch grading**: the **Actions** tab on `hackathon-portal` shows every
  submission run — useful for debugging a stuck or failed grade.
- **Result states** a team can see on their issue:
  - ✅ `Active`, full score — passed every test case
  - ⚠️ `Active`, partial score — passed some test cases
  - ❌ `Failed` — no `solution.py` found in the zip, or 0 tests passed
  - ❌ `Disqualified` — the anti-cheat check in `evaluate.py` flagged the
    submission
- **Re-submissions**: participants can open a new issue for the same
  question with an updated zip at any time; each run just overwrites that
  team's score for that question in `leaderboard.json`.

---

## Limitations

- **Single-file submissions** — the grader looks for one file matching
  `submission_filename` (in any of the supported languages) anywhere in
  the zip; multi-file projects aren't supported out of the box.
- **Time limit only, no memory limit** — `time_limit_seconds` caps
  runtime per test case, but nothing caps memory use, so a submission
  that allocates unbounded memory can still exhaust the runner.
- **20-minute job ceiling** — `grade.yml` sets `timeout-minutes: 20` for
  the whole grading job (compile + all test cases combined); raise it
  further if you have many/slow test cases or a slow-compiling language.
- **Polling, not push** — the site re-fetches `questions.json` and
  `leaderboard.json` every 30 seconds on every page (plus once on load),
  so updates land within ~30s without a manual refresh — not instant,
  but no server needed either.
- **Username-based identity, not verified accounts** — anyone can create
  a GitHub account, so "one submission per registered username" isn't
  proof against a determined cheater running multiple accounts (see
  Security notes).

Already fixed and no longer limitations, if you're comparing against an
older version of this doc: Java submissions no longer need their public
class name to match the filename (the grader reads the real class name
out of the source and compiles accordingly); output comparison now
tolerates small floating-point differences instead of requiring an exact
string match.

---

## Security notes

- **Never commit real test cases or answer keys to `hackathon-portal`.**
  It's public — anything there is visible immediately regardless of any
  "locked" flag.
- **`PRIVATE_REPO_TOKEN`** grants read access to your answer key. Scope it
  to only `hackathon-tests`, and rotate it if you suspect it leaked.
- **`evaluate.py`** includes a basic anti-cheat check (looking for a
  signature string that shouldn't appear in a genuine submission). Don't
  publish the private repo, and don't paste its contents into public
  places (including AI tools, forums, etc.) — that defeats the point.
- **Team identity is just a GitHub username.** Anyone can create a GitHub
  account, so this system trusts "one submission per registered username,"
  not strong identity verification. Fine for a low-stakes/educational
  event; not meant to stop a determined cheater with multiple accounts.
- **Never interpolate issue-body content directly into a shell `run:`
  step.** `grade.yml` extracts the submission zip URL from the issue body
  with a regex — pass values like that through `env:` and reference them
  as `$VAR`, never as a raw `${{ ... }}` inside the script text. Doing the
  latter lets GitHub substitute attacker-controlled text straight into the
  shell command before it's parsed, which is a real script-injection
  vector on a workflow anyone can trigger by opening an issue — and this
  workflow's job later authenticates as `PRIVATE_REPO_TOKEN` in the same
  run, so the blast radius includes your private answer key.

---

## Troubleshooting

- **"Failed to push leaderboard update after 15 attempts"** — usually means
  a lot of teams submitted in the same few seconds (e.g. right at a
  deadline) and this run kept losing the race to commit
  `leaderboard.json`. The submission itself wasn't lost — the participant
  just needs to open a new submission issue and it'll retry cleanly. Could
  also mean the workflow's write permissions aren't enabled (see step 3
  above).
- **Grader comments "Sorry, Q# isn't currently open"** — the question's
  `unlocked` flag in `questions.json` is `false`. Release it first.
- **"Unregistered GitHub user"** — the submitter's username isn't in
  `hackathon-tests/team_mapping.json` (must be lowercase).
- **"No solution.py found in submission"** — the zip didn't contain a file
  matching the question's `submission_filename`, at any nesting depth.
- **Checkout Private Engine step fails** — `PRIVATE_REPO_TOKEN` is missing,
  expired, or doesn't have access to `hackathon-tests`.
