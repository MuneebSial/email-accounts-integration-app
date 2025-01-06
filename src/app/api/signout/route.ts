import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Sign out successful." });

  // Clear the userId cookie
  response.cookies.delete("userId", { path: "/" });

  return response;
}
