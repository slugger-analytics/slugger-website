"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
import { ExclamationTriangleIcon, ReloadIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { WidgetTab, markIframeLoaded, isIframeLoaded } from "@/lib/tabStore";
import { $user } from "@/lib/userStore";
import { generateToken } from "@/api/user";
import { recordWidgetInteraction } from "@/api/widget";

interface WidgetIframeProps {
    tab: WidgetTab;
    isVisible: boolean;
}

/**
 * Parses a user ID string to a number, returning null if invalid.
 * User IDs should always be numeric strings from the database.
 */
function parseUserId(userId: string): number | null {
    if (!userId || !/^\d+$/.test(userId)) {
        return null;
    }
    return parseInt(userId, 10);
}

/**
 * WidgetIframe Component
 * 
 * Renders an iframe for a widget tab, handling:
 * - Token injection for restricted widgets
 * - Visibility toggle to preserve iframe state (hidden vs unmounted)
 * - Loading and error states
 * 
 * CRITICAL: The iframe src is set ONLY ONCE on initial render.
 * Subsequent re-renders do NOT modify the src attribute.
 * This prevents iframe reloads when:
 * - Switching between tabs
 * - Navigating away and returning to dashboard
 * - Reordering tabs via drag-and-drop
 * 
 * Requirements: 2.4, 5.4, 8.3, 8.4
 */
export default function WidgetIframe({ tab, isVisible }: WidgetIframeProps) {
    const user = useStore($user);
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Track if iframe has been initialized (src set once)
    const iframeInitializedRef = useRef(false);
    // Track if interaction has been recorded to prevent duplicate recordings on retry
    const interactionRecordedRef = useRef(false);
    // Ref to the iframe element for direct DOM manipulation if needed
    const iframeRef = useRef<HTMLIFrameElement>(null);
    // Store the initial URL to prevent changes
    const initialUrlRef = useRef<string | null>(null);

    /**
     * Builds the iframe URL, injecting token for restricted widgets.
     * This should only be called once per tab lifecycle.
     */
    const buildIframeUrl = useCallback(async () => {
        // If already initialized, don't rebuild URL
        if (iframeInitializedRef.current || initialUrlRef.current) {
            return;
        }

        if (!tab.url) {
            setError("Widget URL is missing");
            setIsLoading(false);
            return;
        }

        try {
            const url = new URL(tab.url, window.location.origin);
            const userIdNum = parseUserId(user.id);

            // Inject token for restricted access widgets
            if (tab.restrictedAccess && userIdNum !== null) {
                const token = await generateToken(userIdNum, tab.publicId);
                url.searchParams.set("alpb_token", token);
            }

            // Record widget launch interaction (only once per tab lifecycle)
            if (userIdNum !== null && !interactionRecordedRef.current) {
                interactionRecordedRef.current = true;
                // Fire-and-forget with error logging - interaction recording is non-critical
                recordWidgetInteraction(tab.widgetId, userIdNum, "launch").catch((err) => {
                    console.error("Failed to record widget interaction:", err);
                });
            }

            const finalUrl = url.toString();

            // Store the initial URL and mark as initialized
            initialUrlRef.current = finalUrl;
            iframeInitializedRef.current = true;

            setIframeUrl(finalUrl);
            setError(null);
        } catch (err) {
            console.error("Failed to build iframe URL:", err);
            setError("Failed to load widget. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [tab.url, tab.restrictedAccess, tab.publicId, tab.widgetId, user.id]);

    // Build URL on mount - only once
    useEffect(() => {
        // Only build URL if not already initialized
        if (!iframeInitializedRef.current && !initialUrlRef.current && !error) {
            buildIframeUrl();
        }
    }, [buildIframeUrl, error]);

    const handleRetry = () => {
        // Reset initialization state for retry
        iframeInitializedRef.current = false;
        initialUrlRef.current = null;
        setIsLoading(true);
        setError(null);
        setIframeUrl(null);
        buildIframeUrl();
    };

    const handleIframeLoad = () => {
        setIsLoading(false);
        // Mark this iframe as loaded in the store
        markIframeLoaded(tab.id);
    };

    const handleIframeError = () => {
        setError("Failed to load widget content");
        setIsLoading(false);
    };

    // Error state
    if (error) {
        return (
            <div
                className={cn(
                    "flex flex-col items-center justify-center h-full bg-muted/20",
                    !isVisible && "hidden"
                )}
            >
                <ExclamationTriangleIcon className="h-12 w-12 text-destructive mb-4" />
                <p className="text-destructive font-medium mb-2">Error Loading Widget</p>
                <p className="text-muted-foreground text-sm mb-4">{error}</p>
                <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                    <ReloadIcon className="h-4 w-4" />
                    Retry
                </button>
            </div>
        );
    }

    // Use the stored initial URL to prevent any src changes after first render
    const displayUrl = initialUrlRef.current || iframeUrl;

    return (
        <div
            className={cn(
                "relative w-full h-full",
                !isVisible && "hidden"
            )}
        >
            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                    <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        <p className="text-sm text-muted-foreground">Loading {tab.name}...</p>
                    </div>
                </div>
            )}

            {/* 
             * Iframe - rendered once with stable src
             * The src attribute is set only on initial render and never changed
             * This preserves iframe state across tab switches and navigation
             */}
            {displayUrl && (
                <iframe
                    ref={iframeRef}
                    src={displayUrl}
                    title={tab.name}
                    className="w-full h-full border-0"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                    allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone"
                    data-tab-id={tab.id}
                />
            )}
        </div>
    );
}
