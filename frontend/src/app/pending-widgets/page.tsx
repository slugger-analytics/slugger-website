"use client";

import { useState, useEffect } from "react";
import {
  fetchPendingWidgets,
  approveWidget,
  declineWidget,
  Request,
} from "../../api/widget";
import ProtectedRoute from "../components/ProtectedRoutes";

export default function PendingWidgetsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  // Fetch pending widgets from the backend
  useEffect(() => {
    const loadPendingWidgets = async () => {
      try {
        const data = await fetchPendingWidgets();
        setRequests(data);
      } catch (error) {
        console.error("Error fetching widgets:", error);
      }
    };

    loadPendingWidgets();
  }, []);

  // Handle approving a widget
  const handleApproveWidget = async (requestId: string) => {
    try {
      const result = await approveWidget(requestId);
      console.log("hereeee");
      setStatus(result);
      // Remove the approved widget from the list
      setRequests((prevWidgets) =>
        prevWidgets.filter((request) => request.request_id !== requestId),
      );
    } catch (error: any) {
      setStatus(error.message || "Error approving widget.");
    }
  };

  // Handle declining a widget
  const handleDeclineWidget = async (requestId: string) => {
    try {
      const result = await declineWidget(requestId);
      setStatus(result);
      // Remove the declined widget from the list
      setRequests((prevWidgets) =>
        prevWidgets.filter((request) => request.request_id !== requestId),
      );
    } catch (error: any) {
      setStatus(error.message || "Error declining widget.");
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-8 text-center">Pending Widgets</h1>

        {status && (
          <p className="text-center text-green-600 mb-4 font-semibold">
            {status}
          </p>
        )}

        {requests.length === 0 ? (
          <p className="text-center text-gray-600">No pending widgets.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {requests.map((request) => (
              <div
                key={request.request_id}
                className="widget-card p-6 bg-white rounded-lg shadow-md border border-gray-200"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {request.widget_name}
                </h3>
                <p className="text-gray-600 mb-2">{request.description}</p>
                <p className="text-sm text-gray-500 mb-2">
                  Visibility: {request.visibility}
                </p>
                <p className="text-sm text-yellow-600 mb-4">
                  Status: {request.status}
                </p>
                <div className="flex justify-between">
                  <button
                    onClick={() => handleApproveWidget(request.request_id)}
                    className="bg-green-500 text-black rounded-md hover:bg-green-600"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDeclineWidget(request.request_id)}
                    className="bg-red-500 text-black rounded-md hover:bg-red-600"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
