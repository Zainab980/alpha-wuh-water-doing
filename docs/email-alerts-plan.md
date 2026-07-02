# Email alerts — technical plan (Wuh Water Doing?)

## 1. The goal

Add an **optional** feature to the existing app: a person can ask to get an
email whenever the Barbados Water Authority (BWA) posts a notice for their area.
No login, no signup wall — the app keeps working exactly as it does now, with
email alerts as an extra.

## 2. How a person uses it (inside the app, no signup)

The app stays the same. We add a small **"Get email alerts" card** that appears
under the notices:

1. They use the app normally (pick an area, see the map and notices).
2. They see a card: _"Get an email when water is affected in St. Michael."_
3. They click it → it **expands into a small form right there**: an email box,
   an area dropdown (already set to their choice, changeable to **"All of
   Barbados"** or **one parish**), and a **"Send me alerts"** button.
4. They submit → message: _"Almost done — check your email and click the link to
   confirm."_
5. They click the confirm link in their inbox → done. Alerts now arrive
   automatically.
6. Every alert email has a **one-click unsubscribe** link.

So the card has three simple states: **button → small form → "check your email."**

## 3. The big picture (end to end)

```
 In the app: click "Get alerts" ─▶ enter email + area ─▶ we send a "confirm" email
                                                              │
                                              person clicks confirm link
                                                              ▼
                                                 saved as a confirmed subscriber
                                                              │
   Every ~20 min a timer wakes up ─▶ reads BWA notices ─▶ finds NEW ones
                                                              │
                            for each new notice: who signed up for that area?
                                                              │
                                            email them (once) ─▶ inbox
```

## 4. The building blocks (what we add)

Today the app only _reads and shows_ notices. To send emails we add four things:

1. **A database** — an organised store that remembers who signed up and what
   we've already sent.
2. **An email sender** — a service that delivers emails properly (handles spam
   rules, bounces).
3. **A timer (scheduler)** — a small job that runs automatically every so often
   to check for new notices. (Our hosting already provides this.)
4. **A few behind-the-scenes web addresses (endpoints)** — "sign me up",
   "confirm", and "unsubscribe".


**"Already emailed" list:** a record of each `notice + subscriber` we've sent,
so the **same notice is never emailed to the same person twice** — even if the
timer runs twice or retries after an error.

## 5. The heart of it: the automatic checker

Every ~20 minutes the timer runs this:

1. **Read** the BWA notices (reusing what the app already does).
2. **Keep only what's worth sending** — current or upcoming, using the date
   logic we already built, so it never emails about work that's already over.
3. **Find new ones** — skip notices we've already handled.
4. **Match** each new notice to the **confirmed subscribers for that area** (plus
   anyone on "All of Barbados").
5. **Send** each person one email.
6. If BWA can't be reached, **do nothing and try again next time** — never guess,
   never send wrong info.

## 6. Build order (each step has a "done when")

- **Step 1 — "Get alerts" card + form + save.** _Done when:_ clicking the card
  shows the form, and a test sign-up saves as `pending`.
- **Step 2 — Confirm email (double opt-in).** _Done when:_ clicking the confirm
  link flips the person to `confirmed`.
- **Step 3 — Unsubscribe + privacy note.** _Done when:_ the unsubscribe link
  removes them and stops their emails.
- **Step 4 — The checker + sending (the core).** _Done when:_ a new St. Michael
  notice emails only confirmed St. Michael (and "All of Barbados") subscribers,
  exactly once.
- **Step 5 — Reliability + scale polish.** _Done when:_ batched sending works,
  failed sends retry, and a basic alert fires if something breaks.
- **Step 0 (recommended) — a private admin page** so a person can post a notice
  the moment it appears on WhatsApp/Instagram (BWA often posts there first). This
  keeps alerts complete and same-day without needing WhatsApp access.