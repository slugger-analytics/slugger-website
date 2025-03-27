"use client";

import { useState, useEffect } from "react";
import { fetchPendingDevelopers, approveDeveloper } from "@/api/developer";
import { PendingDeveloper } from "@/data/types";
import ProtectedRoute from "../components/ProtectedRoutes";

export default function PendingDevelopersPage() {
  const [requests, setRequests] = useState<PendingDeveloper[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const loadPendingDevelopers = async () => {
      try {
        const data = await fetchPendingDevelopers();
        setRequests(data);
      } catch (error) {
        console.error("Error fetching developers:", error);
      }
    };

    loadPendingDevelopers();
  }, []);

  const handleApproveDeveloper = async (requestId: string) => {
    try {
      await approveDeveloper(requestId);
      setStatus("Developer account approved and API key sent");
      setRequests((prev) => prev.filter((req) => req.request_id !== requestId));
    } catch (error: any) {
      setStatus(error.message || "Error approving developer");
    }
  };

  return (
    <ProtectedRoute role="master">
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-8 text-center">
          Pending Developers
        </h1>

        {status && (
          <p className="text-center text-green-600 mb-4 font-semibold">
            {status}
          </p>
        )}

        {requests.length === 0 ? (
          <p className="text-center text-gray-600">No pending developers.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {requests.map((request) => (
              <div
                key={request.request_id}
                className="p-6 bg-white rounded-lg shadow-md border border-gray-200"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {request.first_name} {request.last_name}
                </h3>
                <p className="text-gray-600 mb-2">{request.email}</p>
                <p className="text-sm text-yellow-600 mb-4">
                  Status: {request.status}
                </p>
                <div className="flex justify-between">
                  <button
                    onClick={() => handleApproveDeveloper(request.request_id)}
                    className="bg-green-500 text-black rounded-md hover:bg-green-600 px-4 py-2"
                  >
                    Approve
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
