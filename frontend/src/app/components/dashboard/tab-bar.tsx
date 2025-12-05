"use client";

import React, { useState, useRef, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { HomeIcon, Cross2Icon, ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import {
    $tabs,
    $activeTabId,
    activateTab,
    closeTab,
    reorderTabs,
    Tab,
    WidgetTab,
} from "@/lib/tabStore";

/**
 * TabBar Component
 * 
 * A horizontal tab bar that displays open tabs for the widget viewer.
 * Features:
 * - Home tab (always visible, non-closable, non-draggable)
 * - Widget tabs (closable, draggable for reordering)
 * - Horizontal scrolling for overflow
 * - Drag-and-drop reordering
 */
export default function TabBar() {
    const tabs = useStore($tabs);
    const activeTabId = useStore($activeTabId);

    // Drag state
    const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Scroll state for overflow handling
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftScroll, setShowLeftScroll] = useState(false);
    const [showRightScroll, setShowRightScroll] = useState(false);

    // Check scroll overflow
    const checkScrollOverflow = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        setShowLeftScroll(scrollLeft > 0);
        setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 1);
    };

    useEffect(() => {
        checkScrollOverflow();
        window.addEventListener("resize", checkScrollOverflow);
        return () => window.removeEventListener("resize", checkScrollOverflow);
    }, [tabs]);

    // Scroll handlers
    const scrollLeft = () => {
        scrollContainerRef.current?.scrollBy({ left: -150, behavior: "smooth" });
    };

    const scrollRight = () => {
        scrollContainerRef.current?.scrollBy({ left: 150, behavior: "smooth" });
    };

    // Drag handlers
    const handleDragStart = (e: React.DragEvent, tabId: string, index: number) => {
        // Prevent dragging Home tab
        if (tabId === "home") {
            e.preventDefault();
            return;
        }
        setDraggedTabId(tabId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", index.toString());
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        // Prevent dropping at index 0 (before Home tab)
        if (index === 0) {
            e.dataTransfer.dropEffect = "none";
            return;
        }
        e.dataTransfer.dropEffect = "move";
        setDragOverIndex(index);
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e: React.DragEvent, toIndex: number) => {
        e.preventDefault();
        // Prevent dropping at index 0
        if (toIndex === 0) return;

        const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
        if (!isNaN(fromIndex) && fromIndex !== toIndex) {
            reorderTabs(fromIndex, toIndex);
        }
        setDraggedTabId(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedTabId(null);
        setDragOverIndex(null);
    };

    return (
        <div className="flex items-center w-full border-b border-border bg-muted/30">
            {/* Left scroll indicator */}
            {showLeftScroll && (
                <button
                    onClick={scrollLeft}
                    className="flex-shrink-0 p-1 hover:bg-accent rounded-sm"
                    aria-label="Scroll tabs left"
                >
                    <ChevronLeftIcon className="h-4 w-4" />
                </button>
            )}

            {/* Tab container with horizontal scroll */}
            <div
                ref={scrollContainerRef}
                className="flex-1 flex items-center overflow-x-auto scrollbar-hide"
                onScroll={checkScrollOverflow}
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {tabs.map((tab, index) => (
                    <TabItem
                        key={tab.id}
                        tab={tab}
                        index={index}
                        isActive={tab.id === activeTabId}
                        isDragging={tab.id === draggedTabId}
                        isDragOver={index === dragOverIndex}
                        onActivate={() => activateTab(tab.id)}
                        onClose={() => closeTab(tab.id)}
                        onDragStart={(e) => handleDragStart(e, tab.id, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                    />
                ))}
            </div>

            {/* Right scroll indicator */}
            {showRightScroll && (
                <button
                    onClick={scrollRight}
                    className="flex-shrink-0 p-1 hover:bg-accent rounded-sm"
                    aria-label="Scroll tabs right"
                >
                    <ChevronRightIcon className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}


/**
 * TabItem Component
 * 
 * Renders an individual tab with appropriate styling and interactions.
 */
interface TabItemProps {
    tab: Tab;
    index: number;
    isActive: boolean;
    isDragging: boolean;
    isDragOver: boolean;
    onActivate: () => void;
    onClose: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
}

function TabItem({
    tab,
    index,
    isActive,
    isDragging,
    isDragOver,
    onActivate,
    onClose,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
}: TabItemProps) {
    const isHomeTab = tab.type === "home";
    const isDraggable = !isHomeTab;

    return (
        <div
            className={cn(
                "group flex items-center gap-2 px-3 py-2 border-r border-border cursor-pointer select-none transition-colors min-w-[100px] max-w-[200px]",
                // Active state
                isActive
                    ? "bg-background text-foreground border-b-2 border-b-primary"
                    : "bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                // Dragging states
                isDragging && "opacity-50",
                isDragOver && "border-l-2 border-l-primary",
                // Home tab sticky positioning
                isHomeTab && "sticky left-0 z-10 bg-muted/80 backdrop-blur-sm"
            )}
            draggable={isDraggable}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            onClick={onActivate}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onActivate();
                }
            }}
        >
            {/* Tab icon/name */}
            {isHomeTab ? (
                <>
                    <HomeIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">Home</span>
                </>
            ) : (
                <>
                    <span className="text-sm font-medium truncate" title={(tab as WidgetTab).name}>
                        {(tab as WidgetTab).name}
                    </span>
                    {/* Close button for widget tabs - always focusable for keyboard accessibility */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                onClose();
                            }
                        }}
                        className={cn(
                            "flex-shrink-0 p-0.5 rounded-sm transition-opacity",
                            "hover:bg-black/20 hover:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary",
                            // Visible when active, hovered, or focused; otherwise hidden but still focusable
                            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                        )}
                        aria-label={`Close ${(tab as WidgetTab).name} tab`}
                        tabIndex={0}
                    >
                        <Cross2Icon className="h-3 w-3" />
                    </button>
                </>
            )}
        </div>
    );
}
