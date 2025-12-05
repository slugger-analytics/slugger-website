import { atom } from "nanostores";
import { WidgetType } from "@/data/types";

// ============================================================================
// Tab Types and Interfaces
// ============================================================================

// Base tab type
export interface BaseTab {
    id: string;
    type: "home" | "widget";
}

// Home tab (singleton, non-closable)
export interface HomeTab extends BaseTab {
    type: "home";
    id: "home";
}

// Widget tab (closable, reorderable)
export interface WidgetTab extends BaseTab {
    type: "widget";
    id: string; // unique identifier (e.g., `widget-${widgetId}`)
    widgetId: number;
    name: string;
    url: string;
    restrictedAccess: boolean;
    publicId: string;
}

export type Tab = HomeTab | WidgetTab;

// Tab store state shape
export interface TabState {
    tabs: Tab[];
    activeTabId: string;
}

// Session storage schema
export interface PersistedTabState {
    tabs: Tab[];
    activeTabId: string;
}

// ============================================================================
// Constants
// ============================================================================

const HOME_TAB: HomeTab = {
    id: "home",
    type: "home",
};

const SESSION_STORAGE_KEY = "widget-tab-state";

// ============================================================================
// Store Atoms
// ============================================================================

export const $tabs = atom<Tab[]>([HOME_TAB]);
export const $activeTabId = atom<string>("home");

/**
 * Tracks which iframes have been loaded.
 * Key: tabId, Value: true if iframe has loaded
 * Used to prevent unnecessary reloads when switching tabs.
 * Requirements: 8.3
 */
export const $iframeLoadedMap = atom<Record<string, boolean>>({});


// ============================================================================
// Tab Store Actions
// ============================================================================

/**
 * Opens a widget in a new tab, or activates existing tab if widget is already open.
 * New tabs are appended to the right of existing tabs.
 */
export function openWidgetTab(widget: WidgetType): void {
    const tabs = $tabs.get();
    const targetTabId = `widget-${widget.id}`;

    // Check if widget already has an open tab
    const existingTab = tabs.find(
        (tab) => tab.type === "widget" && tab.id === targetTabId
    );

    if (existingTab) {
        // Activate existing tab instead of creating duplicate
        $activeTabId.set(existingTab.id);
        return;
    }

    // Create new widget tab
    const newTab: WidgetTab = {
        id: targetTabId,
        type: "widget",
        widgetId: widget.id,
        name: widget.name,
        url: widget.redirectLink || "",
        restrictedAccess: widget.restrictedAccess,
        publicId: widget.publicId,
    };

    // Append to the right of existing tabs
    $tabs.set([...tabs, newTab]);
    $activeTabId.set(newTab.id);

    // Persist state
    persistTabState();
}

/**
 * Closes a tab by its ID. Cannot close the Home tab.
 * If closing the active tab, activates the tab to its left.
 */
export function closeTab(tabId: string): void {
    // Cannot close Home tab
    if (tabId === "home") {
        return;
    }

    const tabs = $tabs.get();
    const tabIndex = tabs.findIndex((tab) => tab.id === tabId);

    // Tab not found
    if (tabIndex === -1) {
        return;
    }

    const activeTabId = $activeTabId.get();
    const isClosingActiveTab = activeTabId === tabId;

    // Remove the tab
    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    $tabs.set(newTabs);

    // Clear iframe loaded status for the closed tab
    const currentMap = $iframeLoadedMap.get();
    if (currentMap[tabId]) {
        const newMap = { ...currentMap };
        delete newMap[tabId];
        $iframeLoadedMap.set(newMap);
    }

    // If closing active tab, activate the tab to its left
    if (isClosingActiveTab) {
        const newActiveIndex = Math.max(0, tabIndex - 1);
        $activeTabId.set(newTabs[newActiveIndex].id);
    }

    // Persist state
    persistTabState();
}

/**
 * Activates a tab by its ID.
 */
export function activateTab(tabId: string): void {
    const tabs = $tabs.get();
    const tabExists = tabs.some((tab) => tab.id === tabId);

    if (tabExists) {
        $activeTabId.set(tabId);
        persistTabState();
    }
}

/**
 * Reorders tabs by moving a tab from one index to another.
 * Home tab (index 0) cannot be moved or displaced.
 */
export function reorderTabs(fromIndex: number, toIndex: number): void {
    // Cannot move Home tab (index 0)
    if (fromIndex === 0) {
        return;
    }

    // Cannot move to position 0 (before Home tab)
    if (toIndex === 0) {
        return;
    }

    const tabs = $tabs.get();

    // Validate indices
    if (fromIndex < 0 || fromIndex >= tabs.length) {
        return;
    }
    if (toIndex < 0 || toIndex >= tabs.length) {
        return;
    }

    // Same position, no change needed
    if (fromIndex === toIndex) {
        return;
    }

    // Perform reorder
    const newTabs = [...tabs];
    const [movedTab] = newTabs.splice(fromIndex, 1);
    newTabs.splice(toIndex, 0, movedTab);

    $tabs.set(newTabs);

    // Persist state
    persistTabState();
}

// ============================================================================
// Iframe Loaded Tracking
// ============================================================================

/**
 * Marks an iframe as loaded for a given tab.
 * Used to track which iframes have been initialized to prevent reloads.
 * Requirements: 8.3
 */
export function markIframeLoaded(tabId: string): void {
    const currentMap = $iframeLoadedMap.get();
    if (!currentMap[tabId]) {
        $iframeLoadedMap.set({ ...currentMap, [tabId]: true });
    }
}

/**
 * Checks if an iframe has been loaded for a given tab.
 * Requirements: 8.3
 */
export function isIframeLoaded(tabId: string): boolean {
    return $iframeLoadedMap.get()[tabId] === true;
}

/**
 * Clears the iframe loaded status for a tab (called when tab is closed).
 */
export function clearIframeLoaded(tabId: string): void {
    const currentMap = $iframeLoadedMap.get();
    if (currentMap[tabId]) {
        const newMap = { ...currentMap };
        delete newMap[tabId];
        $iframeLoadedMap.set(newMap);
    }
}


// ============================================================================
// Session Storage Persistence
// ============================================================================

/**
 * Persists the current tab state to sessionStorage.
 */
export function persistTabState(): void {
    if (typeof window === "undefined") {
        return;
    }

    try {
        const state: PersistedTabState = {
            tabs: $tabs.get(),
            activeTabId: $activeTabId.get(),
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        // Gracefully handle storage errors (e.g., quota exceeded, private browsing)
        console.warn("Failed to persist tab state:", error);
    }
}

/**
 * Initializes the tab store from sessionStorage, or starts fresh with Home tab.
 * Should be called on dashboard mount.
 */
export function initializeTabStore(): void {
    if (typeof window === "undefined") {
        return;
    }

    try {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);

        if (stored) {
            const state: PersistedTabState = JSON.parse(stored);

            // Validate the restored state
            if (isValidTabState(state)) {
                $tabs.set(state.tabs);
                $activeTabId.set(state.activeTabId);
                return;
            }
        }
    } catch (error) {
        // Corrupted data - clear and start fresh
        console.warn("Failed to restore tab state, starting fresh:", error);
        clearPersistedTabState();
    }

    // Start with fresh state
    $tabs.set([HOME_TAB]);
    $activeTabId.set("home");
}

/**
 * Clears the persisted tab state from sessionStorage.
 */
export function clearPersistedTabState(): void {
    if (typeof window === "undefined") {
        return;
    }

    try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
        console.warn("Failed to clear persisted tab state:", error);
    }
}

/**
 * Validates that a restored tab state is valid.
 */
function isValidTabState(state: unknown): state is PersistedTabState {
    if (!state || typeof state !== "object") {
        return false;
    }

    const s = state as PersistedTabState;

    // Must have tabs array
    if (!Array.isArray(s.tabs) || s.tabs.length === 0) {
        return false;
    }

    // First tab must be Home tab
    const firstTab = s.tabs[0];
    if (firstTab.id !== "home" || firstTab.type !== "home") {
        return false;
    }

    // Must have valid activeTabId
    if (typeof s.activeTabId !== "string") {
        return false;
    }

    // activeTabId must reference an existing tab
    const activeTabExists = s.tabs.some((tab) => tab.id === s.activeTabId);
    if (!activeTabExists) {
        return false;
    }

    // Validate each tab
    for (const tab of s.tabs) {
        if (!isValidTab(tab)) {
            return false;
        }
    }

    return true;
}

/**
 * Validates that a tab object is valid.
 */
function isValidTab(tab: unknown): tab is Tab {
    if (!tab || typeof tab !== "object") {
        return false;
    }

    const t = tab as Tab;

    if (t.type === "home") {
        return t.id === "home";
    }

    if (t.type === "widget") {
        return (
            typeof t.id === "string" &&
            typeof t.widgetId === "number" &&
            typeof t.name === "string" &&
            typeof t.url === "string" &&
            typeof t.restrictedAccess === "boolean" &&
            typeof t.publicId === "string"
        );
    }

    return false;
}
