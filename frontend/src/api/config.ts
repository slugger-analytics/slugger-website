/** Backend origin. Next.js only inlines NEXT_PUBLIC_* at process start. */
const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
export const API_URL =
  configured && configured !== "undefined"
    ? configured
    : "http://localhost:3001";
