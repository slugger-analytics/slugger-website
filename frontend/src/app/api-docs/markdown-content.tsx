import ReactMarkdown from "react-markdown";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { ComponentProps } from "react";

type CodeProps = ComponentProps<typeof SyntaxHighlighter> & {
  node?: any;
  inline?: boolean;
  className?: string;
  children: string | string[];
};

export default function MarkdownContent() {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-3 text-sm">{children}</p>,

        h1: ({ children }) => (
          <h1 className="text-xl font-bold mt-6 mb-3">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-bold mt-5 mb-3">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-bold mt-4 mb-2">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-base font-bold mt-4 mb-2">{children}</h4>
        ),

        ul: ({ children }) => (
          <ul className="list-disc pl-6 mb-3 text-sm">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 mb-3 text-sm">{children}</ol>
        ),
        code(props: any) {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          return match ? (
            <SyntaxHighlighter
              {...rest}
              style={oneDark}
              language={match[1]}
              PreTag="div"
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...rest}>
              {children}
            </code>
          );
        },
      }}
    >
      {`

## Overview

The Atlantic League Analytics Platform provides a robust API to access Trackman data and manage widgets. This API enables authorized users to interact with data and resources securely, facilitating the development and integration of widgets for analytical purposes.

## Base URL

\`\`\`text
https://1ywv9dczq5.execute-api.us-east-2.amazonaws.com/ALPBAPI
\`\`\`

## API Key

This API requires a key for authorization. Once you have your API key, include it in the header of each request:

\`\`\`json
"headers": {
    "x-api-key": "string"
}
\`\`\`

## API Endpoints

### Expected Response
\`\`\`json
{
    "success": "boolean",
    "message": "string",
    "data": "object | object[]", // optional
    "meta": "object" // optional
}
\`\`\`

### 1. Ballpark Management

#### Get Ballpark Details

\`\`\`text
GET /ballparks
\`\`\`

**Query Parameters:**

\`\`\`json
{
    "ballpark_name": "string", // max_length=100
    "city": "string", // max_length=100
    "state": "string", // max_length=2, two-letter state code
    "limit": "int", // range=[1, 1000], default=20
    "page": "int", // min=1
    "order": "string" // Enum: "ASC" or "DESC", default="ASC", sort by ballpark_name
}
\`\`\`

### 2. Game Management

#### Get Game Details

\`\`\`text
GET /games
\`\`\`

**Query Parameters:**

\`\`\`json
{
    "ballpark_name": "string", // max_length=100
    "date": "string", // max_length=50, date format validation applied
    "home_team_name": "string", // Enum of valid team names (see below)
    "visiting_team_name": "string", // Enum of valid team names (see below)
    "limit": "int", // range=[1, 1000], default=20
    "page": "int", // min=1, default=1
    "order": "string" // Enum: "ASC" or "DESC", default="DESC", sort by date
}
\`\`\`

#### __Valid Team Names Enum:__
\`\`\`text
- "York Revolution"
- "Staten Island FerryHawks"
- "Southern Maryland Blue Crabs"
- "Long Island Ducks"
- "Lexington Legends"
- "Lancaster Stormers"
- "High Point Rockers"
- "Hagerstown Flying Boxcars"
- "Gastonia Baseball Club"
- "Charleston Dirty Birds"
\`\`\`text
### 3. Pitch Management

#### Get Pitch Data

\`\`\`text
GET /pitches
\`\`\`

**Query Parameters:**

\`\`\`json
{
    "auto_pitch_type": "string", // Enum: "Cutter", "Splitter", "Changeup", "Slider", "Curveball", "Four-Seam", "Sinker", null
    "balls": "int", // range=[0, 4]
    "batter_id": "UUID",
    "catcher_id": "UUID",
    "date": "string", // date format validation applied
    "date_range_end": "string", // date format validation applied
    "date_range_start": "string", // date format validation applied
    "game_id": "UUID",
    "inning": "int", // min=1
    "outs": "int", // range=[0, 3]
    "pitch_call": "string", // Enum (see below for valid values)
    "pitcher_id": "UUID",
    "play_result": "string", // Enum (see below for valid values)
    "strikes": "int", // range=[0, 3]
    "top_or_bottom": "string", // Enum: "Top" or "Bottom"
    "limit": "int", // range=[1, 1000], default=20
    "page": "int", // min=1, default=1
    "order": "string" // Enum: "ASC" or "DESC", default="DESC", sort by (date, time)
}
\`\`\`

#### __Valid Pitch Call Enum Values:__
\`\`\`text
- "BallIntentional"
- "InPlay"
- "BallInDirt"
- "HitByPitch"
- "FoulBall"
- "StrikeSwinging"
- "FoulBallNotFieldable"
- "Undefined"
- "StrikeCalled"
- "BallCalled"
- "FoulBallFieldable"
\`\`\`
#### __Valid Play Result Enum Values:__
\`\`\`text
- "Single"
- "Double"
- "Triple"
- "Error"
- "FieldersChoice"
- "HomeRun"
- "Out"
- "Sacrifice"
- "Undefined"
- null
\`\`\`
## __6. Auth Integration - Restricted Access Mode__

ALPB Analytics provides a simple framework for integrating with our authorization system using \`Restricted Access\` mode.

#### What Does Enabling \`Restricted Access Mode\` For a Widget Do?

Enabling \`Restricted Mode\` enforces the following access rules:

- **Public Widgets** → Can only be accessed through ALPB Analytics.
- **Private Widgets** → Can only be accessed through ALPB Analytics by an **authorized user**.

#### Getting Started With Restricted Access Mode

1. From \`Home\`, click \`Edit\` on the widget you want to enable restricted access for.
2. Under \`Authorization\`, enable \`Generate validation tokens\`.
   - Once enabled, the \`alpb_token\` query parameter will be automatically appended to your widget URL each time a user launches your widget via our platform:
   \`\`\`text
   ?alpb_token=<string>
   \`\`\`

   Your widget can validate the token to ensure it is being accessed only by an authorized user through ALPB Analytics by making the following request:

\`\`\`text
POST /validate-token
\`\`\`

\`\`\`json
{
    "alpb_token": "string", // From your widget's url query parameters
    "widget_id": "string" // From 'Home' -> 'Edit' -> 'widget_id' on ALPB Analytics
}
\`\`\`

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
`}
    </ReactMarkdown>
  );
}
