# Middleware Documentation

This document describes all middleware functions available in the backend and their usage.

## Overview

Middleware functions are used to handle cross-cutting concerns such as authentication, authorization, validation, and resource ownership checks. They are executed before route handlers and can modify the request/response or terminate the request early.

## Permission Guards (`permission-guards.js`)

Permission guards handle role-based authorization and authentication checks.

### `requireAuth`

**Description**: Requires that a user is authenticated (logged in). Checks for the presence of a user session.

**Usage**:
```javascript
import { requireAuth } from "../middleware/permission-guards.js";

router.get("/protected-route", requireAuth, async (req, res) => {
  // Route handler
});
```

**Behavior**:
- Checks if `req.session?.user` exists
- If authenticated: calls `next()` to proceed
- If not authenticated: returns `401 Unauthorized` with error message

**Error Response**:
```json
{
  "success": false,
  "message": "Authentication required"
}
```

---

### `requireSiteAdmin`

**Description**: Requires that the authenticated user has site administrator privileges (`role = 'admin'`).

**Usage**:
```javascript
import { requireSiteAdmin } from "../middleware/permission-guards.js";

router.post("/admin-only", requireSiteAdmin, async (req, res) => {
  // Route handler
});
```

**Behavior**:
- Checks if `req.session?.user?.role === 'admin'`
- If admin: calls `next()` to proceed
- If not admin: returns `403 Forbidden` with error message

**Error Response**:
```json
{
  "success": false,
  "message": "Site admin privileges required"
}
```

---

### `requireTeamAdmin`

**Description**: Requires that the authenticated user has team administrator privileges (`is_admin = true`).

**Usage**:
```javascript
import { requireTeamAdmin } from "../middleware/permission-guards.js";

router.post("/team/:teamId/members/:memberId/promote", requireTeamAdmin, async (req, res) => {
  // Route handler
});
```

**Behavior**:
- Checks if `req.session?.user?.is_admin === true`
- If team admin: calls `next()` to proceed
- If not team admin: returns `403 Forbidden` with error message

**Error Response**:
```json
{
  "success": false,
  "message": "Team admin privileges required"
}
```

---

## Ownership Guards (`ownership-guards.js`)

Ownership guards verify that users have access to specific resources (widgets, teams, etc.). These are async middleware functions that query the database.

### `requireWidgetOwnership`

**Description**: Requires that the authenticated user is either the owner or a collaborator of the widget specified in `req.params.widgetId`. Site admins bypass this check.

**Usage**:
```javascript
import { requireWidgetOwnership } from "../middleware/ownership-guards.js";

router.patch("/widgets/:widgetId", requireWidgetOwnership, async (req, res) => {
  // Route handler
});
```

**Behavior**:
1. Extracts `widgetId` from `req.params.widgetId` and `userId` from `req.session.user.user_id`
2. Validates that both IDs are present and valid
3. If user is site admin (`role === 'admin'`): bypasses check and proceeds
4. Queries `user_widget` table to check if user is owner or collaborator
5. If authorized: stores `req.widgetUserRole` (owner/member) and calls `next()`
6. If not authorized: returns `403 Forbidden`

**Error Responses**:
- Invalid widget ID: `400 Bad Request`
- Not authorized: `403 Forbidden` - "Access denied: You don't have permission to modify this widget"
- Database error: `500 Internal Server Error`

**Note**: The user's role for the widget (`owner` or `member`) is stored in `req.widgetUserRole` for use in route handlers.

---

### `requireWidgetOwner`

**Description**: Requires that the authenticated user is the **owner** (not just a collaborator) of the widget specified in `req.params.widgetId`. More restrictive than `requireWidgetOwnership`. Site admins bypass this check.

**Usage**:
```javascript
import { requireWidgetOwner } from "../middleware/ownership-guards.js";

router.post("/widgets/:widgetId/developers", requireWidgetOwner, async (req, res) => {
  // Route handler
});
```

**Behavior**:
1. Extracts `widgetId` from `req.params.widgetId` and `userId` from `req.session.user.user_id`
2. Validates that both IDs are present and valid
3. If user is site admin (`role === 'admin'`): bypasses check and proceeds
4. Queries `user_widget` table to check if user has `role = 'owner'`
5. If owner: calls `next()`
6. If not owner: returns `403 Forbidden`

**Error Responses**:
- Invalid widget ID: `400 Bad Request`
- Not authorized: `403 Forbidden` - "Access denied: Only widget owners can perform this action"
- Database error: `500 Internal Server Error`

**Difference from `requireWidgetOwnership`**:
- `requireWidgetOwnership`: Allows both owners and collaborators
- `requireWidgetOwner`: Only allows owners

---

### `requireTeamMembership`

**Description**: Requires that the authenticated user belongs to the team specified in `req.params.teamId`. Site admins bypass this check.

**Usage**:
```javascript
import { requireTeamMembership } from "../middleware/ownership-guards.js";

router.get("/teams/:teamId/members", requireTeamMembership, async (req, res) => {
  // Route handler
});
```

**Behavior**:
1. Extracts `teamId` from `req.params.teamId` and `userId` from `req.session.user.user_id`
2. Validates that both IDs are present
3. If user is site admin (`role === 'admin'`): bypasses check and proceeds
4. Checks if `req.session.user.team_id === teamId`
5. If member: calls `next()`
6. If not member: returns `403 Forbidden`

**Error Responses**:
- Invalid user/team ID: `400 Bad Request`
- Not authorized: `403 Forbidden` - "Access denied: You don't belong to this team"
- Database error: `500 Internal Server Error`

---

## Validation Middleware (`validation-middleware.js`)

Validation middleware uses Zod schemas to validate request data before it reaches route handlers.

### `validationMiddleware`

**Description**: Factory function that creates middleware to validate `req.body`, `req.params`, and/or `req.query` against Zod schemas.

**Usage**:
```javascript
import { validationMiddleware } from "../middleware/validation-middleware.js";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string(),
  lastName: z.string()
});

router.post("/users", validationMiddleware({ bodySchema: createUserSchema }), async (req, res) => {
  // Route handler - req.body is guaranteed to be valid
});
```

**Parameters**:
- `bodySchema` (optional): Zod schema to validate `req.body`
- `paramsSchema` (optional): Zod schema to validate `req.params`
- `querySchema` (optional): Zod schema to validate `req.query`

**Behavior**:
1. Validates each provided schema against the corresponding request property
2. If all validations pass: calls `next()`
3. If validation fails: returns `400 Bad Request` with detailed error message
4. If unexpected error occurs: returns `500 Internal Server Error`

**Error Response**:
```json
{
  "success": false,
  "message": "field.path: validation error message"
}
```

**Example with multiple schemas**:
```javascript
const paramsSchema = z.object({
  widgetId: z.string().transform(Number)
});

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? Number(val) : 1),
  limit: z.string().optional().transform(val => val ? Number(val) : 10)
});

router.get(
  "/widgets/:widgetId",
  validationMiddleware({ paramsSchema, querySchema }),
  async (req, res) => {
    // req.params.widgetId is a number
    // req.query.page and req.query.limit are numbers
  }
);
```

**Notes**:
- Only the first validation error message is returned to the client
- All validation errors are logged to the console
- Validation errors use Zod's error format with path and message

---

## Middleware Composition

Multiple middleware functions can be chained together. They execute in order from left to right:

```javascript
router.patch(
  "/widgets/:widgetId",
  requireAuth,                    // 1. Check authentication
  requireWidgetOwnership,          // 2. Check widget access
  validationMiddleware({          // 3. Validate request body
    bodySchema: editWidgetSchema
  }),
  async (req, res) => {           // 4. Route handler
    // All checks passed
  }
);
```

**Execution Order**:
1. `requireAuth` checks if user is logged in
2. If authenticated, `requireWidgetOwnership` checks widget access
3. If authorized, `validationMiddleware` validates the request body
4. If valid, the route handler executes

If any middleware fails, the request is terminated and the error response is sent.

---

## Common Patterns

### Pattern 1: Public Route
```javascript
router.get("/public", async (req, res) => {
  // No middleware - accessible to everyone
});
```

### Pattern 2: Authenticated Route
```javascript
router.get("/protected", requireAuth, async (req, res) => {
  // Requires login
});
```

### Pattern 3: Admin-Only Route
```javascript
router.post("/admin-action", requireSiteAdmin, async (req, res) => {
  // Requires site admin role
});
```

### Pattern 4: Resource Ownership + Validation
```javascript
router.patch(
  "/widgets/:widgetId",
  requireAuth,
  requireWidgetOwnership,
  validationMiddleware({ bodySchema: editSchema }),
  async (req, res) => {
    // User is authenticated, owns/collaborates on widget, and body is valid
  }
);
```

### Pattern 5: Team Admin + Team Membership
```javascript
router.post(
  "/teams/:teamId/members/:memberId/promote",
  requireTeamAdmin,
  requireTeamMembership,
  async (req, res) => {
    // User is team admin and belongs to the team
  }
);
```

---

## Error Response Format

All middleware functions return errors in a consistent format:

```json
{
  "success": false,
  "message": "Error description"
}
```

**HTTP Status Codes**:
- `400 Bad Request`: Invalid input (validation errors, invalid IDs)
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Authorization failed (insufficient permissions)
- `500 Internal Server Error`: Unexpected server errors

---

## Notes

1. **Session-based Authentication**: All middleware relies on `req.session.user` being set by the authentication system.

2. **Admin Bypass**: Site admins (`role === 'admin'`) bypass ownership checks in `requireWidgetOwnership`, `requireWidgetOwner`, and `requireTeamMembership`.

3. **Async Middleware**: Ownership guards are async functions. Ensure proper error handling in route handlers.

4. **Validation Order**: Always place validation middleware after authentication/authorization middleware to avoid unnecessary validation for unauthorized requests.

5. **Request Modification**: Some middleware (like `requireWidgetOwnership`) may add properties to the request object (e.g., `req.widgetUserRole`) for use in route handlers.

