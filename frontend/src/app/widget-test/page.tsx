"use client";

import { useState, useEffect } from "react";
import { WidgetFrame } from "@/app/components/WidgetFrame";
import { useAuth } from "@/app/contexts/AuthContext";
import { useStore } from "@nanostores/react";
import { $authTokens } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

/**
 * Widget Test Page
 *
 * This page allows testing the WidgetFrame component and PostMessage protocol.
 * It embeds a test widget and displays the current auth state.
 */
export default function WidgetTestPage() {
  const { isAuthenticated, getWidgetTokens } = useAuth();
  const storeTokens = useStore($authTokens);
  const [widgetUrl, setWidgetUrl] = useState("https://jwt-testing.netlify.app/");
  const [isWidgetReady, setIsWidgetReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Defer token state to client-side to avoid SSR hydration mismatch
  const [tokens, setTokens] = useState<typeof storeTokens>(null);
  const [hasMounted, setHasMounted] = useState(false);

  // Set tokens only after client-side mount
  useEffect(() => {
    setHasMounted(true);
    setTokens(storeTokens);
  }, [storeTokens]);

  const widgetTokens = getWidgetTokens();

  // Debug logging
  useEffect(() => {
    if (!hasMounted) return;
    console.log("[WidgetTestPage] Component mounted");
    console.log("[WidgetTestPage] isAuthenticated:", isAuthenticated);
    console.log("[WidgetTestPage] tokens from store:", tokens);
    console.log("[WidgetTestPage] widgetTokens:", widgetTokens);
    
    // Check localStorage directly
    const storedTokens = localStorage.getItem("slugger_auth_tokens");
    console.log("[WidgetTestPage] localStorage tokens:", storedTokens ? JSON.parse(storedTokens) : null);
  }, [hasMounted, isAuthenticated, tokens, widgetTokens]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Widget Integration Test</h1>

      {/* Auth Status */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">Auth Context:</span>
            <span
              className={`px-2 py-1 rounded text-sm ${
                isAuthenticated
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {isAuthenticated ? "Yes" : "No (session-based)"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Tokens Available:</span>
            <span
              className={`px-2 py-1 rounded text-sm ${
                !hasMounted
                  ? "bg-gray-100 text-gray-800"
                  : tokens
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {!hasMounted ? "Loading..." : tokens ? "Yes ✓" : "No"}
            </span>
          </div>

          {tokens && (
            <>
              <div className="flex items-center gap-2">
                <span className="font-medium">Token Expires:</span>
                <span className="text-sm text-gray-600">
                  {new Date(tokens.expiresAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Access Token (first 50 chars):</span>
                <code className="text-xs bg-gray-100 p-1 rounded">
                  {tokens.accessToken.substring(0, 50)}...
                </code>
              </div>
            </>
          )}

          {!isAuthenticated && (
            <p className="text-amber-600 text-sm">
              Please log in first to test widget token passing.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Widget URL Input */}
      <Card>
        <CardHeader>
          <CardTitle>Widget Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={widgetUrl}
              onChange={(e) => setWidgetUrl(e.target.value)}
              placeholder="Widget URL (e.g., http://localhost:3001)"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Widget Ready:</span>
            <span
              className={`px-2 py-1 rounded text-sm ${
                isWidgetReady
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {isWidgetReady ? "Yes" : "Waiting..."}
            </span>
          </div>
          {error && (
            <p className="text-red-600 text-sm">Error: {error}</p>
          )}
        </CardContent>
      </Card>

      {/* Widget Tokens Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Tokens Being Sent to Widget</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasMounted ? (
            <p className="text-gray-500">Loading...</p>
          ) : widgetTokens ? (
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-48">
              {JSON.stringify(
                {
                  type: "SLUGGER_AUTH",
                  payload: {
                    accessToken: widgetTokens.accessToken.substring(0, 50) + "...",
                    idToken: widgetTokens.idToken.substring(0, 50) + "...",
                    expiresAt: widgetTokens.expiresAt,
                    expiresAtReadable: new Date(widgetTokens.expiresAt).toLocaleString(),
                  },
                },
                null,
                2
              )}
            </pre>
          ) : (
            <p className="text-gray-500">No tokens available</p>
          )}
        </CardContent>
      </Card>

      {/* Widget Frame - render if we have tokens (not just isAuthenticated) */}
      {hasMounted && tokens && widgetUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Embedded Widget</CardTitle>
          </CardHeader>
          <CardContent>
            <WidgetFrame
              src={widgetUrl}
              title="Test Widget"
              widgetId="test-widget"
              className="w-full h-[400px] border rounded"
              onReady={() => setIsWidgetReady(true)}
              onError={(err) => setError(err)}
            />
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal list-inside space-y-1">
            <li>Log in to the application first</li>
            <li>Start a test widget server on the URL above</li>
            <li>The widget should receive SLUGGER_AUTH message with tokens</li>
            <li>Check browser console for PostMessage logs</li>
          </ol>
          <div className="mt-4 p-3 bg-gray-100 rounded">
            <p className="font-medium mb-2">Test Widget Code:</p>
            <pre className="text-xs overflow-auto">
{`// In your widget, add this listener:
window.addEventListener('message', (event) => {
  if (event.data?.type === 'SLUGGER_AUTH') {
    console.log('Received tokens:', event.data.payload);
  }
});

// Signal ready to shell:
window.parent.postMessage({
  type: 'SLUGGER_WIDGET_READY',
  widgetId: 'my-widget'
}, '*');`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
