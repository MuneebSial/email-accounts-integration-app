"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface GoogleAccount {
  _id: string;
  email: string;
  name: string;
  picture: string;
  expiryDate: string;
  needsReauth: boolean;
}

const GoogleAccounts = () => {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Fetch connected Google accounts
    fetch("/api/accounts")
      .then((res) => {
        if (!res.ok) {
          router.push("/login"); // Redirect to login if unauthorized
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setAccounts(data);
      })
      .catch(() => setError("Error fetching accounts."));
  }, [router]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Your Connected Google Accounts
      </h1>
      {error && <p className="text-red-600">{error}</p>}
      <div className="space-y-4">
        {accounts.map((account) => (
          <div key={account._id} className="bg-white p-4 rounded-md shadow-md">
            <img
              src={account.picture}
              alt={account.name}
              className="w-16 h-16 rounded-full mb-4"
            />
            <p>
              <strong>Name:</strong> {account.name}
            </p>
            <p>
              <strong>Email:</strong> {account.email}
            </p>
            <p>
              <strong>Token Expires On:</strong>{" "}
              {new Date(account.expiryDate).toLocaleString()}
            </p>
            {account.needsReauth ? (
              <button
                onClick={() =>
                  router.push(`/api/auth/google?accountId=${account._id}`)
                }
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Re-authenticate
              </button>
            ) : (
              <p className="mt-4 text-green-600">Status: Authenticated</p>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => router.push("/api/auth/google")}
        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Attach New Google Account
      </button>
    </div>
  );
};

export default GoogleAccounts;
