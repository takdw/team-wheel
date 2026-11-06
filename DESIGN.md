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
    padding: "26px 24px 0"
  count-tag:
    backgroundColor: "{colors.sage}"
    rounded: "{rounded.count}"
    size: "23px"
  mode-tag:
    rounded: "{rounded.tag}"
    padding: "5px 8px"
  avatar:
    textColor: "{colors.ink}"
    rounded: "{rounded.circle}"
    size: "34px"
  brand-home:
    textColor: "{colors.ink}"
    typography: "{typography.brand}"
  wheel-assembly:
    width: "400px"
---

# Design System: Team Wheel

## Overview

**Creative North Star: "The Shared Table"**

Team Wheel borrows the warmth of tabletop game pieces and a paper score sheet. A light paper ground, forest-green controls, and quiet pastel participants make a shared decision feel friendly and understandable. Rounded Manrope lettering gives headings and compact working labels one consistent voice.

The interface stays clear and familiar: real buttons, inline forms, a native disclosure, and a semantic history table. Character comes from the wheel, participant colors, small orange punctuation, and one deliberate motion: decelerating toward an already saved result. There is no photographic or illustrative asset layer; the wheel is live SVG geometry.

**Key Characteristics:**

- Warm paper surfaces with dark green type and controls.
- Pastel participant identity repeated across wheel, roster, and history.
- Compact, aligned working data beside a generous circular wheel.
- Native web controls, visible keyboard focus, and explicit state text.
- Saved-result deceleration with an instant reduced-motion alternative.

This record describes the implemented system in `app/globals.css`, `app/page.tsx`, `lib/wheel.ts`, and `lib/motion.ts`. The review captures show explicitly local demo names and counts; they do not establish a default roster. No approved image comp is a design authority for this build.

## Colors

Warm near-whites support forest green and soft participant colors; color accompanies labels and numbers rather than carrying status alone. Frontmatter holds the canonical values.

### Primary

- **Forest Green** (`green`) anchors the spin action, brand disc, active mode, and text actions; `green-hover` deepens the primary action on hover.
- **Primary Text** keeps the main action legible on forest green.
- **Sage** softly marks active controls and count tags without competing with the wheel.

### Secondary

- **Participant Sage, Apricot, Blue, Mauve, Yellow, Teal, Coral, and Lavender** are the ordered eight-color participant palette. The participant ID determines a stable palette index; colors can repeat. Reuse that same ID color for a person's wheel slice, roster avatar, and historical avatar.
- **Orange** is a small punctuation accent in the wordmark, winner, and history heading.

### Neutral

- **Paper** is the page ground; **Surface** lifts the roster and selected mode through tone.
- **Ink** carries primary text and the pointer; **Muted** carries supporting copy, dates, and secondary data.
- **Line** separates the header, panel, rows, and history. **Mode Track** and **Count Surface** keep grouping and counts understated.

### State colors

- **Danger** on **Error Surface** identifies an actionable message; text explains the issue.
- **Focus** is the amber keyboard outline. **Field Focus** is the add-name group's softer green outline.
- **Disabled Green** and **Disabled Ink** preserve a readable inactive spin button; other disabled buttons use reduced opacity.

### Named Rules

**The Same Person Rule.** Derive participant color from the stable ID everywhere; a rename must not create a new visual identity.

**The Visible Odds Rule.** Slice area and the numeric next odds describe the same probability; color is never a substitute for either.

## Typography

**Display Font:** Manrope Variable, with sans-serif fallback.  
**Body Font:** Manrope Variable, with sans-serif fallback.

The variable font is self-hosted through `@fontsource-variable/manrope`. Rounded letterforms keep the tool approachable; tightly spaced headings and tabular numerals preserve clarity at working density. The hierarchy is observed rather than derived from a fixed scale ratio. Font synthesis is disabled.

### Hierarchy

- **Display:** the frontmatter display role names the page's one main question. It becomes 33px at widths up to 800px, or 34px on desktop viewports no taller than 800px.
- **Headline:** the larger history heading becomes 21px at widths up to 800px.
- **Title:** the compact roster heading uses the title role. Headings use balanced text wrapping.
- **Body:** the page introduction uses the body role; supporting descriptions and most working controls use 12–13px. Expanded odds help uses 12px with 1.8 line height.
- **Label:** compact text actions use the label role. Secondary labels range from 10–12px; the smallest roster metadata becomes 9px on narrow phones. These small metadata sizes describe the current dense rows, not a default for new body copy.
- **Result:** the selected name uses the result role, wraps anywhere when needed, and has horizontal breathing room. The ready message is a smaller 17px at weight 600.
- **Brand:** the wordmark uses the brand role, shrinking to 22px on narrow phones.
- **Data:** pick counts, percentages, and times use tabular numerals. Roster names are 13px at weight 650; history names use weight 600.

### Named Rules

**The One Voice Rule.** Use Manrope for the interface, including SVG wheel labels; hierarchy comes from scale, weight, and spacing.

## Layout

The page is a centered container with an upper working area and full-width history below. Above 1100px, its maximum width is 1440px with 64px side padding. The working area pairs a flexible wheel column with a 340–410px roster, separated by 65px. This composition belongs to the main-screen surface; future screens inherit the spacing and alignment discipline rather than duplicating its two columns.

The stylesheet's later desktop rules are authoritative: at widths of at least 801px, the header is 82px high, main content starts after 32px, the heading-to-workspace gap is 24px, and the wheel is at most 400px wide. The earlier 444px and large-screen 475px wheel declarations are overridden.

| Condition | Actual behavior |
| --- | --- |
| At least 1600px wide | Container maximum becomes 1480px with 75px padding; roster is 440px, column gap 90px. The later desktop wheel cap still applies. |
| At most 1100px wide | Side padding is 35px, roster 350px, column gap 30px, panel side padding 20px. |
| At most 800px wide | Side padding is 25px; header is 77px; wheel, roster, and history stack in source order. The wheel is at most 420px and the roster at most 560px. Header sync text and the team badge are hidden; the footer still carries connection information. |
| At most 440px wide | Side padding is 18px; the wheel fills available width. Spin action is full width up to 290px. Share control and brand compact; panel side padding becomes 18px. Footer stacks. |
| At least 801px wide and at most 800px high | Header becomes 70px, main top space 24px, heading bottom space 22px, wheel cap 330px, result reserve 72px, spin action minimum height 46px. Roster scroll area caps at 270px. |

Working spacing reuses small 4–16px control increments and 20–32px section/panel intervals. One-pixel dividers and aligned columns organize dense data. Roster rows are at least 70px; the scrolling roster normally caps at 429px, rises to 458px on very wide screens, and caps at 400px on stacked layouts. The short-desktop rule overrides these caps.

History remains a real table inside a horizontal scrolling container. Below 441px the table retains a 490px minimum width, allowing dates and actions to scroll into view rather than crushing their columns. Names truncate in the roster and history with full names in title attributes; long winner names wrap. Wheel labels truncate to 18 characters, or 11 above 14 candidates, and omit text for slices of 2.5% or less; the roster retains the corresponding person and odds.

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

The dominant silhouette is a circle: wheel, stationary hub, pointer relationship, brand disc, and initial avatars. SVG wedges are separated by fine pale strokes and an outer ring. The pointer remains centered above the rotating disc; the hub remains stationary.

Supporting controls have modest rounded corners rather than pills: panel, button, field, track, segment, count, and tag radii use the frontmatter roles. A one-pixel line frames the roster and input group. Tiny icon buttons and inline rename fields use the smallest radii. Line icons are Lucide SVGs; identity initials are text, not decorative glyph icons.

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

One quiet roster container keeps the working data together.

The roster uses surface, line, the panel radius, and panel padding from frontmatter; it has no shadow. Its footer uses a subtly tinted `#f8f9f3` strip with matching bottom corners. Three aligned columns show name, picks, and next odds. A stable initial avatar repeats the participant's wheel color. Paused participants remain visible with a grayscale avatar, muted name, explicit Paused label, and an em dash for odds.

### Inputs / Fields

Inline forms keep roster management near the data.

The add-person group has a `#fafbf6` ground, line border, field radius, and compact sage plus action. Its 44px minimum-height text input has an associated screen-reader label, a 60-character limit, and native required validation. The field's inner outline is replaced by the group's 2px field-focus outline at a 2px offset. Successful addition clears and refocuses the field. The submit button requires a nonblank name and is disabled during a pending operation.

Rename uses an autofocus inline input on paper with a line border and the small-field radius, followed by named save and cancel icon buttons. Native form submission saves the trimmed name; cancel exits editing. Manage reveals Rename and Pause/Resume controls within each row.

### Navigation and access

The header's brand link leads home; a native button copies the team URL. There is no separate tab bar or custom route navigation. The compact mobile header retains both actions. The sync label reads Connecting, Saved for your team, or Reconnecting; connection interruption is also stated in the footer.

Access is supplied by the hosting environment rather than a designed in-app account screen: Sites presents its access page, and independent hosting uses the browser's native Basic Authentication challenge. Do not infer a custom sign-in form from this system.

### The wheel and result

Probability becomes a visible piece of the shared table.

The live SVG has a 520-unit viewBox with probability-proportional sectors. Random gives every active person equal area; Balanced weights each active person by `1 / (1 + picks - minimum active picks)`. The stationary pointer identifies the final slice. Accessible SVG text points users to the roster's numeric odds; the winner is announced through an atomic polite live status region.

Only after the selection is saved does the disc turn through at least five full revolutions, landing at the selected sector's midpoint. The animation lasts 4300ms with `cubic-bezier(.12,.72,.12,1)`. While a spin is being saved, status says “Saving your selection…”; during rotation it says “Around it goes…”. Roster saves and undo disable conflicting controls while retaining the idle spin label and current result. The result and saved snapshot reveal together when motion finishes. Reduced-motion preference applies the final rotation and completion synchronously, without creating a rotation animation. CSS also collapses incidental transition/loader animation durations to 0.01ms.

### Loading, empty, error, and history states

- **Loading:** a labeled spinner occupies the roster with `aria-busy`; history says that saved picks will appear. Data-dependent controls remain disabled.
- **Empty:** no default people are supplied. Eight pale placeholder sectors sit behind “Make it your team’s.” with the hub hidden. The roster invites the first name and can focus the add field. With no active candidates, spinning is disabled. An all-paused roster keeps its people visible.
- **History empty:** a quiet tinted container with a circular history icon explains where the first turn will appear. It is a local state, not a modal.
- **Error:** a warm error banner above the workspace uses `role="alert"`, explanatory text, Refresh, and a named dismiss action. A failed spin may retain its pending identity; “Retry this spin” resumes that same selection. Pending state disables roster and mode changes.
- **History:** named columns pair participant, mode, time, and the latest valid pick's Undo action. Undone entries remain visible with a grayscale avatar, a struck name, and explicit “Undone” text. Show older picks appends older entries and displays a loading icon during the request.
- **Odds help:** a native `details`/`summary` disclosure expands the probability explanation in place, with a chevron that reverses when open.

## Do's and Don'ts

### Do:

- **Do** use the frontmatter palette and self-hosted Manrope roles for new controls.
- **Do** preserve participant ID colors across wheel, roster, and history.
- **Do** pair probability slices with numeric odds and explicit mode labels.
- **Do** keep native buttons, form submission, disclosure behavior, semantic tables, and visible keyboard focus.
- **Do** save the result before animating and complete immediately when reduced motion is requested.
- **Do** retain paused and undone entries with explicit text and readable historical context.
- **Do** allow long names to wrap in results and preserve table readability through local horizontal scrolling.

### Don't:

- **Don't** use participant color alone to communicate identity, selection, pause, or undo.
- **Don't** turn the orange punctuation accent into the primary action color.
- **Don't** add shadows to every panel; reserve the observed soft lift for wheel pieces and selected mode.
- **Don't** replace the working SVG wheel with a static image or let an animation choose the outcome.
- **Don't** treat local screenshot names, counts, dates, or colors as production seed data.
- **Don't** infer a custom account screen or a multi-page navigation system from the hosting access flow.
