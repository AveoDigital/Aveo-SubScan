import { Subscription } from "../types";

export interface SyncResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

// Push subscription alert directly to user's real Google Calendar
export async function addSubscriptionToCalendar(
  accessToken: string,
  sub: Subscription
): Promise<SyncResult> {
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  
  // Format next billing date
  const billingDateStr = sub.nextPaymentDate; // YYYY-MM-DD
  
  // All day event end date is the next day
  const dNode = new Date(billingDateStr);
  dNode.setDate(dNode.getDate() + 1);
  const endDateStr = dNode.toISOString().split("T")[0];

  const summary = `💸 Aveo Pay Alert: ${sub.serviceName} Renewal (${sub.amount} ${sub.currency})`;
  let description = `Automated alarm setup via Aveo Subscriptions (${sub.category}).\n\n`;
  description += `• Amount: ${sub.amount} ${sub.currency}\n`;
  description += `• Billing Cycle: ${sub.billingCycle}\n`;
  if (sub.priceIncreased) {
    description += `⚠️ PRICE INCREASE ALERT: This renewal is flagged as higher by +${sub.renewalIncreaseAmount} ${sub.currency} (previously ${sub.previousPrice} ${sub.currency}).\n`;
  }
  if (sub.notes) {
    description += `\nAveo Scan Notes:\n${sub.notes}\n`;
  }
  description += `\nBetter tomorrow than we were today! \nAveo Digital sub-assistant.`;

  const payload = {
    summary,
    description,
    status: "confirmed",
    transparency: "transparent", // Mark as Free time so it doesn't block their schedule
    start: {
      date: billingDateStr
    },
    end: {
      date: endDateStr
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 1440 }, // 1 day before
        { method: "email", minutes: 2880 } // 2 days before email reminder
      ]
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Calendar request failed: ${errText}`);
    }

    const data = await response.json();
    return {
      success: true,
      eventId: data.id
    };
  } catch (err: any) {
    console.error("Calendar sync failure:", err);
    return {
      success: false,
      error: err.message || "Unknown calendar sync error"
    };
  }
}

// Bulk sync helper
export async function syncAllSubscriptionsToCalendar(
  accessToken: string,
  subs: Subscription[],
  onProgress: (serviceName: string, success: boolean) => void
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  
  for (const sub of subs) {
    if (sub.status !== "active") continue;
    const res = await addSubscriptionToCalendar(accessToken, sub);
    onProgress(sub.serviceName, res.success);
    results.push(res);
  }

  return results;
}
