"use client";

import React from "react";
import { useStore } from "@nanostores/react";
import { $tabs, $activeTabId, WidgetTab } from "@/lib/tabStore";
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
 * Requirements: 5.2, 5.3, 8.5
 */
export default function TabContent() {
    const tabs = useStore($tabs);
    const activeTabId = useStore($activeTabId);

    // Get all widget tabs - ALL will be rendered (not just active)
    const widgetTabs = tabs.filter((tab): tab is WidgetTab => tab.type === "widget");

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
             * Widget iframes - ALL are ALWAYS rendered in DOM
             * Visibility controlled via CSS display property
             * Stable keys (tab.id) ensure React doesn't remount iframes
             * This preserves iframe state across tab switches and navigation
             */}
            {widgetTabs.map((tab) => (
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
