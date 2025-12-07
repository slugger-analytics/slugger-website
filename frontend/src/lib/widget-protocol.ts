/**
 * PostMessage Protocol Types for Widget Communication
 * 
 * This file defines the message types for secure communication between
 * the shell application and embedded widget iframes.
 */

/**
 * User information included in authentication messages
 */
export interface WidgetAuthUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    teamId?: string;
    teamRole?: string;
    isAdmin?: boolean;
}

/**
 * Shell → Widget: Authentication message containing JWT tokens
 * 
 * Sent when:
 * - Widget sends SLUGGER_WIDGET_READY
 * - Widget sends SLUGGER_TOKEN_REFRESH
 * - Tab becomes visible with refreshed tokens
 */
export interface SluggerAuthMessage {
    type: "SLUGGER_AUTH";
    payload: {
        accessToken: string;
        idToken: string;
        expiresAt: number; // Unix timestamp in milliseconds
        user?: WidgetAuthUser;
    };
}

/**
 * Widget → Shell: Widget ready message
 * 
 * Sent by widget when it has loaded and is ready to receive tokens
 */
export interface WidgetReadyMessage {
    type: "SLUGGER_WIDGET_READY";
    widgetId?: string;
}

/**
 * Widget → Shell: Token refresh request
 * 
 * Sent by widget when it needs fresh tokens (e.g., before making API calls)
 */
export interface TokenRefreshMessage {
    type: "SLUGGER_TOKEN_REFRESH";
}

/**
 * Union type for all messages sent from Widget to Shell
 */
export type WidgetToShellMessage = WidgetReadyMessage | TokenRefreshMessage;

/**
 * Union type for all messages sent from Shell to Widget
 */
export type ShellToWidgetMessage = SluggerAuthMessage;
