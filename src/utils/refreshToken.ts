import { google } from "googleapis";
import dbConnect from "@/utils/dbConnect";
import GoogleAccount from "@/models/GoogleAccount";
import oauth2Client from "@/utils/googleAuth";

export async function refreshAccessToken(
  accountId: string
): Promise<string | null> {
  try {
    await dbConnect();

    // Find the account in the database
    const account = await GoogleAccount.findById(accountId);
    if (!account) throw new Error("Google account not found.");

    // ✅ Step 1: Check if the account is still authenticated
    oauth2Client.setCredentials({ access_token: account.accessToken });

    try {
      // Make a simple API call to check access
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      await gmail.users.getProfile({ userId: "me" });
    } catch (authError) {
      // If the account is unauthenticated, mark it for re-authentication
      console.error(
        "Account access revoked. Marking account as needing re-authentication."
      );
      await GoogleAccount.findByIdAndUpdate(accountId, { needsReauth: true });
      return null;
    }

    // ✅ Step 2: Check if the token is still valid (expires in more than 1 minute)
    const currentTime = new Date().getTime();
    const expiryTime = new Date(account.expiryDate).getTime();

    if (currentTime < expiryTime - 60000) {
      return account.accessToken;
    }

    // ✅ Step 3: Refresh the access token
    oauth2Client.setCredentials({ refresh_token: account.refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    // ✅ Step 4: Update account with new access token
    account.accessToken = credentials.access_token!;
    account.expiryDate = new Date(credentials.expiry_date!);
    account.needsReauth = false;
    await account.save();

    return credentials.access_token!;
  } catch (error: any) {
    // ✅ Handle refresh token errors
    if (isInvalidGrantError(error)) {
      console.error(
        "Refresh token invalid. Marking account as needing re-authentication."
      );
      await GoogleAccount.findByIdAndUpdate(accountId, { needsReauth: true });
      return null;
    }

    throw error;
  }
}

// ✅ Helper function to detect 'invalid_grant' error
function isInvalidGrantError(error: any): boolean {
  return (
    error?.response?.data?.error === "invalid_grant" ||
    error?.response?.data?.error?.code === 401 ||
    error?.response?.data?.error?.message?.includes("Token has been revoked")
  );
}
