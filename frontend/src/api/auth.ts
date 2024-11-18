import { useAuth } from "@/app/contexts/AuthContext";

export async function signUpUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}) {
  try {
    const response = await fetch("http://localhost:3001/api/register-user", {
      // Update to your backend URL
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to sign up");
    }

    return result;
  } catch (error) {
    console.error("Error signing up user:", error);
    throw error;
  }
}

export const loginUser = async (email: string, password: string, ) => {
  try {
    const response = await fetch("http://localhost:3001/api/login-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Store tokens and user data locally
      return data; // Return user data to handle on the frontend
    } else {
      throw new Error(data.message || "Login failed");
    }
  } catch (error) {
    console.error("Error during login:", error);
    throw error;
  }
};
