"use client";

import { useEffect, useState } from "react";

interface GoogleAccount {
  _id: string;
  email: string;
  name: string;
}

const SendEmail = () => {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Fetch connected accounts
  useEffect(() => {
    const userId = localStorage.getItem("userId");

    fetch("/api/accounts", {
      headers: {
        "x-user-id": userId || "",
      },
    })
      .then((res) => res.json())
      .then((data) => setAccounts(data))
      .catch((error) => console.error("Error fetching accounts:", error));
  }, []);

  // Handle form submission
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAccount) {
      alert("Please select a Google account.");
      return;
    }

    const response = await fetch("/api/send-email", {
      method: "POST",
      body: JSON.stringify({
        accountId: selectedAccount,
        to,
        subject,
        message,
      }),
    });

    if (response.ok) {
      alert("Email sent successfully!");
    } else {
      alert("Failed to send email.");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Send Emails</h1>
      <form
        onSubmit={handleSendEmail}
        className="bg-white p-8 rounded-md shadow-md"
      >
        <div className="mb-4">
          <label className="block text-gray-700 font-bold mb-2">
            Select Google Account:
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full p-2 border rounded-md"
            required
          >
            <option value="">-- Select an Account --</option>
            {accounts.map((account) => (
              <option key={account._id} value={account._id}>
                {account.email} ({account.name})
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 font-bold mb-2">To:</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 font-bold mb-2">Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 font-bold mb-2">Message:</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded-md"
            rows={4}
            required
          />
        </div>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Send Email
        </button>
      </form>
    </div>
  );
};

export default SendEmail;
