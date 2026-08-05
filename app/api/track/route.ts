import { NextRequest, NextResponse } from "next/server";

const DHL_URL = "https://api-eu.dhl.com/track/shipments";

const showcaseEvents = [
  { date: "Today", time: "09:42", location: "Leipzig, Germany", description: "Processed at DHL facility", current: true },
  { date: "Today", time: "04:18", location: "Leipzig, Germany", description: "Arrived at DHL sort facility" },
  { date: "Yesterday", time: "17:35", location: "Prague, Czech Republic", description: "Shipment picked up" },
];

function showcaseTracking(trackingNumber: string) {
  return {
    trackingNumber,
    status: "In transit",
    statusDetail: "Shipment is moving through the DHL network",
    service: "DHL Express Worldwide",
    origin: "Prague, Czech Republic",
    destination: "Amsterdam, Netherlands",
    estimatedDelivery: "Tomorrow, by end of day",
    events: showcaseEvents,
    source: "Showcase data" as const,
  };
}

function formatPlace(place?: { addressLocality?: string; countryCode?: string }) {
  if (!place) return "Not available";
  return [place.addressLocality, place.countryCode].filter(Boolean).join(", ") || "Not available";
}

export async function GET(request: NextRequest) {
  const trackingNumber = request.nextUrl.searchParams.get("trackingNumber")?.trim();
  if (!trackingNumber) return NextResponse.json({ error: "A tracking number is required." }, { status: 400 });

  try {
    const response = await fetch(`${DHL_URL}?trackingNumber=${encodeURIComponent(trackingNumber)}`, {
      headers: { Accept: "application/json", "DHL-API-Key": process.env.DHL_API_KEY ?? "demo-key" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`DHL returned ${response.status}`);

    const payload = await response.json() as { shipments?: Array<Record<string, unknown>> };
    const shipment = payload.shipments?.[0];
    if (!shipment) throw new Error("No shipment in DHL response");

    const rawEvents = Array.isArray(shipment.events) ? shipment.events : [];
    const events = rawEvents.slice(0, 5).map((item) => {
      const event = item as { timestamp?: string; location?: { addressLocality?: string; countryCode?: string }; description?: string; status?: string };
      const timestamp = event.timestamp ? new Date(event.timestamp) : null;
      return {
        date: timestamp ? timestamp.toLocaleDateString("en", { month: "short", day: "numeric" }) : "Recent",
        time: timestamp ? timestamp.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—",
        location: formatPlace(event.location),
        description: event.description ?? event.status ?? "Shipment update",
      };
    });
    const status = shipment.status as { status?: string; description?: string } | undefined;
    const origin = shipment.origin as { addressLocality?: string; countryCode?: string } | undefined;
    const destination = shipment.destination as { addressLocality?: string; countryCode?: string } | undefined;

    return NextResponse.json({
      message: "Live response received from DHL’s demo API.",
      tracking: {
        ...showcaseTracking(trackingNumber),
        trackingNumber: String(shipment.id ?? trackingNumber),
        status: status?.status ?? "Shipment update",
        statusDetail: status?.description ?? "Latest status received from DHL",
        service: String(shipment.service ?? "DHL shipment"),
        origin: formatPlace(origin),
        destination: formatPlace(destination),
        estimatedDelivery: String(shipment.estimatedTimeOfDelivery ?? "Not available"),
        events: events.length ? events.map((event, index) => ({ ...event, current: index === 0 })) : showcaseEvents,
        source: "DHL demo API",
      },
    });
  } catch {
    return NextResponse.json({
      message: "DHL demo request completed in showcase fallback mode.",
      tracking: showcaseTracking(trackingNumber),
    });
  }
}
