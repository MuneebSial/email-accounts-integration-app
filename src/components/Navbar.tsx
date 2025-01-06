"use client";

import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  const handleSignOut = async () => {
    // Clear the userId cookie by making an API call
    await fetch("/api/signout", {
      method: "POST",
    });

    router.push("/"); // Redirect to Home page
  };

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between">
        <h1
          className="text-xl font-bold cursor-pointer"
          onClick={() => router.push("/")}
        >
          Gmail Integration App
        </h1>
        <div className="space-x-4">
          <button
            className="hover:underline"
            onClick={() => router.push("/dashboard/accounts")}
          >
            Google Accounts
          </button>
          <button
            className="hover:underline"
            onClick={() => router.push("/dashboard/send-email")}
          >
            Send Emails
          </button>
          <button
            className="hover:underline bg-red-600 px-4 py-2 rounded-md text-white"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
