# UI Audit — Money Memory vs. `Ledger Screen.dc.html`

Every screen in the app compared directly against the design source (`Ledger Screen.dc.html`, fetched fresh from the Claude Design project, the spec of record per `HANDOFF.md`). No fixes applied — this is the punch list only.

Design values quoted below (`var(--line)`, `this.tone('accent')`, etc.) come directly from the design's `renderVals()` method and the shared style strings it defines (`cardBtn`, `iconBtn`, `rowBtn`, `chip()`, `tone()`, `mkTrack()`, etc.) — not from memory or paraphrase.

---

## Summary — systemic root causes

These six patterns each show up on **most or every screen** because they live in one shared component. Fixing the component fixes every screen that uses it.

| # | Pattern | Root cause (file) | Screens affected |
|---|---|---|---|
| 1 | **Switches always render ink/black when ON, never the accent color.** Design: `mkTrack(on) → background: on ? 'var(--accent-ink)' : ...`. | `src/components/AppSwitch.tsx:21` — `outputRange: [theme.switchOffTrack, theme.ink]` should end in `theme.accentColor`. | Settings (3 switches), Budget ("Count lent as spending") |
| 2 | **Icon/back buttons are flat, opaque, and use the wrong ink tone instead of the glass-blur treatment.** Design's `iconBtn`/`backBtn`: `background:var(--surface); backdrop-filter:blur(26px) saturate(1.45); box-shadow:var(--lift); color:var(--ink2)`. | `src/components/IconButton.tsx:20-24` uses `theme.surface2` (flat) + `theme.ink` (full ink), no blur, no lift shadow. | Every screen with a back button or the Home search/settings icons — i.e. nearly all of them |
| 3 | **"See all" / "All accounts →" / privacy-hint links render in grey (`ink3`), not the accent color.** Design's `seeAllBtn` and `privacyHintStyle` are both `color:var(--accent-ink)`. | Inline in `app/(tabs)/index.tsx` — these use plain `<AppText variant="mono">`, which defaults to `ink3`. | Home (3 instances) |
| 4 | **The bottom tab bar is a floating rounded "pill" with margins on all sides; the design is an edge-to-edge bar docked to the bottom with only a top border.** Design's `navStyle`: `padding:9px 10px 26px; border-top:1px solid var(--line)` — no side margins, no full-perimeter border-radius. | `src/components/CustomTabBar.tsx` — `barContainer` is `width:'92%'`, `borderRadius:26` on all corners, `marginBottom:10`. | Every screen with the tab bar (Home, History, Loans, Stats) |
| 5 | **Full-screen overlays (action sheet, entry form) use a flat solid background instead of the shared warm gradient.** Design's `formStyle`/`sheetStyle` both use the same `linear-gradient(...)` as the main shell (the sheet is additionally blurred: `backdrop-filter:blur(34px)`). | `app/entry/[type].tsx:149` (`backgroundColor: theme.bg`) and `app/sheet.tsx:30` (`backgroundColor: theme.solid`) render flat colors, not gradients — and don't use the shared `Screen`/`Backdrop` component at all, so they also have no blobs. | Entry form (used on every single transaction), Action sheet |
| 6 | **Settings-style rows: explanatory subtext dropped, and a divider was added between rows that the design doesn't have.** Covered in detail in the Settings section below — the single clearest example of category 3+4 combined. | `app/settings.tsx` | Settings (worst case); the reverse problem (missing dividers where design wants them) shows up on Transaction Detail |

Two secondary, recurring-but-narrower patterns worth calling out because they appear more than once:

- **Status/tone-colored avatar circles render as flat neutral grey instead of being colored by status.** Design colors the initial-avatar by `toneBg(statusTone)`/`tone(statusTone)` (pos/warn/neg) on the Loans list and Person screen. Implementation uses a flat `theme.surface2` circle in both `app/(tabs)/loans.tsx:109` and `app/person/[name].tsx:45`.
- **Icon "badge" circles are missing where the design colors an icon by semantic tone** (Home quick actions, the action sheet's 6 options) — the implementation shows a bare glyph/icon with no colored background circle at all in both cases.

---

## Home (`app/(tabs)/index.tsx`)

1. **Full-page gradient**: Matches. Screen renders through the shared `Screen`/`Backdrop`, which is genuinely full-height.
2. **Accent wiring**: **Mismatches.** "All accounts →" (line 106), "See all" (line 202), and the privacy hint text (line 111) all render in default grey (`ink3`) instead of `theme.accentColor` — design's `seeAllBtn`/`privacyHintStyle` are both accent-colored. Also, the wallet-card eye icon and quick-action icons render as bare glyphs with **no colored icon badge** at all — design's `quickActions[i].iconStyle` gives each a 34×34 tone-colored circle (neg/pos/warn/neutral per action).
3. **Card grouping**: Matches. Budget card, "You are owed" + "This month" pair, "Recent activity", and the summary link card are each their own card, same as the design's `cardBtn`/`cardBtnSm` structure.
4. **Explanatory subtext**: Matches for what's shown (budget status line, wallet-card subtitles are present and correctly dynamic).
5. **Unintended decoration**: The Quick Actions row (Spent/Received/Lent/Moved) uses a flat `theme.surface2` background (line 121) — design's quick-action buttons use the full glass treatment (`background:var(--surface); backdrop-filter:blur(26px); box-shadow:var(--lift)`), same as every other card button. Not "extra" decoration so much as the *wrong kind* — flat instead of glass.
6. **Chrome details**: Search/settings icon buttons inherit the systemic `IconButton` issue (#2 above). Quick-action icons are missing their colored circle backgrounds (see accent-wiring note above — this is really a "removed" chrome detail, not accent per se).

## Settings / "More" (`app/settings.tsx`)

The screen the user flagged first, and the clearest example of the full pattern set.

1. **Full-page gradient**: Matches (uses shared `Screen`).
2. **Accent wiring**: **Mismatches.** All three switches (Privacy mode, Count lent as spending, Budget alerts) render black/ink when on instead of accent (systemic `AppSwitch` bug, #1 above).
3. **Card grouping**: **Mismatch.** Design puts all ten setting rows — Accent theme, Dark appearance, Privacy mode, What privacy hides, Count lent, Budget alerts, Categories, Accounts, Backup & export, Monthly summary — inside **one single card** (`<div style="border:1px solid var(--line);background:var(--surface)...padding:6px 6px">` wraps the entire `settingRows` loop). The implementation splits these into **two separate `GlassCard`s** (lines 60–77 for the first six, 79–87 for the remaining four), with a visible gap between them.
4. **Explanatory subtext**: **Mismatch — the single biggest finding in this audit.** The design gives every row a dynamic, specific explanatory line:
   - Accent theme → `"{Theme} · colours highlights, charts and the app mark"` — **implementation shows none** (`SettingRow` at line 61 has no `sub`).
   - Privacy mode → `"The eye on Home reveals hidden amounts for 10 seconds"` / `"Amounts are visible on every screen"` — **implementation shows none** (line 70, no `sub` passed).
   - What privacy hides → `"Dashboard cards only · open an account and the balance is visible"` / `"Every amount in the app — cards, transactions, loans"` — **implementation shows none** (line 72).
   - Count lent as spending → `"Loans stay out of your budget until written off"` / `"Loans reduce your budget like an expense"` — **implementation shows none** (line 74).
   - Categories → `"{n} categories · rename or add"` — **implementation shows none** (line 80).
   - Accounts → `"{n} accounts"` — **implementation shows none** (line 82).
   - Backup & export → `"CSV or full backup file, saved by you"` — **implementation shows none** (line 84).
   - Monthly summary → `"September 2026"` — **implementation shows none** (line 86).
   - Dark appearance and Budget alerts do pass a `sub`, but compressed/static versus the design's fuller, state-aware copy (e.g. design's Budget alerts sub is `"At 80% and when you pass the budget"` / `"No notifications"`; implementation is a static `"Fires at 80% and at overspend"` regardless of on/off state).
5. **Unintended decoration**:
   - A 1px divider (`Sep`, line 166-169) was inserted between every row inside the settings card. The design's row loop has **no divider between rows at all** — each row is just its own padded block.
   - "Delete all data" (line 95) is rendered as a **filled** red pill (`backgroundColor: theme.toneBg('neg')`). Design's equivalent (`dangerGhostBtn`) is a **ghost/outlined** button: `border:1px solid var(--line); background:transparent`, text-only red. The filled-pill treatment (`dangerBtn`) is a *different* design token, correctly used elsewhere (see Transaction Detail) — it was applied to the wrong button here.
   - The "Your money data stays yours" info box (line 89, plain `GlassCard`) renders with the full blurred-glass treatment. Design's equivalent is a **flat, non-blurred** card: `background:var(--surface2)` (no `backdrop-filter`).
6. **Chrome details**: Currency input (line 53) has no background fill; design's currency input has `background:var(--surface2)`. Back button inherits the systemic `IconButton` issue.

## Budget (`app/budget.tsx`)

1. **Full-page gradient**: Matches.
2. **Accent wiring**: **Mismatch.** "Count money lent as spending" switch renders ink not accent (systemic #1).
3. **Card grouping**: **Missing content, not a grouping error** — the entire **"Budget history"** card (last 3 months, with per-month progress bars) that exists in the design is absent from the implementation. The three cards that are present (ring, category budgets, lend-toggle) do match the design's grouping for those sections.
4. **Explanatory subtext**: Matches — the lend-toggle sub-text and "Past months keep the budget..." note are both present and close to the design's wording.
5. **Unintended decoration**: None found.
6. **Chrome details**: The −/+ stepper buttons (lines 76, 80) have no background fill; design's `stepBtn` has `background:var(--surface)`. Category-budget rows correctly have no dividers between them, matching the design.

## Transactions / History (`app/(tabs)/history.tsx`)

1. **Full-page gradient**: Matches.
2. **Accent wiring**: No accent-driven elements on this screen in the design either (filter chips are ink-active by design) — matches.
3. **Card grouping**: Matches — one card per day-group, same as design.
4. **Explanatory subtext**: Matches (empty-state copy matches design's wording closely).
5. **Unintended decoration**: None found.
6. **Chrome details**: **Mismatch.** The search bar (line 42) uses a flat `theme.surface2` background; design's search container uses the full glass treatment (`background:var(--surface); backdrop-filter:blur(26px); box-shadow:var(--lift)`). The "Calendar" link (line 38) is plain text; design's is a bordered ghost-pill button (`ghostBtn`).

## Calendar (`app/calendar.tsx`)

1. **Full-page gradient**: Matches.
2. **Accent wiring**: **Mismatch.** The per-day spend-intensity dot (line 68) uses `theme.accentColor`. Design's `dotStyle` colors it `this.tone('neg')` (reddish, matching "money out") when not selected, and `var(--surface)` when the day is selected (for contrast against the dark selected-day circle). It should never be accent-colored.
3. **Card grouping**: Matches (calendar grid card + day-list card, same as design).
4. **Explanatory subtext**: Matches.
5. **Unintended decoration**: None found.
6. **Chrome details**: Selected-day circle correctly uses `theme.ink` (matches design exactly). Back button inherits systemic issue.

## Loans (`app/(tabs)/loans.tsx`)

1. **Full-page gradient**: Matches.
2. **Accent wiring**: N/A directly, but see chrome-detail mismatch below for the active-tab color.
3. **Card grouping**: Matches — summary card and one card per person row both match the design's structure.
4. **Explanatory subtext**: Matches.
5. **Unintended decoration**: None found.
6. **Chrome details**:
   - **No back button at all.** Design's Loans header has `backBtn` + "Loans" title; the implementation (line 34-36) only shows the title.
   - Active Lent/Borrowed tab pill (line 43) uses `theme.ink` (full black/white) as its background. Design's `lentTabStyle`/`borrowedTabStyle` use `background: lentTab ? 'var(--solid)' : 'transparent'` — a lighter "raised chip" color (`--solid`), not full ink. This is inverted from spec.
   - Person-row avatar circles (line 109) are flat `theme.surface2`. Design colors them by status tone (`toneBg(statusTone)`/`tone(statusTone)` — pos/warn/neg), per the secondary systemic pattern noted above.

## Person detail (`app/person/[name].tsx`)

1. **Full-page gradient**: Matches.
2. **Accent wiring**: N/A on this screen in the design either.
3. **Card grouping**: Matches (one summary card, one Timeline card).
4. **Explanatory subtext**: Matches for what's shown.
5. **Unintended decoration**: None found.
6. **Chrome details**:
   - Avatar circle (line 45) is flat `theme.surface2`; should be status-toned like Loans (same secondary systemic pattern).
   - **Missing status badge.** Design shows a colored "Outstanding" / "Partly paid" / "Cleared" pill (`personStatusStyle`) prominently next to the outstanding amount. The implementation only shows a "Paid in full ✓" line when fully cleared — there's no badge for the "Outstanding" / "Partly paid" states at all.
   - CTA button and progress-bar tone both correctly match the design (`primaryBtn`, always-`pos`-toned bar).

## Stats (`app/(tabs)/stats.tsx`)

1. **Full-page gradient**: Matches.
2. **Accent wiring**: **Mismatch (over-applied, not missing).** "How the money left" bars (line 106) and "Money flow" step-dots (line 120) both use `theme.accentColor` uniformly. Design colors "How the money left" bars with a rotating multi-hue chart palette (`hues[i%6]`, one color per payment method) and colors "Money flow" step-dots by **semantic tone** per step (`this.tone(f.tone)` — pos/neutral/neg/warn), not accent. "Spending by day" today-bar correctly uses accent (`day === 6 ? this.tone('accent')` in the design) — that one's a match.
3. **Card grouping**: Matches (four separate cards, same as design).
4. **Explanatory subtext**: Matches (insight sentence wording is close to spec).
5. **Unintended decoration**: None found. Donut-chart category colors correctly use the fixed category-hue palette, not accent.
6. **Chrome details**: **No back button** — same missing-chrome pattern as Loans; design's Stats header has `backBtn` + title, implementation (line 38-40) shows only the title.

## Monthly Report (`app/report.tsx`)

1. **Full-page gradient**: Matches.
2. **Accent wiring**: N/A in the design for this screen.
3. **Card grouping**: Matches (three cards, same as design).
4. **Explanatory subtext**: N/A (no subtext rows on this screen in the design).
5. **Unintended decoration**: None found.
6. **Chrome details**:
   - **Reconciliation rows lose their tone coloring.** Design's `mkRow` colors "Money in" pos, "Money out" neg, "Lent to people" warn, "Repayments received" pos; implementation (line 60-63) renders every non-bold row in plain default ink.
   - **"Largest transactions" rows are simplified.** Design reuses the full `row(t)` treatment (tone-colored icon badge, sub-line, tone-colored amount) for these; implementation (line 73-78) shows only a bare title + amount, no icon, no sub-line, no per-type color.
   - **Missing "Export this month as CSV" button** — present in the design at the bottom of the screen, absent from the implementation entirely (this is a known stub per the original build handoff, but it is a real content gap against the design file).

## Accounts (`app/accounts/index.tsx`)

1. **Full-page gradient**: Matches.
2. **Accent wiring**: N/A in the design for this screen.
3. **Card grouping**: Matches (summary card + one card per account, same as design's `cardBtnRow` pattern).
4. **Explanatory subtext**: **Minor mismatch.** The credit-limit disclaimer ("Credit-card limits are never counted toward your money.") is shown *only* when nothing is currently lent out (line 48, `owed > 0 ? ... : 'Credit-card limits...'`). In the design this line is a fixed, always-present note, shown regardless of the lent-out amount.
5. **Unintended decoration**: None found.
6. **Chrome details**:
   - "+ Add" (line 28) is plain text; design's equivalent is a bordered ghost-pill (`ghostBtn`), same missing-chrome pattern as History's "Calendar" link.
   - Credit-card tag text ("credit left · not your money") renders in plain grey (`ink3`); design colors this `this.tone('warn')` for credit accounts specifically. Non-credit "available" tags correctly stay grey in both.
   - Account icon avatars correctly use flat neutral `surface2` in both — no mismatch here (unlike Loans/Person, the design also wants these neutral).

## Account detail (`app/accounts/[id].tsx`)

1. **Full-page gradient**: Matches.
2. **Accent wiring**: N/A.
3. **Card grouping**: Matches (summary card + history card, same as design).
4. **Explanatory subtext**: Matches.
5. **Unintended decoration**: None found.
6. **Chrome details**: In/Out stat colors correctly pos/neg-toned, matching design. Back button inherits systemic issue. No other mismatches found.

## Add Account (`app/accounts/add.tsx`)

1. **Full-page gradient**: Matches.
2. **Accent wiring**: N/A.
3. **Card grouping**: **Mismatch.** Design wraps the entire form — Name field, Type chips, "Money in it now" field, the privacy disclaimer, and the Save button — inside **one single card** (`padding:18px` on one `<div style="border:1px solid var(--line);background:var(--surface)...">`). The implementation renders Name/Type/Amount as bare, uncarded fields directly on the page background (lines 53-89), puts the disclaimer in its *own* separate small `GlassCard` (line 91), and puts Save as a standalone button outside any card (line 99) — one continuous design card split into three disconnected pieces.
4. **Explanatory subtext**: **Mismatch.** The design's disclaimer is one fixed sentence regardless of account type: *"We never ask for bank logins, card numbers or OTPs. You type what you know; the numbers stay on this phone."* The implementation substitutes different, type-conditional copy ("Credit limits are never counted as your money..." / "This starting balance only affects totals from today forward.") — not a compression of the design's copy, but different copy entirely.
5. **Unintended decoration**: The disclaimer getting its own `GlassCard` counts as decoration the design doesn't specify for that text (in the design it's a plain, uncarded line sitting inside the same card as the fields).
6. **Chrome details**: Input fields correctly have no background fill (matches design's `fieldInput: background:transparent`).

## Transaction Detail (`app/transaction/[id].tsx`)

1. **Full-page gradient**: Matches.
2. **Accent wiring**: N/A.
3. **Card grouping**: Matches (one card for the detail, buttons below it, same as design).
4. **Explanatory subtext**: **Mismatch.** Design's footer line is a contextual "echo" sentence specific to the record (e.g. *"Counted in September spending and in your Food category."*, or *"{Person}'s outstanding balance includes this amount."* for a loan). The implementation (line 88) shows the short `transactionSub` line instead (the same account/note text used in list rows) — a different, less informative line than the design specifies.
5. **Unintended decoration**: None found. The filled red Delete button (line 99, `toneBg('neg')`) is actually **correct** here — this matches the design's `dangerBtn` token exactly (the *filled* variant is right for this screen; see the note under Settings, where the same treatment was wrongly applied to a button that should have been the outlined variant instead).
6. **Chrome details**:
   - **Missing icon.** Design shows a 52×52 tone-colored icon badge (`detailIconStyle`) above the title; the implementation has no icon at all.
   - **Missing row dividers.** Design's detail rows (Type/Category/Person/etc.) each have `border-bottom:1px solid var(--line)` between them; the implementation (lines 77-85) renders them as a plain `gap:12` list with no dividers at all — the opposite problem from Settings, where dividers were added but shouldn't have been.

## Onboarding (`src/screens/onboarding/OnboardingFlow.tsx`)

1. **Full-page gradient**: **Partial mismatch.** The gradient itself is present (line 80), but the three background blobs are missing — the design's blobs render on every screen including onboarding (they're outside the screen-switch in the shell markup), and onboarding here uses a bare `LinearGradient` directly rather than the shared `Screen`/`Backdrop` component that draws the blobs.
2. **Accent wiring**: **Mixed.** The account-type checkboxes correctly fill with accent when checked (line 127, matches design's `checkStyle`). But the slide-progress dots (line 159) use accent for the active dot — design's `onbDots` uses **ink** (`var(--ink)`) for the active dot, not accent. The splash-screen logo mark (line 61) is a plain `theme.ink`-filled square — design's `markStyle` is accent-colored (`this.tone('accent')`).
3. **Card grouping**: Matches (each account-type row is its own bordered block, same as design).
4. **Explanatory subtext**: Matches (slide body copy is present and close to spec).
5. **Unintended decoration**: None found.
6. **Chrome details**: "Skip" (line 84) is plain text; design's is a bordered ghost-pill button, same missing-chrome pattern as elsewhere.

## Entry form (`app/entry/[type].tsx`)

The other screen shown on essentially every use of the app (every transaction goes through this).

1. **Full-page gradient**: **Mismatch — flat solid color, not a gradient.** Line 149: `backgroundColor: theme.bg`. Design's `formStyle` uses the same warm `linear-gradient(...)` as the main shell. This screen also doesn't use the shared `Screen` component at all, so it has no blobs either.
2. **Accent wiring**: N/A directly — chips are correctly ink-active per design.
3. **Card grouping**: Matches — the design's form also has no card wrapping around the fields, just labeled sections, same as the implementation.
4. **Explanatory subtext**: Matches (field hints and the note-label's "— optional, helps you remember" suffix are both present).
5. **Unintended decoration**: None found.
6. **Chrome details**:
   - "Close" (line 154) is plain text; design uses a glass `backBtn`-style icon button with a "✕" glyph, not a text link.
   - **Keypad keys have no button/card styling at all.** `src/components/Keypad.tsx` renders bare text in a grid (line 34-38, no border, no background, no shadow). Design's `keys` style gives each of the 12 keys its own glass-card treatment: `border:1px solid var(--line); background:var(--surface); backdrop-filter:blur(26px); box-shadow:var(--lift)`. This is highly visible since the keypad is on screen for every single transaction entered.
   - Save button doesn't visually grey out when no amount is entered — design's `saveBtnStyle` swaps to `background:var(--line-strong)` / `color:var(--ink3)` when the amount is empty; implementation always shows the active `theme.ink` fill.

## Action sheet (`app/sheet.tsx`)

1. **Full-page gradient**: N/A (this is a bottom sheet, not a full page) — but see chrome details below for its panel background.
2. **Accent wiring**: N/A.
3. **Card grouping**: N/A (single list of options, matches design's structure).
4. **Explanatory subtext**: **Mismatch — missing entirely.** Design gives each of the 6 options a sub-line (e.g. *"Still yours — just not with you"* for Lent, *"Food, bills, shopping — anything out"* for Spent). The implementation (line 43-53) shows only the label, no sub-text at all.
5. **Unintended decoration**: Option rows (line 47) have an added flat `theme.surface2` background fill. Design's sheet options are `background:transparent` — just a border, no fill.
6. **Chrome details**:
   - **Sheet panel background mismatch.** Line 30: flat `theme.solid`. Design's `sheetStyle` is a translucent, blurred gradient panel (`backdrop-filter:blur(34px) saturate(1.4)`), matching the glass treatment used everywhere else — this sheet is the one surface in the app that's fully opaque instead of glassy.
   - **Icon badges aren't tone-colored.** Every option (line 49) gets the same flat `theme.solid` circle with a plain-ink icon. Design colors each icon circle by the option's semantic tone (`toneBg(o.tone)`/`tone(o.tone)` — neg for Spent, pos for Received/Someone paid me back, warn for Lent/Borrowed, neutral for Moved), matching the Home quick-actions treatment.

---

## Screens not separately audited

`app/(tabs)/_layout.tsx` (tab bar wiring) is covered under the `CustomTabBar` systemic finding above. No screen was skipped — all 16 screens/overlays enumerated in the design's `screen` prop plus both overlay layers (action sheet, entry form) are covered above.
