# Atlantic League Analytics Platform API Documentation

## Overview

The Atlantic League Analytics Platform provides a robust API to access Trackman data and manage widgets. This API enables authorized users to interact with data and resources securely, facilitating the development and integration of widgets for analytical purposes.

## Base URL

```
https://1ywv9dczq5.execute-api.us-east-2.amazonaws.com/ALPBAPI
```

## API Key

This API requires a key for authorization. Once you have your API key, include it in the header of each request:

```json
"headers": {
    "x-api-key": "string"
}
```

## API Endpoints

### Expected Response
```json
{
  "success": "boolean",
  "message": "string",
  "data": "object | object[]", // optional
  "meta": "object" // optional
}
```

### 1. Ballpark Management

#### Get Ballpark Details

```
GET /ballparks
```

**Query Parameters:**

```json
{
  "ballpark_name": "string",
  "city": "string",
  "state": "string",
  "order": "string", // <"ASC" | "DESC"> by ballpark_name, default="ASC"
}
```

### 2. Game Management

#### Get Game Details

```
GET /games
```

**Query Parameters:**

```json
{
  "ballpark_name": "string",
  "date": "string",
  "home_team_name": "string",
  "visiting_team_name": "string",
  "limit": "int", // range=[1, 1000], default=20 
  "page": "int",
  "order": "string" // <"ASC" | "DESC"> by date, default="DESC"
}
```

### 3. Pitch Management

#### Get Pitch Data

```
GET /pitches
```

**Query Parameters:**

```json
{
  "auto_pitch_type": "string",
  "balls": "int",
  "batter_id": "int",
  "catcher_id": "int",
  "date": "date",
  "date_range_end": "string",
  "date_range_start": "string",
  "game_id": "UUID",
  "inning": "int",
  "outs": "int",
  "pitch_call": "string", // <"Single" | "Double" | "Triple" | "Error" | "FieldersChoice" | "HomeRun" | "Out" | "Sacrifice" | "Undefined" | null>
  "pitcher_id": "int",
  "play_result": "string",
  "strikes": "int",
  "top_or_bottom": "string",
  "limit": "int", // range=[1, 1000], default=20 
  "page": "int",
  "order": "string" // <"ASC" | "DESC"> by (date, time), default="DESC"
}
```

### 4. Player Management

#### Get Player Details

```
GET /players
```

**Query Parameters:**

```json
{
  "player_batting_handedness": "string",
  "player_name": "string",
  "player_pitching_handedness": "string",
  "player_position": "string",
  "team_id": "UUID",
  "team_name": "string",
  "limit": "int", // range=[1, 1000], default=20 
  "page": "int",
  "order": "string" // <"ASC" | "DESC"> by player_name, default="ASC"
}
```

### 5. Team Management

#### Retrieve All Teams

```
GET /teams
```

**Query Parameters:**

```json
{
  "home_ballpark_name": "string",
  "league": "string",
  "team_name": "string",
  "ballpark": "Ballpark", // refer to ballpark endpoint documentation
  "limit": "int", // range=[1, 1000], default=20 
  "page": "int",
  "order": "string" // <"ASC" | "DESC"> by team_name, default="DESC"
}
```

### 6. Auth Integration - Restricted Access Mode

ALPB Analytics provides a simple framework for integrating with our authorization system using `Restricted Access` mode.

#### What Does Enabling `Restricted Access Mode` For a Widget Do?

Enabling `Restricted Mode` enforces the following access rules:

- **Public Widgets** → Can only be accessed through ALPB Analytics.
- **Private Widgets** → Can only be accessed through ALPB Analytics by an **authorized user**.

#### Getting Started With Restricted Access Mode

1. From `Home`, click `Edit` on the widget you want to enable restricted access for.
2. Under `Authorization`, enable `Generate validation tokens`.
   - Once enabled, the `alpb_token` query parameter will be automatically appended to your widget URL each time a user launches your widget via our platform:
     ```
     ?alpb_token=<string>
     ```

Your widget can validate the token to ensure it is being accessed only by an authorized user through ALPB Analytics by making the following request:

#### Validate Token

```
POST /validate-token
```

```json
{
  "alpb_token": "string", // From your widget's url query parameters
  "widget_id": "string" // From 'Home' -> 'Edit' -> 'widget_id' on ALPB Analytics
}
```

## Error Handling

Common error responses include:

- **400 Bad Request:** The request was invalid or cannot be otherwise served.
- **401 Unauthorized:** Authentication failed or user does not have permissions.
- **403 Forbidden:** The request was valid, but the server is refusing action.
- **404 Not Found:** The requested resource could not be found.
- **500 Internal Server Error:** An error occurred on the server.

## Rate Limiting

To ensure fair use of the API, the following rate limits apply:
**100 requests per minute per user.**

## Database Structure Notes

The ER diagram outlines the relationships between key entities such as `PLAYER`, `PITCH`, `GAME`, and `TEAM`.

Each `PITCH` record is associated with a specific `PLAYER` (pitcher) and can also reference a batter. The `TEAM` entity includes members (players), and games are mapped between two teams.

## Conclusion

This API documentation provides a comprehensive overview of the Atlantic League Analytics Platform's API functionalities. Users are encouraged to review the authentication methods, endpoints, and response structures to effectively integrate with the platform.

For further inquiries or support, please contact our development team.
