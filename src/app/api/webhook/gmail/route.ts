import GoogleAccount from "@/models/GoogleAccount";
import dbConnect from "@/utils/dbConnect";
import { getAuthenticatedClient } from "@/utils/googleAuth";
import { google } from "googleapis";
import { NextResponse } from "next/server";

// In-memory store for deduplication (consider Redis for production use)
const processedMessages = new Set<string>();

// Function to introduce a delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchEmailContent(oauth2Client, messageId) {
  console.log(`Fetching email content for ID: ${messageId}`);

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  try {
    // Fetch the email using the Gmail API
    const response = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full", // Options: 'full', 'metadata', 'minimal'
    });

    const message = response.data;
    const headers = message.payload.headers;

    // Extract email metadata
    const subject =
      headers.find((header) => header.name === "Subject")?.value ||
      "No Subject";
    const from =
      headers.find((header) => header.name === "From")?.value ||
      "Unknown Sender";
    const to =
      headers.find((header) => header.name === "To")?.value ||
      "Unknown Recipient";
    const date =
      headers.find((header) => header.name === "Date")?.value || "Unknown Date";

    // Extract email body (plain text or HTML)
    let body = extractEmailBody(message.payload);

    console.log(
      `Email fetched - Subject: ${subject}, From: ${from}, To: ${to}`
    );

    return {
      messageId,
      subject,
      from,
      to,
      date,
      body,
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.warn(
        `Email with ID ${messageId} not found. It may have been deleted or moved.`
      );
      return null; // Return null if the email is not found
    }

    console.error(
      `Error fetching email content for ID ${messageId}:`,
      error.message
    );
    throw new Error(`Failed to fetch email with ID ${messageId}`);
  }
}

// Function to extract email body content from the message payload
function extractEmailBody(payload) {
  let body = "";

  if (!payload.parts) {
    // If there's no parts array, the body might be in payload.body.data
    body = payload.body.data
      ? Buffer.from(payload.body.data, "base64").toString("utf-8")
      : "";
  } else {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain") {
        body = part.body.data
          ? Buffer.from(part.body.data, "base64").toString("utf-8")
          : "";
      } else if (part.mimeType === "text/html") {
        // Prefer HTML body over plain text if available
        body = part.body.data
          ? Buffer.from(part.body.data, "base64").toString("utf-8")
          : "";
      }
    }
  }

  return body || "No message body found.";
}

// Function to fetch Gmail history and process new messages
async function fetchUpdatedEmails(account, oauth2Client) {
  console.log(`Fetching updates for email: ${account.email}`);

  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const response = await gmail.users.history.list({
      userId: "me",
      startHistoryId: String(account.historyId),
      historyTypes: ["messageAdded"],
    });

    if (!response.data.history) {
      console.log("No new messages found. Updating history ID.");
      await updateHistoryId(account, response.data.historyId);
      return false;
    }

    console.log("Processing Gmail history events...");

    for (const record of response.data.history) {
      if (record.messagesAdded) {
        for (const messageInfo of record.messagesAdded) {
          const messageId = messageInfo.message.id;
          console.log("New Email ID detected:", messageId);

          if (!processedMessages.has(messageId)) {
            const email = await fetchEmailContent(oauth2Client, messageId);

            if (email) {
              console.log("Fetched email content:", email);
            } else {
              console.warn(
                `Skipping processing for non-existing email ID: ${messageId}`
              );
            }

            processedMessages.add(messageId);
            if (processedMessages.size > 1000) processedMessages.clear();
          } else {
            console.log(`Duplicate email ignored: ${messageId}`);
          }
        }
      } else {
        console.log("No new messages in this history event.");
      }
    }

    await updateHistoryId(account, response.data.historyId);
    return true;
  } catch (error) {
    console.error("Error fetching history:", error);
    return false;
  }
}

// Function to update history ID in the database
async function updateHistoryId(account, newHistoryId) {
  if (newHistoryId && newHistoryId !== account.historyId) {
    account.historyId = newHistoryId;
    await account.save();
    console.log(`Updated history ID to: ${newHistoryId}`);
  }
}

// Webhook handler function
export async function POST(req) {
  try {
    const body = await req.json();

    // Step 1: Handle Pub/Sub verification request
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

    const { emailAddress, historyId } = decodedData;

    console.log("Received notification:", { emailAddress, historyId });

    // Step 3: Deduplication check
    const messageId = message.messageId;
    if (processedMessages.has(messageId)) {
      console.log(`Duplicate message ignored: ${messageId}`);
      return NextResponse.json({ success: true });
    }

    // Add messageId to processed set (cleanup old items to avoid memory bloat)
    processedMessages.add(messageId);
    if (processedMessages.size > 1000) {
      processedMessages.clear();
    }

    // Step 4: Fetch the user account from database
    await dbConnect();

    const account = await GoogleAccount.findOne({ email: emailAddress });
    if (!account) {
      console.error(`Account not found for email: ${emailAddress}`);
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Step 5: Handle outdated or duplicate historyId cases
    if (historyId <= account.historyId) {
      console.log(
        `Old or duplicate history ID received: ${historyId}, skipping.`
      );
      return NextResponse.json({ success: true });
    }

    // Step 6: Authenticate the user account
    const oauth2Client = await getAuthenticatedClient(account);

    // Step 7: Retry fetching history with exponential backoff
    let success = false;
    // for (let attempt = 1; attempt <= 3; attempt++) {
    //   console.log(`Attempt ${attempt}: Fetching email updates...`);
    //   success = await fetchUpdatedEmails(account, oauth2Client);
    //   if (success) break;
    //   await delay(2000 * attempt); // Exponential backoff
    // }

    console.log(`Fetching email updates...`);
    success = await fetchUpdatedEmails(account, oauth2Client);

    if (!success) {
      // console.error(`Failed to fetch email updates after multiple attempts.`);
      return NextResponse.json(
        { error: "Failed to process email updates" },
        { status: 500 }
      );
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
