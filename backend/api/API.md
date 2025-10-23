# API Documentation

This document lists all available API endpoints and their required permissions.

## Authentication Endpoints (`/auth`)

| Method | Endpoint | Permission Required | Description |
|--------|----------|-------------------|--------------|
| POST | `/auth/resend-confirmation` | None | Resend confirmation code for unconfirmed users |
| POST | `/auth/confirm-signup` | None | Confirm user signup with confirmation code |
| GET | `/auth/check-status/:email` | None | Check if email belongs to a pending developer |

## Developer Management Endpoints (`/developers`)

| Method | Endpoint | Permission Required | Description |
|--------|----------|-------------------|--------------|
| POST | `/developers/pending/:developerId/approve` | Site Admin | Approve a pending developer |
| POST | `/developers/pending/:developerId/decline` | Site Admin | Decline a pending developer |
| GET | `/developers/pending` | Site Admin | Get all pending developers |

## League Data Endpoints (`/league`)

| Method | Endpoint | Permission Required | Description |
|--------|----------|-------------------|--------------|
| GET | `/league/standings` | None | Get league standings |
| GET | `/league/leaders` | None | Get league leaders |

## Team Management Endpoints (`/teams`)

| Method | Endpoint | Permission Required | Description |
|--------|----------|-------------------|--------------|
| GET | `/teams` | None | Get all teams |
| GET | `/teams/:teamId` | None | Get team by ID |
| GET | `/teams/:teamId/members` | Team Membership | Get team members |
| GET | `/teams/:teamId/members/:memberId` | Team Membership | Get team member by ID |
| POST | `/teams/:teamId/members/:memberId/promote` | Team Admin | Promote team member |
| POST | `/teams/:teamId/members/:memberId/demote` | Team Admin | Demote team member |
| PATCH | `/teams/:teamId/members/:memberId` | Team Admin | Change member's team |
| POST | `/teams/:teamId/invite` | Team Admin | Generate team invite link |
| POST | `/teams/validate-invite` | None | Validate team invite token |
| DELETE | `/teams/:teamId/members/:memberId` | Team Admin | Remove member from team |

## User Management Endpoints (`/users`)

| Method | Endpoint | Permission Required | Description |
|--------|----------|-------------------|--------------|
| GET | `/users` | Authentication | Get user data by ID |
| POST | `/users/sign-up` | None | Register a new user |
| POST | `/users/sign-in` | None | Authenticate user |
| POST | `/users/logout` | None | Logout user |
| PATCH | `/users/add-favorite` | Authentication | Add widget to favorites |
| PATCH | `/users/remove-favorite` | Authentication | Remove widget from favorites |
| GET | `/users/favorite-widgets` | Authentication | Get user's favorite widgets |
| POST | `/users/validate-session` | Authentication | Validate user session |
| POST | `/users/generate-token` | Authentication | Generate widget access token |
| GET | `/users/search` | Site Admin | Search users by email |
| POST | `/users/send-password-reset-email` | None | Send password reset email |
| POST | `/users/reset-password` | None | Reset user password |
| PATCH | `/users` | Authentication | Update user profile |

## Widget Category Endpoints (`/widget-categories`)

| Method | Endpoint | Permission Required | Description |
|--------|----------|-------------------|--------------|
| GET | `/widget-categories` | None | Get all widget categories |
| POST | `/widget-categories` | Site Admin | Create new category |
| PATCH | `/widget-categories/:categoryId` | Site Admin | Update category |
| DELETE | `/widget-categories/:categoryId` | Site Admin | Delete category |

## Widget Management Endpoints (`/widgets`)

| Method | Endpoint | Permission Required | Description |
|--------|----------|-------------------|--------------|
| GET | `/widgets` | None | Get all widgets (with filters) |
| PATCH | `/widgets/:widgetId` | Widget Ownership | Edit widget |
| DELETE | `/widgets/:widgetId` | Widget Ownership | Delete widget |
| POST | `/widgets/register` | Authentication | Register new widget |
| GET | `/widgets/:widgetId/categories` | None | Get widget categories |
| POST | `/widgets/:widgetId/categories` | Widget Ownership | Add category to widget |
| DELETE | `/widgets/:widgetId/categories/:categoryId` | Widget Ownership | Remove category from widget |
| POST | `/widgets/metrics` | Authentication | Record widget metrics |
| GET | `/widgets/:widgetId/developers` | Authentication | Get widget developers |
| POST | `/widgets/:widgetId/developers` | Widget Owner | Add developer to widget |
| POST | `/widgets/:widgetId/collaborators` | Widget Owner | Add collaborator to widget |
| GET | `/widgets/:widgetId/collaborators` | Authentication | Get widget collaborators |
| GET | `/widgets/:widgetId/teams` | Authentication | Get teams with widget access |
| PUT | `/widgets/:widgetId/teams` | Widget Ownership | Update widget team access |
| GET | `/widgets/pending` | Site Admin | Get pending widget requests |
| POST | `/widgets/pending/:requestId/approve` | Site Admin | Approve pending widget |
| POST | `/widgets/pending/:requestId/decline` | Site Admin | Decline pending widget |

## Permission Levels

- **None**: No authentication required
- **Authentication**: User must be logged in
- **Site Admin**: User must have `role = 'admin'`
- **Team Admin**: User must have `is_admin = true`
- **Team Membership**: User must belong to the specified team
- **Widget Ownership**: User must be owner or collaborator of the widget
- **Widget Owner**: User must be owner of the widget (not just collaborator)
