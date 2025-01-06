"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMessage("");

    const response = await fetch("/api/signup", {
      method: "POST",
      body: JSON.stringify({ username }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      router.push("/dashboard/accounts"); // Redirect to dashboard
    } else {
      setErrorMessage("Signup failed. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleSignup}
        className="bg-white p-8 rounded-md shadow-md"
      >
        <h2 className="text-2xl font-bold mb-6">Signup</h2>
        {errorMessage && (
          <p className="mb-4 text-red-600 font-semibold">{errorMessage}</p>
        )}
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 border rounded-md mb-4"
          required
        />
        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Signup
        </button>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}
