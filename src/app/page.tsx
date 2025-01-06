"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">
        Welcome to Gmail Integration App
      </h1>
      <div className="space-x-4">
        <Link
          href="/signup"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Signup
        </Link>
        <Link
          href="/login"
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
