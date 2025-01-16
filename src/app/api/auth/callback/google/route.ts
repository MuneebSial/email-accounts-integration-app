import { NextRequest, NextResponse } from "next/server";
import { createOAuth2Client } from "@/utils/googleAuth";
import { google } from "googleapis";
import dbConnect from "@/utils/dbConnect";
import GoogleAccount from "@/models/GoogleAccount";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Get the code and state from the URL
    const { searchParams } = req.nextUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    // Validate the presence of code and state
    if (!code || !state) {
      return NextResponse.json(
        { error: "Invalid request. Missing code or state." },
        { status: 400 }
      );
    }

    // Parse the state to get the userId
    const { userId /*, accountId*/ } = JSON.parse(state);

    const oauth2Client = createOAuth2Client();

    // Exchange the authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch the user's Google profile
    const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Check if the account already exists
    let account = await GoogleAccount.findOne({ email: userInfo.email });

    if (account) {
      account.accessToken = tokens.access_token;
      account.refreshToken = tokens.refresh_token || account.refreshToken;
      account.expiryDate = tokens.expiry_date;
      account.needsReauth = false;
    } else {
      // Create a new account
      account = new GoogleAccount({
        userId,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
      });
    }

    // Save the account
    await account.save();

    // Redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard/accounts", req.url));
  } catch (error) {
    console.error("Error in Google callback:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
