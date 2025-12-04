"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useStore } from "@nanostores/react";
import { ExclamationTriangleIcon, ReloadIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { WidgetTab } from "@/lib/tabStore";
import { $user } from "@/lib/userStore";
import { generateToken } from "@/api/user";
import { recordWidgetInteraction } from "@/api/widget";

interface WidgetIframeProps {
    tab: WidgetTab;
    isVisible: boolean;
}

/**
 * WidgetIframe Component
 * 
 * Renders an iframe for a widget tab, handling:
 * - Token injection for restricted widgets
 * - Visibility toggle to preserve iframe state (hidden vs unmounted)
 * - Loading and error states
 * 
 * Requirements: 2.4, 5.4
 */
export default function WidgetIframe({ tab, isVisible }: WidgetIframeProps) {
    const user = useStore($user);
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Builds the iframe URL, injecting token for restricted widgets
     */
    const buildIframeUrl = useCallback(async () => {
        if (!tab.url) {
            setError("Widget URL is missing");
            setIsLoading(false);
            return;
        }

        try {
            const url = new URL(tab.url, window.location.origin);

            // Inject token for restricted access widgets
            if (tab.restrictedAccess && user.id) {
                const token = await generateToken(parseInt(user.id), tab.publicId);
                url.searchParams.set("alpb_token", token);
            }

            // Record widget launch interaction
            if (user.id) {
                recordWidgetInteraction(tab.widgetId, parseInt(user.id), "launch");
            }

            setIframeUrl(url.toString());
            setError(null);
        } catch (err) {
            console.error("Failed to build iframe URL:", err);
            setError("Failed to load widget. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [tab.url, tab.restrictedAccess, tab.publicId, tab.widgetId, user.id]);

    // Build URL on mount or when tab changes
    useEffect(() => {
        // Only build URL once per tab
        if (!iframeUrl && !error) {
            buildIframeUrl();
        }
    }, [buildIframeUrl, iframeUrl, error]);

    const handleRetry = () => {
        setIsLoading(true);
        setError(null);
        setIframeUrl(null);
        buildIframeUrl();
    };

    const handleIframeLoad = () => {
        setIsLoading(false);
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

            {/* Iframe - always rendered to preserve state */}
            {iframeUrl && (
                <iframe
                    src={iframeUrl}
                    title={tab.name}
                    className="w-full h-full border-0"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                    allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone"
                />
            )}
        </div>
    );
}
