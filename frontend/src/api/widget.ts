/**
 * Frontend API utility functions for managing widgets and interacting with the backend.
 * Includes functions to register, fetch, approve, decline, and update widgets.
 */

import { jwtDecode } from "jwt-decode";
import {
  PendingWidget,
  PendingWidgetsAPIRes,
  RegisterWidgetDataType,
  WidgetType,
} from "@/data/types";
import dotenv from "dotenv";
import { error } from "console";

dotenv.config();

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const registerWidget = async (
  widgetData: RegisterWidgetDataType,
  userId: string,
): Promise<any> => {
  try {
    // Attach user ID to the payload
    const dataToSend = {
      ...widgetData,
      userId,
    };

    const response = await fetch(`${API_URL}/api/widgets/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataToSend),
    });

    const res = await response.json();

    if (!res.success) {
      throw new Error(res.message);
    }

    return await res.data;
  } catch (error: any) {
    console.error("Error registering widget:", error.message || error);
    throw error;
  }
};

export const fetchPendingWidgets = async (): Promise<PendingWidget[]> => {
  try {
    const response = await fetch(`${API_URL}/api/widgets/pending`);
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const res: PendingWidgetsAPIRes = await response.json();
    if (!res.success || !res.data) {
      throw new Error(res.message);
    }
    return res.data;
  } catch (error) {
    console.error("Error fetching pending widgets:", error);
    throw error;
  }
};

export const approveWidget = async (requestId: string): Promise<string> => {
  try {
    const response = await fetch(
      `${API_URL}/api/widgets/pending/${requestId}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );

    const res = await response.json();

    if (!res.success) {
      throw new Error(res.message);
    }

    return res.data.apiKey;
  } catch (error) {
    console.error("Error approving widget:", error);
    throw error;
  }
};

export const declineWidget = async (requestId: string): Promise<string> => {
  try {
    const response = await fetch(
      `${API_URL}/api/widgets/pending/${requestId}/decline`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );

    const res = await response.json();

    if (!res.success) {
      throw new Error(res.message);
    }

    return `Widget ${requestId} declined.`;
  } catch (error) {
    console.error("Error declining widget:", error);
    throw error;
  }
};

export const fetchWidgets = async (): Promise<WidgetType[]> => {
  try {
    const response = await fetch(`${API_URL}/api/widgets`);
    const res = await response.json();
    if (!res.success) {
      throw new Error(res.message);
    }

    const data = res.data;

    // Normalize the data for frontend consumption
    const cleanedData = data.map((w: any) => ({
      id: w.widget_id,
      name: w.widget_name || "Unnamed Widget",
      description: w.description || "",
      widgetId: w.widget_id || "",
      visibility: w.visibility || "Public",
      redirectLink: w.redirect_link || "",
      imageUrl: w.image_url || undefined,
      developerIds: w.developer_ids || [],
    }));

    return cleanedData;
  } catch (error) {
    console.error("Error fetching widgets:", error);
    throw error;
  }
};

export const updateWidget = async ({
  id,
  name,
  description,
  redirectLink,
  visibility,
  imageUrl,
}: WidgetType): Promise<Response> => {
  try {
    const response = await fetch(`${API_URL}/api/widgets/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description,
        redirectLink,
        visibility,
        imageUrl,
      }),
    });

    const res = await response.json();
    if (!res.success) {
      throw new Error(res.message);
    }

    return res.data;
  } catch (error) {
    console.error("Error updating widget:", error);
    throw error;
  }
};
