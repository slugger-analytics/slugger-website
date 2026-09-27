# Widget access

Who may use a widget, and which check to put on a new route.

## Who can open a widget

A user may use a widget only when one of these is true:

- The widget is public. An empty visibility is treated as public, so older widgets keep working.
- The user is a collaborator on that widget (`user_widget`).
- The user's team has been granted access (`widget_team_access`).

The user comes from the logged-in session. A `userId` in the query string or request body does not choose the user. Search runs only over widgets that check already allows, so knowing a private widget's name does not reveal it.

A site admin (`users.role = 'admin'`) may use every widget, including private widgets that are not assigned to them.

## Three kinds of permission

Account role, team membership, and widget role decide different things.

| Kind | Stored as | What it decides |
| --- | --- | --- |
| Account role | `users.role` | Site admin, widget developer, or league user |
| Team membership | `users.team_id` | Which team's private widgets a league user may open |
| Team admin | `users.is_admin` | Managing members of that user's own team |
| Widget role | `user_widget.role` | `member` or `owner` on one widget |

A widget developer does not receive a team's private widgets just by belonging to that team. A team admin flag does not grant another team's widgets. A new collaborator must already have the account role `widget developer`. The role stored on the widget is `member` or `owner`.

Team membership is not chosen by the client. Signup ignores `teamId` and `teamRole`. A team is assigned by a verified invite at sign-in, or by an admin. Registering a widget uses the session user. A public widget is not attached to a team. A non-admin may attach a private widget only to their own team. A user with no team cannot assign one. A site admin may name other teams.

## Which check to use

| Route does this | Use |
| --- | --- |
| Reads a widget, its categories, developers, teams, selector options, or a PDF | `requireWidgetAccess` |
| Changes public vs private, replaces team access, or adds a collaborator | `requireWidgetOwner` |
| Edits or deletes a widget | `requireWidgetOwnership` (member or owner) |
| Site-admin pages (pending requests, assigning developers) | `requireSiteAdmin` |
| Team member routes | `requireTeamAdmin` and `requireTeamMembership` |

`requireWidgetOwner` allows a site admin or a widget owner. `requireWidgetOwnership` allows a site admin or any collaborator, including a member. A member can still edit and delete a widget. A member cannot change who can see it.

PDF downloads accept only `w{widgetId}-{timestamp}.pdf`, then check access to that widget id. A launch token is minted only for the session user and only for a widget that user can open. Validating the token checks that it names the same widget and that the user still has access. A launch metric is stored for the session user, and only for a widget that user can open.

Team ids are compared as text, so a numeric id in the session and a string id in the URL still match. A different team does not. A site admin may call another team's route.

A normal user may read only their own account and their own email approval status. A site admin may read another account.

## Where the rules live

The route handlers call these functions, and the tests call the same functions:

- `backend/lib/widgetAccess.js` — catalog identity, public visibility, token match, PDF name, launch user
- `backend/lib/widgetAudience.js` — visibility changes, registration teams, team-access updates
- `backend/lib/accountLookup.js` — whose account may be read, signup team fields
- `backend/lib/accountApproval.js` — whose email status may be read
- `backend/lib/teamMemberMove.js` — team-id match, moving a member to another team
- `backend/lib/widgetAssignment.js` — who may be added, and the member or owner role

Run the backend checks with `npm test` in `backend`. The Active and Hidden catalog labels are covered by `frontend/src/lib/__tests__/widget-visibility.test.ts`.

## Left for the next team

- After login, parameterized analysis still returns every team and player, not only the caller's team.
- `GET /api/teams` is still public and returns the full team row. The member list is protected.
- A widget member can still edit and delete a widget.
- The old `master` role is still in the role list. Signup cannot choose it.
