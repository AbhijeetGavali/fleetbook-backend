import { logger } from "../../shared/utils/logger";

const BASE_URL = `https://graph.facebook.com/v19.0`;

// ── sendRaw ───────────────────────────────────────────────────────────────────
async function sendRaw(body: object): Promise<string | null> {
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID!;
  const token = process.env.WA_TOKEN!;

  try {
    if (process.env.NODE_ENV === "development") {
      console.log("[WA dev] would send:", JSON.stringify(body, null, 2));
      return `wamid.${Date.now()}`;
    }

    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error("[WA] error - status:", res.status, JSON.stringify(errBody));
      return null;
    }

    const data = (await res.json()) as any;
    return data?.messages?.[0]?.id ?? null;
  } catch (e) {
    console.error("[WA] send error", e);
    return null;
  }
}

// ── Upload PDF to WA media, returns media_id ──────────────────────────────────
async function uploadMedia(pdfBuffer: Buffer, filename: string): Promise<string | null> {
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID!;
  const token = process.env.WA_TOKEN!;

  try {
    if (process.env.NODE_ENV === "development") {
      console.log("[WA dev] would upload media:", filename);
      return `media_id_dev_${Date.now()}`;
    }

    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", "application/pdf");
    form.append(
      "file",
      new Blob([pdfBuffer], { type: "application/pdf" }),
      filename
    );

    const res = await fetch(`${BASE_URL}/${phoneNumberId}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error("[WA] media upload error:", res.status, JSON.stringify(errBody));
      return null;
    }

    const data = (await res.json()) as any;
    return data?.id ?? null;
  } catch (e) {
    console.error("[WA] media upload error", e);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface WhatsAppReportParams {
  toPhone: string; // e.g. "919876543210" (no +)
  userName: string;
  fromDate: string;
  toDate: string;
  totalRevenue: number;
  totalProfit: number;
  pdfBuffer: Buffer;
  pdfFilename: string;
}

/**
 * Sends the approved template "monthly_profit_report_fleetbook" with:
 *   - DOCUMENT header  → uploaded PDF
 *   - BODY parameters  → {{1}} user_name, {{2}} from_date, {{3}} to_date,
 *                        {{4}} total_revenue, {{5}} total_price
 *
 * Template body (as approved in Meta Business Manager):
 *   Hello {{1}},
 *   Your monthly profit report for the period {{2}} to {{3}} is ready.
 *   Total Revenue: ₹{{4}}
 *   Total Profit: ₹{{5}}
 *   Please find the report attached.
 */
export const sendWhatsAppReport = async (params: WhatsAppReportParams): Promise<void> => {
  const revenue = params.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const profit = params.totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 });

  // 1. Upload PDF to get media_id
  const mediaId = await uploadMedia(params.pdfBuffer, params.pdfFilename);
  if (!mediaId && process.env.NODE_ENV !== "development") {
    logger.warn(`[WA] PDF upload failed for ${params.toPhone}, skipping`);
    return;
  }

  // 2. Send template with document header + body params
  const msgId = await sendRaw({
    messaging_product: "whatsapp",
    to: params.toPhone.replace(/^\+/, ""),
    type: "template",
    template: {
      name: "monthly_profit_report_fleetbook",
      language: { code: "en" },
      components: [
        // Document header — the PDF
        {
          type: "header",
          parameters: [
            {
              type: "document",
              document: {
                id: mediaId,
                filename: params.pdfFilename,
              },
            },
          ],
        },
        // Body — positional parameters matching {{1}}…{{5}}
        {
          type: "body",
          parameters: [
            { type: "text", text: params.userName },
            { type: "text", text: params.fromDate },
            { type: "text", text: params.toDate },
            { type: "text", text: `₹${revenue}` },
            { type: "text", text: `₹${profit}` },
          ],
        },
      ],
    },
  });

  if (msgId) logger.info(`[WA] report sent to ${params.toPhone} [${msgId}]`);
};
