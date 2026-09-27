import { API_URL } from "./config";

export const checkAccountStatus = async (email: string) => {
  const response = await fetch(`${API_URL}/api/auth/check-status/${encodeURIComponent(email)}`, {
    credentials: "include",
  });
  const data = await response.json();
  return data.status;
};

export const fetchPendingDevelopers = async () => {
  const response = await fetch(`${API_URL}/api/developers/pending`, {
    credentials: "include",
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data.data;
};

export const approveDeveloper = async (requestId: string) => {
  const response = await fetch(
    `${API_URL}/api/developers/pending/${requestId}/approve`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    },
  );

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data;
};

export const declineDeveloper = async (requestId: string) => {
  const response = await fetch(
    `${API_URL}/api/developers/pending/${requestId}/decline`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    },
  );

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data;
};

export interface ApprovedWidget {
  widget_id: number;
  widget_name: string;
  visibility: string;
  status: string;
}

export const fetchAllApprovedWidgets = async (): Promise<ApprovedWidget[]> => {
  const response = await fetch(`${API_URL}/api/developers/widgets`, {
    credentials: "include",
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data.data;
};

export const updateDeveloperWidgetRole = async (
  userId: number,
  widgetId: number,
  role: "member" | "owner",
) => {
  const response = await fetch(
    `${API_URL}/api/developers/${userId}/widgets/${widgetId}/role`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    },
  );
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || "Failed to update role");
  }
  return data.data;
};

export const fetchAllDevelopersWithWidgets = async () => {
  const response = await fetch(`${API_URL}/api/developers`, {
    credentials: "include",
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data.data;
};
