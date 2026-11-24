import { test, expect, Page } from "@playwright/test"

// iPad landscape in Safari (iPad Air: 1180 wide, ~740 tall below the toolbars)
// and the narrowest current iPad (1080 wide). Game pages should fit one screen.
const SIZES = [
  { width: 1180, height: 740 },
  { width: 1080, height: 740 },
]

const GAMES = [
  "/activity/four-in-a-row/in-app/friend",
  "/activity/tic-tac-toe/in-app/gomoku",
  "/activity/battleships/in-app",
  "/activity/memory/in-app/hard",
  "/activity/minesweeper",
  "/activity/sudoku/in-app",
  "/activity/chess/in-app",
  "/activity/checkers/in-app",
  "/activity/maze/in-app",
  "/activity/dot-to-dot/in-app",
  "/activity/seek-and-find/seek",
  "/activity/guide-robot/in-app",
  "/activity/word-search/in-app",
  "/activity/hangman/in-app",
  "/activity/letter-tracing/in-app",
  "/activity/clock/match",
  "/activity/jigsaw/hard",
]

const overflow = (page: Page) =>
  page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight)

for (const size of SIZES) {
  test(`game pages fit one screen at ${size.width}×${size.height}`, async ({ page }) => {
    await page.setViewportSize(size)
    for (const path of GAMES) {
      await page.goto(path)
      await page.waitForTimeout(300)
      expect(await overflow(page), path).toBeLessThanOrEqual(0)
    }
  })
}

// Centre of each loose piece, in SVG user units, and the transform to screen.
async function pieces(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>(".jigsaw-svg")!
    const vb = svg.viewBox.baseVal
    const r = svg.getBoundingClientRect()
    const s = r.width / vb.width
    return {
      view: { w: vb.width, h: vb.height },
      loose: [...svg.querySelectorAll<SVGGElement>(".jigsaw-piece:not(.is-placed)")].map(g => {
        const bb = g.querySelector<SVGPathElement>(".jigsaw-piece-edge")!.getBBox()
        const m = g.transform.baseVal.consolidate()?.matrix ?? { e: 0, f: 0 }
        const hx = bb.x + bb.width / 2, hy = bb.y + bb.height / 2
        const fx = r.x + (hx + m.e) * s, fy = r.y + (hy + m.f) * s
        return {
          // Is this piece the one a finger at its centre would grab? (Loose
          // pieces overlap in the tray.)
          onTop: document.elementFromPoint(fx, fy)?.closest(".jigsaw-piece") === g,
          centre: [hx + m.e, hy + m.f],
          from: [r.x + (hx + m.e) * s, r.y + (hy + m.f) * s],
          home: [r.x + hx * s, r.y + hy * s],
        }
      }),
    }
  })
}

test("jigsaw: side tray in landscape, pieces survive rotation, still solvable", async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 740 })
  await page.goto("/activity/jigsaw/medium")
  await expect(page.locator(".jigsaw-svg--side")).toHaveCount(1)

  const inView = async () => {
    const { view, loose } = await pieces(page)
    return loose.every(p => p.centre[0] >= 0 && p.centre[0] <= view.w && p.centre[1] >= 0 && p.centre[1] <= view.h)
  }
  expect(await inView()).toBe(true)

  // Rotate to portrait: tray moves below the board, loose pieces follow it.
  await page.setViewportSize({ width: 820, height: 1180 })
  await expect(page.locator(".jigsaw-svg--side")).toHaveCount(0)
  expect(await inView()).toBe(true)

  // And back; then drag every piece home.
  await page.setViewportSize({ width: 1180, height: 740 })
  await expect(page.locator(".jigsaw-svg--side")).toHaveCount(1)
  expect(await inView()).toBe(true)

  for (let i = 0; i < 40; i++) {
    const { loose } = await pieces(page)
    if (loose.length === 0) break
    const p = loose.find(l => l.onTop) ?? loose[loose.length - 1]
    await page.mouse.move(p.from[0], p.from[1])
    await page.mouse.down()
    await page.mouse.move(p.home[0], p.home[1], { steps: 8 })
    await page.mouse.up()
  }
  await expect(page.locator(".jigsaw .handoff")).toBeVisible()
})
