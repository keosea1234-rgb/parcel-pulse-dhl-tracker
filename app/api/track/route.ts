import { NextRequest, NextResponse } from "next/server";

const DHL_URL = "https://api-eu.dhl.com/track/shipments";

type Address = { addressLocality?: string; countryCode?: string; postalCode?: string };
type Event = { timestamp?: string; location?: { address?: Address }; statusCode?: string; status?: string; description?: string };

function formatPlace(place?: { address?: Address } | Address) {
  const address: Address | undefined = place && "address" in place
    ? (place as { address?: Address }).address
    : (place as Address | undefined);
  if (!address) return "Not available";
  return [address.addressLocality, address.countryCode].filter(Boolean).join(", ") || "Not available";
}

function normalizeShipment(shipment: Record<string, unknown>) {
  const status = shipment.status as { timestamp?: string; statusCode?: string; status?: string; description?: string; location?: { address?: Address } } | undefined;
  const details = shipment.details as { product?: { productName?: string }; weight?: { value?: string | number; unitText?: string }; references?: Array<{ type?: string; number?: string }> } | undefined;
  const rawEvents = Array.isArray(shipment.events) ? shipment.events as Event[] : [];
  const events = rawEvents.slice(0, 8).map((event, index) => {
    const timestamp = event.timestamp ? new Date(event.timestamp) : null;
    return {
      date: timestamp ? timestamp.toLocaleDateString("en", { month: "short", day: "numeric" }) : "Recent",
      time: timestamp ? timestamp.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—",
      location: formatPlace(event.location),
      description: event.description ?? event.status ?? "Shipment update",
      current: index === 0,
    };
  });
  return {
    trackingNumber: String(shipment.id ?? "Not available"),
    status: status?.status ?? "Shipment update",
    statusCode: status?.statusCode ?? "unknown",
    statusDetail: status?.description ?? "Latest status received from DHL",
    statusTimestamp: status?.timestamp ?? "Not available",
    currentLocation: formatPlace(status?.location),
    service: String(shipment.service ?? "DHL shipment"),
    productName: details?.product?.productName ?? "Not supplied",
    weight: details?.weight?.value ? `${details.weight.value} ${details.weight.unitText ?? ""}`.trim() : "Not supplied",
    references: (details?.references ?? []).map((reference) => ({ type: reference.type ?? "reference", number: reference.number ?? "Not supplied" })),
    origin: formatPlace(shipment.origin as { address?: Address } | undefined),
    destination: formatPlace(shipment.destination as { address?: Address } | undefined),
    estimatedDelivery: String(shipment.estimatedTimeOfDelivery ?? "Not available"),
    events,
    source: "DHL Unified Tracking",
  };
}

async function readDhlError(response: Response) {
  const fallback = `DHL returned ${response.status} ${response.statusText}`.trim();
  try {
    const payload = await response.json() as { detail?: string; title?: string; message?: string };
    return payload.detail ?? payload.title ?? payload.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const trackingNumber = request.nextUrl.searchParams.get("trackingNumber")?.trim();
  if (!trackingNumber) return NextResponse.json({ error: "A tracking number is required." }, { status: 400 });

  const apiKey = process.env.DHL_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DHL_API_KEY is not configured in this deployment." }, { status: 503 });

  try {
    const response = await fetch(`${DHL_URL}?trackingNumber=${encodeURIComponent(trackingNumber)}`, {
      headers: { Accept: "application/json", "DHL-API-Key": apiKey },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: await readDhlError(response) }, { status: response.status });
    const payload = await response.json() as { shipments?: Array<Record<string, unknown>> };
    const shipment = payload.shipments?.[0];
    if (!shipment) return NextResponse.json({ error: "DHL did not return a shipment for this tracking number." }, { status: 404 });
    return NextResponse.json({ message: "Live response received from DHL Unified Tracking.", tracking: normalizeShipment(shipment) });
  } catch {
    return NextResponse.json({ error: "Unable to reach DHL Unified Tracking. Please try again shortly." }, { status: 502 });
  }
}
