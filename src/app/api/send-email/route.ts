import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { refreshAccessToken } from "@/utils/refreshToken";
import oauth2Client from "@/utils/googleAuth";

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { accountId, to, subject, message } = await req.json();

    // Validate required fields
    if (!accountId || !to || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Refresh the access token
    const accessToken = await refreshAccessToken(accountId);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Account needs re-authentication." },
        { status: 403 }
      );
    }

    // Set OAuth2 credentials
    oauth2Client.setCredentials({ access_token: accessToken });

    // Create Gmail service
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Construct email content
    const emailContent = [
      `To: ${to}`,
      "Content-Type: text/html; charset=utf-8",
      `Subject: ${subject}`,
      "",
      message,
    ].join("\n");

    // Encode the email message
    const encodedMessage = Buffer.from(emailContent)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send the email
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    // Return success response
    return NextResponse.json({ message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error in send-email route:", error);

    // Return error response
    return NextResponse.json(
      { error: "Failed to send email. Please try again later." },
      { status: 500 }
    );
  }
}
