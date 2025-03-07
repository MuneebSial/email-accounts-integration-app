import axios from "axios";
import { Request, Response } from "express";
import getAccessToken from "../../../lib/microsoft"; 
import router from "../route";

const MICROSOFT_GRAPH_API = "https://graph.microsoft.com/v1.0";


interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    name: string;
    email: string;
  };
}


export const getEmails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "User is not authenticated" });
    }

    const accessToken = await getAccessToken(req.user.id);

    if (!accessToken) {
      return res.status(401).json({ error: "Access token is missing" });
    }

    const response = await axios.get(`${MICROSOFT_GRAPH_API}/me/mailFolders/inbox/messages`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
};


export const sendEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "User is not authenticated" });
    }

    const { to, subject, body } = req.body;
    const accessToken = await getAccessToken(req.user.id);

    if (!accessToken) {
      return res.status(401).json({ error: "Access token is missing" });
    }

    const emailData = {
      message: {
        subject,
        body: { contentType: "HTML", content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    };

    const response = await axios.post(`${MICROSOFT_GRAPH_API}/me/sendMail`, emailData, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });

    res.status(200).json({ message: "Email sent successfully", response: response.data });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
};

export default router; 
