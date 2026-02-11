"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
import { ExclamationTriangleIcon, ReloadIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { WidgetTab, markIframeLoaded, isIframeLoaded } from "@/lib/tabStore";
import { $user } from "@/lib/userStore";
import { generateToken } from "@/api/user";
import { recordWidgetInteraction } from "@/api/widget";
import {
    getTokensForWidget,
    shouldRefreshTokens,
    getTimeUntilExpiry,
    getRefreshToken,
    updateTokensAfterRefresh
} from "@/lib/auth-store";
import { refreshTokens } from "@/api/auth";

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

    // PostMessage state
    const [widgetOrigin, setWidgetOrigin] = useState<string | null>(null);
    const [isWidgetReady, setIsWidgetReady] = useState(false);

    // Track if iframe has been initialized (src set once)
    const iframeInitializedRef = useRef(false);
    // Track if interaction has been recorded to prevent duplicate recordings on retry
    const interactionRecordedRef = useRef(false);
    // Ref to the iframe element for direct DOM manipulation if needed
    const iframeRef = useRef<HTMLIFrameElement>(null);
    // Store the initial URL to prevent changes
    const initialUrlRef = useRef<string | null>(null);

    /**
     * Sends authentication tokens to the widget via PostMessage.
     * Only sends if iframe is ready and origin is validated.
     */
    const sendTokensToWidget = useCallback(() => {
        // Validate iframe contentWindow exists
        if (!iframeRef.current?.contentWindow) {
            console.warn(`[WidgetIframe] Cannot send tokens: iframe contentWindow not available`);
            return;
        }

        // Validate widgetOrigin is set
        if (!widgetOrigin) {
            console.warn(`[WidgetIframe] Cannot send tokens: widgetOrigin not set`);
            return;
        }

        // Get tokens from auth store
        const tokens = getTokensForWidget();
        if (!tokens) {
            console.log(`[WidgetIframe] No tokens available to send to ${tab.name}`);
            return;
        }

        // Send SLUGGER_AUTH message
        const message = {
            type: "SLUGGER_AUTH",
            payload: {
                accessToken: tokens.accessToken,
                idToken: tokens.idToken,
                expiresAt: tokens.expiresAt,
                user: tokens.user,
            },
        };

        console.log(`[WidgetIframe] Sending SLUGGER_AUTH to ${tab.name} at origin ${widgetOrigin}`);
        iframeRef.current.contentWindow.postMessage(message, widgetOrigin);
    }, [widgetOrigin, tab.name]);

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

    // Parse origin from widget URL for PostMessage validation
    useEffect(() => {
        if (tab.url) {
            try {
                const url = new URL(tab.url, window.location.origin);
                const origin = url.origin;
                setWidgetOrigin(origin);
                console.log(`[WidgetIframe] Parsed origin for ${tab.name}:`, origin);
            } catch (err) {
                console.error(`[WidgetIframe] Failed to parse origin from URL: ${tab.url}`, err);
                setWidgetOrigin(null);
            }
        }
    }, [tab.url, tab.name]);

    // Listen for PostMessage events from widget
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Validate message origin matches widget origin
            if (!widgetOrigin || event.origin !== widgetOrigin) {
                // Silently ignore messages from other origins
                return;
            }

            const messageType = event.data?.type;

            if (messageType === "SLUGGER_WIDGET_READY") {
                console.log(`[WidgetIframe] Received SLUGGER_WIDGET_READY from ${tab.name}`);
                setIsWidgetReady(true);
                sendTokensToWidget();
            } else if (messageType === "SLUGGER_TOKEN_REFRESH") {
                console.log(`[WidgetIframe] Received SLUGGER_TOKEN_REFRESH from ${tab.name}`);

                // Check if tokens need refresh
                if (shouldRefreshTokens()) {
                    console.log(`[WidgetIframe] Tokens need refresh, refreshing...`);
                    const refreshToken = getRefreshToken();
                    if (refreshToken) {
                        refreshTokens(refreshToken)
                            .then((newTokens) => {
                                updateTokensAfterRefresh(newTokens);
                                sendTokensToWidget();
                            })
                            .catch((err) => {
                                console.error(`[WidgetIframe] Token refresh failed:`, err);
                            });
                    } else {
                        console.warn(`[WidgetIframe] No refresh token available`);
                    }
                } else {
                    // Tokens are still valid, just send them
                    console.log(`[WidgetIframe] Tokens still valid, sending current tokens`);
                    sendTokensToWidget();
                }
            }
        };

        window.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, [widgetOrigin, tab.name, sendTokensToWidget]);

    // Send tokens when tab becomes visible
    useEffect(() => {
        if (isVisible && isWidgetReady) {
            console.log(`[WidgetIframe] Tab ${tab.name} became visible, sending tokens`);
            sendTokensToWidget();
        }
    }, [isVisible, isWidgetReady, tab.name, sendTokensToWidget]);

    // Proactive token refresh - triggers 5 minutes before expiry
    useEffect(() => {
        const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
        let refreshTimer: NodeJS.Timeout | null = null;

        const scheduleRefresh = () => {
            // Clear any existing timer
            if (refreshTimer) {
                clearTimeout(refreshTimer);
                refreshTimer = null;
            }

            // Get time until expiry
            const timeUntilExpiry = getTimeUntilExpiry();

            if (timeUntilExpiry <= 0) {
                console.log(`[WidgetIframe] Tokens already expired`);
                return;
            }

            // Calculate when to trigger refresh (5 minutes before expiry)
            const timeUntilRefresh = Math.max(0, timeUntilExpiry - REFRESH_THRESHOLD);

            console.log(`[WidgetIframe] Scheduling token refresh in ${Math.round(timeUntilRefresh / 1000)}s`);

            refreshTimer = setTimeout(() => {
                console.log(`[WidgetIframe] Proactive token refresh triggered for ${tab.name}`);
                const refreshToken = getRefreshToken();

                if (refreshToken) {
                    refreshTokens(refreshToken)
                        .then((newTokens) => {
                            console.log(`[WidgetIframe] Tokens refreshed successfully`);
                            updateTokensAfterRefresh(newTokens);

                            // Send updated tokens to widget if it's ready
                            if (isWidgetReady) {
                                sendTokensToWidget();
                            }

                            // Schedule next refresh
                            scheduleRefresh();
                        })
                        .catch((err) => {
                            console.error(`[WidgetIframe] Proactive token refresh failed:`, err);
                        });
                } else {
                    console.warn(`[WidgetIframe] No refresh token available for proactive refresh`);
                }
            }, timeUntilRefresh);
        };

        // Schedule initial refresh
        scheduleRefresh();

        // Cleanup on unmount
        return () => {
            if (refreshTimer) {
                clearTimeout(refreshTimer);
            }
        };
    }, [tab.name, isWidgetReady, sendTokensToWidget]);

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
