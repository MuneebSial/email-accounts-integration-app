import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import {
  getAuthenticatedClient,
  processAccessTokenError,
} from "@/utils/googleAuth";
import GoogleAccount from "@/models/GoogleAccount";
import dbConnect from "@/utils/dbConnect";

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

    await dbConnect();

    const account = await GoogleAccount.findById(accountId);

    if (!account)
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 }
      );

    const oauth2Client = await getAuthenticatedClient(account);

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

    try {
      // Send the email
      await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });
    } catch (error) {
      await processAccessTokenError(error, account);
    }

    // Return success response
    return NextResponse.json({ message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error in send-email route:", error);

    // Return error response
    return NextResponse.json(
      { message: "Failed to send email. Please try again later.", error },
      { status: 500 }
    );
  }
}
