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

    console.log("Received Pub/Sub message:", decodedData);

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

    // Log for verification
    console.log("Processed message:", {
      messageId,
      decodedData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
