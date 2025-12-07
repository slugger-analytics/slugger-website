"use client";

import React, { useMemo } from "react";
import { useStore } from "@nanostores/react";
import { $activeTabId, $widgetTabsCache, WidgetTab } from "@/lib/tabStore";
import DashboardContent from "./dashboard-content";
import WidgetIframe from "./widget-iframe";

/**
 * TabContent Component
 * 
 * Renders the content for all tabs:
 * - Home tab: displays the widget gallery (DashboardContent)
 * - Widget tabs: displays widget iframes (WidgetIframe)
 * 
 * CRITICAL: All widget iframes are ALWAYS rendered in the DOM to preserve their state.
 * Visibility is controlled via CSS display property, NOT conditional rendering.
 * This ensures iframe state is preserved when:
 * - Switching between tabs (Requirement 5.4)
 * - Navigating away from dashboard and returning (Requirement 8.3, 8.5)
 * - Reordering tabs via drag-and-drop (Requirement 8.4)
 * 
 * IMPORTANT: Iframes are rendered from $widgetTabsCache (stable insertion order),
 * NOT from $tabs (which changes order during drag-and-drop). This prevents
 * iframe reloads when tabs are reordered because the DOM order stays constant.
 * 
 * Requirements: 5.2, 5.3, 8.4, 8.5
 */
export default function TabContent() {
    const activeTabId = useStore($activeTabId);
    const widgetTabsCache = useStore($widgetTabsCache);

    // Convert cache Map to array - maintains stable insertion order
    // This order never changes during tab reordering, only when tabs are opened/closed
    const cachedWidgetTabs = useMemo(() => {
        return Array.from(widgetTabsCache.values());
    }, [widgetTabsCache]);

    // Check if Home tab is active
    const isHomeActive = activeTabId === "home";

    return (
        <div className="flex-1 relative overflow-auto">
            {/* Home content - widget gallery */}
            {/* Use CSS display to show/hide, keeping component mounted */}
            <div
                style={{ display: isHomeActive ? "block" : "none" }}
                className="min-h-full"
            >
                <DashboardContent />
            </div>

            {/* 
             * Widget iframes - ALL are ALWAYS rendered in DOM in STABLE order
             * Rendered from $widgetTabsCache which maintains insertion order
             * Tab reordering does NOT affect this array, preventing iframe reloads
             * Visibility controlled via CSS display property
             */}
            {cachedWidgetTabs.map((tab) => (
                <div
                    key={tab.id}
                    style={{ display: activeTabId === tab.id ? "block" : "none" }}
                    className="h-full"
                    data-tab-id={tab.id}
                >
                    <WidgetIframe
                        tab={tab}
                        isVisible={activeTabId === tab.id}
                    />
                </div>
            ))}
        </div>
    );
}
