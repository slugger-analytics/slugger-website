import React, { useState } from "react";

const ApproveWidget = () => {
  const [status, setStatus] = useState("");

  const approveWidget = async () => {
    try {
      const response = await fetch("/api/approve-widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "12345", // Example userId
          email: "user@example.com", // Example email
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setStatus(`API Key: ${data.apiKey}`);
      } else {
        setStatus(`Error: ${data.message}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setStatus(`Error: ${error.message}`);
      } else {
        setStatus("An unknown error occurred.");
      }
    }
  };

  return (
    <div>
      <button onClick={approveWidget}>Approve Widget</button>
      {status && <p>{status}</p>}
    </div>
  );
};

export default ApproveWidget;
