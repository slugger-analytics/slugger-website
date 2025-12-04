"use client";

import React from "react";
import { useStore } from "@nanostores/react";
import { $tabs, $activeTabId, Tab, WidgetTab } from "@/lib/tabStore";
import DashboardContent from "./dashboard-content";
import WidgetIframe from "./widget-iframe";

/**
 * TabContent Component
 * 
 * Renders the content for the active tab:
 * - Home tab: displays the widget gallery (DashboardContent)
 * - Widget tabs: displays the widget iframe (WidgetIframe)
 * 
 * All widget iframes are kept mounted but hidden to preserve their state
 * when switching between tabs (Requirement 5.4).
 * 
 * Requirements: 5.2, 5.3
 */
export default function TabContent() {
    const tabs = useStore($tabs);
    const activeTabId = useStore($activeTabId);

    // Get all widget tabs for rendering (to preserve iframe state)
    const widgetTabs = tabs.filter((tab): tab is WidgetTab => tab.type === "widget");

    // Check if Home tab is active
    const isHomeActive = activeTabId === "home";

    return (
        <div className="flex-1 relative overflow-hidden">
            {/* Home content - widget gallery */}
            <div className={isHomeActive ? "h-full overflow-auto" : "hidden"}>
                <DashboardContent />
            </div>

            {/* Widget iframes - all rendered but only active one visible */}
            {widgetTabs.map((tab) => (
                <div
                    key={tab.id}
                    className={activeTabId === tab.id ? "h-full" : "hidden"}
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
