import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    clientName,
    clientPhone,
    hotel,
    dates,
    time,
    childrenCount,
    childNames,
    totalPrice,
  } = req.body as {
    clientName: string;
    clientPhone: string;
    hotel: string;
    dates: string;
    time: string;
    childrenCount: number;
    childNames: string;
    totalPrice: number;
  };

  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
  const WHATSAPP_BUSINESS_NUMBER = process.env.WHATSAPP_BUSINESS_NUMBER;

  // If WhatsApp Business API is not configured, log and return success
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID || !WHATSAPP_BUSINESS_NUMBER) {
    console.log("WhatsApp Business API not configured. Booking notification skipped.");
    console.log("Booking details:", { clientName, clientPhone, hotel, dates, time, childrenCount, totalPrice });
    return res.status(200).json({ success: true, message: "WhatsApp not configured, notification skipped" });
  }

  const message = [
    "🔔 *New Booking Received!*",
    "",
    `👤 *Client:* ${clientName}`,
    `📱 *Phone:* ${clientPhone}`,
    `🏨 *Hotel:* ${hotel}`,
    `📅 *Dates:* ${dates}`,
    `🕐 *Time:* ${time}`,
    `👶 *Children:* ${childrenCount} (${childNames})`,
    `💰 *Total:* ${totalPrice} MAD`,
    "",
    "_Sent automatically by Call a Nanny_",
  ].join("\n");

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: WHATSAPP_BUSINESS_NUMBER,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      return res.status(200).json({ success: true, whatsapp: false, error: data });
    }

    return res.status(200).json({ success: true, whatsapp: true });
  } catch (error) {
    console.error("WhatsApp notification failed:", error);
    // Don't fail the request — notification is best-effort
    return res.status(200).json({ success: true, whatsapp: false });
  }
}
