---
name: Team Wheel
description: A warm, clear shared wheel with transparent chances and a remembered turn for everyone.
colors:
  paper: "#f8f7f2"
  surface: "#fffefa"
  ink: "#253d33"
  muted: "#667369"
  line: "#dfe3d9"
  green: "#2d5641"
  green-hover: "#214532"
  sage: "#e9eee3"
  orange: "#cd673d"
  danger: "#913d2d"
  primary-text: "#faffed"
  focus: "#bb7536"
  field-focus: "#698366"
  mode-track: "#eaece3"
  count-surface: "#f0f2ea"
  error-surface: "#f9e9df"
  disabled-green: "#bac6b6"
  disabled-ink: "#354b37"
  participant-sage: "#b9cec2"
  participant-apricot: "#eac08c"
  participant-blue: "#b7c9e4"
  participant-mauve: "#d9bad2"
  participant-yellow: "#e2d68f"
  participant-teal: "#a8d2cf"
  participant-coral: "#e8b8aa"
  participant-lavender: "#c5c2de"
typography:
  display:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "40px"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "23px"
    fontWeight: 650
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "19px"
    fontWeight: 650
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 650
  result:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "29px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  brand:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "25px"
    fontWeight: 750
    letterSpacing: "-0.035em"
rounded:
  field-small: "4px"
  tag: "5px"
  count: "6px"
  segment: "7px"
  field: "8px"
  button: "9px"
  track: "10px"
  panel: "14px"
  circle: "50%"
spacing:
  "4": "4px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "30": "30px"
  "32": "32px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.button}"
    padding: "10px 15px"
    height: "51px"
  button-primary-hover:
    backgroundColor: "{colors.green-hover}"
  button-primary-disabled:
    backgroundColor: "{colors.disabled-green}"
    textColor: "{colors.disabled-ink}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "10px 15px"
    height: "42px"
  button-secondary-hover:
    backgroundColor: "{colors.sage}"
  button-text:
    textColor: "{colors.green}"
    typography: "{typography.label}"
    padding: "6px 0"
    height: "30px"
  button-icon:
    rounded: "{rounded.tag}"
    padding: "4px"
    width: "30px"
    height: "30px"
  mode-segment:
    rounded: "{rounded.segment}"
    padding: "8px 16px"
    height: "38px"
  mode-segment-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.green}"
  input-add-person:
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px"
    height: "44px"
  team-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "20px 24px 0"
  count-tag:
    backgroundColor: "{colors.sage}"
    rounded: "{rounded.count}"
    size: "23px"
  mode-tag:
    rounded: "{rounded.tag}"
    padding: "5px 8px"
  avatar:
    rounded: "{rounded.circle}"
    size: "34px"
  profile-preview:
    rounded: "{rounded.circle}"
    size: "56px"
  person-editor:
    padding: "14px 0 0"
  brand-home:
    textColor: "{colors.ink}"
    typography: "{typography.brand}"
  wheel-assembly:
    width: "min(available width - 28px, clamp(280px, 100svh - 440px, 560px))"
---

# Design System: Team Wheel

## Overview

**Creative North Star: "The Shared Table"**

Team Wheel borrows the warmth of tabletop game pieces and a paper score sheet. A light paper ground, forest-green controls, and distinct participant colors make a shared decision feel friendly and understandable. Rounded Manrope lettering gives headings and compact working labels one consistent voice.

The interface stays clear and familiar: real buttons, inline forms, a native odds popover, and a chronological history list. Character comes from the wheel, participant colors, small orange punctuation, and one deliberate motion: decelerating toward an already saved result. Optional participant photos sit within circular identity marks; the wheel remains live SVG geometry.

**Key Characteristics:**

- Warm paper surfaces with dark green type and controls.
- Participant colors and optional photos repeated across wheel, roster, winner, and history.
- A centered circular wheel with team management in a left slide-over.
- Native web controls, visible keyboard focus, and explicit state text.
- Saved-result deceleration with an instant reduced-motion alternative.

This record describes the implemented system in `app/globals.css`, `app/page.tsx`, `app/components/person-editor.tsx`, `app/components/avatar.tsx`, `app/components/modal.tsx`, `lib/wheel.ts`, and `lib/motion.ts`. The review captures show explicitly local demo names and counts; they do not establish a default roster. No approved image comp is a design authority for this build.

## Colors

Warm near-whites support forest green and soft participant colors; color accompanies labels and numbers rather than carrying status alone. Frontmatter holds the canonical values.

### Primary

- **Forest Green** (`green`) anchors the spin action, brand disc, active mode, and text actions; `green-hover` deepens the primary action on hover.
- **Primary Text** keeps the main action legible on forest green.
- **Sage** softly marks active controls and count tags without competing with the wheel.

### Secondary

- **Participant colors** start with teal, amber, blue, rose, leaf, plum, sky, and terracotta from the editor presets. Larger teams draw from additional shades. Each teammate has a distinct saved default and a manual choice takes precedence. The pale participant tokens support the empty wheel and legacy fallbacks. The wheel and avatars use the current profile color, while saved spins retain their candidate colors.
- **Adaptive identity text** uses Ink when its contrast reaches 4.5:1, then Surface, then black or white according to luminance. Apply the same helper to initials and SVG wheel labels when participant colors change.
- **Orange** is a small punctuation accent in the wordmark and winner.

### Neutral

- **Paper** is the page ground; **Surface** lifts the roster and selected mode through tone.
- **Ink** carries primary text and the pointer; **Muted** carries supporting copy, dates, and secondary data.
- **Line** separates the header, panel, rows, and history. **Mode Track** and **Count Surface** keep grouping and counts understated.

### State colors

- **Danger** on **Error Surface** identifies an actionable message; text explains the issue.
- **Focus** is the amber keyboard outline. **Field Focus** is the add-name group's softer green outline.
- **Disabled Green** and **Disabled Ink** preserve a readable inactive spin button; other disabled buttons use reduced opacity.

### Named Rules

**The Same Person Rule.** Use the manual color or the teammate’s saved default. Preserve that identity through renames and keep saved spin colors when replaying a result.

**The Visible Odds Rule.** Slice area and the numeric next odds describe the same probability; color is never a substitute for either.

## Typography

**Display Font:** Manrope Variable, with sans-serif fallback.  
**Body Font:** Manrope Variable, with sans-serif fallback.

The variable font is self-hosted through `@fontsource-variable/manrope`. Rounded letterforms keep the tool approachable; tightly spaced headings and tabular numerals preserve clarity at working density. The hierarchy is observed rather than derived from a fixed scale ratio. Font synthesis is disabled.

### Hierarchy

- **Display:** the frontmatter display role names the page's one main question. It becomes 33px at widths up to 800px, or 34px on desktop viewports no taller than 800px.
- **Headline:** the larger history heading becomes 21px at widths up to 800px.
- **Title:** the compact roster heading uses the title role. Headings use balanced text wrapping.
- **Body:** supporting descriptions and most working controls use 12–13px. The odds popover uses 13px with 1.6 line height.
- **Label:** compact text actions use the label role. Secondary labels range from 10–12px; the smallest roster metadata becomes 9px on narrow phones. These small metadata sizes describe the current dense rows, not a default for new body copy.
- **Result:** the selected name uses the result role, wraps anywhere when needed, and has horizontal breathing room. The ready message is a smaller 17px at weight 600.
- **Brand:** the wordmark uses the brand role, shrinking to 22px on narrow phones.
- **Data:** pick counts, percentages, and times use tabular numerals. Roster names are 13px at weight 650; history names use weight 600.

### Named Rules

**The One Voice Rule.** Use Manrope for the interface, including SVG wheel labels; hierarchy comes from scale, weight, and spacing.

## Layout

The page centers the wheel, mode controls, result, and spin action in one column. Team opens a left drawer and History opens a right drawer from the header. Each dialog fills the dynamic viewport height, is at most 440px wide, and leaves a 20px backdrop strip on phones. The drawers scroll independently with sticky headings. Their flat surfaces use 24px side padding, reduced to 20px on phones.

The wheel uses `min(available width - 28px, clamp(280px, 100svh - 440px, 560px))`. Short desktops use a 420px cap and `100svh - 400px` to keep the spin control and odds help in view. Main content starts after 24px, with an 18px heading-to-workspace gap. The rotating square is clipped with 24px of overflow allowance for its shadow and right-hand pointer, preventing horizontal page overflow at angled finishes.

| Condition | Actual behavior |
| --- | --- |
| At least 1600px wide | Container maximum 1480px with 75px side padding. |
| At least 1101px wide | Container maximum 1440px with 64px side padding; header 82px high. |
| At most 1100px wide | Side padding 35px. |
| At most 800px wide | Side padding 25px; header 77px. Header sync text is hidden, copy action becomes icon-only, and both drawer triggers stay visible. |
| At most 440px wide | Side padding 18px; wheel fits available width; spin action up to 290px. |
| At most 480px wide | Drawer triggers use text labels, the Team count hides, and the brand compacts. Below 351px the wordmark stands alone. |
| At least 801px wide and at most 800px high | Header 70px, result reserve 72px, spin action minimum height 46px. |

Working spacing reuses small 4–16px control increments and 20–32px section intervals. One-pixel dividers and aligned columns organize dense roster data. Roster rows are at least 70px. The drawer owns scrolling while open; the page is locked behind it.

The history list stacks mode and time below each name, with Undo alongside the latest valid pick. Metadata wraps at narrow widths. Names truncate in roster/history with full names in title attributes; long winner names wrap. Wheel labels truncate to 18 characters, or 11 above 14 candidates; photo-bearing labels use 14. Text is omitted for slices of 2.5% or less, and photos below 5%; Team retains the person and numeric odds. Profile controls and deletion confirmation wrap within the drawer.

## Elevation & Depth

Depth is primarily tonal: paper beneath an off-white roster, fine borders, and quiet count backgrounds. Ordinary cards and actions have no shadow. Soft shadows are restricted to the physical wheel assembly and selected mode; they establish the wheel's pieces and the selected control.

### Shadow Vocabulary

- **Selected segment:** `0 2px 5px #293d2510`.
- **Wheel disc:** SVG `drop-shadow(0 7px 10px #2a402015)`.
- **Pointer:** SVG `drop-shadow(0 2px 2px #162c201f)`.
- **Wheel hub:** `0 3px 12px #253d3320`.

### Named Rules

**The Tabletop Depth Rule.** Reserve soft lift for the wheel pieces and selected mode; organize ordinary working surfaces with tone and borders.

## Shapes

The dominant silhouette is a circle: wheel, stationary hub, pointer relationship, brand disc, and participant avatars. SVG wedges are separated by fine pale strokes and an outer ring. The pointer remains fixed at 3 o’clock, pointing left into the rotating disc; the plain 44px hub remains stationary.

Supporting controls have modest rounded corners rather than pills: panel, button, field, track, segment, count, and tag radii use the frontmatter roles. A one-pixel line frames the roster and input group. Tiny icon buttons use the smallest radii. Line icons are Lucide SVGs; identity initials are text, not decorative glyph icons.

## Components

### Buttons

Clear actions with modest corners and a strong primary contrast.

- **Primary:** forest green with pale text, a leading shuffle/loading icon, and a trailing arrow. Minimum width is 253px; height, padding, and radius follow the primary token. Hover deepens the fill over 160ms. The short-desktop and phone layout adaptations are defined above.
- **Secondary:** off-white fill, fine line border, and sage hover; used for copying the team link. Successful copy replaces its icon and label with a check and “Link copied” for 2.5 seconds.
- **Text:** transparent green actions for Manage, Done, Undo, and Refresh; hover underlines at a 3px offset. Icon actions use a quiet sage hover and accessible names.
- **Focus:** buttons, links, ordinary inputs, and disclosure summaries receive a 3px amber outline offset by 4px. Disabled buttons have a not-allowed cursor; ordinary buttons fade to 0.48 opacity, while the spin action uses the dedicated disabled palette at full opacity.

### Selection mode

A familiar two-button segmented group with visible selected state.

The track uses the mode-track color, a 10px radius, and 4px inset padding. Each segment has a 7px radius, 13px type at weight 600, and an icon with a label. Selected segments use surface, green text, and the selected-segment shadow. Unselected hover uses `#dce2d3`. `aria-pressed` conveys selection; a sentence below explains the current mode. Mode changes reset the displayed outcome. Mode controls are disabled while a selection is pending or in progress.

### Chips and counts

Small data markers keep the roster and history scannable.

The active-person count is a sage square with a minimum 23px size. Pick counts use a light count surface and tabular numerals. History mode tags have a 5px radius, 5px by 8px padding, 10px text, and an icon plus label. Random uses `#ebece5` with `#51604f`; Balanced uses `#e5ebe0` with `#405d3e`. These are descriptive tags, not toggles.

### Cards / Containers

A left slide-over keeps team management available without competing with the wheel.

The drawer roster uses a flat surface without an outer border, radius, or shadow. Its footer uses a subtly tinted `#f8f9f3` strip spanning the drawer width. Three aligned columns show name, picks, and next odds. A circular photo or initials avatar repeats the participant's selected color. Paused participants remain visible with a grayscale avatar, muted name, explicit Paused label, and an em dash for odds.

### Inputs / Fields

Inline forms keep roster management near the data.

The add-person group has a `#fafbf6` ground, line border, field radius, and compact sage plus action. Its 44px minimum-height text input has an associated screen-reader label, a 60-character limit, and native required validation. The field's inner outline is replaced by the group's 2px field-focus outline at a 2px offset. Successful addition clears and refocuses the field. The submit button requires a nonblank name and is disabled during a pending operation.

Manage reveals Edit, Pause/Resume, and Delete controls within each row. Controls wrap when the name column is narrow. Edit opens a full-width inline form below that person: an autofocus name field, eight preset color swatches, a native custom color picker, default-color reset, photo preview and upload/remove actions, then Save changes and Cancel. The paper name field has a line border, 7px corners, and 40px minimum height. Swatches are 29px circles (27px on phones); the selected swatch has a green outline and `aria-pressed`. Preparing a photo or saving disables the form; upload errors appear in a local alert. Native submission saves the trimmed name and profile changes; cancel discards them.

### Participant avatars

Optional photos extend the existing circular identity marks.

Deletion stays inline with the affected member. Delete opens a warm danger-tinted confirmation stating that past picks and statistics are kept, with Cancel deletion focused first and a distinct Delete member action. Successful deletion removes the member from the roster and future spins. A compact, sage Undo deletion notice appears inside the team panel, near the action on phones. Undo restores the same profile, count, and paused/active state. The notice clears when dismissed or another change is saved; historical totals and most-picked statistics continue to include deleted members.

Roster avatars are 34px, history 28px, winner 40px, and editor previews 56px. Photos fill the clipped circle with a centered crop; missing or failed avatar images fall back to the first letters of up to two names, with adaptive text contrast. Uploads accept JPG, PNG, or WebP up to 10 MB and are center-cropped to 128×128 before saving. Removing a photo restores initials. Wheel portraits use a pale circular rim where slices have room. Winner and history avatars show the current profile; historical names and saved spin colors remain recorded.

### Navigation and access

The header’s brand link leads home; Team opens the left drawer and a native button copies the team URL. The drawer closes via Escape, its Close team control, or the backdrop. Native modal behavior keeps keyboard interaction in the drawer; closing restores focus to the opener, falling back to the header Team button if the empty-wheel opener was removed. Opening animates left-to-right over 260ms with a 200ms scrim fade; reduced motion removes the slide. There is no separate tab bar or custom route navigation. The compact mobile header retains both actions. The sync label reads Connecting, Saved for your team, or Reconnecting; a footer appears only for connection interruption. Copy stays functional and concise, without decorative slogans.

Access is supplied by the hosting environment rather than a designed in-app account screen: Sites presents its access page, and independent hosting uses the browser's native Basic Authentication challenge. Do not infer a custom sign-in form from this system.

### The wheel and result

Probability becomes a visible piece of the shared table.

The live SVG has a 520-unit viewBox with probability-proportional sectors. Random gives every active person equal area; Balanced weights each active person by `1 / (1 + picks - minimum active picks)`. The stationary pointer identifies the final slice. Accessible SVG text points users to the roster's numeric odds; the winner is announced through an atomic polite live status region.

Only after the selection is saved does the disc turn through five to seven full revolutions, landing at a separately randomized point inside the selected slice. A tiny divider margin prevents an ambiguous exact-edge finish. The saved angle makes retries land in the same place; old picks retain their original midpoint. Independent cryptographic fractions vary the turns and duration from 5200–6800ms, with `cubic-bezier(.12,.72,.12,1)`. Selection probabilities are unchanged. While a spin is being saved, status says “Saving your selection…”; during rotation it says “Spinning…”. Roster saves and undo disable conflicting controls while retaining the idle spin label and current result. The result and saved snapshot reveal together when motion finishes. Reduced-motion preference applies the final rotation and completion synchronously, without creating a rotation animation. CSS also collapses incidental transition/loader animation durations to 0.01ms.

After the wheel lands, a centered native modal presents the winner’s avatar and name. A brief burst of confetti uses the participant palette and is hidden in reduced motion. Spin again keeps the roster. Sit out & spin again pauses the winner before drawing again, with Sit out alone when nobody else is active. Closing the modal returns focus to the wheel or Team, and the wheel shows the result inline.

### Loading, empty, error, and history states

- **Loading:** a labeled spinner occupies the roster with `aria-busy`; history reports that it is loading. Data-dependent controls remain disabled.
- **Empty:** no default people are supplied. Eight pale placeholder sectors sit behind “Add teammates” and “Enter a name to start.” with the hub hidden. The action opens the drawer. The roster invites the first name and can focus the add field. With no active candidates, spinning is disabled. An all-paused wheel offers Open team to resume someone.
- **History empty:** a quiet tinted container inside the History drawer prompts a spin to add the first pick.
- **Error:** a warm error banner above the workspace, or inside the drawer while open, uses `role="alert"`, explanatory text, Refresh, and a named dismiss action. A failed spin may retain its pending identity; “Retry this spin” resumes that same selection. Pending state disables roster and mode changes.
- **History:** the History drawer lists picks newest first with the participant, mode, time, and the latest valid pick’s Undo action. Undone entries remain visible with a grayscale avatar, a struck name, and explicit “Undone” text. Show older picks appends older entries and displays a loading icon during the request.
- **Odds help:** a button below Spin opens an anchored native popover. Escape or an outside click dismisses it.

## Do's and Don'ts

### Do:

- **Do** use the frontmatter palette and self-hosted Manrope roles for new controls.
- **Do** share selected participant colors across the wheel and avatars, retaining saved defaults and spin colors.
- **Do** pair probability slices with numeric odds and explicit mode labels.
- **Do** keep native buttons, form submission, list semantics, and visible keyboard focus.
- **Do** save the result before animating and complete immediately when reduced motion is requested.
- **Do** retain paused and undone entries with explicit text and readable historical context.
- **Do** allow long names to wrap in results and let history metadata wrap in the drawer.

### Don't:

- **Don't** use participant color alone to communicate identity, selection, pause, or undo.
- **Don't** turn the orange punctuation accent into the primary action color.
- **Don't** add shadows to every panel; reserve the observed soft lift for wheel pieces and selected mode.
- **Don't** replace the working SVG wheel with a static image or let an animation choose the outcome.
- **Don't** treat local screenshot names, counts, dates, or colors as production seed data.
- **Don't** infer a custom account screen or a multi-page navigation system from the hosting access flow.
