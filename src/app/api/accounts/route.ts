import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import GoogleAccount from "@/models/GoogleAccount";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Get userId from cookies
    const userId = req.cookies.get("userId")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch connected Google accounts
    const accounts = await GoogleAccount.find({ userId });
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Error in Accounts Route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
