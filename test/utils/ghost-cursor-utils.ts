import { Locator, Page } from "@playwright/test";
import { createCursor, Cursor } from "ghost-cursor-playwright";

type ClickTarget = string | Locator | { x: number; y: number };

export interface DemoCursor {
  click: (target: ClickTarget, options?: { waitAfter?: number }) => Promise<void>;
  move: (target: ClickTarget) => Promise<void>;
  cursor: Cursor;
}

/**
 * Injects a visible cursor element that follows mouse movements.
 * Useful for demo recordings since Playwright doesn't show the system cursor.
 */
export async function injectVisibleCursor(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      #ghost-cursor {
        position: fixed;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(255, 50, 50, 0.8);
        border: 2px solid white;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
        pointer-events: none;
        z-index: 999999;
        transform: translate(-50%, -50%);
        transition: transform 0.05s ease-out;
      }
      #ghost-cursor.clicking {
        transform: translate(-50%, -50%) scale(0.8);
        background: rgba(255, 100, 100, 1);
      }
    `,
  });

  await page.addScriptTag({
    content: `
      const cursor = document.createElement('div');
      cursor.id = 'ghost-cursor';
      document.body.appendChild(cursor);

      document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
      });

      document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
      document.addEventListener('mouseup', () => cursor.classList.remove('clicking'));
    `,
  });

  await page.waitForTimeout(200);
}

/**
 * Converts a Locator to a bounding box for ghost-cursor.
 */
async function locatorToBoundingBox(
  locator: Locator
): Promise<{ x: number; y: number; width: number; height: number }> {
  await locator.waitFor({ state: "visible", timeout: 5000 });
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("Could not get bounding box for locator");
  }
  return box;
}

/**
 * Sets up a page for demo recording with ghost-cursor.
 * Returns a DemoCursor that accepts Playwright Locators.
 */
export async function setupDemoCursor(page: Page): Promise<DemoCursor> {
  await injectVisibleCursor(page);
  const cursor = await createCursor(page);

  const resolveTarget = async (target: ClickTarget) => {
    if (typeof target === "string") {
      return target;
    }
    if ("x" in target && "y" in target && !("boundingBox" in target)) {
      return target as { x: number; y: number };
    }
    // It's a Locator
    return locatorToBoundingBox(target as Locator);
  };

  return {
    cursor,
    async click(target: ClickTarget, options?: { waitAfter?: number }) {
      const resolved = await resolveTarget(target);
      await cursor.actions.click({ target: resolved });
      if (options?.waitAfter) {
        await page.waitForTimeout(options.waitAfter);
      }
    },
    async move(target: ClickTarget) {
      const resolved = await resolveTarget(target);
      await cursor.actions.move(resolved);
    },
  };
}

/**
 * Default video settings for demo recordings.
 */
export const demoVideoSettings = {
  video: {
    mode: "on" as const,
    size: { width: 1280, height: 720 },
  },
  viewport: { width: 1280, height: 720 },
};
