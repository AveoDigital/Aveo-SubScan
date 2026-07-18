import { Subscription, GeminiScanResult } from "../types";

export interface ScanStatusUpdate {
  phase: "searching" | "fetching" | "parsing" | "completing" | "error";
  message: string;
  progress: number;
}

// Sample mock email sources that users can inject to safely test the parser
export const SAMPLE_SCAN_TEMPLATES = [
  {
    id: "tpl_1",
    sender: "info@netflix.com",
    subject: "Important update regarding your Netflix plan price increase",
    bodySnippet: "As we continue to add more value, we are increasing the price of your Premium plan from $17.90 USD to $22.40 USD starting next month. Your subscription will auto-renew on July 2nd.",
    date: "2026-06-15"
  },
  {
    id: "tpl_2",
    sender: "no-reply@spotify.com",
    subject: "Your Spotify Premium family subscription payment confirmation - June 2026",
    bodySnippet: "Thanks for subscribing to Premium Family. We have successfully charged your card $18.90 USD for the upcoming month. Your service stays active until July 16, 2026.",
    date: "2026-06-16"
  },
  {
    id: "tpl_3",
    sender: "billing@github.com",
    subject: "GitHub receipt for ericg6692@gmail.com - Invoice #GH-90210",
    bodySnippet: "Your monthly GitHub Team seats billing is complete. Subscripton total: $4.00 USD. Your next auto-renewal date is set to July 10, 2026.",
    date: "2026-06-10"
  },
  {
    id: "tpl_4",
    sender: "support@notion.so",
    subject: "Notion Pro Plan annual subscription renewal invoice",
    bodySnippet: "Thank you for using Notion! Your annual personal pro membership will renew on June 28, 2026 for $96.00 USD. If you wish to cancel or modify, do so in your settings.",
    date: "2026-06-01"
  },
  {
    id: "tpl_5",
    sender: "cloud@apple.com",
    subject: "Your iCloud+ with 2TB storage subscription renewal notice",
    bodySnippet: "Your iCloud+ 2TB storage plan is renewing soon. You will be billed $12.90 USD on June 25, 2026. This subscription auto-renews monthly unless cancelled.",
    date: "2026-06-12"
  }
];

export async function fetchGmailMessages(accessToken: string, queryStr: string): Promise<any[]> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(queryStr)}&maxResults=15`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Gmail API request failed with status: ${response.status}`);
  }

  const data = await response.ok ? await response.json() : null;
  return data?.messages || [];
}

export async function fetchGmailMessageDetail(accessToken: string, id: string): Promise<any> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch message details for dynamic ID: ${id}`);
  }

  return response.json();
}

export function parseHeaders(payload: any): { subject: string; date: string; from: string } {
  let subject = "";
  let date = "";
  let from = "";

  if (payload && payload.headers) {
    for (const header of payload.headers) {
      if (header.name.toLowerCase() === "subject") {
        subject = header.value;
      }
      if (header.name.toLowerCase() === "date") {
        date = header.value;
      }
      if (header.name.toLowerCase() === "from") {
        from = header.value;
      }
    }
  }

  return { subject, date, from };
}

// Scans user's real inbox for subscription emails and sends them to Gemini backend for parsing
export async function runGmailScan(
  accessToken: string,
  userId: string,
  onProgress: (status: ScanStatusUpdate) => void,
  onSubscriptionFound: (sub: Subscription) => void
): Promise<Subscription[]> {
  const subscriptions: Subscription[] = [];
  try {
    onProgress({
      phase: "searching",
      message: "Sweeping Gmail inbox for subscription invoices & price warnings...",
      progress: 10
    });

    // We look for invoice receipt indicators
    const searchQueries = [
      'subject:(subscription OR renewal OR invoice OR payment OR billing OR receipt OR "price increase")',
      'from:(netflix OR spotify OR apple OR google OR github OR adobesystems OR zoom OR microsoft OR slack)'
    ].join(" ");

    const messages = await fetchGmailMessages(accessToken, searchQueries);

    if (messages.length === 0) {
      onProgress({
        phase: "completing",
        message: "No subscription emails found in your live inbox. Try importing our Aveo AI demo set!",
        progress: 100
      });
      return [];
    }

    onProgress({
      phase: "fetching",
      message: `Found ${messages.length} potential subscription records. Fetching details...`,
      progress: 30
    });

    let count = 0;
    for (const msg of messages) {
      count++;
      const pct = 30 + Math.floor((count / messages.length) * 40);
      onProgress({
        phase: "fetching",
        message: `Analyzing invoice record ${count} of ${messages.length}...`,
        progress: pct
      });

      try {
        const details = await fetchGmailMessageDetail(accessToken, msg.id);
        const snippet = details.snippet || "";
        const { subject, date, from } = parseHeaders(details.payload);

        // Send to server-side Gemini scanner
        onProgress({
          phase: "parsing",
          message: `Asking Aveo AI to parse: "${subject.substring(0, 30)}..."`,
          progress: pct
        });

        const apiResponse = await fetch("/api/parse-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            subject,
            bodySnippet: snippet,
            date,
            sender: from
          })
        });

        if (apiResponse.ok) {
          const result: GeminiScanResult = await apiResponse.json();
          if (result.isSubscriptionEmail && result.serviceName) {
            const sub: Subscription = {
              userId,
              serviceName: result.serviceName,
              amount: result.amount,
              currency: result.currency,
              billingCycle: result.billingCycle || "monthly",
              nextPaymentDate: result.nextPaymentDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0],
              alertEnabled: true,
              priceIncreased: result.priceIncreased,
              renewalIncreaseAmount: result.renewalIncreaseAmount || 0,
              previousPrice: result.previousPrice || 0,
              category: result.category || "Other",
              source: "gmail",
              status: "active",
              emailSubject: subject,
              emailDate: date,
              notes: result.explanation
            };
            subscriptions.push(sub);
            onSubscriptionFound(sub);
          }
        }
      } catch (err) {
        console.warn(`Problem scanning email snippet index ${count}:`, err);
      }
    }

    onProgress({
      phase: "completing",
      message: `Done! AI decoded ${subscriptions.length} active digital subscriptions from your Gmail!`,
      progress: 100
    });

  } catch (error: any) {
    console.error("Gmail SubScan Radar failed:", error);
    onProgress({
      phase: "error",
      message: `Scan failed: ${error.message || "Credential timeout"}`,
      progress: 100
    });
  }

  return subscriptions;
}

// Simulates parsing selected demo emails via the live server-side Gemini scan
export async function runSimulatedTemplateScan(
  userId: string,
  templates: typeof SAMPLE_SCAN_TEMPLATES,
  onProgress: (status: ScanStatusUpdate) => void,
  onSubscriptionFound: (sub: Subscription) => void
): Promise<Subscription[]> {
  const resultSubs: Subscription[] = [];
  try {
    onProgress({
      phase: "searching",
      message: "Initiating simulated sweep of custom template invoices...",
      progress: 15
    });

    let count = 0;
    for (const tpl of templates) {
      count++;
      const pct = 15 + Math.floor((count / templates.length) * 75);
      
      onProgress({
        phase: "parsing",
        message: `Aveo AI examining item ${count}: "${tpl.subject.substring(0, 30)}..."`,
        progress: pct
      });

      // Call the real Gemini backend
      const response = await fetch("/api/parse-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: tpl.subject,
          bodySnippet: tpl.bodySnippet,
          date: tpl.date,
          sender: tpl.sender
        })
      });

      if (response.ok) {
        const result: GeminiScanResult = await response.json();
        if (result.isSubscriptionEmail && result.serviceName) {
          const sub: Subscription = {
            userId,
            serviceName: result.serviceName,
            amount: result.amount,
            currency: result.currency,
            billingCycle: result.billingCycle || "monthly",
            nextPaymentDate: result.nextPaymentDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0],
            alertEnabled: true,
            priceIncreased: result.priceIncreased,
            renewalIncreaseAmount: result.renewalIncreaseAmount || 0,
            previousPrice: result.previousPrice || 0,
            category: result.category || "Other",
            source: "gmail",
            status: "active",
            emailSubject: tpl.subject,
            emailDate: tpl.date,
            notes: result.explanation
          };
          resultSubs.push(sub);
          onSubscriptionFound(sub);
        }
      }
    }

    onProgress({
      phase: "completing",
      message: `Completed! Successfully scanned and ingested ${resultSubs.length} subscriptions using Gemini.`,
      progress: 100
    });

  } catch (error: any) {
    console.error("Simulation scan crashed:", error);
    onProgress({
      phase: "error",
      message: `Simulation scan error: ${error.message}`,
      progress: 100
    });
  }

  return resultSubs;
}
