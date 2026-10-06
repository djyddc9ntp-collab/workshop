# TODO-234: Keep the theme in sync across open dashboard tabs

**Type:** Bug
**Area:** Frontend
**Priority:** Low

## Story

Raised in code review of TODO-231. The theme choice is saved in `localStorage`, but
open tabs only read it on load. If the dashboard is open in two tabs (the wall
screen and a second monitor, say) and someone switches theme in one, the other
keeps the old theme and its toggle label goes stale. Clicking the toggle in the
stale tab then overwrites the first tab's choice.

Left out of TODO-231 on purpose: the ticket only asks for the choice to persist and
be restored on load (AC-3), and nobody uses more than one tab per screen today.

## Acceptance criteria

- **AC-1** When `ops-dashboard-theme` changes in another tab, an open dashboard
  applies the new theme and updates the `#theme-toggle` label, without a reload
  (the window `storage` event).
- **AC-2** An unknown value from another tab is ignored (no change), the same rule
  as on load.

Fences:

- Both test suites stay green (`./mvnw test` and `npm test`).
- Frontend only. No new dependencies.
