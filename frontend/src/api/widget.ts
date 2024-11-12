export interface WidgetData {
  user_id: string;
  widgetName: string;
  description: string;
  visibility: string;
}

import { jwtDecode } from "jwt-decode";
import { WidgetType } from "@/data/types";

export const registerWidget = async (
  widgetData: any,
  idToken: string,
): Promise<any> => {
  try {
    // Decode the token to extract the user information
    const decodedToken: any = jwtDecode(idToken);
    const userId = decodedToken.sub;
    // Attach userId to the widgetData payload
    const dataToSend = {
      ...widgetData,
      userId,
    };
    const response = await fetch("http://localhost:3001/api/register-widget", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataToSend),
    });
    console.log(response);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Failed to register widget");
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error("Error registering widget:", error.message || error);
    throw error;
  }
};

export interface Request {
  request_id: string;
  widget_name: string;
  description: string;
  visibility: string;
  status: string;
  user_id: string;
}

export const fetchPendingWidgets = async (): Promise<Request[]> => {
  try {
    const response = await fetch("http://localhost:3001/api/pending-widgets");
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching pending widgets:", error);
    throw error;
  }
};

export const approveWidget = async (requestId: string): Promise<string> => {
  try {
    const response = await fetch("http://localhost:3001/api/approve-widget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    if (!response.ok) {
      console.log("Didn't make it :(");
      const data = await response.json();
      throw new Error(data.message || "Failed to approve widget");
    }
    console.log("Made it");
    const data = await response.json();
    console.log(data);
    return data.apiKey || `Widget ${requestId} approved.`;
  } catch (error) {
    console.error("Error approving widget:", error);
    throw error;
  }
};

export const declineWidget = async (requestId: string): Promise<string> => {
  try {
    const response = await fetch("http://localhost:3001/api/decline-widget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Failed to decline widget");
    }

    return `Widget ${requestId} declined.`;
  } catch (error) {
    console.error("Error declining widget:", error);
    throw error;
  }
};

export const fetchWidgets = async (): Promise<WidgetType[]> => {
  try {
    const response = await fetch("http://localhost:3001/api/fetch-widgets");
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const data = await response.json();
    const cleanedData = data.map((w: any) => ({
      id: w.widget_id,
      name: w.widget_name || "Unnamed Widget",
      description: w.description || "",
      widgetId: w.widget_id || "",
      visibility: w.visibility || "Public", // Ensure visibility is included
      redirectUrl: w.redirect_link || "",
      imageUrl: w.image_url || undefined,
      developerIds: w.developer_ids || [],
    }));
    return cleanedData;
  } catch (error) {
    console.error("Error fetching pending widgets:", error);
    throw error;
  }
};

export const updateWidget = async ({
  id,
  name,
  description,
  redirectLink,
  visibility,
}: WidgetType) => {
  try {
    const response = await fetch(
      `http://localhost:3001/api/edit-widget/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description, redirectLink, visibility }),
      },
    );
    return response;
  } catch (error) {
    console.error("Error updating widget:", error);
    throw error;
  }
};
