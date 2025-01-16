import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";
import GoogleAccount from "@/models/GoogleAccount";
import { createOAuth2Client } from "@/utils/googleAuth";

/**
 * Handles the Google OAuth flow for both first-time account integration and re-authentication.
 * Dynamically adjusts the OAuth URL generation based on whether the user is integrating a new account
 * or re-authenticating an existing account that requires new tokens.
 *
 * @param {NextRequest} req - The incoming HTTP request object.
 * @returns {NextResponse} - A redirection response to the appropriate Google OAuth URL.
 *
 * The function determines the flow based on the presence of the `accountId` query parameter.
 * - If `accountId` is not provided, it assumes a first-time integration and prompts the user to select an account.
 * - If `accountId` is provided, it assumes a re-authentication flow and targets the specific account using `login_hint`.
 */
export async function GET(req: NextRequest) {
  // ✅ Extract user ID from cookies (used to track the authenticated user in your system)
  const userId = req.cookies.get("userId")?.value;

  // ✅ Extract account ID from query parameters (used for re-authentication flow)
  const accountId = req.nextUrl.searchParams.get("accountId");

  // ✅ Create an OAuth2 client with Google credentials
  const oauth2Client = createOAuth2Client();

  // ✅ First-time account integration (no accountId means user is adding a new account)
  if (!accountId) {
    // Generate an OAuth URL prompting the user to select a Google account
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline", // Ensures a refresh token is returned
      prompt: "consent", // Forces the consent screen to appear
      scope: [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
      // Pass user ID in the state to track the OAuth flow across requests
      state: JSON.stringify({ userId }),
    });

    // Redirect the user to the Google OAuth URL
    return NextResponse.redirect(authUrl);
  }

  // ✅ Re-authentication for an existing account (accountId is provided)
  await dbConnect(); // Connect to the database

  // Fetch the Google account that needs re-authentication
  const account = await GoogleAccount.findById(accountId);
  if (!account) {
    return NextResponse.json(
      { error: "Google account not found" },
      { status: 404 }
    );
  }

  // Generate an OAuth URL targeting the specific Google account using `login_hint`
  const reAuthUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // Ensures a refresh token is returned
    prompt: "consent", // Forces the consent screen to appear
    include_granted_scopes: true, // Ensures previously granted scopes are included
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    // Pass both userId and accountId in the state to track the OAuth flow across requests
    state: JSON.stringify({ userId, accountId }),
    login_hint: account.email, // Suggests the specific account for re-authentication
  });

  // Redirect the user to the Google OAuth URL
  return NextResponse.redirect(reAuthUrl);
}
