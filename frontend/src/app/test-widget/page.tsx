"use client";

import { useEffect, useState } from "react";

interface SluggerAuth {
  accessToken: string;
  idToken: string;
  expiresAt: number;
  bootstrapToken: string | null; // short-lived 5-min JWT for GET /api/users/me
  user: {
    id: string;
    email: string;
    emailVerified?: boolean;
    firstName?: string;
    lastName?: string;
    role?: string;
    teamId?: string;
    teamRole?: string;
    isAdmin?: boolean;
  };
}

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com",
  "https://slugger-alb-1518464736.us-east-2.elb.amazonaws.com",
  "https://alpb-analytics.com",
  "https://www.alpb-analytics.com",
  "https://jwt-testing.netlify.app",
];

/**
 * Test Widget Page
 * 
 * This simulates a widget receiving tokens from the SLUGGER shell.
 * It implements the PostMessage protocol as defined in the Widget Developer Guide.
 */
export default function TestWidgetPage() {
  const [auth, setAuth] = useState<SluggerAuth | null>(null);
  const [status, setStatus] = useState<"waiting" | "success" | "error">("waiting");
  const [logs, setLogs] = useState<string[]>(["[Init] Widget loaded, sending SLUGGER_WIDGET_READY..."]);
  const [apiResult, setApiResult] = useState<string>("");
  const [shellOrigin, setShellOrigin] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Decode JWT payload
  const decodeJWT = (token: string) => {
    try {
      const payload = token.split(".")[1];
      return JSON.parse(atob(payload));
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    // Listen for messages from shell
    const handleMessage = (event: MessageEvent) => {
      // Validate origin - allow localhost variants for testing
      const isLocalhost = event.origin.includes("localhost") || event.origin.includes("127.0.0.1");
      if (!isLocalhost && !ALLOWED_ORIGINS.includes(event.origin)) {
        addLog(`Ignored message from unknown origin: ${event.origin}`);
        return;
      }

      if (event.data?.type === "SLUGGER_AUTH") {
        addLog(`Received SLUGGER_AUTH from ${event.origin}`);
        setShellOrigin(event.origin);

        const { payload } = event.data;
        const decoded = decodeJWT(payload.idToken);

        if (!decoded) {
          setStatus("error");
          addLog("Failed to decode ID token");
          return;
        }

        // Use user info from payload if available, fallback to decoded JWT
        const userFromPayload = payload.user;
        
        setAuth({
          accessToken:    payload.accessToken,
          idToken:        payload.idToken,
          expiresAt:      payload.expiresAt,
          bootstrapToken: payload.bootstrapToken ?? null,
          user: {
            id:            userFromPayload?.id || decoded.sub,
            email:         userFromPayload?.email || decoded.email,
            emailVerified: decoded.email_verified ?? false,
            firstName:     userFromPayload?.firstName || decoded.given_name,
            lastName:      userFromPayload?.lastName || decoded.family_name,
            role:          userFromPayload?.role,
            teamId:        userFromPayload?.teamId,
            teamRole:      userFromPayload?.teamRole,
            isAdmin:       userFromPayload?.isAdmin,
          },
        });
        setStatus("success");
        const hasBootstrap = !!payload.bootstrapToken;
        addLog(`Authenticated as ${userFromPayload?.email || decoded.email} | bootstrapToken: ${hasBootstrap ? "✓" : "✗"}`);
      }
    };

    window.addEventListener("message", handleMessage);

    // Send ready signal to each known Slugger origin (avoid '*')
    const sluggerOrigins = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://alpb-analytics.com",
      "https://www.alpb-analytics.com",
      "https://slugger-alb-1518464736.us-east-2.elb.amazonaws.com",
    ];
    sluggerOrigins.forEach((origin) => {
      window.parent.postMessage({ type: "SLUGGER_WIDGET_READY", widgetId: "test-widget" }, origin);
    });
    addLog("Sent SLUGGER_WIDGET_READY to known Slugger origins");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const testApiCall = async () => {
    if (!auth) {
      setApiResult("Not authenticated");
      return;
    }
    if (!auth.bootstrapToken) {
      setApiResult("No bootstrapToken received — cannot call /api/users/me.\nMake sure the Slugger shell sent bootstrapToken in SLUGGER_AUTH.");
      return;
    }

    setApiResult("Loading…");
    addLog("GET /api/users/me with bootstrapToken…");

    // In a real widget this call happens on YOUR OWN BACKEND.
    // Here we call Slugger directly from the browser to demo the protocol.
    const sluggerBase = shellOrigin ?? "http://localhost:3001";
    // The backend runs on port 3001 locally; strip :3000 and use :3001
    const apiBase = sluggerBase.replace(":3000", ":3001");

    try {
      const response = await fetch(`${apiBase}/api/users/me`, {
        headers: {
          // ✅ Short-lived bootstrapToken — NOT the long-lived Cognito accessToken
          Authorization: `Bearer ${auth.bootstrapToken}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setApiResult(JSON.stringify(data, null, 2));
        addLog("/api/users/me → success ✓");
      } else {
        setApiResult(`Error ${response.status}: ${data.message || response.statusText}`);
        addLog(`/api/users/me → ${response.status} ${data.message}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      setApiResult(`Network error: ${msg}`);
      addLog(`/api/users/me → network error: ${msg}`);
    }
  };

  return (
    <div className="p-5 bg-gray-100 min-h-screen font-sans">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg p-5 shadow-sm">
          <h1 className="text-xl font-semibold mb-2">Test Widget - SLUGGER SDK Demo</h1>
          <p className="text-gray-600 text-sm">
            This widget demonstrates the PostMessage authentication protocol.
          </p>
        </div>

        {/* Auth Status */}
        <div className="bg-white rounded-lg p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Authentication Status</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600 w-28">Status:</span>
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${
                  status === "waiting"
                    ? "bg-yellow-100 text-yellow-800"
                    : status === "success"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {status === "waiting"
                  ? "Waiting for tokens..."
                  : status === "success"
                  ? "Authenticated"
                  : "Error"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600 w-28">User Email:</span>
              <span>{auth?.user.email || "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600 w-28">User Name:</span>
              <span>{auth?.user.firstName && auth?.user.lastName 
                ? `${auth.user.firstName} ${auth.user.lastName}` 
                : "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600 w-28">Role:</span>
              <span className={`px-2 py-0.5 rounded text-sm ${
                auth?.user.role === 'admin' 
                  ? 'bg-purple-100 text-purple-800'
                  : auth?.user.role === 'widget developer'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {auth?.user.role || "-"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600 w-28">User ID:</span>
              <span className="text-sm font-mono">{auth?.user.id || "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600 w-28">Token Expires:</span>
              <span>
                {auth?.expiresAt
                  ? new Date(auth.expiresAt).toLocaleString()
                  : "-"}
              </span>
            </div>
            {auth?.user.teamId && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600 w-28">Team ID:</span>
                <span className="text-sm font-mono">{auth.user.teamId}</span>
              </div>
            )}
            {auth?.user.teamRole && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600 w-28">Team Role:</span>
                <span className="px-2 py-0.5 rounded text-sm bg-green-100 text-green-800">
                  {auth.user.teamRole}
                </span>
              </div>
            )}
            {auth?.user.isAdmin && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600 w-28">Admin:</span>
                <span className="px-2 py-0.5 rounded text-sm bg-red-100 text-red-800">Yes</span>
              </div>
            )}
          </div>
        </div>

        {/* Bootstrap Token */}
        <div className="bg-white rounded-lg p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-1">Bootstrap Token <span className="text-sm font-normal text-gray-500">(short-lived · 5 min)</span></h2>
          <p className="text-xs text-gray-500 mb-3">
            This is the token your backend should send to <code>GET /api/users/me</code>. It is <strong>not</strong> the long-lived Cognito accessToken.
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-gray-600 w-16">Status:</span>
            <span className={`px-2 py-0.5 rounded text-sm font-medium ${
              !auth ? "bg-gray-100 text-gray-500"
              : auth.bootstrapToken ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
            }`}>
              {!auth ? "—" : auth.bootstrapToken ? "✓ received" : "✗ not provided"}
            </span>
          </div>
          <div className="bg-gray-100 p-3 rounded font-mono text-xs break-all max-h-20 overflow-auto">
            {auth?.bootstrapToken
              ? `${auth.bootstrapToken.substring(0, 120)}…`
              : "Waiting for SLUGGER_AUTH…"}
          </div>
        </div>

        {/* API Test */}
        <div className="bg-white rounded-lg p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-1">API Test</h2>
          <p className="text-xs text-gray-500 mb-3">
            Calls <code>GET /api/users/me</code> using <code>bootstrapToken</code> as <code>Authorization: Bearer</code>.
            This simulates what your own backend would do.
          </p>
          <button
            onClick={testApiCall}
            disabled={!auth?.bootstrapToken}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Call /api/users/me with bootstrapToken
          </button>
          {apiResult && (
            <pre className="mt-3 bg-gray-100 p-3 rounded text-xs overflow-auto max-h-32">
              {apiResult}
            </pre>
          )}
        </div>

        {/* Event Log */}
        <div className="bg-white rounded-lg p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Event Log</h2>
          <div className="bg-gray-900 text-gray-200 p-3 rounded font-mono text-xs max-h-48 overflow-auto">
            {logs.map((log, i) => (
              <div key={i} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
