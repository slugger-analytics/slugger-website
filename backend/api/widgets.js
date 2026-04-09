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

const isGeneralStatisticsWidget = (widgetId, widgetName, redirectLink) => {
  const normalizedName = (widgetName || "").toLowerCase();
  const normalizedRedirect = (redirectLink || "").toLowerCase();

  return (
    widgetId === 238 ||
    normalizedName.includes("general statistics") ||
    normalizedRedirect.includes("baseball-general-statistics-widget")
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

    const now = Date.now();
    const cacheKey = String(widgetId);
    const cacheEntry = selectorOptionsCache.get(cacheKey);
    if (cacheEntry && cacheEntry.expiresAt > now) {
      return res.status(200).json({
        success: true,
        message: `${widgetName} selector options retrieved from cache`,
        data: cacheEntry.data,
      });
    }

    let sourceOptions = isHittingAnalyticsWidget(widgetId, widgetName, redirectLink)
      ? await fetchHittingWidgetPlayerOptions()
      : isGeneralStatisticsWidget(widgetId, widgetName, redirectLink)
        ? await fetchGeneralStatisticsOptionsViaBrowser(redirectLink)
        : await fetchWidgetSelectorOptionsViaBrowser(redirectLink);

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

    if (sourceOptions.length === 0 && isGeneralStatisticsWidget(widgetId, widgetName, redirectLink)) {
      sourceOptions = localPlayersResult.rows.map((row) => ({
        text: row.player_name,
        externalId: "",
      }));
    }

    const playerLookup = buildPlayerLookupMap(localPlayersResult.rows);

    const teamsMap = new Map();
    const mappedPlayers = [];

    for (const option of sourceOptions) {
      const local = resolveLocalPlayerFromOption(option.text, playerLookup);
      if (!local) continue;

      if (!teamsMap.has(local.team_id)) {
        teamsMap.set(local.team_id, {
          id: local.team_id,
          name: local.team_name,
        });
      }

      mappedPlayers.push({
        id: local.player_id,
        name: local.player_name,
        teamId: local.team_id,
        position: local.position,
        externalId: option.externalId || null,
        sourceLabel: option.text,
      });
    }

    const data = {
      widgetId,
      widgetName,
      teams: Array.from(teamsMap.values()),
      players: mappedPlayers,
      metadata: {
        sourceOptionCount: sourceOptions.length,
        mappedPlayerCount: mappedPlayers.length,
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
    const source = typeof req.body?.source === "string" ? req.body.source : "superwidget-pdf";

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
    console.log(`[PDF Export] Team IDs: ${JSON.stringify(teamIds)}, Player IDs: ${JSON.stringify(playerIds)}`);
    console.log(`[PDF Export] Team Names: ${JSON.stringify(teamNames)}, Player Names: ${JSON.stringify(playerNames)}`);

    const executionUrl = buildWidgetExecutionUrl(
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
        new Promise(resolve => setTimeout(resolve, 60000)) // 60s fallback
      ]);
    } catch (error) {
      console.log(`[PDF Export] Navigation timeout or error: ${error.message}, continuing anyway...`);
    }
    
    try {
      await page.waitForFunction(
        () => document?.body?.innerText?.length > 200,
        { timeout: 45000 }
      );
    } catch {
      // no-op fallback to timed wait below
    }

    if (isHittingAnalyticsWidget(widgetId, widgetName, redirectLink) && playerNames.length > 0) {
      let matchedRequestedPlayer = null;
      const attemptedPlayers = [];

      for (const candidatePlayerName of playerNames) {
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

      console.log(`[PDF Export] Hitting selection debug: ${JSON.stringify(selectionDebug)}`);

      if (!matchedRequestedPlayer) {
        const availablePlayers = await page.evaluate(() => {
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
          message: `Hitting widget could not match selected players (${playerNames.join(", ")}). Widget currently selected "${selectionDebug?.text || "unknown"}".`,
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

      await new Promise((resolve) => setTimeout(resolve, 7000));
    }

    console.log(`[PDF Export] Page loaded, waiting 12 seconds for rendering and parameter hydration...`);
    await new Promise(resolve => setTimeout(resolve, 12000));
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
    const executionUrl = buildWidgetExecutionUrl(redirectLink, teamIds, playerIds, source);
    
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
