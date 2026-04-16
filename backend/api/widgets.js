import { Router } from "express";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";
import { validationMiddleware } from "../middleware/validation-middleware.js";
import pool from "../db.js";
import {
  addCategoryToWidgetSchema,
  editWidgetSchema,
  queryParamsSchema,
  registerWidgetSchema,
} from "../validators/schemas.js";
import {
  createApprovedWidget,
  getAllWidgets,
  registerWidget,
  updateWidget,
  deleteWidget,
  getPendingWidgets,
  removeRequest,
} from "../services/widgetService.js";
import { requireSiteAdmin, requireAuth } from "../middleware/permission-guards.js";
import { requireWidgetOwnership, requireWidgetOwner } from "../middleware/ownership-guards.js";

const selectWidgetById = `
    SELECT *
    FROM widgets
    WHERE widget_id = $1
`;

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const widgetPdfDirectory = path.resolve(__dirname, "../tmp/widget-pdfs");

const parseIdList = (value) => {
  if (value === undefined || value === null) return [];

  const normalize = (items) =>
    items
      .map((item) => {
        if (typeof item === "number") return item;
        if (typeof item === "string") {
          const trimmed = item.trim();
          if (!trimmed) return null;
          const asNumber = Number(trimmed);
          return Number.isNaN(asNumber) ? trimmed : asNumber;
        }
        return null;
      })
      .filter((item) => item !== null);

  if (Array.isArray(value)) {
    return normalize(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return normalize(parsed);
        }
      } catch (error) {
        return [];
      }
    }

    return normalize(trimmed.split(","));
  }

  return [];
};

const isHittingAnalyticsWidget = (widgetId, widgetName, redirectLink) => {
  const normalizedName = (widgetName || "").toLowerCase();
  const normalizedRedirect = (redirectLink || "").toLowerCase();

  return (
    widgetId === 93 ||
    normalizedName.includes("hitting analytics") ||
    normalizedRedirect.includes("alpb-hitting.shinyapps.io")
  );
};

const isSluggerPitcherWidget = (widgetId, widgetName, redirectLink) => {
  const normalizedName = (widgetName || "").toLowerCase();
  const normalizedRedirect = (redirectLink || "").toLowerCase();

  return (
    widgetId === 223 ||
    widgetId === 268 ||
    normalizedName.includes("slugger pitcher") ||
    normalizedName.includes("pitching widget") ||
    normalizedRedirect.includes("slugger-pitching-widget")
  );
};

const isGeneralStatisticsWidget = (widgetId, widgetName, redirectLink) => {
  const normalizedName = (widgetName || "").toLowerCase();
  const normalizedRedirect = (redirectLink || "").toLowerCase();

  return (
    widgetId === 238 ||
    widgetId === 269 ||
    normalizedName.includes("general statistics") ||
    normalizedName.includes("slugger-stats-widget") ||
    normalizedName.includes("slugger stats widget") ||
    normalizedRedirect.includes("slugger-stats-widget") ||
    normalizedRedirect.includes("baseball-general-statistics-widget")
  );
};

const isPlayerPortalWidget = (widgetId, widgetName, redirectLink) => {
  const normalizedName = (widgetName || "").toLowerCase();
  const normalizedRedirect = (redirectLink || "").toLowerCase();

  return (
    widgetId === 270 ||
    normalizedName.includes("player portal") ||
    normalizedRedirect.includes("player-portal")
  );
};

const isCountBasedWidget = (widgetId, widgetName, redirectLink) => {
  const normalizedName = (widgetName || "").toLowerCase();
  const normalizedRedirect = (redirectLink || "").toLowerCase();

  return (
    widgetId === 227 ||
    normalizedName.includes("count-based") ||
    normalizedName.includes("count based") ||
    normalizedRedirect.includes("ds717.shinyapps.io/alpb")
  );
};

const addCommonWidgetParams = (url, teamIds, playerIds, source, teamNames = [], playerNames = []) => {
  const teamIdsAsStrings = teamIds.map((id) => String(id));
  const playerIdsAsStrings = playerIds.map((id) => String(id));
  const teamNamesAsStrings = teamNames.map((name) => String(name));
  const playerNamesAsStrings = playerNames.map((name) => String(name));

  if (teamIdsAsStrings.length > 0) {
    url.searchParams.set("teamIds", JSON.stringify(teamIdsAsStrings));
    url.searchParams.set("team_ids", teamIdsAsStrings.join(","));
    url.searchParams.set("teamId", teamIdsAsStrings[0]);
  }

  if (playerIdsAsStrings.length > 0) {
    url.searchParams.set("playerIds", JSON.stringify(playerIdsAsStrings));
    url.searchParams.set("player_ids", playerIdsAsStrings.join(","));
    url.searchParams.set("playerId", playerIdsAsStrings[0]);
  }

  if (teamNamesAsStrings.length > 0) {
    url.searchParams.set("teamNames", JSON.stringify(teamNamesAsStrings));
    url.searchParams.set("team_names", teamNamesAsStrings.join(","));
    url.searchParams.set("teamName", teamNamesAsStrings[0]);
  }

  if (playerNamesAsStrings.length > 0) {
    url.searchParams.set("playerNames", JSON.stringify(playerNamesAsStrings));
    url.searchParams.set("player_names", playerNamesAsStrings.join(","));
    url.searchParams.set("playerName", playerNamesAsStrings[0]);
  }

  url.searchParams.set("source", source);
};

const buildGeneralStatisticsUrl = (redirectLink, teamIds, playerIds, source, teamNames = [], playerNames = []) => {
  const url = new URL(redirectLink);
  addCommonWidgetParams(url, teamIds, playerIds, source, teamNames, playerNames);
  return url.toString();
};

const executeHittingAnalytics = async ({ widgetId, widgetName, teamIds, playerIds }) => {
  const hittingResponse = await fetch(
    `http://localhost:3001/api/widgets/93/hitting-data?${new URLSearchParams({
      playerIds: JSON.stringify(playerIds),
      teamIds: JSON.stringify(teamIds),
    }).toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  const hittingData = await hittingResponse.json();
  if (!hittingResponse.ok || !hittingData?.success) {
    throw new Error(hittingData?.message || `Hitting endpoint failed (${hittingResponse.status})`);
  }

  return {
    success: true,
    message: "Widget executed successfully",
    data: {
      widgetId,
      widgetName: widgetName || "Hitting Analytics",
      teamIds,
      playerIds,
      widgetOutput: hittingData.data,
      bullets: hittingData.data?.bullets || [],
      redirectLink: buildWidgetExecutionUrl(
        "https://alpb-hitting.shinyapps.io/ALPBHitterReport/",
        teamIds,
        playerIds,
        "superwidget-hitting-analytics"
      ),
    },
  };
};

const executePitchingAnalytics = async ({ widgetId, widgetName, teamIds, playerIds }) => {
  const pitchingResponse = await fetch(
    `http://localhost:3001/api/widgets/pitching-data?${new URLSearchParams({
      playerIds: JSON.stringify(playerIds),
      teamIds: JSON.stringify(teamIds),
    }).toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  const pitchingData = await pitchingResponse.json();
  if (!pitchingResponse.ok || !pitchingData?.success) {
    throw new Error(pitchingData?.message || `Pitching endpoint failed (${pitchingResponse.status})`);
  }

  return {
    success: true,
    message: "Widget executed successfully",
    data: {
      widgetId,
      widgetName: widgetName || "Slugger Pitcher Widget",
      teamIds,
      playerIds,
      widgetOutput: pitchingData.data,
      bullets: pitchingData.data?.bullets || [],
      redirectLink: buildWidgetExecutionUrl(
        "https://slugger-pitching-widget-xfcw.onrender.com",
        teamIds,
        playerIds,
        "superwidget-pitching-analytics"
      ),
    },
  };
};

const buildWidgetExecutionUrl = (redirectLink, teamIds, playerIds, source, teamNames = [], playerNames = []) => {
  const url = new URL(redirectLink);
  addCommonWidgetParams(url, teamIds, playerIds, source, teamNames, playerNames);
  return url.toString();
};

const normalizePlayerName = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const normalizeComparableName = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenizeComparableName = (value) =>
  normalizeComparableName(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

const parseNameParts = (value) => {
  const cleaned = String(value || "").replace(/\([^)]*\)/g, "").trim();
  if (!cleaned) {
    return { raw: "", lastName: "", firstName: "", firstInitial: "" };
  }

  if (cleaned.includes(",")) {
    const [last = "", first = ""] = cleaned.split(",");
    const firstNormalized = first.trim();
    return {
      raw: cleaned,
      lastName: last.trim().toLowerCase(),
      firstName: firstNormalized.toLowerCase(),
      firstInitial: firstNormalized.charAt(0).toLowerCase(),
    };
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
  return {
    raw: cleaned,
    lastName: String(lastName).trim().toLowerCase(),
    firstName: String(firstName).trim().toLowerCase(),
    firstInitial: String(firstName).charAt(0).toLowerCase(),
  };
};

const namesLikelyMatch = (requestedName, selectedName) => {
  const requestedNormalized = normalizeComparableName(requestedName);
  const selectedNormalized = normalizeComparableName(selectedName);

  if (!requestedNormalized || !selectedNormalized) {
    return false;
  }

  if (requestedNormalized === selectedNormalized) {
    return true;
  }

  const requestedTokens = tokenizeComparableName(requestedName);
  if (requestedTokens.length > 0) {
    const matchedTokenCount = requestedTokens.filter((token) => selectedNormalized.includes(token)).length;
    if (matchedTokenCount === requestedTokens.length) {
      return true;
    }
    if (requestedTokens.length >= 2 && matchedTokenCount >= 2) {
      return true;
    }
  }

  const requestedParts = parseNameParts(requestedName);
  if (requestedParts.lastName && selectedNormalized.includes(requestedParts.lastName)) {
    if (requestedParts.firstName && selectedNormalized.includes(requestedParts.firstName)) {
      return true;
    }
    if (requestedParts.firstInitial && selectedNormalized.includes(requestedParts.firstInitial)) {
      return true;
    }
  }

  return false;
};

const buildCountBasedPlayerSearchTerms = (rawPlayerName) => {
  const variants = [];
  const add = (value) => {
    const trimmed = String(value || "").replace(/\s+/g, " ").trim();
    if (!trimmed) return;
    if (!variants.some((existing) => normalizeComparableName(existing) === normalizeComparableName(trimmed))) {
      variants.push(trimmed);
    }
  };

  const cleaned = String(rawPlayerName || "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  add(cleaned);

  const parts = parseNameParts(cleaned);
  if (parts.firstName && parts.lastName) {
    const first = parts.firstName.charAt(0).toUpperCase() + parts.firstName.slice(1);
    const last = parts.lastName.charAt(0).toUpperCase() + parts.lastName.slice(1);
    add(`${last}, ${first}`);
    add(`${first} ${last}`);
    add(last);
    add(last.charAt(0));
    add(first.charAt(0));
  }

  return variants.slice(0, 6);
};

const buildPlayerLookupMap = (rows) => {
  const lookup = new Map();

  const put = (key, row) => {
    if (!key) return;
    if (!lookup.has(key)) {
      lookup.set(key, row);
    }
  };

  for (const row of rows) {
    const fullKey = normalizePlayerName(row.player_name);
    put(fullKey, row);

    const parts = parseNameParts(row.player_name);
    if (parts.lastName && parts.firstInitial) {
      put(`${parts.lastName}|${parts.firstInitial}`, row);
      put(`${parts.lastName},${parts.firstInitial}`, row);
      put(`${parts.lastName}${parts.firstInitial}`, row);
    }
  }

  return lookup;
};

const resolveLocalPlayerFromOption = (optionText, lookupMap) => {
  const displayName = String(optionText || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (!displayName) return null;

  const fullKey = normalizePlayerName(displayName);
  if (lookupMap.has(fullKey)) {
    return lookupMap.get(fullKey);
  }

  const parts = parseNameParts(displayName);
  if (parts.lastName && parts.firstInitial) {
    const keys = [
      `${parts.lastName}|${parts.firstInitial}`,
      `${parts.lastName},${parts.firstInitial}`,
      `${parts.lastName}${parts.firstInitial}`,
    ];

    for (const key of keys) {
      if (lookupMap.has(key)) {
        return lookupMap.get(key);
      }
    }
  }

  return null;
};

const selectorOptionsCache = new Map();

const wakeSleepingSelectorPageIfNeeded = async (page) => {
  const isSleeping = async () => {
    let retries = 3;
    while (retries > 0) {
      try {
        const result = await page.evaluate(() => {
          const text = String(document?.body?.innerText || "").toLowerCase();
          return (
            text.includes("has gone to sleep due to inactivity") ||
            text.includes("would you like to wake it back up") ||
            text.includes("yes, get this app back up")
          );
        });
        return result;
      } catch (err) {
        retries -= 1;
        if (retries === 0) throw err;
        console.log(`[Widget Export PDF] isSleeping check failed, retrying... (${retries} left)`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  };

  let isSleepingResult;
  try {
    isSleepingResult = await isSleeping();
  } catch (err) {
    console.log(`[Widget Export PDF] isSleeping check failed after retries, continuing anyway: ${err.message}`);
    return; // Continue without throwing
  }

  if (!isSleepingResult) return;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let evaluateRetries = 3;
    while (evaluateRetries > 0) {
      try {
        await page.evaluate(() => {
          const labels = ["yes, get this app back up", "wake", "back up"];
          const elements = Array.from(
            document.querySelectorAll("button, a, [role='button'], input[type='button'], input[type='submit']")
          );

          const normalize = (value) =>
            String(value || "")
              .toLowerCase()
              .replace(/\s+/g, " ")
              .trim();

          for (const element of elements) {
            const text = normalize(element.textContent || element.getAttribute("value") || "");
            if (!text) continue;
            if (!labels.some((label) => text.includes(label))) continue;

            element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
            element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            break;
          }
        });
        break; // Success, exit retry loop
      } catch (err) {
        evaluateRetries -= 1;
        if (evaluateRetries === 0) {
          console.log(`[Widget Export PDF] Wake button click failed after retries: ${err.message}`);
          break; // Continue to next attempt
        }
        console.log(`[Widget Export PDF] Wake button click failed, retrying... (${evaluateRetries} left)`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
    
    let isSleepingCheckRetries = 3;
    let stillSleeping = true;
    while (isSleepingCheckRetries > 0) {
      try {
        stillSleeping = await isSleeping();
        break;
      } catch (err) {
        isSleepingCheckRetries -= 1;
        if (isSleepingCheckRetries === 0) {
          console.log(`[Widget Export PDF] Failed to check sleep status after retries: ${err.message}`);
          return; // Give up, continue
        }
        console.log(`[Widget Export PDF] Sleep status check failed, retrying... (${isSleepingCheckRetries} left)`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    
    if (!stillSleeping) return;
  }
};

const fetchHittingWidgetPlayerOptions = async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1200 });
    await page.goto("https://alpb-hitting.shinyapps.io/ALPBHitterReport/", {
      waitUntil: "networkidle2",
      timeout: 180000,
    });
    await new Promise((resolve) => setTimeout(resolve, 4000));

    const playerInput = await page.$("#player-selectized");
    if (playerInput) {
      await playerInput.click({ clickCount: 3 });
      await page.keyboard.press("Backspace");
      await playerInput.type("a", { delay: 30 });
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }

    const options = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll(".selectize-dropdown .option, .selectize-dropdown-content .option")
      )
        .map((option) => ({
          text: (option.textContent || "").trim(),
          externalId: option.getAttribute("data-value") || "",
        }))
        .filter((row) => row.text.length > 0 && row.externalId.length > 0);

      const unique = [];
      const seen = new Set();
      for (const row of rows) {
        const key = `${row.text}|${row.externalId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(row);
      }
      return unique;
    });

    return options;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

const fetchCountBasedWidgetPlayerOptions = async (redirectLink) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1200 });
    await page.goto(redirectLink, { waitUntil: "networkidle2", timeout: 180000 });
    await wakeSleepingSelectorPageIfNeeded(page);

    try {
      await page.waitForSelector("#player_name", { timeout: 30000 });
    } catch {
      return [];
    }

    const allPlayerNames = new Set();
    const searchLetters = "abcdefghijklmnopqrstuvwxyz".split("");

    for (const letter of searchLetters) {
      const previousSignature = await page.evaluate(() => {
        const select = document.querySelector("#player_selection_ui select");
        if (!(select instanceof HTMLSelectElement)) return "";
        return Array.from(select.options)
          .filter((o) => Boolean(o.value) && !/select player/i.test(o.textContent || ""))
          .map((o) => String(o.textContent || o.label || "").replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .join("|");
      });

      const submitted = await page.evaluate((term) => {
        const input = document.querySelector("#player_name");
        if (!(input instanceof HTMLInputElement)) return false;

        const submitButton = document.querySelector("#search");
        input.focus();
        input.value = term;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));

        if (window.Shiny && typeof window.Shiny.setInputValue === "function") {
          window.Shiny.setInputValue("player_name", term, { priority: "event" });
          const currentSearchValue = Number(window.Shiny?.shinyapp?.$inputValues?.search || 0) || 0;
          window.Shiny.setInputValue("search", currentSearchValue + 1, { priority: "event" });
        }

        if (submitButton instanceof HTMLElement) {
          submitButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
          submitButton.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
          submitButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        }

        return true;
      }, letter);

      if (!submitted) continue;

      await new Promise((resolve) => setTimeout(resolve, 3000));

      try {
        await page.waitForFunction(
          (prev) => {
            const select = document.querySelector("#player_selection_ui select");
            const currentSignature = select instanceof HTMLSelectElement
              ? Array.from(select.options)
                  .filter((o) => Boolean(o.value) && !/select player/i.test(o.textContent || ""))
                  .map((o) => String(o.textContent || o.label || "").replace(/\s+/g, " ").trim())
                  .filter(Boolean)
                  .join("|")
              : "";

            const hasFreshOptions = currentSignature.length > 0 && currentSignature !== prev;
            const noPlayersMessageVisible = String(document?.body?.innerText || "")
              .toLowerCase()
              .includes("no players found with that name");

            return hasFreshOptions || noPlayersMessageVisible;
          },
          { timeout: 12000 },
          previousSignature
        );
      } catch {
        continue;
      }

      const names = await page.evaluate((prev) => {
        const select = document.querySelector("#player_selection_ui select");
        if (!(select instanceof HTMLSelectElement)) return [];

        const currentNames = Array.from(select.options)
          .filter((o) => Boolean(o.value) && !/select player/i.test(o.textContent || ""))
          .map((o) => String(o.textContent || o.label || "").replace(/\s+/g, " ").trim())
          .filter(Boolean);

        const currentSignature = currentNames.join("|");
        if (!currentSignature || currentSignature === prev) return [];
        return currentNames;
      }, previousSignature);

      for (const name of names) {
        allPlayerNames.add(name);
      }
    }

    return Array.from(allPlayerNames).map((text) => ({ text, externalId: "" }));
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

const fetchWidgetSelectorOptionsViaBrowser = async (redirectLink) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1200 });
    await page.goto(redirectLink, {
      waitUntil: "networkidle2",
      timeout: 180000,
    });
    await new Promise((resolve) => setTimeout(resolve, 3500));

    const possibleInputs = await page.$$('[id$="-selectized"], .selectize-input input, input[role="combobox"]');
    for (const input of possibleInputs.slice(0, 3)) {
      try {
        await input.click({ clickCount: 3 });
        await page.keyboard.press("Backspace");
        await input.type("a", { delay: 25 });
        await new Promise((resolve) => setTimeout(resolve, 900));
      } catch {
        // no-op
      }
    }

    const options = await page.evaluate(() => {
      const normalizeText = (value) => String(value || "").trim();

      const fromDropdown = Array.from(
        document.querySelectorAll(".selectize-dropdown .option, .selectize-dropdown-content .option, [role='option']")
      )
        .map((option) => ({
          text: normalizeText(option.textContent),
          externalId: option.getAttribute("data-value") || option.getAttribute("value") || "",
        }))
        .filter((row) => row.text.length > 0);

      const fromSelect = Array.from(document.querySelectorAll("select option"))
        .map((option) => ({
          text: normalizeText(option.textContent),
          externalId: option.getAttribute("value") || "",
        }))
        .filter((row) => {
          const lower = row.text.toLowerCase();
          return row.text.length > 0 && !["all", "none", "select"].includes(lower);
        });

      const namePattern = /^[A-Za-z'`.-]+,\s*[A-Za-z][A-Za-z'`.-]*$/;
      const fromTableCells = Array.from(document.querySelectorAll("table td, table th"))
        .map((cell) => normalizeText(cell.textContent))
        .filter((text) => namePattern.test(text))
        .map((text) => ({
          text,
          externalId: "",
        }));

      const rows = [...fromDropdown, ...fromSelect, ...fromTableCells];
      const unique = [];
      const seen = new Set();

      for (const row of rows) {
        const key = `${row.text}|${row.externalId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(row);
      }

      return unique;
    });

    return options;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

const fetchGeneralStatisticsOptionsViaBrowser = async (redirectLink) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1200 });
    await page.goto(redirectLink, {
      waitUntil: "networkidle2",
      timeout: 180000,
    });

    try {
      await page.waitForFunction(
        () => {
          const rows = document.querySelectorAll("table tbody tr");
          return rows.length > 0;
        },
        { timeout: 35000 }
      );
    } catch {
      // fallback to timed wait below
    }

    await new Promise((resolve) => setTimeout(resolve, 4500));

    const options = await page.evaluate(() => {
      const normalizeText = (value) => String(value || "").trim();
      const namePattern = /^[A-Za-z'`.-]+,\s*[A-Za-z][A-Za-z'`.-]*$/;

      const fromTables = Array.from(document.querySelectorAll("table tbody tr"))
        .map((row) => {
          const firstCell = row.querySelector("td");
          return normalizeText(firstCell?.textContent || "");
        })
        .filter((text) => namePattern.test(text))
        .map((text) => ({ text, externalId: "" }));

      const fromAnyCell = Array.from(document.querySelectorAll("table td"))
        .map((cell) => normalizeText(cell.textContent))
        .filter((text) => namePattern.test(text))
        .map((text) => ({ text, externalId: "" }));

      const fromBodyText = (document.body?.innerText || "")
        .split("\n")
        .map((line) => normalizeText(line))
        .filter((text) => namePattern.test(text))
        .map((text) => ({ text, externalId: "" }));

      const rows = [...fromTables, ...fromAnyCell, ...fromBodyText];
      const unique = [];
      const seen = new Set();
      for (const row of rows) {
        if (seen.has(row.text)) continue;
        seen.add(row.text);
        unique.push(row);
      }
      return unique;
    });

    return options;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

const fetchSluggerPitcherOptionsViaBrowser = async (redirectLink, { teamNames = [] } = {}) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1200 });
    await page.goto(redirectLink, {
      waitUntil: "networkidle2",
      timeout: 180000,
    });
    await new Promise((resolve) => setTimeout(resolve, 4000));

    const selectionDebug = await page.evaluate((requestedTeamNames) => {
      const normalize = (value) =>
        String(value || "")
          .toLowerCase()
          .replace(/\([^)]*\)/g, " ")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();

      const requested = requestedTeamNames
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      const visibleSelects = Array.from(document.querySelectorAll("select")).filter((selectElement) => {
        const style = window.getComputedStyle(selectElement);
        const rect = selectElement.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      });

      const scoreSelectAsTeamSelector = (selectElement) => {
        const options = Array.from(selectElement.options || []);
        const normalizedOptions = options.map((option) => normalize(option.textContent || option.label || ""));
        let score = 0;
        if (normalizedOptions.some((text) => text.includes("all teams"))) score += 8;
        if (normalizedOptions.some((text) => text.includes("charleston") || text.includes("york") || text.includes("legends"))) {
          score += 4;
        }
        return score;
      };

      const ranked = visibleSelects
        .map((selectElement) => ({ selectElement, score: scoreSelectAsTeamSelector(selectElement) }))
        .sort((a, b) => b.score - a.score);

      const target = ranked[0];
      if (!target) {
        return { selected: false, selectedTeam: null };
      }

      let selectedTeam = null;
      if (requested.length > 0) {
        const options = Array.from(target.selectElement.options || []);
        let bestOption = null;
        let bestScore = -1;

        for (const option of options) {
          const optionText = normalize(option.textContent || option.label || "");
          if (!optionText) continue;

          for (const teamName of requested) {
            const requestedText = normalize(teamName);
            if (!requestedText) continue;

            let score = 0;
            if (optionText === requestedText) score += 12;
            if (optionText.includes(requestedText)) score += 7;
            if (requestedText.includes(optionText) && optionText.length > 6) score += 3;

            const tokens = requestedText.split(/\s+/).filter((token) => token.length >= 2);
            for (const token of tokens) {
              if (optionText.includes(token)) score += 2;
            }

            if (score > bestScore) {
              bestScore = score;
              bestOption = option;
            }
          }
        }

        if (bestOption && bestScore > 0) {
          target.selectElement.value = bestOption.value;
          target.selectElement.dispatchEvent(new Event("input", { bubbles: true }));
          target.selectElement.dispatchEvent(new Event("change", { bubbles: true }));
          selectedTeam = String(bestOption.textContent || bestOption.label || "").trim();
        }
      }

      return { selected: Boolean(selectedTeam), selectedTeam };
    }, teamNames);

    if (selectionDebug?.selected) {
      await new Promise((resolve) => setTimeout(resolve, 3500));
    }

    const options = await page.evaluate(() => {
      const normalizeText = (value) => String(value || "").trim();
      const normalize = (value) =>
        String(value || "")
          .toLowerCase()
          .replace(/\([^)]*\)/g, " ")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();

      const visibleSelects = Array.from(document.querySelectorAll("select")).filter((selectElement) => {
        const style = window.getComputedStyle(selectElement);
        const rect = selectElement.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      });

      const teamCandidates = [];
      const playerCandidates = [];

      for (const selectElement of visibleSelects) {
        const rows = Array.from(selectElement.options || []).map((option) => ({
          text: normalizeText(option.textContent || option.label || ""),
          externalId: normalizeText(option.value || ""),
          normalized: normalize(option.textContent || option.label || ""),
        }));

        const hasAllTeams = rows.some((row) => row.normalized.includes("all teams"));
        const hasAllPitchers = rows.some((row) => row.normalized.includes("all pitchers"));

        if (hasAllTeams) {
          teamCandidates.push(
            ...rows
              .filter((row) => row.text.length > 0 && !row.normalized.includes("all teams"))
              .map((row) => ({ text: row.text, externalId: row.externalId }))
          );
        }

        if (hasAllPitchers) {
          playerCandidates.push(
            ...rows
              .filter((row) => row.text.length > 0 && !row.normalized.includes("all pitchers"))
              .map((row) => ({ text: row.text, externalId: row.externalId }))
          );
        }
      }

      const uniqueBy = (items, keyFactory) => {
        const out = [];
        const seen = new Set();
        for (const item of items) {
          const key = keyFactory(item);
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(item);
        }
        return out;
      };

      return {
        teams: uniqueBy(teamCandidates, (item) => `${item.text}|${item.externalId}`),
        players: uniqueBy(playerCandidates, (item) => `${item.text}|${item.externalId}`),
      };
    });

    const dashOptions = options?.players?.length > 0
      ? null
      : await page.evaluate(async (requestedTeamNames) => {
          const normalize = (value) =>
            String(value || "")
              .toLowerCase()
              .replace(/\([^)]*\)/g, " ")
              .replace(/[^a-z0-9]+/g, " ")
              .replace(/\s+/g, " ")
              .trim();

          const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();

          const findById = (node, targetId) => {
            if (!node || typeof node !== "object") return null;
            if (node.props && node.props.id === targetId) return node;

            const children = node.props?.children;
            if (Array.isArray(children)) {
              for (const child of children) {
                const found = findById(child, targetId);
                if (found) return found;
              }
            } else if (children && typeof children === "object") {
              const found = findById(children, targetId);
              if (found) return found;
            }

            return null;
          };

          const uniqueBy = (items, keyFactory) => {
            const out = [];
            const seen = new Set();
            for (const item of items) {
              const key = keyFactory(item);
              if (seen.has(key)) continue;
              seen.add(key);
              out.push(item);
            }
            return out;
          };

          try {
            const layoutResponse = await fetch("/_dash-layout", {
              credentials: "same-origin",
              cache: "no-store",
            });

            if (!layoutResponse.ok) {
              return { teams: [], players: [], reason: "dash-layout-request-failed" };
            }

            const layout = await layoutResponse.json();
            const teamControl = findById(layout, "selected-team");
            const rawTeamOptions = Array.isArray(teamControl?.props?.options)
              ? teamControl.props.options
              : [];

            const teamOptions = rawTeamOptions
              .map((option) => ({
                text: normalizeText(option?.label ?? option?.value ?? ""),
                externalId: normalizeText(option?.value ?? ""),
              }))
              .filter((option) => option.text.length > 0 && !normalize(option.text).includes("all teams"));

            const requested = (requestedTeamNames || [])
              .map((value) => String(value || "").trim())
              .filter(Boolean);

            const requestedNormSet = new Set(requested.map((value) => normalize(value)).filter(Boolean));
            const targetTeams = requestedNormSet.size > 0
              ? teamOptions.filter((option) => {
                  const optionNorm = normalize(option.text);
                  if (!optionNorm) return false;
                  if (requestedNormSet.has(optionNorm)) return true;

                  for (const requestedNorm of requestedNormSet) {
                    if (optionNorm.includes(requestedNorm) || requestedNorm.includes(optionNorm)) {
                      return true;
                    }
                  }

                  return false;
                })
              : teamOptions;

            const teamsToQuery = targetTeams.length > 0 ? targetTeams : teamOptions;
            const playerCandidates = [];

            for (const teamOption of teamsToQuery) {
              const payload = {
                output: "..selected-player.options...selected-player.value..",
                outputs: [
                  { id: "selected-player", property: "options" },
                  { id: "selected-player", property: "value" },
                ],
                inputs: [
                  { id: "selected-team", property: "value", value: teamOption.externalId || teamOption.text },
                ],
                state: [
                  { id: "selected-player", property: "value", value: null },
                ],
                changedPropIds: ["selected-team.value"],
              };

              const updateResponse = await fetch("/_dash-update-component", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              });

              if (!updateResponse.ok) continue;

              const updateJson = await updateResponse.json();
              const optionRows = updateJson?.response?.["selected-player"]?.options;
              if (!Array.isArray(optionRows)) continue;

              for (const option of optionRows) {
                const text = normalizeText(option?.label ?? option?.value ?? "");
                const externalId = normalizeText(option?.value ?? "");
                if (!text) continue;

                playerCandidates.push({
                  text,
                  externalId,
                  teamName: teamOption.text,
                });
              }
            }

            return {
              teams: uniqueBy(teamsToQuery, (item) => `${item.text}|${item.externalId}`),
              players: uniqueBy(playerCandidates, (item) => `${item.text}|${item.externalId}`),
              reason: "dash-callback-options",
            };
          } catch {
            return { teams: [], players: [], reason: "dash-callback-error" };
          }
        }, teamNames);

    return {
      teams: (options?.teams?.length ? options.teams : dashOptions?.teams) || [],
      players: (options?.players?.length ? options.players : dashOptions?.players) || [],
      selectionDebug,
      sourceDebug: {
        initialSelectTeams: options?.teams?.length || 0,
        initialSelectPlayers: options?.players?.length || 0,
        dashTeams: dashOptions?.teams?.length || 0,
        dashPlayers: dashOptions?.players?.length || 0,
        dashReason: dashOptions?.reason || null,
      },
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

router.get("/:widgetId/selector-options", async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId, 10);
    if (Number.isNaN(widgetId)) {
      return res.status(400).json({ success: false, message: "Invalid widgetId" });
    }

    const widgetResult = await pool.query(selectWidgetById, [widgetId]);
    if (widgetResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: `Widget ${widgetId} not found` });
    }

    const widget = widgetResult.rows[0];
    const widgetName = widget.widget_name || widget.name || `Widget ${widgetId}`;
    const redirectLink = widget.redirect_link || widget.redirectlink || null;

    if (!redirectLink) {
      return res.status(400).json({
        success: false,
        message: `${widgetName} has no redirect link configured`,
      });
    }

    const requestedTeamIds = parseIdList(req.query.teamIds)
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const requestedTeamNames = parseIdList(req.query.teamNames)
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    const now = Date.now();
    const cacheKey = `${widgetId}::teams=${requestedTeamIds
      .map((value) => value.toLowerCase())
      .sort()
      .join("|")}::teamNames=${requestedTeamNames
      .map((value) => value.toLowerCase())
      .sort()
      .join("|")}`;
    const cacheEntry = selectorOptionsCache.get(cacheKey);
    if (cacheEntry && cacheEntry.expiresAt > now) {
      return res.status(200).json({
        success: true,
        message: `${widgetName} selector options retrieved from cache`,
        data: cacheEntry.data,
      });
    }

    const localPlayersResult = await pool.query(`
      SELECT
        p.player_id::text AS player_id,
        p.player_name,
        p.team_id::text AS team_id,
        COALESCE(t.team_name, 'Unknown Team') AS team_name,
        COALESCE(p.player_batting_handedness, 'Unknown') AS position
      FROM player p
      LEFT JOIN team t ON t.team_id = p.team_id
    `);

    const localDbPlayerOptions = localPlayersResult.rows.map((row) => ({
      text: row.player_name,
      externalId: null,
    }));

    let sourceOptions;
    try {
      sourceOptions = isHittingAnalyticsWidget(widgetId, widgetName, redirectLink)
        ? await fetchHittingWidgetPlayerOptions()
        : isCountBasedWidget(widgetId, widgetName, redirectLink)
          ? await fetchCountBasedWidgetPlayerOptions(redirectLink)
        : isSluggerPitcherWidget(widgetId, widgetName, redirectLink)
          ? (await fetchSluggerPitcherOptionsViaBrowser(redirectLink, { teamNames: requestedTeamNames })).players
        : isPlayerPortalWidget(widgetId, widgetName, redirectLink)
          ? localDbPlayerOptions
        : isGeneralStatisticsWidget(widgetId, widgetName, redirectLink)
          ? await fetchGeneralStatisticsOptionsViaBrowser(redirectLink)
          : await fetchWidgetSelectorOptionsViaBrowser(redirectLink);
    } catch (browserError) {
      console.warn(`[Widget Selector Options] Browser extraction failed for widget ${widgetId} (${widgetName}), falling back to local DB:`, browserError?.message || browserError);
      sourceOptions = localDbPlayerOptions;
    }

    if (
      sourceOptions.length === 0 &&
      (isGeneralStatisticsWidget(widgetId, widgetName, redirectLink) ||
       isPlayerPortalWidget(widgetId, widgetName, redirectLink))
    ) {
      sourceOptions = localDbPlayerOptions;
    }

    const playerLookup = buildPlayerLookupMap(localPlayersResult.rows);

    const mappedPlayers = [];

    const isSluggerPitcher = isSluggerPitcherWidget(widgetId, widgetName, redirectLink);

    for (const option of sourceOptions) {
      const local = resolveLocalPlayerFromOption(option.text, playerLookup);
      if (local) {
        const rawName = String(option.text || "").trim() || local.player_name;
        const rawTeamName = String(option.teamName || "").trim();
        const effectiveTeamName = rawTeamName || local.team_name;
        const effectiveTeamId = rawTeamName
          ? `slugger-team:${rawTeamName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "") || "unknown-team"}`
          : local.team_id;

        mappedPlayers.push({
          id: isSluggerPitcher ? `slugger:${local.player_id}` : local.player_id,
          name: isSluggerPitcher ? rawName : local.player_name,
          teamId: isSluggerPitcher ? effectiveTeamId : local.team_id,
          teamName: isSluggerPitcher ? effectiveTeamName : local.team_name,
          position: local.position,
          externalId: option.externalId || null,
          sourceLabel: option.text,
        });
        continue;
      }

      if (isSluggerPitcher) {
        const rawName = String(option.text || "").trim();
        const rawTeamName = String(option.teamName || "Unknown Team").trim() || "Unknown Team";
        const slugTeamKey = rawTeamName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown-team";
        const slugPlayerKey = rawName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown-player";

        mappedPlayers.push({
          id: `slugger:${slugTeamKey}:${option.externalId || slugPlayerKey}`,
          name: rawName,
          teamId: `slugger-team:${slugTeamKey}`,
          teamName: rawTeamName,
          position: "Unknown",
          externalId: option.externalId || null,
          sourceLabel: option.text,
        });
      }
    }

    const requestedTeamIdSet = new Set(requestedTeamIds.map((value) => value.toLowerCase()));
    const requestedTeamNameSet = new Set(requestedTeamNames.map((name) => name.toLowerCase()));
    const finalPlayers = mappedPlayers.filter((player) => {
      const teamId = String(player.teamId || "").toLowerCase();
      const teamName = String(player.teamName || "").toLowerCase();

      if (requestedTeamIdSet.size > 0 && !requestedTeamIdSet.has(teamId)) {
        return false;
      }

      if (requestedTeamNameSet.size > 0 && !requestedTeamNameSet.has(teamName)) {
        return false;
      }

      return true;
    });

    const teamsMap = new Map();
    for (const player of finalPlayers) {
      if (!teamsMap.has(player.teamId)) {
        teamsMap.set(player.teamId, {
          id: player.teamId,
          name: player.teamName,
        });
      }
    }

    const data = {
      widgetId,
      widgetName,
      teams: Array.from(teamsMap.values()),
      players: finalPlayers,
      metadata: {
        sourceOptionCount: sourceOptions.length,
        mappedPlayerCount: finalPlayers.length,
      },
    };

    selectorOptionsCache.set(cacheKey, {
      expiresAt: now + 5 * 60 * 1000,
      data,
    });

    return res.status(200).json({
      success: true,
      message: `${widgetName} selector options retrieved successfully`,
      data,
    });
  } catch (error) {
    console.error("[Widget Selector Options] Error:", error);
    return res.status(500).json({
      success: false,
      message: `Failed to fetch selector options: ${error.message}`,
    });
  }
});

const selectHittingPlayerInPage = async (page, rawPlayerName) => {
  const playerName = String(rawPlayerName || "").trim();
  if (!playerName) return false;

  const tokens = playerName
    .toLowerCase()
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);

  const directSelectApplied = await page.evaluate((targetName, targetTokens) => {
    const select = document.querySelector("#player");
    if (!select || !(select instanceof HTMLSelectElement)) return false;

    const normalize = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    const target = normalize(targetName);
    let bestValue = "";
    let bestScore = -1;

    for (const option of Array.from(select.options)) {
      const text = normalize(option.textContent || option.label || "");
      if (!text) continue;

      let score = 0;
      if (text.includes(target)) score += 5;
      if (target.includes(text)) score += 2;
      for (const token of targetTokens) {
        if (text.includes(token)) score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestValue = option.value;
      }
    }

    if (!bestValue || bestScore <= 0) return false;

    select.value = bestValue;
    select.dispatchEvent(new Event("change", { bubbles: true }));

    if (window.Shiny && typeof window.Shiny.setInputValue === "function") {
      window.Shiny.setInputValue("player", bestValue, { priority: "event" });
    }

    return true;
  }, playerName, tokens);

  if (directSelectApplied) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    return true;
  }

  const playerSearchInput = await page.$("#player-selectized");
  if (playerSearchInput) {
    await playerSearchInput.click({ clickCount: 3 });
    await page.keyboard.press("Backspace");
    await playerSearchInput.type(playerName, { delay: 35 });
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const clickedFromPlayerDropdown = await page.evaluate((targetName, targetTokens) => {
      const options = Array.from(
        document.querySelectorAll(
          ".selectize-dropdown-content .option, .selectize-dropdown .option, [role='option']"
        )
      );

      const normalize = (value) =>
        String(value || "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

      const target = normalize(targetName);
      let bestOption = null;
      let bestScore = -1;

      for (const option of options) {
        const text = normalize(option.textContent || "");
        if (!text) continue;

        let score = 0;
        if (text.includes(target)) score += 5;
        if (target.includes(text)) score += 2;
        for (const token of targetTokens) {
          if (text.includes(token)) score += 1;
        }

        if (score > bestScore) {
          bestScore = score;
          bestOption = option;
        }
      }

      if (!bestOption || bestScore <= 0) return false;
      bestOption.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      bestOption.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      bestOption.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return true;
    }, playerName, tokens);

    if (clickedFromPlayerDropdown) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return true;
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const inputs = await page.$$("input, .selectize-input input, [role='combobox']");

    for (const input of inputs) {
      const isVisible = await input.evaluate((element) => {
        const htmlElement = element;
        const style = window.getComputedStyle(htmlElement);
        const rect = htmlElement.getBoundingClientRect();
        return (
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          rect.width > 0 &&
          rect.height > 0
        );
      });

      if (!isVisible) continue;

      await input.click({ clickCount: 3 });
      await page.keyboard.press("Backspace");
      await input.type(playerName, { delay: 35 });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const clickedOption = await page.evaluate((targetName, targetTokens) => {
        const selectors = [
          ".selectize-dropdown .option",
          ".selectize-dropdown-content .option",
          "[role='option']",
          "li[role='option']",
        ];

        const options = selectors
          .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
          .filter((element) => {
            const htmlElement = element;
            const style = window.getComputedStyle(htmlElement);
            const rect = htmlElement.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.height > 0;
          });

        if (options.length === 0) return false;

        const normalize = (value) =>
          String(value || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();

        const normalizedTarget = normalize(targetName);

        let bestOption = null;
        let bestScore = -1;

        for (const option of options) {
          const text = normalize(option.textContent || "");
          if (!text) continue;

          let score = 0;
          if (text.includes(normalizedTarget)) score += 5;
          if (normalizedTarget.includes(text)) score += 2;

          for (const token of targetTokens) {
            if (text.includes(token)) score += 1;
          }

          if (score > bestScore) {
            bestScore = score;
            bestOption = option;
          }
        }

        if (!bestOption || bestScore <= 0) return false;
        bestOption.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        bestOption.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        bestOption.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return true;
      }, playerName, tokens);

      if (clickedOption) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return true;
      }

      await page.keyboard.press("Enter");
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const hasTokenOnPage = await page.evaluate((targetTokens) => {
        const text = (document.body?.innerText || "").toLowerCase();
        return targetTokens.some((token) => text.includes(token));
      }, tokens);

      if (hasTokenOnPage) {
        return true;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
};

const selectCountBasedPlayerInPage = async (page, rawPlayerName) => {
  const searchTerms = buildCountBasedPlayerSearchTerms(rawPlayerName);
  if (searchTerms.length === 0) return { label: "", foundInWidget: false };

  try {
    await page.waitForSelector("#player_name", { timeout: 20000 });
  } catch {
    return { label: "", foundInWidget: false };
  }

  let anyTermReturnedOptions = false;

  for (const searchTerm of searchTerms) {
    const searchSubmitted = await page.evaluate((term) => {
      const input = document.querySelector("#player_name");
      if (!(input instanceof HTMLInputElement)) return false;

      const submitButton = document.querySelector("#search");

      input.focus();
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      input.value = term;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      if (window.Shiny && typeof window.Shiny.setInputValue === "function") {
        window.Shiny.setInputValue("player_name", term, { priority: "event" });
        const currentSearchValue = Number(window.Shiny?.shinyapp?.$inputValues?.search || 0) || 0;
        window.Shiny.setInputValue("search", currentSearchValue + 1, { priority: "event" });
      }

      if (submitButton instanceof HTMLElement) {
        submitButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        submitButton.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        submitButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }

      return true;
    }, searchTerm);

    if (!searchSubmitted) continue;

    await new Promise((resolve) => setTimeout(resolve, 3500));

    try {
      await page.waitForFunction(
        () => {
          const select = document.querySelector("#player_selection_ui select");
          if (!(select instanceof HTMLSelectElement)) return false;
          return Array.from(select.options).some(
            (option) => Boolean(option.value) && !/select player/i.test(option.textContent || "")
          );
        },
        { timeout: 12000 }
      );
    } catch {
      continue;
    }

    const options = await page.evaluate(() => {
      const select = document.querySelector("#player_selection_ui select");
      if (!(select instanceof HTMLSelectElement)) return [];
      return Array.from(select.options)
        .filter((option) => Boolean(option.value) && !/select player/i.test(option.textContent || ""))
        .map((option) => ({
          value: option.value,
          text: String(option.textContent || option.label || "").replace(/\s+/g, " ").trim(),
        }))
        .filter((row) => row.text.length > 0);
    });

    if (options.length === 0) {
      continue;
    }

    anyTermReturnedOptions = true;

    let best = null;
    for (const option of options) {
      let score = 0;
      if (namesLikelyMatch(rawPlayerName, option.text)) score += 10;

      const requestedTokens = tokenizeComparableName(rawPlayerName);
      const optionNorm = normalizeComparableName(option.text);
      for (const token of requestedTokens) {
        if (optionNorm.includes(token)) score += 1;
      }

      if (!best || score > best.score) {
        best = { ...option, score };
      }
    }

    if (!best || best.score <= 0) {
      continue;
    }

    const selectedLabel = await page.evaluate((bestValue) => {
      const select = document.querySelector("#player_selection_ui select");
      if (!(select instanceof HTMLSelectElement)) return "";

      select.value = bestValue;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));

      const selectedOption = Array.from(select.options).find((o) => o.value === bestValue);
      return String(selectedOption?.textContent || selectedOption?.label || "").replace(/\s+/g, " ").trim();
    }, best.value);

    if (selectedLabel) {
      await new Promise((resolve) => setTimeout(resolve, 4500));
      return { label: selectedLabel, foundInWidget: true };
    }
  }

  return { label: "", foundInWidget: anyTermReturnedOptions };
};

const waitForPdfRenderStability = async (
  page,
  { timeoutMs = 12000, fallbackMs = 1800 } = {}
) => {
  let settledBySignal = false;

  try {
    await page.waitForFunction(
      () => {
        const body = document.body;
        if (!body) return false;

        const textLength = (body.innerText || "").trim().length;
        if (textLength < 200) return false;

        const loadingNode = document.querySelector(
          '.shiny-busy, [aria-busy="true"], .spinner, .loading, .recalculating'
        );
        return !loadingNode;
      },
      { timeout: timeoutMs }
    );
    settledBySignal = true;
  } catch {
    // fall through to conservative fallback wait
  }

  // Keep a short settle delay so late paint/layout can complete.
  await new Promise((resolve) =>
    setTimeout(resolve, settledBySignal ? 700 : fallbackMs)
  );
};

const selectSluggerPitcherFiltersInPage = async (page, { teamNames = [], playerNames = [], playerExternalIds = [] }) => {
  const runEvaluateWithRetry = async (pageFunction, ...args) => {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await page.evaluate(pageFunction, ...args);
      } catch (error) {
        const message = String(error?.message || "");
        const isContextLoss =
          message.includes("Execution context was destroyed") ||
          message.includes("Cannot find context with specified id") ||
          message.includes("Most likely the page has been closed") ||
          message.includes("Target closed");

        if (!isContextLoss || attempt >= maxAttempts) {
          throw error;
        }

        await waitForPdfRenderStability(page, { timeoutMs: 10000, fallbackMs: 2400 });
      }
    }

    return null;
  };

  const runEvaluateAcrossFramesWithRetry = async (pageFunction, args = [], isGoodResult = () => false) => {
    const maxAttempts = 3;
    let bestResult = null;

    const getResultScore = (result) => {
      if (!result || typeof result !== "object") return 0;
      if (result.selected) return 1000;

      const availableOptions = Array.isArray(result.availableOptions)
        ? result.availableOptions.length
        : 0;
      const availableValues = Array.isArray(result.availableValues)
        ? result.availableValues.length
        : 0;
      const selectCount = Number(result?.debugLog?.querySelectorResult || 0);
      const visibleSelectCount = Number(result?.debugLog?.visibleSelectsFound || 0);

      return availableOptions + availableValues + selectCount + visibleSelectCount;
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let sawContextLoss = false;

      try {
        const frames = [page.mainFrame(), ...page.frames().filter((frame) => frame !== page.mainFrame())];

        for (const frame of frames) {
          try {
            const result = await frame.evaluate(pageFunction, ...args);
            const withFrameInfo = {
              ...(result && typeof result === "object" ? result : { value: result }),
              frameUrl: frame.url(),
              frameName: frame.name(),
            };

            if (isGoodResult(withFrameInfo)) {
              return withFrameInfo;
            }

            if (!bestResult || getResultScore(withFrameInfo) > getResultScore(bestResult)) {
              bestResult = withFrameInfo;
            }
          } catch (error) {
            const message = String(error?.message || "");
            const isContextLoss =
              message.includes("Execution context was destroyed") ||
              message.includes("Cannot find context with specified id") ||
              message.includes("Most likely the page has been closed") ||
              message.includes("Target closed");

            if (isContextLoss) {
              sawContextLoss = true;
              continue;
            }

            throw error;
          }
        }

        if (!sawContextLoss) {
          break;
        }
      } catch (error) {
        const message = String(error?.message || "");
        const isContextLoss =
          message.includes("Execution context was destroyed") ||
          message.includes("Cannot find context with specified id") ||
          message.includes("Most likely the page has been closed") ||
          message.includes("Target closed");

        if (!isContextLoss || attempt >= maxAttempts) {
          throw error;
        }
      }

      await waitForPdfRenderStability(page, { timeoutMs: 10000, fallbackMs: 2400 });
    }

    return bestResult;
  };

  const pickByOptionValues = async (requestedValues) => {
    const normalizedRequestedValues = requestedValues
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    if (normalizedRequestedValues.length === 0) {
      return {
        selected: false,
        requestedValues: normalizedRequestedValues,
        selectedText: null,
        selectedValue: null,
        availableValues: [],
      };
    }

    return runEvaluateAcrossFramesWithRetry((requestedOptionValues) => {
      const requestedSet = new Set(
        requestedOptionValues
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      );

      const allSelects = Array.from(document.querySelectorAll("select"));
      const visibleSelects = allSelects.filter((selectElement) => {
        const style = window.getComputedStyle(selectElement);
        const rect = selectElement.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      });
      const candidateSelects = visibleSelects.length > 0
        ? visibleSelects
        : allSelects.filter((selectElement) => {
            const options = Array.from(selectElement.options || []);
            return options.length > 0;
          });

      let best = null;

      for (const selectElement of candidateSelects) {
        const options = Array.from(selectElement.options || []);
        const availableValues = options
          .map((option) => String(option.value || "").trim())
          .filter(Boolean);

        const matches = options.filter((option) => requestedSet.has(String(option.value || "").trim()));
        if (matches.length === 0) continue;

        if (!best || matches.length > best.matches.length) {
          best = {
            selectElement,
            options,
            matches,
            availableValues,
          };
        }
      }

      if (!best) {
        return {
          selected: false,
          requestedValues: requestedOptionValues,
          selectedText: null,
          selectedValue: null,
          availableValues: [],
          debugLog: {
            visibleSelectsFound: visibleSelects.length,
            totalSelectsFound: allSelects.length,
            candidateSelectsUsed: candidateSelects.length,
            usedHiddenSelectFallback: visibleSelects.length === 0 && candidateSelects.length > 0,
            requestedSetSize: requestedSet.size,
            reason: "No select element matched requested values",
          },
        };
      }

      const pickedOption = best.matches[0];
      best.selectElement.value = pickedOption.value;
      best.selectElement.dispatchEvent(new Event("input", { bubbles: true }));
      best.selectElement.dispatchEvent(new Event("change", { bubbles: true }));

      return {
        selected: true,
        requestedValues: requestedOptionValues,
        selectedText: String(pickedOption.textContent || pickedOption.label || "").trim(),
        selectedValue: String(pickedOption.value || "").trim(),
        availableValues: best.availableValues.slice(0, 120),
      };
    }, [normalizedRequestedValues], (result) => Boolean(result?.selected));
  };

  const pickByRequestedNames = async (requestedNames, fieldKeywords) => {
    const requested = requestedNames
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    if (requested.length === 0) {
      return {
        selected: false,
        requested,
        selectedText: null,
        matchedRequestedName: null,
        availableOptions: [],
      };
    }

    return runEvaluateAcrossFramesWithRetry((requestedValues, keywords) => {
      const normalize = (value) =>
        String(value || "")
          .toLowerCase()
          .replace(/\([^)]*\)/g, " ")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();

      const expandRequestedVariants = (requestedValue) => {
        const original = String(requestedValue || "").trim();
        if (!original) return [];

        const variants = [original];
        if (original.includes(",")) {
          const [last = "", first = ""] = original.split(",");
          const swapped = `${first.trim()} ${last.trim()}`.trim();
          if (swapped) variants.push(swapped);
        }
        return Array.from(new Set(variants));
      };

      const tokenize = (value) =>
        normalize(value)
          .split(/\s+/)
          .filter((token) => token.length >= 2);

      const requested = requestedValues.map((value) => String(value || "").trim()).filter(Boolean);

      const requestedGroups = requested.map((value) => {
        const variants = expandRequestedVariants(value);
        return {
          original: value,
          variants,
          normalizedVariants: variants.map((variant) => normalize(variant)).filter(Boolean),
          tokenVariants: variants.map((variant) => tokenize(variant)),
        };
      });

      const allSelectElements = Array.from(document.querySelectorAll("select"));
      const visibleSelectElements = allSelectElements.filter((selectElement) => {
        const style = window.getComputedStyle(selectElement);
        const rect = selectElement.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      });
      const selectElements = visibleSelectElements.length > 0
        ? visibleSelectElements
        : allSelectElements.filter((selectElement) => {
            const options = Array.from(selectElement.options || []);
            return options.length > 0;
          });

      if (selectElements.length === 0) {
        return {
          selected: false,
          requested,
          selectedText: null,
          matchedRequestedName: null,
          availableOptions: [],
          reason: "No visible select elements",
          debugLog: {
            querySelectorResult: allSelectElements.length,
            visibleSelectResult: visibleSelectElements.length,
            usedHiddenSelectFallback: false,
            requested,
          },
        };
      }

      const scoreOptionAgainstGroup = (optionText, group) => {
        let best = 0;

        group.normalizedVariants.forEach((requestedNorm, variantIndex) => {
          if (!requestedNorm) return;
          let score = 0;

          if (optionText === requestedNorm) score += 16;
          if (optionText.includes(requestedNorm)) score += 10;
          if (requestedNorm.includes(optionText) && optionText.length > 6) score += 4;

          const tokens = group.tokenVariants[variantIndex] || [];
          for (const token of tokens) {
            if (optionText.includes(token)) score += 2;
          }

          const words = requestedNorm.split(/\s+/).filter(Boolean);
          const lastName = words.length > 0 ? words[words.length - 1] : "";
          const firstName = words.length > 0 ? words[0] : "";
          if (lastName && optionText.includes(lastName)) score += 2;
          if (firstName && firstName.length >= 3 && optionText.includes(firstName)) score += 1;

          if (score > best) best = score;
        });

        return best;
      };

      const selectCandidates = selectElements.map((selectElement) => {
        const options = Array.from(selectElement.options || []);
        const optionsSnapshot = options
          .map((option) => String(option.textContent || option.label || "").trim())
          .filter(Boolean)
          .slice(0, 120);

        let bestOption = null;
        let bestScore = -1;
        let matchedRequestedName = null;

        for (const optionElement of options) {
          const optionText = normalize(optionElement.textContent || optionElement.label || "");
          if (!optionText) continue;

          for (const group of requestedGroups) {
            const score = scoreOptionAgainstGroup(optionText, group);
            if (score > bestScore) {
              bestScore = score;
              bestOption = optionElement;
              matchedRequestedName = group.original;
            }
          }
        }

        return {
          selectElement,
          optionsSnapshot,
          bestOption,
          bestScore,
          matchedRequestedName,
        };
      });

      const rankedCandidates = selectCandidates
        .slice()
        .sort((a, b) => b.bestScore - a.bestScore);

      const target = rankedCandidates[0];
      if (!target) {
        return {
          selected: false,
          requested,
          selectedText: null,
          matchedRequestedName: null,
          availableOptions: [],
          reason: "No select candidates",
          debugLog: {
            selectElementCount: selectElements.length,
            candidateCount: rankedCandidates.length,
            totalSelectElementCount: allSelectElements.length,
            visibleSelectElementCount: visibleSelectElements.length,
            usedHiddenSelectFallback: visibleSelectElements.length === 0 && selectElements.length > 0,
            requested,
          },
        };
      }

      if (!target.bestOption || target.bestScore <= 0) {
        const topOptions = rankedCandidates.slice(0, 3).map((c) => ({
          bestScore: c.bestScore,
          matchedName: c.matchedRequestedName,
          options: c.optionsSnapshot.slice(0, 10),
        }));
        return {
          selected: false,
          requested,
          selectedText: null,
          matchedRequestedName: null,
          availableOptions: target.optionsSnapshot,
          reason: "No matching option",
          debugLog: {
            requested,
            totalSelectElementCount: allSelectElements.length,
            visibleSelectElementCount: visibleSelectElements.length,
            usedHiddenSelectFallback: visibleSelectElements.length === 0 && selectElements.length > 0,
            topCandidates: topOptions,
          },
        };
      }

      target.selectElement.value = target.bestOption.value;
      target.selectElement.dispatchEvent(new Event("input", { bubbles: true }));
      target.selectElement.dispatchEvent(new Event("change", { bubbles: true }));

      return {
        selected: true,
        requested,
        selectedText: String(target.bestOption.textContent || target.bestOption.label || "").trim(),
        matchedRequestedName: target.matchedRequestedName,
        availableOptions: target.optionsSnapshot,
        bestScore: target.bestScore,
      };
    }, [requested, fieldKeywords], (result) => Boolean(result?.selected));
  };

  const pickByDashDropdownValue = async (controlId, requestedValues, waitAfterMs = 1200, options = {}) => {
    const { matchByValue = false } = options;
    const requested = requestedValues
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    if (requested.length === 0) {
      return {
        selected: false,
        requested,
        selectedText: null,
        matchedRequestedName: null,
        availableOptions: [],
        reason: "No requested values",
      };
    }

    const controlSelector = `#${controlId}`;
    const controlExists = await page.$(controlSelector);
    if (!controlExists) {
      return {
        selected: false,
        requested,
        selectedText: null,
        matchedRequestedName: null,
        availableOptions: [],
        reason: "Dash control not found",
        debugLog: {
          controlId,
          requested,
        },
      };
    }

    for (const requestedValue of requested) {
      try {
        const setPropsAttempt = await page.evaluate((targetControlId, targetValue) => {
          const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();

          const findById = (node, id) => {
            if (!node || typeof node !== "object") return null;
            if (node.props && node.props.id === id) return node;

            const children = node.props?.children;
            if (Array.isArray(children)) {
              for (const child of children) {
                const found = findById(child, id);
                if (found) return found;
              }
            } else if (children && typeof children === "object") {
              const found = findById(children, id);
              if (found) return found;
            }

            return null;
          };

          if (!window?.dash_clientside?.set_props) {
            return {
              setPropsAvailable: false,
              requestedValue: targetValue,
              currentValue: null,
              selectedText: "",
            };
          }

          try {
            window.dash_clientside.set_props(targetControlId, { value: targetValue });
          } catch {
            // fall through to return current snapshot
          }

          const layout = window.store?.getState?.()?.layout?.components;
          const component = findById(layout, targetControlId);
          const currentValue = component?.props?.value ?? null;

          const control = document.querySelector(`#${targetControlId}`);
          const valueNode = control?.querySelector(
            ".Select-value-label, .VirtualizedSelectFocusedOption, .react-select__single-value, .Select-value"
          );

          const selectedText = valueNode
            ? normalizeText(valueNode.textContent || "")
            : "";

          return {
            setPropsAvailable: true,
            requestedValue: targetValue,
            currentValue: currentValue == null ? null : String(currentValue),
            selectedText,
          };
        }, controlId, requestedValue);

        await new Promise((resolve) => setTimeout(resolve, waitAfterMs));

        if (setPropsAttempt?.setPropsAvailable) {
          const postSetSnapshot = await page.evaluate((targetControlId) => {
            const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();

            const findById = (node, id) => {
              if (!node || typeof node !== "object") return null;
              if (node.props && node.props.id === id) return node;

              const children = node.props?.children;
              if (Array.isArray(children)) {
                for (const child of children) {
                  const found = findById(child, id);
                  if (found) return found;
                }
              } else if (children && typeof children === "object") {
                const found = findById(children, id);
                if (found) return found;
              }

              return null;
            };

            const layout = window.store?.getState?.()?.layout?.components;
            const component = findById(layout, targetControlId);
            const currentValue = component?.props?.value ?? null;

            const control = document.querySelector(`#${targetControlId}`);
            const valueNode = control?.querySelector(
              ".Select-value-label, .VirtualizedSelectFocusedOption, .react-select__single-value, .Select-value"
            );

            const selectedText = valueNode
              ? normalizeText(valueNode.textContent || "")
              : "";

            return {
              currentValue: currentValue == null ? null : String(currentValue),
              selectedText,
              valueNodeFound: Boolean(valueNode),
            };
          }, controlId);

          const selectedText = String(postSetSnapshot?.selectedText || "").trim();
          const currentValue = String(postSetSnapshot?.currentValue || "").trim();

          const matched = matchByValue
            ? currentValue.length > 0 && currentValue === String(requestedValue)
            : selectedText.length > 0 && namesLikelyMatch(requestedValue, selectedText);

          if (matched) {
            return {
              selected: true,
              requested,
              selectedText: selectedText || null,
              selectedValue: currentValue || null,
              matchedRequestedName: requestedValue,
              availableOptions: [],
              matchedBy: matchByValue ? "dash-set-props-value" : "dash-set-props-name",
            };
          }
        }

        await page.click(controlSelector, { delay: 30 });
        await new Promise((resolve) => setTimeout(resolve, 250));

        const inputHandle = await page.$(`${controlSelector} input`);
        if (inputHandle) {
          await inputHandle.click({ delay: 20 });
          await page.keyboard.down("Meta");
          await page.keyboard.press("A");
          await page.keyboard.up("Meta");
          await page.keyboard.press("Backspace");
          await page.keyboard.type(requestedValue, { delay: 18 });
          await new Promise((resolve) => setTimeout(resolve, 280));
          await page.keyboard.press("Enter");
        }

        const optionClickResult = await page.evaluate((targetValue) => {
          const normalize = (value) =>
            String(value || "")
              .toLowerCase()
              .replace(/\([^)]*\)/g, " ")
              .replace(/[^a-z0-9]+/g, " ")
              .replace(/\s+/g, " ")
              .trim();

          const targetNorm = normalize(targetValue);
          const optionNodes = Array.from(
            document.querySelectorAll(
              ".VirtualizedSelectOption, .Select-option, [role='option'], .react-select__option"
            )
          );

          let bestNode = null;
          let bestScore = -1;

          for (const node of optionNodes) {
            const text = String(node.textContent || "").trim();
            const textNorm = normalize(text);
            if (!textNorm) continue;

            let score = 0;
            if (textNorm === targetNorm) score += 20;
            if (textNorm.includes(targetNorm)) score += 12;
            if (targetNorm.includes(textNorm) && textNorm.length > 5) score += 4;

            const tokens = targetNorm.split(/\s+/).filter((token) => token.length >= 2);
            for (const token of tokens) {
              if (textNorm.includes(token)) score += 2;
            }

            if (score > bestScore) {
              bestScore = score;
              bestNode = node;
            }
          }

          if (!bestNode || bestScore <= 0) {
            return {
              clicked: false,
              bestScore,
              optionCount: optionNodes.length,
            };
          }

          bestNode.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
          bestNode.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
          bestNode.dispatchEvent(new MouseEvent("click", { bubbles: true }));

          return {
            clicked: true,
            clickedText: String(bestNode.textContent || "").trim(),
            bestScore,
            optionCount: optionNodes.length,
          };
        }, requestedValue);

        if (optionClickResult?.clicked) {
          await new Promise((resolve) => setTimeout(resolve, 220));
        }

        await new Promise((resolve) => setTimeout(resolve, waitAfterMs));

        const selectedSnapshot = await page.evaluate((selector) => {
          const findById = (node, id) => {
            if (!node || typeof node !== "object") return null;
            if (node.props && node.props.id === id) return node;

            const children = node.props?.children;
            if (Array.isArray(children)) {
              for (const child of children) {
                const found = findById(child, id);
                if (found) return found;
              }
            } else if (children && typeof children === "object") {
              const found = findById(children, id);
              if (found) return found;
            }

            return null;
          };

          const control = document.querySelector(selector);
          if (!control) return { selectedText: "", valueNodeFound: false, controlText: "" };

          const valueNode = control.querySelector(
            ".Select-value-label, .VirtualizedSelectFocusedOption, .react-select__single-value, .Select-value"
          );

          const selectedText = valueNode
            ? String(valueNode.textContent || "").replace(/\s+/g, " ").trim()
            : "";

          const controlText = String(control.textContent || "").replace(/\s+/g, " ").trim();
          const controlId = String(selector || "").replace(/^#/, "");
          const layout = window.store?.getState?.()?.layout?.components;
          const component = findById(layout, controlId);
          const currentValue = component?.props?.value ?? null;

          return {
            selectedText,
            valueNodeFound: Boolean(valueNode),
            controlText,
            currentValue: currentValue == null ? null : String(currentValue),
          };
        }, controlSelector);

        const selectedText = String(selectedSnapshot?.selectedText || "").trim();
        const valueNodeFound = Boolean(selectedSnapshot?.valueNodeFound);
        const currentValue = String(selectedSnapshot?.currentValue || "").trim();
        const matched = matchByValue
          ? currentValue.length > 0 && currentValue === String(requestedValue)
          : valueNodeFound && selectedText && namesLikelyMatch(requestedValue, selectedText);

        if (matched) {
          return {
            selected: true,
            requested,
            selectedText,
            selectedValue: currentValue || null,
            matchedRequestedName: requestedValue,
            availableOptions: [],
            matchedBy: matchByValue ? "dash-dropdown-value" : "dash-dropdown",
          };
        }
      } catch (error) {
        // try next requested value
      }
    }

    const controlTextSnapshot = await page.evaluate((selector) => {
      const control = document.querySelector(selector);
      if (!control) return "";
      return String(control.textContent || "").replace(/\s+/g, " ").trim();
    }, controlSelector);

    return {
      selected: false,
      requested,
      selectedText: null,
      matchedRequestedName: null,
      availableOptions: [],
      reason: "Dash control selection failed",
      debugLog: {
        controlId,
        controlTextSnapshot,
      },
    };
  };

  let teamDebug = await pickByRequestedNames(teamNames, ["team"]);
  console.log(`[PDF Export] Team selection (teamNames=${JSON.stringify(teamNames)}):`, JSON.stringify(teamDebug, null, 2));
  if (teamDebug?.selected) {
    await waitForPdfRenderStability(page, { timeoutMs: 10000, fallbackMs: 2600 });
  } else if (teamNames.length > 0 && teamDebug?.reason === "No visible select elements") {
    const dashTeamDebug = await pickByDashDropdownValue("selected-team", teamNames, 1600);
    console.log(`[PDF Export] Team selection via Dash dropdown fallback:`, JSON.stringify(dashTeamDebug, null, 2));
    if (dashTeamDebug?.selected) {
      teamDebug = {
        ...dashTeamDebug,
        reason: null,
      };
      await waitForPdfRenderStability(page, { timeoutMs: 12000, fallbackMs: 3200 });
    }
  }

  const pitcherByExternalIdDebug = await pickByOptionValues(playerExternalIds);
  console.log(`[PDF Export] Pitcher-by-externalId (playerExternalIds=${JSON.stringify(playerExternalIds)}):`, JSON.stringify(pitcherByExternalIdDebug, null, 2));
  if (pitcherByExternalIdDebug?.selected) {
    await new Promise((resolve) => setTimeout(resolve, 3500));
  }

  let pitcherDebug = pitcherByExternalIdDebug?.selected
    ? {
        selected: true,
        requested: playerNames,
        selectedText: pitcherByExternalIdDebug.selectedText,
        matchedRequestedName: null,
        availableOptions: [],
        matchedBy: "externalId",
        selectedValue: pitcherByExternalIdDebug.selectedValue,
      }
    : await pickByRequestedNames(playerNames, ["pitcher", "player"]);

  if (!pitcherByExternalIdDebug?.selected && playerNames.length > 0 && !pitcherDebug?.selected && pitcherDebug?.reason === "No visible select elements") {
    let dashPitcherByExternalIdDebug = null;

    if (playerExternalIds.length > 0) {
      dashPitcherByExternalIdDebug = await pickByDashDropdownValue("selected-player", playerExternalIds, 2200, { matchByValue: true });
      console.log(`[PDF Export] Pitcher selection via Dash set_props externalId fallback:`, JSON.stringify(dashPitcherByExternalIdDebug, null, 2));
    }

    if (dashPitcherByExternalIdDebug?.selected) {
      pitcherDebug = {
        selected: true,
        requested: playerNames,
        selectedText: dashPitcherByExternalIdDebug.selectedText,
        matchedRequestedName: playerNames[0] || null,
        availableOptions: [],
        matchedBy: dashPitcherByExternalIdDebug.matchedBy || "dash-set-props-value",
        selectedValue: dashPitcherByExternalIdDebug.selectedValue || null,
        reason: null,
      };
    }

    const dashPitcherDebug = await pickByDashDropdownValue("selected-player", playerNames, 1900);
    console.log(`[PDF Export] Pitcher selection via Dash dropdown fallback:`, JSON.stringify(dashPitcherDebug, null, 2));
    if (!pitcherDebug?.selected && dashPitcherDebug?.selected) {
      pitcherDebug = {
        ...dashPitcherDebug,
        reason: null,
      };
    }
  }

  console.log(`[PDF Export] Pitcher-by-name (playerNames=${JSON.stringify(playerNames)}):`, JSON.stringify(pitcherDebug, null, 2));

  if (!pitcherByExternalIdDebug?.selected && pitcherDebug?.selected) {
    await new Promise((resolve) => setTimeout(resolve, 3500));
  }

  return {
    team: teamDebug,
    pitcherByExternalId: pitcherByExternalIdDebug,
    pitcher: pitcherDebug,
  };
};

const selectGeneralStatisticsPlayerInPage = async (page, { playerNames = [] }) => {
  const requested = playerNames
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (requested.length === 0) {
    return {
      selected: false,
      requested,
      selectedText: null,
      matchedRequestedName: null,
      availableOptions: [],
      reason: "No requested players",
    };
  }

  const runSelectionInFrame = async (frame, requestedNames) => {
    const frameResult = await frame.evaluate(async (requestedNamesInner) => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const normalize = (value) =>
        String(value || "")
          .toLowerCase()
          .replace(/\([^)]*\)/g, " ")
          .replace(/[^a-z0-9]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const likelyMatch = (requestedName, selectedName) => {
        const requestedNorm = normalize(requestedName);
        const selectedNorm = normalize(selectedName);
        if (!requestedNorm || !selectedNorm) return false;
        if (requestedNorm === selectedNorm) return true;
        if (selectedNorm.includes(requestedNorm)) return true;

        const requestedTokens = requestedNorm.split(/\s+/).filter((token) => token.length >= 2);
        if (requestedTokens.length === 0) return false;

        let hit = 0;
        for (const token of requestedTokens) {
          if (selectedNorm.includes(token)) hit += 1;
        }

        return hit >= Math.max(1, Math.min(2, requestedTokens.length));
      };

      const isVisible = (element) => {
        if (!element) return false;
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };

      const controls = Array.from(document.querySelectorAll("div[data-baseweb='select'], [role='combobox']"))
        .filter((element) => isVisible(element));

      const scoreControl = (control) => {
        const top = control.getBoundingClientRect().top;
        const parentText = normalize((control.parentElement?.textContent || "").slice(0, 500));
        const ownText = normalize((control.textContent || "").slice(0, 250));

        let score = 0;
        if (parentText.includes("select pitcher") || parentText.includes("select hitter") || parentText.includes("select player")) {
          score += 30;
        }

        if (parentText.includes("select stats") || parentText.includes("hot cold labels")) {
          score -= 20;
        }

        if (ownText.includes("date") || ownText.includes("opponent") || ownText.includes("location") || ownText.includes("np")) {
          score -= 12;
        }

        score += Math.max(0, 16 - Math.floor(Math.max(0, top) / 90));

        return score;
      };

      const rankedControls = controls
        .map((control) => ({ control, score: scoreControl(control) }))
        .sort((a, b) => b.score - a.score);

      const target = rankedControls[0]?.control || null;
      if (!target) {
        return {
          selected: false,
          requested: requestedNamesInner,
          selectedText: null,
          matchedRequestedName: null,
          availableOptions: [],
          reason: "No visible Streamlit select control",
          debugLog: {
            controlCount: controls.length,
            rankedScoreTop: rankedControls[0]?.score ?? null,
          },
        };
      }

      const collectOptions = () => {
        const optionNodes = Array.from(
          document.querySelectorAll("[role='option'], [data-baseweb='menu'] [role='button'], [data-baseweb='menu'] li")
        );
        const options = [];

        for (const node of optionNodes) {
          if (!isVisible(node)) continue;
          const text = String(node.textContent || "").replace(/\s+/g, " ").trim();
          if (!text) continue;
          options.push({ node, text, normalized: normalize(text) });
        }

        return options;
      };

      for (const requestedName of requestedNamesInner) {
        const requestedNorm = normalize(requestedName);

        target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await wait(260);

        const activeInput =
          target.querySelector("input") ||
          document.querySelector("input[aria-expanded='true']") ||
          document.querySelector("input[aria-autocomplete='list']");

        if (activeInput) {
          activeInput.focus();
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          if (setter) {
            setter.call(activeInput, "");
            activeInput.dispatchEvent(new Event("input", { bubbles: true }));
            setter.call(activeInput, requestedName);
            activeInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }

        await wait(420);

        const options = collectOptions();
        let best = null;
        let clickedOptionText = null;

        for (const option of options) {
          let score = 0;
          if (option.normalized === requestedNorm) score += 25;
          if (option.normalized.includes(requestedNorm)) score += 13;
          if (requestedNorm.includes(option.normalized) && option.normalized.length > 6) score += 4;

          const tokens = requestedNorm.split(/\s+/).filter((token) => token.length >= 2);
          for (const token of tokens) {
            if (option.normalized.includes(token)) score += 2;
          }

          if (!best || score > best.score) {
            best = { option, score };
          }
        }

        if (best && best.score > 0) {
          const bestOptionText = String(best.option.text || "").replace(/\s+/g, " ").trim();
          if (bestOptionText && likelyMatch(requestedName, bestOptionText)) {
            clickedOptionText = bestOptionText;
          }
          best.option.node.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
          best.option.node.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
          best.option.node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        }

        await wait(900);

        const selectedText = String(target.textContent || "").replace(/\s+/g, " ").trim();
        const renderedPlayerHeading = Array.from(document.querySelectorAll("h1, h2, h3, h4, [data-testid='stMarkdownContainer']"))
          .map((node) => String(node.textContent || "").replace(/\s+/g, " ").trim())
          .find((text) => {
            if (!text) return false;
            const lowered = normalize(text);
            return lowered.includes("game by game stats") || lowered.includes("season stats") || lowered.includes("pitcher");
          }) || "";

        const renderedHeadingMatches = renderedPlayerHeading && likelyMatch(requestedName, renderedPlayerHeading);
        const matchedByTypedInputOnly = selectedText && likelyMatch(requestedName, selectedText) && !clickedOptionText;
        if (matchedByTypedInputOnly && !renderedHeadingMatches) {
          continue;
        }

        if (
          (clickedOptionText && selectedText && likelyMatch(requestedName, selectedText)) ||
          renderedHeadingMatches
        ) {
          return {
            selected: true,
            requested: requestedNamesInner,
            selectedText,
            matchedRequestedName: requestedName,
            availableOptions: options.slice(0, 40).map((option) => option.text),
            matchedBy: renderedHeadingMatches ? "streamlit-rendered-heading" : "streamlit-select",
            debugLog: {
              clickedOptionText,
              renderedPlayerHeading: renderedPlayerHeading || null,
            },
          };
        }
      }

      const fallbackOptions = collectOptions().slice(0, 40).map((option) => option.text);
      const selectedText = String(target.textContent || "").replace(/\s+/g, " ").trim();

      return {
        selected: false,
        requested: requestedNamesInner,
        selectedText: selectedText || null,
        matchedRequestedName: null,
        availableOptions: fallbackOptions,
        reason: "Streamlit select did not match requested player",
        debugLog: {
          controlCount: controls.length,
          targetScore: rankedControls[0]?.score ?? null,
        },
      };
    }, requestedNames);

    return {
      ...frameResult,
      frameUrl: frame.url(),
      frameName: frame.name(),
    };
  };

  const frames = [page.mainFrame(), ...page.frames().filter((frame) => frame !== page.mainFrame())];
  let bestResult = null;

  for (const frame of frames) {
    try {
      const frameResult = await runSelectionInFrame(frame, requested);

      if (frameResult?.selected) {
        return frameResult;
      }

      const frameScore = Number(frameResult?.debugLog?.controlCount || 0) + Number((frameResult?.availableOptions || []).length);
      const bestScore = Number(bestResult?.debugLog?.controlCount || 0) + Number((bestResult?.availableOptions || []).length);

      if (!bestResult || frameScore > bestScore) {
        bestResult = frameResult;
      }
    } catch (error) {
      const message = String(error?.message || "");
      if (
        message.includes("Execution context was destroyed") ||
        message.includes("Cannot find context with specified id") ||
        message.includes("Most likely the page has been closed") ||
        message.includes("Target closed")
      ) {
        continue;
      }
      throw error;
    }
  }

  const result = bestResult || {
    selected: false,
    requested,
    selectedText: null,
    matchedRequestedName: null,
    availableOptions: [],
    reason: "No frame returned selectable controls",
  };
  return result;
};

const selectGeneralStatisticsTeamInPage = async (page, { teamNames = [] }) => {
  const requested = teamNames
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (requested.length === 0) {
    return {
      selected: false,
      requested,
      selectedText: null,
      matchedRequestedName: null,
      reason: "No requested teams",
    };
  }

  const runInFrame = async (frame, requestedTeams) => {
    const frameResult = await frame.evaluate(async (requestedTeamsInner) => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const normalize = (value) =>
        String(value || "")
          .toLowerCase()
          .replace(/\([^)]*\)/g, " ")
          .replace(/[^a-z0-9]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const isVisible = (element) => {
        if (!element) return false;
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };

      const controls = Array.from(document.querySelectorAll("div[data-baseweb='select'], [role='combobox']"))
        .filter((element) => isVisible(element));

      const ranked = controls
        .map((control) => {
          const parentText = normalize((control.parentElement?.textContent || "").slice(0, 500));
          const ownText = normalize((control.textContent || "").slice(0, 250));
          let score = 0;
          if (parentText.includes("select a team") || parentText.includes("select team")) score += 35;
          if (parentText.includes("select pitcher") || parentText.includes("select hitter") || parentText.includes("select player")) score -= 20;
          if (parentText.includes("select stats") || parentText.includes("hot cold labels")) score -= 30;
          if (ownText.includes("date") || ownText.includes("opponent") || ownText.includes("location")) score -= 15;
          return { control, score };
        })
        .sort((a, b) => b.score - a.score);

      const target = ranked[0]?.control || null;
      if (!target) {
        return {
          selected: false,
          requested: requestedTeamsInner,
          selectedText: null,
          matchedRequestedName: null,
          reason: "No team control found",
          debugLog: {
            controlCount: controls.length,
          },
        };
      }

      const likelyMatch = (requestedName, selectedName) => {
        const requestedNorm = normalize(requestedName);
        const selectedNorm = normalize(selectedName);
        return Boolean(requestedNorm && selectedNorm && (selectedNorm.includes(requestedNorm) || requestedNorm.includes(selectedNorm)));
      };

      for (const requestedName of requestedTeamsInner) {
        target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await wait(280);

        const activeInput =
          target.querySelector("input") ||
          document.querySelector("input[aria-expanded='true']") ||
          document.querySelector("input[aria-autocomplete='list']");

        if (activeInput) {
          activeInput.focus();
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          if (setter) {
            setter.call(activeInput, "");
            activeInput.dispatchEvent(new Event("input", { bubbles: true }));
            setter.call(activeInput, requestedName);
            activeInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }

        await wait(450);

        const optionNodes = Array.from(document.querySelectorAll("[role='option'], [data-baseweb='menu'] [role='button'], [data-baseweb='menu'] li"));
        let clicked = false;

        for (const node of optionNodes) {
          if (!isVisible(node)) continue;
          const text = String(node.textContent || "").replace(/\s+/g, " ").trim();
          if (!text) continue;
          if (!likelyMatch(requestedName, text)) continue;

          node.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
          node.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
          node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          clicked = true;
          break;
        }

        await wait(900);

        const selectedText = String(target.textContent || "").replace(/\s+/g, " ").trim();
        if (clicked && selectedText && likelyMatch(requestedName, selectedText)) {
          return {
            selected: true,
            requested: requestedTeamsInner,
            selectedText,
            matchedRequestedName: requestedName,
            matchedBy: "streamlit-team-select",
          };
        }
      }

      return {
        selected: false,
        requested: requestedTeamsInner,
        selectedText: String(target.textContent || "").replace(/\s+/g, " ").trim() || null,
        matchedRequestedName: null,
        reason: "Team select did not match requested team",
      };
    }, requestedTeams);

    return {
      ...frameResult,
      frameUrl: frame.url(),
      frameName: frame.name(),
    };
  };

  const frames = [page.mainFrame(), ...page.frames().filter((frame) => frame !== page.mainFrame())];
  let bestResult = null;

  for (const frame of frames) {
    try {
      const frameResult = await runInFrame(frame, requested);
      if (frameResult?.selected) return frameResult;
      if (!bestResult) bestResult = frameResult;
    } catch (error) {
      const message = String(error?.message || "");
      if (
        message.includes("Execution context was destroyed") ||
        message.includes("Cannot find context with specified id") ||
        message.includes("Most likely the page has been closed") ||
        message.includes("Target closed")
      ) {
        continue;
      }
      throw error;
    }
  }

  return bestResult || {
    selected: false,
    requested,
    selectedText: null,
    matchedRequestedName: null,
    reason: "No frame returned selectable team control",
  };
};

router.get("/exports/:fileName", async (req, res) => {
  try {
    const fileName = req.params.fileName;
    if (!fileName || fileName.includes("/") || fileName.includes("..")) {
      return res.status(400).json({ success: false, message: "Invalid file name" });
    }

    const filePath = path.join(widgetPdfDirectory, fileName);
    await fs.access(filePath);
    return res.sendFile(filePath);
  } catch (error) {
    return res.status(404).json({ success: false, message: "PDF file not found" });
  }
});

router.post("/:widgetId/export-pdf", async (req, res) => {
  let browser;
  try {
    const widgetId = parseInt(req.params.widgetId, 10);
    if (Number.isNaN(widgetId)) {
      return res.status(400).json({ success: false, message: "Invalid widgetId" });
    }

    const teamIds = parseIdList(req.body?.teamIds);
    const playerIds = parseIdList(req.body?.playerIds);
    const teamNames = parseIdList(req.body?.teamNames);
    const playerNames = parseIdList(req.body?.playerNames);
    const playerExternalIds = parseIdList(req.body?.playerExternalIds)
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const source = typeof req.body?.source === "string" ? req.body.source : "superwidget-pdf";

    let playerNameCandidates = Array.from(
      new Set(playerNames.map((value) => String(value || "").trim()).filter(Boolean))
    );

    if (playerIds.length > 0) {
      try {
        const playerNameResult = await pool.query(
          `
            SELECT p.player_name
            FROM player p
            WHERE p.player_id::text = ANY($1::text[])
          `,
          [playerIds.map((id) => String(id))]
        );

        const dbNames = (playerNameResult.rows || [])
          .map((row) => String(row.player_name || "").trim())
          .filter(Boolean);

        playerNameCandidates = Array.from(new Set([...playerNameCandidates, ...dbNames]));
      } catch (playerNameError) {
        console.warn("[PDF Export] Failed to load player names from ids:", playerNameError?.message || playerNameError);
      }
    }

    console.log(`[PDF Export] Received request for widget ${widgetId}`);
    console.log(`[PDF Export] Request body:`, JSON.stringify(req.body, null, 2));

    const widgetResult = await pool.query(selectWidgetById, [widgetId]);
    if (widgetResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: `Widget ${widgetId} not found` });
    }

    const widget = widgetResult.rows[0];
    const widgetName = widget.widget_name || widget.name || `Widget ${widgetId}`;
    const redirectLink = widget.redirect_link || widget.redirectlink || null;

    if (!redirectLink) {
      return res.status(400).json({
        success: false,
        message: `${widgetName} has no redirect link configured`,
      });
    }

    console.log(`[PDF Export] Starting PDF export for widget ${widgetId} (${widgetName})`);
    console.log(`[PDF Export] Redirect URL: ${redirectLink}`);
    console.log(`[PDF Export] Params received - teamIds: ${JSON.stringify(teamIds)}, playerIds: ${JSON.stringify(playerIds)}`);
    console.log(`[PDF Export] Params received - teamNames: ${JSON.stringify(teamNames)}, playerNames: ${JSON.stringify(playerNames)}`);
    console.log(`[PDF Export] Params received - playerExternalIds: ${JSON.stringify(playerExternalIds)}, source: ${source}`);

    const executionUrl = isCountBasedWidget(widgetId, widgetName, redirectLink)
      ? (() => {
          const url = new URL(redirectLink);
          url.searchParams.set("source", source);
          return url.toString();
        })()
      : buildWidgetExecutionUrl(
          redirectLink,
          teamIds,
          playerIds,
          source,
          teamNames,
          playerNames
        );
    
    console.log(`[PDF Export] Full execution URL: ${executionUrl}`);

    await fs.mkdir(widgetPdfDirectory, { recursive: true });

    const timestamp = Date.now();
    const safeWidgetName = widgetName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const fileName = `${safeWidgetName || "widget"}-${widgetId}-${timestamp}.pdf`;
    const filePath = path.join(widgetPdfDirectory, fileName);

    console.log(`[PDF Export] Launching headless browser...`);
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
      ],
    });
    console.log(`[PDF Export] Browser launched, creating page...`);

    const page = await browser.newPage();
    let selectionDebug = null;
    await page.setViewport({ width: 1920, height: 3000, deviceScaleFactor: 2 });
    await page.emulateMediaType("screen");
    console.log(`[PDF Export] Navigating to ${executionUrl}...`);
    
    try {
      // Try to wait for network to be mostly idle, but don't fail if it takes too long
      await Promise.race([
        page.goto(executionUrl, {
          waitUntil: "networkidle2",
          timeout: 180000, // 3 minutes
        }),
        new Promise(resolve => setTimeout(resolve, 25000)) // 25s fallback
      ]);
    } catch (error) {
      console.log(`[PDF Export] Navigation timeout or error: ${error.message}, continuing anyway...`);
    }
    
    try {
      await page.waitForFunction(
        () => document?.body?.innerText?.length > 200,
        { timeout: 15000 }
      );
    } catch {
      // no-op fallback to timed wait below
    }

    await wakeSleepingSelectorPageIfNeeded(page);

    if ((isHittingAnalyticsWidget(widgetId, widgetName, redirectLink) || isCountBasedWidget(widgetId, widgetName, redirectLink)) && playerNames.length > 0) {
      let matchedRequestedPlayer = null;
      const attemptedPlayers = [];

      for (const candidatePlayerName of playerNames) {
        if (isCountBasedWidget(widgetId, widgetName, redirectLink)) {
          const result = await selectCountBasedPlayerInPage(page, candidatePlayerName);
          const selectedText = result.label || "";
          const matchedByName = namesLikelyMatch(candidatePlayerName, selectedText);

          attemptedPlayers.push({
            requested: candidatePlayerName,
            selected: selectedText || null,
            foundInWidget: result.foundInWidget,
            matchedByName,
          });

          selectionDebug = {
            selected: Boolean(selectedText),
            text: selectedText || "",
            requested: candidatePlayerName,
            foundInWidget: result.foundInWidget,
          };

          if (!result.foundInWidget) {
            return res.status(422).json({
              success: false,
              message: `${widgetName} could not find player "${candidatePlayerName}" in the widget dataset.`,
              data: {
                widgetId,
                widgetName,
                requestedPlayers: playerNames,
                selectedPlayer: null,
                attemptedPlayers,
                sourceUrl: executionUrl,
                selectionDebug,
              },
            });
          }

          if (matchedByName) {
            matchedRequestedPlayer = candidatePlayerName;
            break;
          }
        } else {
          const selectedPlayer = await selectHittingPlayerInPage(page, candidatePlayerName);
          console.log(`[PDF Export] Hitting player selection attempted for "${candidatePlayerName}": ${selectedPlayer}`);

          selectionDebug = await page.evaluate(() => {
            const select = document.querySelector("#player");
            if (!select || !(select instanceof HTMLSelectElement)) {
              return { selected: false };
            }

            const selectedOption = select.options[select.selectedIndex];
            return {
              selected: true,
              value: select.value,
              text: selectedOption ? (selectedOption.textContent || "").trim() : "",
            };
          });

          const normalizedCandidate = String(candidatePlayerName || "").toLowerCase();
          const candidateLastName = normalizedCandidate.split(",")[0]?.trim() || "";
          const candidateTokens = normalizedCandidate
            .replace(/,/g, " ")
            .split(/\s+/)
            .filter((token) => token.length >= 2);
          const selectedText = String(selectionDebug?.text || "").toLowerCase();
          const matchedByLastName = candidateLastName.length >= 2 && selectedText.includes(candidateLastName);
          const matchedByTokens = candidateTokens.some((token) => selectedText.includes(token));

          attemptedPlayers.push({
            requested: candidatePlayerName,
            selected: selectionDebug?.text || null,
            matchedByLastName,
            matchedByTokens,
          });

          if (matchedByLastName || matchedByTokens) {
            matchedRequestedPlayer = candidatePlayerName;
            break;
          }
        }
      }

      console.log(`[PDF Export] Player selection debug: ${JSON.stringify(selectionDebug)}`);

      if (!matchedRequestedPlayer) {
        const availablePlayers = isCountBasedWidget(widgetId, widgetName, redirectLink)
          ? await page.evaluate(() => {
              const select = document.querySelector("#player_selection_ui select");
              if (!(select instanceof HTMLSelectElement)) return [];
              return Array.from(select.options)
                .filter((o) => Boolean(o.value) && !/select player/i.test(o.textContent || ""))
                .map((o) => String(o.textContent || "").trim())
                .filter(Boolean)
                .slice(0, 50);
            })
          : await page.evaluate(() => {
              const select = document.querySelector("#player");
              if (select && select.selectize && select.selectize.options) {
                return Object.values(select.selectize.options)
                  .map((option) => (option?.text || "").trim())
                  .filter(Boolean)
                  .slice(0, 50);
              }

              return Array.from(document.querySelectorAll(".selectize-dropdown .option, .selectize-dropdown-content .option"))
                .map((option) => (option.textContent || "").trim())
                .filter(Boolean)
                .slice(0, 50);
            });

        return res.status(422).json({
          success: false,
          message: `${widgetName} could not match selected players (${playerNames.join(", ")}). Widget currently selected "${selectionDebug?.text || "unknown"}".`,
          data: {
            widgetId,
            widgetName,
            requestedPlayers: playerNames,
            selectedPlayer: selectionDebug?.text || null,
            availablePlayers,
            attemptedPlayers,
            sourceUrl: executionUrl,
            selectionDebug,
          },
        });
      }

      await waitForPdfRenderStability(page, {
        timeoutMs: isCountBasedWidget(widgetId, widgetName, redirectLink) ? 6000 : 7000,
        fallbackMs: 2200,
      });
    }

    if (isGeneralStatisticsWidget(widgetId, widgetName, redirectLink) && playerNameCandidates.length > 0) {
      const generalStatsTeamSelection = await selectGeneralStatisticsTeamInPage(page, {
        teamNames,
      });

      if (teamNames.length > 0) {
        selectionDebug = {
          ...(selectionDebug || {}),
          generalStatisticsTeamSelection: generalStatsTeamSelection,
        };

        console.log(`[PDF Export] General statistics team selection (teamNames=${JSON.stringify(teamNames)}):`, JSON.stringify(generalStatsTeamSelection, null, 2));

        if (!generalStatsTeamSelection?.selected) {
          return res.status(422).json({
            success: false,
            message: `${widgetName} could not match selected teams (${teamNames.join(", ")}).`,
            data: {
              widgetId,
              widgetName,
              requestedTeams: teamNames,
              sourceUrl: executionUrl,
              selectionDebug,
            },
          });
        }

        await waitForPdfRenderStability(page, {
          timeoutMs: 12000,
          fallbackMs: 2800,
        });
      }

      const generalStatsSelection = await selectGeneralStatisticsPlayerInPage(page, {
        playerNames: playerNameCandidates,
      });

      selectionDebug = {
        ...(selectionDebug || {}),
        generalStatisticsSelection: generalStatsSelection,
      };

      console.log(`[PDF Export] General statistics selection (playerNames=${JSON.stringify(playerNameCandidates)}):`, JSON.stringify(generalStatsSelection, null, 2));

      let matchedGeneralStatsPlayer = Boolean(generalStatsSelection?.selected && generalStatsSelection?.matchedRequestedName);

      if (!matchedGeneralStatsPlayer) {
        const typedSelectedText = String(generalStatsSelection?.selectedText || "").trim();
        const typedMatchedRequestedName = playerNameCandidates.find((candidate) => namesLikelyMatch(candidate, typedSelectedText)) || null;

        if (typedMatchedRequestedName) {
          try {
            const normalizedRequested = normalizeComparableName(typedMatchedRequestedName);
            const normalizedRequestedTeamNames = teamNames
              .map((value) => String(value || "").trim().toLowerCase())
              .filter(Boolean);

            const verificationResult = await pool.query(
              `
                SELECT p.player_name, COALESCE(t.team_name, '') AS team_name
                FROM player p
                LEFT JOIN team t ON t.team_id = p.team_id
                WHERE LOWER(p.player_name) = LOWER($1)
              `,
              [typedMatchedRequestedName]
            );

            const verifiedRows = (verificationResult.rows || []).filter((row) => {
              if (normalizedRequestedTeamNames.length === 0) return true;
              const rowTeam = String(row.team_name || "").trim().toLowerCase();
              return normalizedRequestedTeamNames.includes(rowTeam);
            });

            if (normalizedRequested && verifiedRows.length > 0) {
              matchedGeneralStatsPlayer = true;
              selectionDebug = {
                ...(selectionDebug || {}),
                generalStatisticsSelection: {
                  ...generalStatsSelection,
                  selected: true,
                  matchedRequestedName: typedMatchedRequestedName,
                  matchedBy: "typed-input-verified-by-database-player-team-check",
                },
                generalStatisticsSelectionValidation: {
                  verifiedByWidgetOptions: true,
                  optionCount: verifiedRows.length,
                  verifiedBy: "database-player-team-check",
                },
              };
            } else {
              selectionDebug = {
                ...(selectionDebug || {}),
                generalStatisticsSelectionValidation: {
                  verifiedByWidgetOptions: false,
                  optionCount: verifiedRows.length,
                  verifiedBy: "database-player-team-check",
                },
              };
            }
          } catch (verificationError) {
            selectionDebug = {
              ...(selectionDebug || {}),
              generalStatisticsSelectionValidation: {
                verifiedByWidgetOptions: false,
                error: String(verificationError?.message || verificationError),
              },
            };
          }
        }
      }

      if (!matchedGeneralStatsPlayer) {
        return res.status(422).json({
          success: false,
          message: `${widgetName} could not match selected players (${playerNameCandidates.join(", ")}).`,
          data: {
            widgetId,
            widgetName,
            requestedPlayers: playerNames,
            playerNameCandidates,
            sourceUrl: executionUrl,
            selectionDebug,
          },
        });
      }

      await waitForPdfRenderStability(page, {
        timeoutMs: 12000,
        fallbackMs: 3000,
      });
    }

    if (isSluggerPitcherWidget(widgetId, widgetName, redirectLink) && (teamNames.length > 0 || playerNameCandidates.length > 0)) {
      let pitcherSelection = await selectSluggerPitcherFiltersInPage(page, {
        teamNames,
        playerNames: playerNameCandidates,
        playerExternalIds,
      });

      const firstAttemptNoVisibleSelectorControls =
        pitcherSelection?.team?.reason === "No visible select elements" &&
        pitcherSelection?.pitcher?.reason === "No visible select elements";

      if (firstAttemptNoVisibleSelectorControls && (teamNames.length > 0 || playerNameCandidates.length > 0)) {
        console.log("[PDF Export] Slugger pitcher first pass found no visible selector controls; waiting and retrying selection.");
        await waitForPdfRenderStability(page, {
          timeoutMs: 18000,
          fallbackMs: 4200,
        });

        const secondPassSelection = await selectSluggerPitcherFiltersInPage(page, {
          teamNames,
          playerNames: playerNameCandidates,
          playerExternalIds,
        });

        pitcherSelection = {
          ...secondPassSelection,
          retryMeta: {
            usedSecondPass: true,
            firstPassNoVisibleSelectorControls: true,
            firstPassTeam: pitcherSelection?.team || null,
            firstPassPitcher: pitcherSelection?.pitcher || null,
          },
        };
      }

      selectionDebug = {
        ...(selectionDebug || {}),
        sluggerPitcherSelection: pitcherSelection,
      };

      console.log(`[PDF Export] Slugger pitcher selection FULL debug (teamNames=${JSON.stringify(teamNames)}, playerNames=${JSON.stringify(playerNameCandidates)}, playerExternalIds=${JSON.stringify(playerExternalIds)}):`, JSON.stringify(pitcherSelection, null, 2));

      const matchedPitcherByExternalId = Boolean(pitcherSelection?.pitcherByExternalId?.selectedValue);
      const matchedPitcherByName = Boolean(pitcherSelection?.pitcher?.matchedRequestedName);
      const noVisibleSelectorControls =
        pitcherSelection?.team?.reason === "No visible select elements" &&
        pitcherSelection?.pitcher?.reason === "No visible select elements";

      console.log(`[PDF Export] Pitcher match result - externalId matched: ${matchedPitcherByExternalId}, name matched: ${matchedPitcherByName}, noVisibleSelectorControls: ${noVisibleSelectorControls}`);

      if (noVisibleSelectorControls) {
        selectionDebug = {
          ...(selectionDebug || {}),
          sluggerPitcherSelectionMode: "url-params-no-visible-select-controls",
        };
        console.log("[PDF Export] No visible selector controls detected; continuing export using URL parameter-driven filters.");
      }

      if (playerNameCandidates.length > 0 && !matchedPitcherByExternalId && !matchedPitcherByName && !noVisibleSelectorControls) {
        console.log(`[PDF Export] FAILED MATCH - returning 422 error with full selectionDebug`);
        return res.status(422).json({
          success: false,
          message: `Slugger Pitcher Widget could not match selected players (${playerNameCandidates.join(", ")}).`,
          data: {
            widgetId,
            widgetName,
            requestedTeams: teamNames,
            requestedPlayers: playerNames,
            playerNameCandidates,
            sourceUrl: executionUrl,
            selectionDebug,
          },
        });
      }
    }

    console.log(`[PDF Export] Page loaded, waiting for render stability...`);
    await waitForPdfRenderStability(page, {
      timeoutMs: isSluggerPitcherWidget(widgetId, widgetName, redirectLink) ? 12000 : 9000,
      fallbackMs: isSluggerPitcherWidget(widgetId, widgetName, redirectLink) ? 3200 : 2500,
    });
    console.log(`[PDF Export] Generating PDF to ${filePath}...`);
    
    await page.pdf({
      path: filePath,
      format: "A3",
      printBackground: true,
      margin: {
        top: "6mm",
        right: "6mm",
        bottom: "6mm",
        left: "6mm",
      },
    });
    console.log(`[PDF Export] PDF saved successfully to ${filePath}`);

    const pdfUrl = `${req.protocol}://${req.get("host")}/api/widgets/exports/${encodeURIComponent(fileName)}`;
    console.log(`[PDF Export] Returning PDF URL: ${pdfUrl}`);

    return res.status(200).json({
      success: true,
      message: "Widget PDF exported successfully",
      data: {
        widgetId,
        widgetName,
        pdfUrl,
        sourceUrl: executionUrl,
        selectionDebug,
      },
    });
  } catch (error) {
    console.error("[Widget Export PDF] Error:", error);
    console.error("[Widget Export PDF] Stack:", error?.stack);
    return res.status(500).json({
      success: false,
      message: `Failed to export widget PDF: ${error.message}`,
    });
  } finally {
    if (browser) {
      console.log(`[PDF Export] Closing browser...`);
      await browser.close();
    }
  }
});

// get all widgets
router.get(
  "/",
  validationMiddleware({ querySchema: queryParamsSchema }),
  async (req, res) => {
    try {
      const { widgetName, categories, page, limit, userId } = req.query;

      const widgets = await getAllWidgets(widgetName, categories, page, limit, userId);

      res.status(200).json({
        success: true,
        message: "Widgets retrieved successfully",
        data: widgets,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

// Special endpoint for Hitting Analytics widget (widget_id 93)
// Returns hitting statistics as JSON
router.get("/93/hitting-data", async (req, res) => {
  try {
    const playerIds = parseIdList(req.query.playerIds);
    const teamIds = parseIdList(req.query.teamIds);

    // Build query to get player hitting stats
    let query = `
      SELECT 
        p.player_id,
        p.player_name,
        p.team_id,
        p.player_batting_handedness as position
      FROM player p
    `;

    const params = [];
    const conditions = [];

    // Filter by playerIds if provided
    if (playerIds.length > 0) {
      conditions.push(`p.player_id::text = ANY($${params.length + 1}::text[])`);
      params.push(playerIds.map((id) => String(id)));
    }

    // Filter by teamIds if provided
    if (teamIds.length > 0) {
      conditions.push(`p.team_id::text = ANY($${params.length + 1}::text[])`);
      params.push(teamIds.map((id) => String(id)));
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` LIMIT 100`;

    const result = await pool.query(query, params);
    const players = result.rows || [];

    // Build hitting statistics response
    const hittingData = {
      success: true,
      data: {
        widgetId: 93,
        widgetName: "Hitting Analytics",
        playerCount: players.length,
        teamCount: teamIds.length,
        players: players.map((p) => ({
          id: p.player_id,
          name: p.player_name,
          team: p.team_id,
          position: p.position,
          stats: {
            avg: Math.random() * 0.3 + 0.2, // Mock data
            hr: Math.floor(Math.random() * 40),
            rbi: Math.floor(Math.random() * 120),
            hits: Math.floor(Math.random() * 180),
            ab: Math.floor(Math.random() * 600),
          },
        })),
        bullets: [
          `Hitting Analytics executed successfully.`,
          `Analysis covers ${players.length} player(s) from ${teamIds.length} team(s).`,
          players.length > 0
            ? `Top performer: ${players[0].player_name} (AVG .${(Math.random() * 300 + 200).toFixed(0)})`
            : "No players selected for analysis.",
        ],
      },
    };

    return res.status(200).json(hittingData);
  } catch (error) {
    console.error("[Hitting Analytics] Error:", error);
    return res.status(500).json({
      success: false,
      message: `Error fetching hitting data: ${error.message}`,
    });
  }
});

router.get("/pitching-data", async (req, res) => {
  try {
    const playerIds = parseIdList(req.query.playerIds);
    const teamIds = parseIdList(req.query.teamIds);

    let query = `
      SELECT
        p.player_id,
        p.player_name,
        p.team_id,
        p.player_batting_handedness as position
      FROM player p
    `;

    const params = [];
    const conditions = [];

    if (playerIds.length > 0) {
      conditions.push(`p.player_id::text = ANY($${params.length + 1}::text[])`);
      params.push(playerIds.map((id) => String(id)));
    }

    if (teamIds.length > 0) {
      conditions.push(`p.team_id::text = ANY($${params.length + 1}::text[])`);
      params.push(teamIds.map((id) => String(id)));
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` LIMIT 100`;

    const result = await pool.query(query, params);
    const players = result.rows || [];

    const pitchingData = {
      success: true,
      data: {
        widgetId: 223,
        widgetName: "Slugger Pitcher Widget",
        playerCount: players.length,
        teamCount: teamIds.length,
        players: players.map((p) => ({
          id: p.player_id,
          name: p.player_name,
          team: p.team_id,
          position: p.position,
          stats: {
            era: Number((Math.random() * 3 + 1.5).toFixed(2)),
            whip: Number((Math.random() * 0.8 + 0.9).toFixed(2)),
            so: Math.floor(Math.random() * 120),
            ip: Number((Math.random() * 90 + 20).toFixed(1)),
          },
        })),
        bullets: [
          "Slugger Pitcher Widget executed successfully.",
          `Analysis covers ${players.length} player(s) from ${teamIds.length} team(s).`,
          players.length > 0
            ? `Top arm to watch: ${players[0].player_name} (simulated ERA ${(Math.random() * 2 + 2).toFixed(2)})`
            : "No players selected for analysis.",
        ],
      },
    };

    return res.status(200).json(pitchingData);
  } catch (error) {
    console.error("[Pitching Analytics] Error:", error);
    return res.status(500).json({
      success: false,
      message: `Error fetching pitching data: ${error.message}`,
    });
  }
});

router.get("/:widgetId/execute", async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId, 10);
    if (Number.isNaN(widgetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid widgetId",
      });
    }

    const teamIds = parseIdList(req.query.teamIds);
    const playerIds = parseIdList(req.query.playerIds);
    const teamNames = parseIdList(req.query.teamNames);
    const playerNames = parseIdList(req.query.playerNames);
    const source = typeof req.query.source === "string" ? req.query.source : "superwidget";

    const widgetResult = await pool.query(selectWidgetById, [widgetId]);
    if (widgetResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Widget ${widgetId} not found`,
      });
    }

    const widget = widgetResult.rows[0];
    const widgetName = widget.widget_name || widget.name || `Widget ${widgetId}`;
    const description = widget.description || "No widget description provided.";
    const redirectLink = widget.redirect_link || widget.redirectlink || null;

    if (isHittingAnalyticsWidget(widgetId, widgetName, redirectLink)) {
      try {
        const payload = await executeHittingAnalytics({
          widgetId,
          widgetName,
          teamIds,
          playerIds,
        });
        return res.status(200).json(payload);
      } catch (hittingError) {
        console.error("[Widget Execute] Error calling hitting-data endpoint:", hittingError);
      }
    }

    if (isSluggerPitcherWidget(widgetId, widgetName, redirectLink)) {
      try {
        const payload = await executePitchingAnalytics({
          widgetId,
          widgetName,
          teamIds,
          playerIds,
        });
        return res.status(200).json(payload);
      } catch (pitchingError) {
        console.error("[Widget Execute] Error calling pitching-data endpoint:", pitchingError);
      }
    }

    // Special handling for General Statistics Widget - returns UI-only with prepared URL
    if (isGeneralStatisticsWidget(widgetId, widgetName, redirectLink)) {
      const generalStatsUrl = buildGeneralStatisticsUrl(redirectLink, teamIds, playerIds, source);
      return res.status(200).json({
        success: true,
        message: "General Statistics Widget available - use Generate PDF within the app",
        data: {
          widgetId,
          widgetName,
          teamIds,
          playerIds,
          uiOnly: true,
          redirectLink: generalStatsUrl,
          bullets: [
            `${widgetName} has been loaded with your selected teams and players.`,
            `Use the "Generate and Download PDF" button within the widget to export your analysis.`,
            `Selection scope: ${teamIds.length} team(s), ${playerIds.length} player(s).`,
            description || ""
          ].filter(Boolean),
          widgetOutput: {
            info: "Widget UI with pre-populated filters ready for PDF generation"
          }
        },
      });
    }

    // If no redirectLink, return metadata only
    if (!redirectLink) {
      const bullets = [
        `${widgetName}: No redirect link configured.`,
        `Selection scope: ${teamIds.length} team(s), ${playerIds.length} player(s).`,
        `Source: ${source}`,
      ];

      if (description) {
        bullets.push(`Summary: ${description}`);
      }

      return res.status(200).json({
        success: false,
        message: "Widget has no redirect link configured",
        data: {
          widgetId,
          widgetName,
          teamIds,
          playerIds,
          bullets,
        },
      });
    }

    // Try to call the widget's redirectLink with parameters
    const executionUrl = buildWidgetExecutionUrl(redirectLink, teamIds, playerIds, source, teamNames, playerNames);
    
    try {
      console.log(`[Widget Execute] Calling ${widgetName} at ${executionUrl}`);

      const widgetResponse = await fetch(executionUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Slugger-SuperWidget/1.0'
        },
        signal: AbortSignal.timeout(10000)
      });

      const contentType = widgetResponse.headers.get('content-type');
      const responseText = await widgetResponse.text();

      // Check if response is JSON
      if (contentType && contentType.includes('application/json')) {
        try {
          const widgetData = JSON.parse(responseText);
          
          // Return the actual widget data
          return res.status(200).json({
            success: true,
            message: "Widget executed successfully",
            data: {
              widgetId,
              widgetName,
              teamIds,
              playerIds,
              widgetOutput: widgetData,
              bullets: widgetData.bullets || [`${widgetName} returned data successfully`]
            },
          });
        } catch (parseError) {
          console.error(`[Widget Execute] Failed to parse JSON response from ${widgetName}:`, parseError);
        }
      }

      // If we got HTML or non-JSON response, treat it as a UI-only widget
      console.warn(`[Widget Execute] ${widgetName} returned HTML/non-JSON (Content-Type: ${contentType})`);
      
      const bullets = [
        `${widgetName} is a UI-only widget (returns HTML, not JSON).`,
        `Use Open in Browser to view the live widget with current parameters.`,
        `Selection scope: ${teamIds.length} team(s), ${playerIds.length} player(s).`,
        `Configured redirect: ${redirectLink}`
      ];

      if (description) {
        bullets.push(`Summary: ${description}`);
      }

      return res.status(200).json({
        success: true,
        message: "UI-only widget is available via browser",
        data: {
          widgetId,
          widgetName,
          teamIds,
          playerIds,
          uiOnly: true,
          redirectLink: executionUrl,
          bullets,
          widgetOutput: {
            info: "Widget returned HTML UI (not JSON API)",
            contentType,
            responsePreview: responseText.substring(0, 200) + "..."
          }
        },
      });

    } catch (fetchError) {
      console.error(`[Widget Execute] Error calling ${widgetName}:`, fetchError.message);

      // If fetch failed, treat as UI-only widget so user can open in browser
      const bullets = [
        `${widgetName} is currently unavailable via API (${fetchError.message}).`,
        `Use Open in Browser to view the live widget with current parameters.`,
        `Selection scope: ${teamIds.length} team(s), ${playerIds.length} player(s).`,
        `Configured redirect: ${redirectLink}`
      ];

      if (description) {
        bullets.push(`Summary: ${description}`);
      }

      return res.status(200).json({
        success: true,
        message: "Widget available via browser",
        data: {
          widgetId,
          widgetName,
          teamIds,
          playerIds,
          uiOnly: true,
          redirectLink: executionUrl,
          bullets,
          widgetOutput: {
            info: `Network error: ${fetchError.message}. Widget available via browser.`
          }
        },
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`,
    });
  }
});

// edit a widget
router.patch(
  "/:widgetId",
  requireWidgetOwnership,
  validationMiddleware({ bodySchema: editWidgetSchema }),
  async (req, res) => {
    const { name, description, redirectLink, visibility, imageUrl, publicId, restrictedAccess } = req.body;

    try {
      const id = parseInt(req.params.widgetId);

      // Ensure target widget exists
      const targetWidgetRes = await pool.query(selectWidgetById, [id]);
      if (targetWidgetRes.rowCount === 0) {
        res.status(404).json({
          success: false,
          message: "Widget not found",
        });
        return;
      }

      const updatedWidget = await updateWidget({
        id,
        name,
        description,
        redirectLink,
        visibility,
        imageUrl,
        publicId,
        restrictedAccess
      });

      res.status(200).json({
        success: true,
        message: "Widget updated successfully",
        data: updatedWidget,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Internal error: ${error.message}`,
      });
    }
  },
);

// delete a widget
router.delete("/:widgetId", requireWidgetOwnership, async (req, res) => {
  try {
    const id = parseInt(req.params.widgetId);
    const targetWidgetRes = await pool.query(selectWidgetById, [id]);
    // Ensure target widget exists
    if (targetWidgetRes.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "Widget does not exist",
      });
      return;
    }
    const deletedWidget = await deleteWidget(id);
    res.status(200).json({
      success: true,
      message: "Widget deleted successfully",
      data: deletedWidget,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`,
    });
  }
});

// register a widget
router.post(
  "/register",
  requireAuth,
  validationMiddleware({ bodySchema: registerWidgetSchema }),
  async (req, res) => {
    const { widgetName, description, visibility, userId, teamIds } = req.body; // Extract widget details and userId from the request body

    try {
      const requestedWidget = await registerWidget(
        userId,
        widgetName,
        description,
        visibility,
        teamIds || [],
      );
      res.status(200).json({
        success: true,
        message: "Widget registration request was sent successfully",
        data: requestedWidget,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Internal error: ${error.message}`,
      });
    }
  },
);

// Get categories for a widget
router.get("/:widgetId/categories", async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);

    // Check if widget exists
    const widgetExists = await pool.query(selectWidgetById, [widgetId]);
    if (widgetExists.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Widget not found"
      });
    }

    // Get all categories for this widget
    const categoriesResult = await pool.query(
      `SELECT c.* 
       FROM categories c
       JOIN widget_categories wc ON c.id = wc.category_id
       WHERE wc.widget_id = $1`,
      [widgetId]
    );

    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: categoriesResult.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

// Add a category to a widget
router.post("/:widgetId/categories", requireWidgetOwnership, validationMiddleware({ bodySchema: addCategoryToWidgetSchema }), async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    const { categoryId } = req.body;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required"
      });
    }

    // Check if widget exists
    const widgetExists = await pool.query(selectWidgetById, [widgetId]);
    if (widgetExists.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Widget not found"
      });
    }

    // Check if category exists
    const categoryExists = await pool.query(
      "SELECT * FROM categories WHERE id = $1",
      [categoryId]
    );
    if (categoryExists.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    // Add relation to widget_categories
    const result = await pool.query(
      `INSERT INTO widget_categories (widget_id, category_id)
       VALUES ($1, $2)
       RETURNING *`,
      [widgetId, categoryId]
    );

    res.status(201).json({
      success: true,
      message: "Category added to widget successfully",
      data: result.rows[0]
    });
  } catch (error) {
    // Handle duplicate entry
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: "This category is already associated with this widget"
      });
    }

    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

// Remove a category from a widget
router.delete("/:widgetId/categories/:categoryId", requireWidgetOwnership, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    const categoryId = parseInt(req.params.categoryId);

    // Check if widget exists
    const widgetExists = await pool.query(selectWidgetById, [widgetId]);
    if (widgetExists.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Widget not found"
      });
    }

    // Delete the relation
    const result = await pool.query(
      `DELETE FROM widget_categories 
       WHERE widget_id = $1 AND category_id = $2
       RETURNING *`,
      [widgetId, categoryId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found for this widget"
      });
    }

    res.status(200).json({
      success: true,
      message: "Category removed from widget successfully",
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

router.post("/metrics", requireAuth, async (req, res) => { // TODO remove userId since should be inferred from user store
  try {
    const { widgetId, userId, metricType } = req.body;

    if (metricType === "launch") {
      const result = await pool.query(`
        INSERT INTO widget_launches (widget_id, user_id)
        VALUES ($1, $2)
        RETURNING *
      `, [widgetId, userId]);

      return res.status(201).json({
        success: true,
        message: "Widget launch metric recorded successfully",
        data: result.rows[0]
      })
    }

    else {throw new Error("Invalid metric type")}
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
})

router.get('/:widgetId/developers', requireAuth, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    const response = await pool.query(`
      SELECT uw.user_id, u.email, uw.role
      FROM user_widget as uw
      LEFT JOIN users as u
        ON u.user_id = uw.user_id
      WHERE uw.widget_id = $1
    `, [widgetId])

    return res.status(201).json({
      success: true,
      message: `Widget developers fetched successfully`,
      data: response.rows
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
})

router.post('/:widgetId/developers', requireWidgetOwner, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    const developerId = parseInt(req.body.developerId);

    // Check if developer is already added to widget
    const alreadyDevRes = await pool.query(`
      SELECT user_id
      FROM user_widget
      WHERE
        widget_id = $1
        AND user_id = $2
      `, [widgetId, developerId]);

    if (alreadyDevRes.rowCount > 0) {
      return res.status(500).json({
        success: false,
        message: `Error: user with id ${developerId} is already a collaborator on widget with id ${widgetId}`
      });
    }

    // Add dev
    await pool.query(`
      INSERT INTO user_widget (user_id, widget_id, role)
      VALUES ($1, $2, 'member')
    `, [developerId, widgetId])

    return res.status(201).json({
      success: true,
      message: `Widget developer with id ${developerId} added to widget with id ${widgetId}`,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
})

// Add collaborator to widget
router.post("/:widgetId/collaborators", requireWidgetOwner, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Look up user by email
    const userQuery = 'SELECT user_id FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email"
      });
    }
    
    const userId = userResult.rows[0].user_id;

    // Check if widget exists
    const widgetExists = await pool.query('SELECT widget_id FROM widgets WHERE widget_id = $1', [widgetId]);
    if (widgetExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Widget not found"
      });
    }

    // Check if user is already a collaborator
    const checkQuery = `
      SELECT * FROM user_widget 
      WHERE user_id = $1 AND widget_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [userId, widgetId]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User is already a collaborator"
      });
    }

    // Add collaborator
    const query = `
      INSERT INTO user_widget (user_id, widget_id, role)
      VALUES ($1, $2, 'member')
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId, widgetId]);
    
    // Get the user's email for the response
    const userDetails = await pool.query(
      'SELECT email FROM users WHERE user_id = $1',
      [userId]
    );

    res.status(201).json({
      success: true,
      message: "Collaborator added successfully",
      data: {
        ...result.rows[0],
        email: userDetails.rows[0].email
      }
    });
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(500).json({
      success: false,
      message: `Error adding collaborator: ${error.message}`
    });
  }
});

// Get widget collaborators
router.get("/:widgetId/collaborators", requireAuth, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    
    if (!widgetId) {
      return res.status(400).json({
        success: false,
        message: "widgetId is required"
      });
    }
    
    const query = `
      SELECT u.user_id, u.email, uw.role
      FROM user_widget uw
      JOIN users u ON u.user_id = uw.user_id
      WHERE uw.widget_id = $1
    `;
    
    const result = await pool.query(query, [widgetId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    res.status(500).json({
      success: false,
      message: `Error fetching collaborators: ${error.message}`
    });
  }
});

// Get teams with access to a widget
router.get("/:widgetId/teams", requireAuth, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);

    // Check if widget exists
    const widgetExists = await pool.query(selectWidgetById, [widgetId]);
    if (widgetExists.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Widget not found"
      });
    }

    // Get all teams with access to this widget - using "team" instead of "teams"
    const teamsResult = await pool.query(
      `SELECT t.* 
       FROM team t
       JOIN widget_team_access wta ON t.team_id = wta.team_id
       WHERE wta.widget_id = $1`,
      [widgetId]
    );

  
  
    // Return the raw team_id values without modification to preserve UUID format
    res.status(200).json({
      success: true,
      message: "Teams retrieved successfully",
      data: teamsResult.rows
    });
  } catch (error) {
    console.error(`Error getting teams for widget ${req.params.widgetId}:`, error);
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

// Update teams with access to a widget
router.put("/:widgetId/teams", requireWidgetOwnership, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    const { teamIds } = req.body;

    if (!Array.isArray(teamIds)) {
      return res.status(400).json({
        success: false,
        message: "teamIds must be an array"
      });
    }

    // Check if widget exists
    const widgetExists = await pool.query(selectWidgetById, [widgetId]);
    if (widgetExists.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Widget not found"
      });
    }

    // Check if widget is private
    const widgetVisibility = widgetExists.rows[0].visibility;
    if (widgetVisibility.toLowerCase() !== 'private') {
      return res.status(400).json({
        success: false,
        message: "Only private widgets can have team access"
      });
    }

    // Start a transaction
    await pool.query('BEGIN');

    // Remove all existing team access for this widget
    await pool.query(
      `DELETE FROM widget_team_access WHERE widget_id = $1`,
      [widgetId]
    );

    // Add new team access - using individual inserts to handle errors better
    if (teamIds.length > 0) {
      for (const teamId of teamIds) {
        try {
          await pool.query(
            `INSERT INTO widget_team_access (widget_id, team_id) 
             VALUES ($1, $2) 
             ON CONFLICT (widget_id, team_id) DO NOTHING`,
            [widgetId, teamId]
          );
        } catch (insertError) {
          console.error(`Error adding team ${teamId}:`, insertError.message);
          // Continue with next team instead of failing completely
        }
      }
    }

    // Commit transaction
    await pool.query('COMMIT');

    res.status(200).json({
      success: true,
      message: "Widget team access updated successfully"
    });
  } catch (error) {
    // Rollback if error occurs
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    
    console.error(`Error updating team access for widget ${req.params.widgetId}:`, error);
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

// Get all pending widget requests
router.get("/pending", requireSiteAdmin, async (req, res) => {
  try {
    const pendingWidgets = await getPendingWidgets();
    
    res.status(200).json({
      success: true,
      message: "Pending widgets retrieved successfully",
      data: pendingWidgets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error fetching pending widgets: ${error.message}`
    });
  }
});

// Approve a pending widget request
router.post("/pending/:requestId/approve", requireSiteAdmin, async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const result = await createApprovedWidget(requestId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: { widgetId: result.widgetId }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error approving widget: ${error.message}`
    });
  }
});

// Decline a pending widget request
router.post("/pending/:requestId/decline", requireSiteAdmin, async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const result = await removeRequest(requestId);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error declining widget: ${error.message}`
    });
  }
});

export default router;
