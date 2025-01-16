import { google, Auth } from "googleapis";
import { IGoogleAccount } from "@/models/GoogleAccount";

// Interface for User OAuth credentials
interface UserOAuthCredentials {
  accessToken: string;
  refreshToken: string;
}

/**
 * Create a reusable OAuth2 client with a given redirect URI.
 * @param redirectUri - The redirect URI for the OAuth2 client.
 * @returns A configured OAuth2 client.
 */
export const createOAuth2Client = (): Auth.OAuth2Client => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
  );
};

/**
 * Create a user-specific OAuth2 client with given tokens.
 * @param credentials - The user's OAuth credentials.
 * @returns A configured OAuth2 client.
 */
export const createUserOAuth2Client = ({
  accessToken,
  refreshToken,
}: UserOAuthCredentials): Auth.OAuth2Client => {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return oauth2Client;
};

/**
 * Get a valid OAuth2 client for a user, refreshing the token if necessary.
 * @param googleAccount - The user's Google account details.
 * @returns A valid OAuth2 client.
 */
export const getAuthenticatedClient = async (
  googleAccount: IGoogleAccount
): Promise<Auth.OAuth2Client> => {
  // Use the existing function to create a user-specific OAuth2 client
  const oauth2Client = createUserOAuth2Client({
    accessToken: googleAccount.accessToken,
    refreshToken: googleAccount.refreshToken,
  });

  // try {
  //   // Make a simple API call to check access
  //   const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  //   await gmail.users.getProfile({ userId: "me" });
  // } catch (authError) {
  //   // If the account is unauthenticated, mark it for re-authentication
  //   console.error(
  //     "Account access revoked. Marking account as needing re-authentication."
  //   );
  //   googleAccount.needsReauth = true
  //   await googleAccount.save()
  //   throw authError
  // }

  // Refresh the token if expired
  if (Date.now() > googleAccount.expiryDate) {
    try {
      const credentials = await refreshTokenWithRetry(oauth2Client);
      googleAccount.accessToken = credentials.access_token!;
      googleAccount.refreshToken =
        credentials.refresh_token || googleAccount.refreshToken;
      googleAccount.expiryDate = credentials.expiry_date!;
      await googleAccount.save();
      // console.log(`Token refreshed for user: ${googleAccount.email}`);
    } catch (error: any) {
      await processAccessTokenError(error, googleAccount);
    }
  }

  return oauth2Client;
};

/**
 * Refresh the OAuth2 token with retry logic.
 * @param oauth2Client - The OAuth2 client.
 * @param retries - Number of retry attempts.
 * @returns The refreshed credentials.
 * @throws An error if all retry attempts fail.
 */
export const refreshTokenWithRetry = async (
  oauth2Client: Auth.OAuth2Client,
  retries = 3
): Promise<Auth.Credentials> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Try refreshing the token
      const { credentials } = await oauth2Client.refreshAccessToken();
      return credentials; // Return credentials if successful
    } catch (error) {
      if (attempt < retries - 1) {
        // If not the last attempt, retry after a delay
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        // console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // If all attempts fail, throw the error
        throw new Error("Failed to refresh access token after retries");
      }
    }
  }

  // Ensure there's no path that returns undefined
  throw new Error("Failed to refresh access token");
};

/**
 * Handle token refresh errors and update account status if needed.
 * @param error - The error encountered during token refresh.
 * @param googleAccount - The user's Google account details.
 * @throws The encountered error after marking the user for reauthentication if necessary.
 */
export const processAccessTokenError = async (
  error: any,
  googleAccount: IGoogleAccount
): Promise<void> => {
  console.error(`Failed to refresh token for user: ${googleAccount.email}`);

  const errorCode = error?.response?.data?.error;
  const status = error?.response?.status;

  // Define reauthentication logic for access-related errors
  const accessRelatedErrors = [
    "invalid_grant", // Invalid or expired refresh token
    "insufficient_permissions", // Insufficient permissions for the requested operation
    "access_denied", // Access denied by the user or administrator
    "unauthorized_client", // Unauthorized client trying to make the request
  ];

  if (accessRelatedErrors.includes(errorCode) || status === 403) {
    // Mark the account for reauthentication
    googleAccount.needsReauth = true;
    await googleAccount.save();
    // console.log(
    //   `User ${googleAccount.email} marked for reauthentication due to error: ${
    //     errorCode || "403"
    //   }`
    // );
  }

  // Add detailed logging for debugging purposes
  console.error("Error details:", {
    email: googleAccount.email,
    errorCode,
    status,
    message: error.message,
  });

  throw error; // Re-throw the error for further handling upstream
};
