const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const registerPendingDeveloper = async (userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}) => {
  const response = await fetch(`${API_URL}/api/developers/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data;
};

export const checkAccountStatus = async (email: string) => {
  const response = await fetch(`${API_URL}/api/auth/check-status/${email}`);
  const data = await response.json();
  return data.status;
};

export const fetchPendingDevelopers = async () => {
  const response = await fetch(`${API_URL}/api/developers/pending`);
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
      headers: { "Content-Type": "application/json" },
    },
  );

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data;
};
