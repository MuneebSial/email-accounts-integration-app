import GoogleAccount, { IGoogleAccount } from "@/models/GoogleAccount";
import dbConnect from "@/utils/dbConnect";
import { fetchEmailContent, getAuthenticatedClient } from "@/utils/googleAuth";
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

// In-memory store for deduplication (not persistent, use Redis or DB for production)
const processedMessages = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Step 1: Handle Pub/Sub Verification
    if (body.message && body.message.data === undefined) {
      const token = req.headers.get("x-goog-channel-token");
      console.log("Pub/Sub Verification Token:", token);
      return NextResponse.json({ success: true });
    }

    // Step 2: Decode the Pub/Sub Message
    const message = body.message;
    if (!message?.data) {
      console.error("No data found in Pub/Sub message");
      return NextResponse.json({ error: "No message data" }, { status: 400 });
    }

    const decodedData = JSON.parse(
      Buffer.from(message.data, "base64").toString("utf-8")
    );

    // Step 3: Deduplication
    const messageId = message.messageId; // Unique ID for the message
    if (processedMessages.has(messageId)) {
      console.log(`Duplicate message ignored: ${messageId}`);
      return NextResponse.json({ success: true });
    }

    // Add messageId to processed set (and keep size manageable)
    processedMessages.add(messageId);
    if (processedMessages.size > 1000) {
      // Clean up old IDs to avoid memory bloat
      processedMessages.clear();
    }

    const { emailAddress, historyId } = decodedData;

    // Log for verification
    console.log("Processed message:", {
      messageId,
      decodedData,
    });

    // Step 4: Fetch the User's Google Account
    await dbConnect();

    const account = await GoogleAccount.findOne<IGoogleAccount | null>({
      email: emailAddress,
    });
    if (!account) {
      console.error(`Account not found for email: ${emailAddress}`);
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Step 5: Fetch History and Email Data
    const oauth2Client = await getAuthenticatedClient(account);

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const response = await gmail.users.history.list({
      userId: "me",
      startHistoryId: String(account.historyId),
      historyTypes: ["messageAdded"], // Filter only new messages
    });

    const history = response.data.history || [];

    // Fetch history for the user
    // const history = await fetchHistory(oauth2Client, historyId);
    console.log("Fetched history:", history);

    for (const record of history) {
      if (record.messageAdded?.length) {
        for (const messageInfo of record.messageAdded) {
          const messageId = messageInfo.id || messageInfo?.message?.id;

          if (!messageId) continue;

          // Fetch email content
          const email = await fetchEmailContent(oauth2Client, messageId);

          console.log("Fetched email content:", email);

          // Process email content (store in DB, trigger notification, etc.)
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
