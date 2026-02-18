"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "@nanostores/react";
import { 
  $authTokens, 
  getTokensForWidget, 
  getRefreshToken,
  shouldRefreshTokens,
  updateTokensAfterRefresh,
  getTimeUntilExpiry
} from "@/lib/auth-store";
import { refreshTokens, requestWidgetToken } from "@/api/auth";

interface WidgetFrameProps {
  /** URL of the widget to embed */
  src: string;
  /** Title for accessibility */
  title: string;
  /** Unique identifier for this widget instance */
  widgetId: string;
  /** CSS class for styling the iframe */
  className?: string;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Callback when widget is ready and authenticated */
  onReady?: () => void;
}

/**
 * WidgetFrame Component
 *
 * Embeds a widget in an iframe and handles authentication token passing
 * via PostMessage protocol as defined in the Widget Developer Guide.
 *
 * Protocol:
 * 1. Widget loads and sends SLUGGER_WIDGET_READY
 * 2. Shell responds with SLUGGER_AUTH containing tokens
 * 3. Widget can request SLUGGER_TOKEN_REFRESH when tokens expire
 */
export function WidgetFrame({
  src,
  title,
  widgetId,
  className = "w-full h-[600px] border-0",
  onError,
  onReady,
}: WidgetFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const tokens = useStore($authTokens);
  const [isReady, setIsReady] = useState(false);
  const [widgetOrigin, setWidgetOrigin] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refresh tokens via API
  const performTokenRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      console.warn("[WidgetFrame] No refresh token available");
      onError?.("Session expired. Please login again.");
      return;
    }

    setIsRefreshing(true);
    console.log("[WidgetFrame] Refreshing tokens...");

    try {
      const newTokens = await refreshTokens(refreshToken);
      updateTokensAfterRefresh(newTokens);
      console.log("[WidgetFrame] Tokens refreshed successfully");
      // sendTokens will be called automatically via the tokens useEffect
    } catch (error) {
      console.error("[WidgetFrame] Token refresh failed:", error);
      onError?.("Failed to refresh session. Please login again.");
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onError]);

  // Parse widget origin from src
  useEffect(() => {
    console.log("[WidgetFrame] Mounting with src:", src);
    try {
      const origin = new URL(src).origin;
      console.log("[WidgetFrame] Parsed widget origin:", origin);
      setWidgetOrigin(origin);
    } catch {
      console.error("[WidgetFrame] Invalid widget URL:", src);
      onError?.("Invalid widget URL");
    }
  }, [src, onError]);

  // Send tokens to widget.
  // Also requests a fresh 5-minute bootstrap JWT from the backend so the
  // widget's own backend can call GET /api/users/me to verify the user's
  // identity – without the token ever appearing in the URL.
  const sendTokens = useCallback(async () => {
    if (!iframeRef.current?.contentWindow || !widgetOrigin) return;

    const widgetTokens = getTokensForWidget();
    if (!widgetTokens) {
      console.warn("[WidgetFrame] No valid tokens available to send");
      return;
    }

    // Request a short-lived (5 min) bootstrap token from Slugger's backend.
    // This is separate from the long-lived Cognito accessToken so widgets
    // never hold a credential that lasts longer than one interaction.
    let bootstrapToken: string | undefined;
    try {
      bootstrapToken = await requestWidgetToken();
    } catch (err) {
      // Non-fatal: widget still works with the Cognito tokens for display purposes.
      console.warn("[WidgetFrame] Could not get bootstrap token:", err);
    }

    try {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "SLUGGER_AUTH",
          payload: {
            accessToken: widgetTokens.accessToken,
            idToken: widgetTokens.idToken,
            expiresAt: widgetTokens.expiresAt,
            user: widgetTokens.user,
            // Short-lived token for widget backend → GET /api/users/me
            bootstrapToken,
          },
        },
        widgetOrigin
      );
      console.log(
        "[WidgetFrame] Sent SLUGGER_AUTH to widget:", widgetId,
        "| user:", widgetTokens.user?.email,
        "| bootstrapToken:", bootstrapToken ? "✓" : "✗"
      );
    } catch (error) {
      console.error("[WidgetFrame] Failed to send tokens:", error);
      onError?.("Failed to send auth tokens to widget");
    }
  }, [widgetOrigin, widgetId, onError]);

  // Listen for messages from widget
  useEffect(() => {
    if (!widgetOrigin) return;

    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      if (event.origin !== widgetOrigin) return;

      const { type, widgetId: messageWidgetId } = event.data || {};

      if (type === "SLUGGER_WIDGET_READY") {
        console.log(
          "[WidgetFrame] Widget ready:",
          messageWidgetId || widgetId
        );
        setIsReady(true);
        // Send tokens immediately when widget is ready
        sendTokens();
        onReady?.();
      } else if (type === "SLUGGER_TOKEN_REFRESH") {
        console.log("[WidgetFrame] Widget requesting token refresh");
        // Check if we need to refresh from server or just resend current tokens
        if (shouldRefreshTokens()) {
          performTokenRefresh();
        } else {
          // Tokens are still valid, just resend them
          sendTokens();
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [widgetOrigin, widgetId, sendTokens, onReady, performTokenRefresh]);

  // Re-send tokens when they change (e.g., after refresh)
  useEffect(() => {
    if (isReady && tokens) {
      sendTokens();
    }
  }, [tokens, isReady, sendTokens]);

  // Proactive token refresh - refresh 5 minutes before expiry
  useEffect(() => {
    if (!isReady || !tokens) return;

    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const timeUntilExpiry = getTimeUntilExpiry();
    const REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes before expiry
    const timeUntilRefresh = timeUntilExpiry - REFRESH_BUFFER;

    if (timeUntilRefresh > 0) {
      console.log(`[WidgetFrame] Scheduling token refresh in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
      refreshTimerRef.current = setTimeout(() => {
        console.log("[WidgetFrame] Proactive token refresh triggered");
        performTokenRefresh();
      }, timeUntilRefresh);
    } else if (timeUntilExpiry > 0) {
      // Token is about to expire, refresh now
      console.log("[WidgetFrame] Token expiring soon, refreshing now");
      performTokenRefresh();
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [isReady, tokens, performTokenRefresh]);

  // Handle iframe load (fallback for widgets that don't send WIDGET_READY)
  const handleLoad = () => {
    console.log("[WidgetFrame] iframe loaded, isReady:", isReady);
    // Give widget time to set up listener, then send tokens as fallback
    setTimeout(() => {
      if (!isReady) {
        console.log("[WidgetFrame] Sending tokens on load (fallback), widgetOrigin:", widgetOrigin);
        sendTokens();
      }
    }, 500); // Increased timeout to give widget more time
  };

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title={title}
      className={className}
      onLoad={handleLoad}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
}

export default WidgetFrame;
