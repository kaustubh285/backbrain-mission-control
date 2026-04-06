Project: Backbrain Mission Control

Goal:
Refine the existing React UI into a space-themed, mission-control style dashboard that is data-dense, calm, and ADHD-friendly. Do not change the overall component structure (TelemetryStrip, MissionList, MissionDetail, Timeline, useAppState), but improve layout, styling, and microcopy. Keep everything responsive but prioritize desktop (13–16" laptop).

Overall visual style:
- Dark, low-contrast space theme with subtle glows and thin lines, not neon cyberpunk.
- Think “NASA mission control dashboard” rather than “sci-fi game HUD”.
- Background: deep gray (#05060a to #0b0f18 range), with a very subtle radial gradient from the top center to mimic a console glow.
- Primary accent color: a muted cyan/teal (#4fd1c5 / #38bdf8 style) used for active states, branch names, and key focus elements.
- Secondary accents: desaturated amber (#fbbf24) for warnings/waiting, soft green (#22c55e) for success/active missions, muted red (#f97373) for errors/bugs.
- Typography: use a single clean sans-serif (e.g., system font stack or Inter). Slightly condensed, small sizes (12–14px) to keep it data-dense. No serif, no fancy fonts.
- Borders: 1px, low-contrast strokes (rgba(255, 255, 255, 0.06–0.12)). Rounded corners 6–10px, but keep mission cards and panels mostly rectangular.

Layout:
- Keep the current structure:
  - Top: TelemetryStrip across the full width.
  - Left: MissionList, fixed width ~260–280px, full height.
  - Right: MissionDetail fills remaining space, with a narrow context panel on the left and Timeline on the right.
- Use CSS grid or flexbox to ensure the layout stretches from edge to edge, with minimal padding around the frame and consistent 12–16px inner padding.

TelemetryStrip:
- Purpose: show currently active Claude sessions as “active modules” in a ship’s status bar.
- Background: slightly lighter than the main background with a subtle bottom border glow.
- Each session pill:
  - Rounded pill with a faint border.
  - Left: small animated dot indicating status:
    - Blue pulsing: “thinking” / generating.
    - Yellow pulsing: running tool.
    - Orange pulsing: waiting for permission.
    - Dim gray: idle.
  - Right of the dot: `Session 13af2c` (or first 6–8 chars of ID) + small label for status (“Thinking”, “Running tests”, “Awaiting permission”).
  - If last event is a tool use, show the tool name in a muted color.
- When no sessions: show a centered, low-contrast line like “No active Claude sessions — start one in your terminal” with a small satellite/rocket icon.

MissionList:
- Left sidebar as a scrollable list of missions.
- Each mission row is a “mission patch” card:
  - Left: small vertical accent bar whose color reflects mission status:
    - Green: EXECUTING (has active session).
    - Yellow: COOLING DOWN (recent activity, no active sessions).
    - Dim: IDLE.
  - Primary text: mission title.
    - If Backbrain has `tasks`/`ideas`, use the first such note’s first line as the title.
    - Otherwise, fall back to the git branch name.
  - Secondary line: repo folder name in muted text.
  - Badges on the right:
    - “BUGS” (red) if bug notes exist.
    - “TASKS” (cyan) if pending tasks exist.
    - “NOTES” (dim blue) if generic notes exist.
- Selected mission:
  - Slightly brighter background.
  - Left accent bar thicker or brighter.
- Empty state:
  - A calm message like “No missions yet. Start a Claude Code session in a project with Backbrain initialized.”
  - Include a small monochrome emoji/icon (🛰) inline with the text.

MissionDetail:
- Header:
  - Large mission title (truncated gracefully).
  - Under it, small line with repo path and branch name (branch in accent color).
  - Status badge aligned right: small solid or outlined pill with:
    - ● EXECUTING (green dot).
    - ◌ COOLING DOWN (yellow).
    - ○ IDLE (gray).
- Body split into two columns:
  - Left context panel (~260px):
    - Three sections: TASKS, BUGS, NOTES.
    - Each section header is small, uppercase, letter-spaced label with a thin underline.
    - List items are small cards or simple text rows with subtle hover states.
    - Make tasks and bugs visually distinct (icons or subtle color strip).
  - Right main panel:
    - The Timeline component occupies the rest. Ensure it scrolls independently of the mission list.

Timeline:
- Vertical list, newest-first.
- Each event row:
  - Left: time (HH:mm:ss) in a fixed-width, subtle monospace or monospaced styling.
  - Center: event type label:
    - Claude events: small capsule with colors:
      - SessionStart (green), SessionEnd (dim), tool events (yellow), PermissionRequest (orange).
    - Backbrain notes: pill with tag color (tasks = cyan, bugs = red, notes = blue).
    - Git commits: neutral gray label.
  - Right: concise summary: “Started session”, “Used tool: run_tests”, “Note: fix auth bug”, “Commit: Fix payment retry”.
- Rows expand on click:
  - Expand into a card with a slightly elevated background.
  - For Claude events: show pretty-printed JSON of tool input/output, truncated with a “Show more” toggle if long.
  - For notes: show full text and tags.
- Subtle vertical rule or left border to visually connect events as a single timeline.

Microcopy and UX tone:
- Tone: calm, observant, slightly space-themed but professional.
- Avoid exclamation marks except for errors; no jokey copy.
- Use short, factual labels (“Waiting for missions…”, “No active sessions”) instead of long explanations.
- Keep hover/focus states clear for keyboard users.

Accessibility:
- Ensure sufficient color contrast for text and key indicators.
- Make mission selection and timeline items focusable with the keyboard.
- Don’t rely solely on color for status; include text status labels as well.

Implementation constraints:
- Do NOT change the data flow: WebSocket messages, useAppState, missions-store, and server types must remain compatible.
- You may:
  - Add TailwindCSS or a small CSS utility system if needed.
  - Refactor JSX structure inside the existing components for better semantics/layout.
  - Introduce small presentational components (e.g., Badge, StatusDot, Panel) as long as they stay in `client/src/components`.
- Make sure it still works well at typical terminal+browser split-screen sizes (around 1280×720).