/**
 * **Feature: jwt-widget-integration, Property 1: Token storage completeness**
 * **Validates: Requirements 1.1, 1.2**
 *
 * Property: For any valid token data (accessToken, idToken, refreshToken, expiresIn)
 * and user data, calling setAuthTokens(tokens, user) SHALL result in the auth store
 * containing all provided fields with correct values, and expiresAt calculated as
 * Date.now() + expiresIn * 1000.
 *
 * **Feature: jwt-widget-integration, Property 2: Logout clears all state**
 * **Validates: Requirements 1.3**
 *
 * Property: For any auth store state with tokens and user data, calling clearAuthTokens()
 * SHALL result in the store being null and localStorage being cleared.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import {
    $authTokens,
    setAuthTokens,
    clearAuthTokens,
    getTokensForWidget,
} from "../auth-store";

// Mock localStorage for testing
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

describe("Auth Store Property Tests", () => {
    beforeEach(() => {
        // Setup localStorage mock
        Object.defineProperty(global, "localStorage", {
            value: localStorageMock,
            writable: true,
        });
        localStorageMock.clear();
        clearAuthTokens();
    });

    afterEach(() => {
        clearAuthTokens();
        localStorageMock.clear();
    });

    /**
     * Property 1: Token storage completeness
     * For any valid token data and user data, setAuthTokens SHALL store all fields correctly
     */
    it("stores all token fields correctly with calculated expiresAt (Property 1)", () => {
        fc.assert(
            fc.property(
                // Generate valid token data
                fc.record({
                    accessToken: fc.string({ minLength: 1, maxLength: 500 }),
                    idToken: fc.string({ minLength: 1, maxLength: 500 }),
                    refreshToken: fc.string({ minLength: 1, maxLength: 500 }),
                    expiresIn: fc.integer({ min: 1, max: 86400 }), // 1 second to 24 hours
                }),
                // Generate optional user data
                fc.option(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 100 }),
                        email: fc.emailAddress(),
                        first: fc.string({ minLength: 1, maxLength: 50 }),
                        last: fc.string({ minLength: 1, maxLength: 50 }),
                        role: fc.constantFrom("admin", "widget developer", "league", "master"),
                        teamId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
                        teamRole: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
                        is_admin: fc.option(fc.boolean(), { nil: undefined }),
                    }),
                    { nil: undefined }
                ),
                (tokens, user) => {
                    // Capture time before calling setAuthTokens
                    const timeBefore = Date.now();

                    // Call setAuthTokens
                    setAuthTokens(tokens, user);

                    // Capture time after calling setAuthTokens
                    const timeAfter = Date.now();

                    // Get stored tokens
                    const storedTokens = $authTokens.get();

                    // Verify tokens are stored
                    expect(storedTokens).not.toBeNull();

                    if (storedTokens) {
                        // Verify all token fields are stored correctly
                        expect(storedTokens.accessToken).toBe(tokens.accessToken);
                        expect(storedTokens.idToken).toBe(tokens.idToken);
                        expect(storedTokens.refreshToken).toBe(tokens.refreshToken);

                        // Verify expiresAt is calculated correctly (within the time window)
                        const expectedExpiresAtMin = timeBefore + tokens.expiresIn * 1000;
                        const expectedExpiresAtMax = timeAfter + tokens.expiresIn * 1000;
                        expect(storedTokens.expiresAt).toBeGreaterThanOrEqual(expectedExpiresAtMin);
                        expect(storedTokens.expiresAt).toBeLessThanOrEqual(expectedExpiresAtMax);

                        // Verify user data if provided
                        if (user) {
                            expect(storedTokens.user).toBeDefined();
                            expect(storedTokens.user?.id).toBe(user.id);
                            expect(storedTokens.user?.email).toBe(user.email);
                            expect(storedTokens.user?.firstName).toBe(user.first);
                            expect(storedTokens.user?.lastName).toBe(user.last);
                            expect(storedTokens.user?.role).toBe(user.role);
                            expect(storedTokens.user?.teamId).toBe(user.teamId);
                            expect(storedTokens.user?.teamRole).toBe(user.teamRole);
                            expect(storedTokens.user?.isAdmin).toBe(user.is_admin);
                        } else {
                            expect(storedTokens.user).toBeUndefined();
                        }

                        // Verify localStorage persistence
                        const persistedData = localStorage.getItem("slugger_auth_tokens");
                        expect(persistedData).not.toBeNull();
                        if (persistedData) {
                            const parsed = JSON.parse(persistedData);
                            expect(parsed.accessToken).toBe(tokens.accessToken);
                            expect(parsed.idToken).toBe(tokens.idToken);
                            expect(parsed.refreshToken).toBe(tokens.refreshToken);
                        }
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: jwt-widget-integration, Property 2: Logout clears all state**
     * **Validates: Requirements 1.3**
     *
     * Property: For any auth store state with tokens and user data, calling clearAuthTokens()
     * SHALL result in the store being null and localStorage being cleared.
     */
    it("clears all state on logout (Property 2)", () => {
        fc.assert(
            fc.property(
                // Generate valid token data
                fc.record({
                    accessToken: fc.string({ minLength: 1, maxLength: 500 }),
                    idToken: fc.string({ minLength: 1, maxLength: 500 }),
                    refreshToken: fc.string({ minLength: 1, maxLength: 500 }),
                    expiresIn: fc.integer({ min: 1, max: 86400 }), // 1 second to 24 hours
                }),
                // Generate optional user data
                fc.option(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 100 }),
                        email: fc.emailAddress(),
                        first: fc.string({ minLength: 1, maxLength: 50 }),
                        last: fc.string({ minLength: 1, maxLength: 50 }),
                        role: fc.constantFrom("admin", "widget developer", "league", "master"),
                        teamId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
                        teamRole: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
                        is_admin: fc.option(fc.boolean(), { nil: undefined }),
                    }),
                    { nil: undefined }
                ),
                (tokens, user) => {
                    // First, set up auth state with tokens and user
                    setAuthTokens(tokens, user);

                    // Verify tokens are stored before clearing
                    const storedBefore = $authTokens.get();
                    expect(storedBefore).not.toBeNull();
                    expect(localStorage.getItem("slugger_auth_tokens")).not.toBeNull();

                    // Call clearAuthTokens (logout)
                    clearAuthTokens();

                    // Verify store is null
                    const storedAfter = $authTokens.get();
                    expect(storedAfter).toBeNull();

                    // Verify localStorage is cleared
                    const persistedAfter = localStorage.getItem("slugger_auth_tokens");
                    expect(persistedAfter).toBeNull();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: jwt-widget-integration, Property 5: getTokensForWidget excludes refreshToken**
     * **Validates: Requirements 2.4, 4.4**
     *
     * Property: For any valid auth store state with tokens, calling getTokensForWidget()
     * SHALL return an object containing accessToken, idToken, expiresAt, and optionally user,
     * but SHALL NOT contain refreshToken.
     */
    it("getTokensForWidget excludes refreshToken (Property 5)", () => {
        fc.assert(
            fc.property(
                // Generate valid token data with future expiry
                fc.record({
                    accessToken: fc.string({ minLength: 1, maxLength: 500 }),
                    idToken: fc.string({ minLength: 1, maxLength: 500 }),
                    refreshToken: fc.string({ minLength: 1, maxLength: 500 }),
                    expiresIn: fc.integer({ min: 60, max: 86400 }), // 1 minute to 24 hours (ensure not expired)
                }),
                // Generate optional user data
                fc.option(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 100 }),
                        email: fc.emailAddress(),
                        first: fc.string({ minLength: 1, maxLength: 50 }),
                        last: fc.string({ minLength: 1, maxLength: 50 }),
                        role: fc.constantFrom("admin", "widget developer", "league", "master"),
                        teamId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
                        teamRole: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
                        is_admin: fc.option(fc.boolean(), { nil: undefined }),
                    }),
                    { nil: undefined }
                ),
                (tokens, user) => {
                    // Set up auth state with tokens and user
                    setAuthTokens(tokens, user);

                    // Call getTokensForWidget
                    const widgetTokens = getTokensForWidget();

                    // Verify tokens are returned
                    expect(widgetTokens).not.toBeNull();

                    if (widgetTokens) {
                        // Verify required fields are present
                        expect(widgetTokens.accessToken).toBe(tokens.accessToken);
                        expect(widgetTokens.idToken).toBe(tokens.idToken);
                        expect(widgetTokens.expiresAt).toBeDefined();
                        expect(typeof widgetTokens.expiresAt).toBe("number");

                        // Verify refreshToken is NOT present
                        expect(widgetTokens).not.toHaveProperty("refreshToken");
                        expect((widgetTokens as any).refreshToken).toBeUndefined();

                        // Verify user data if provided
                        if (user) {
                            expect(widgetTokens.user).toBeDefined();
                            expect(widgetTokens.user?.id).toBe(user.id);
                            expect(widgetTokens.user?.email).toBe(user.email);
                            expect(widgetTokens.user?.firstName).toBe(user.first);
                            expect(widgetTokens.user?.lastName).toBe(user.last);
                            expect(widgetTokens.user?.role).toBe(user.role);
                        } else {
                            expect(widgetTokens.user).toBeUndefined();
                        }

                        // Verify the returned object has exactly the expected keys
                        // Note: user key is always present, even if undefined
                        const expectedKeys = ["accessToken", "idToken", "expiresAt", "user"];
                        const actualKeys = Object.keys(widgetTokens).sort();
                        expect(actualKeys).toEqual(expectedKeys.sort());
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
