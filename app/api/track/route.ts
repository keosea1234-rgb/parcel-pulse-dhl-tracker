import { NextRequest, NextResponse } from "next/server";

const DHL_URL = "https://api-eu.dhl.com/track/shipments";

type Address = { addressLocality?: string; countryCode?: string; postalCode?: string };
type Event = { timestamp?: string; location?: { address?: Address }; statusCode?: string; status?: string; description?: string };

type Scenario = {
  status: string;
  statusCode: string;
  description: string;
  service: string;
  productName: string;
  etaOffsetHours?: number;
  currentLocation: Address;
  origin: Address;
  destination: Address;
  weight: string;
  references: Array<{ type: string; number: string }>;
};

const scenarios: Scenario[] = [
  { status: "LABEL CREATED", statusCode: "pre-transit", description: "Electronic shipping information received. Awaiting parcel handover.", service: "ecommerce", productName: "DHL SM Parcel Plus Expedited", etaOffsetHours: 72, currentLocation: { addressLocality: "Prague", countryCode: "CZ", postalCode: "110 00" }, origin: { addressLocality: "Prague", countryCode: "CZ" }, destination: { addressLocality: "Amsterdam", countryCode: "NL" }, weight: "0.85 KG", references: [{ type: "customer-reference", number: "ORD-50021" }] },
  { status: "PICKED UP", statusCode: "transit", description: "Shipment picked up from sender and accepted into the DHL network.", service: "express", productName: "DHL Express Worldwide", etaOffsetHours: 52, currentLocation: { addressLocality: "Brno", countryCode: "CZ", postalCode: "602 00" }, origin: { addressLocality: "Brno", countryCode: "CZ" }, destination: { addressLocality: "Berlin", countryCode: "DE" }, weight: "2.10 KG", references: [{ type: "customer-reference", number: "ORD-50022" }, { type: "local-tracking-number", number: "CZ-PICKUP-022" }] },
  { status: "IN TRANSIT", statusCode: "transit", description: "Processed at DHL sort facility and moving to the destination region.", service: "ecommerce-europe", productName: "DHL Parcel Connect", etaOffsetHours: 30, currentLocation: { addressLocality: "Leipzig", countryCode: "DE", postalCode: "04347" }, origin: { addressLocality: "Vienna", countryCode: "AT" }, destination: { addressLocality: "Paris", countryCode: "FR" }, weight: "1.35 KG", references: [{ type: "customer-confirmation-number", number: "CNF-50023" }] },
  { status: "ARRIVED AT CUSTOMS", statusCode: "transit", description: "Shipment is awaiting customs clearance in the destination country.", service: "express", productName: "DHL Express Worldwide", etaOffsetHours: 42, currentLocation: { addressLocality: "London Heathrow", countryCode: "GB", postalCode: "TW6" }, origin: { addressLocality: "Prague", countryCode: "CZ" }, destination: { addressLocality: "London", countryCode: "GB" }, weight: "4.70 KG", references: [{ type: "customer-reference", number: "ORD-50024" }, { type: "ecommerce-number", number: "EC-50024" }] },
  { status: "ON HOLD", statusCode: "failure", description: "Shipment is on hold pending recipient instructions or payment of charges.", service: "express", productName: "DHL Express Envelope", currentLocation: { addressLocality: "Milan", countryCode: "IT", postalCode: "20090" }, origin: { addressLocality: "Prague", countryCode: "CZ" }, destination: { addressLocality: "Milan", countryCode: "IT" }, weight: "0.42 KG", references: [{ type: "customer-reference", number: "ORD-50025" }] },
  { status: "OUT FOR DELIVERY", statusCode: "transit", description: "With delivering courier. Delivery is planned for today.", service: "ecommerce", productName: "DHL Parcel International", etaOffsetHours: 4, currentLocation: { addressLocality: "Rotterdam", countryCode: "NL", postalCode: "3011" }, origin: { addressLocality: "Cologne", countryCode: "DE" }, destination: { addressLocality: "Rotterdam", countryCode: "NL" }, weight: "3.20 KG", references: [{ type: "local-tracking-number", number: "NL-LASTMILE-026" }] },
  { status: "AVAILABLE FOR PICKUP", statusCode: "transit", description: "Shipment is ready for collection at the DHL ServicePoint.", service: "parcel-de", productName: "DHL Paket", etaOffsetHours: 36, currentLocation: { addressLocality: "Munich", countryCode: "DE", postalCode: "80331" }, origin: { addressLocality: "Hamburg", countryCode: "DE" }, destination: { addressLocality: "Munich", countryCode: "DE" }, weight: "1.80 KG", references: [{ type: "customer-reference", number: "ORD-50027" }] },
  { status: "DELIVERED", statusCode: "delivered", description: "Delivered to parcel locker. Recipient notified.", service: "ecommerce", productName: "DHL SM Parcel Plus Expedited", currentLocation: { addressLocality: "Henderson, NV", countryCode: "US", postalCode: "89014" }, origin: { addressLocality: "Hebron, KY", countryCode: "US" }, destination: { addressLocality: "Henderson, NV", countryCode: "US" }, weight: "1.35 LB", references: [{ type: "customer-reference", number: "ORD-50028" }, { type: "ecommerce-number", number: "EC-50028" }] },
  { status: "DELIVERY EXCEPTION", statusCode: "failure", description: "Delivery attempt was unsuccessful. A new delivery attempt is being arranged.", service: "ecommerce-europe", productName: "DHL Parcel Connect", etaOffsetHours: 28, currentLocation: { addressLocality: "Warsaw", countryCode: "PL", postalCode: "00-001" }, origin: { addressLocality: "Prague", countryCode: "CZ" }, destination: { addressLocality: "Warsaw", countryCode: "PL" }, weight: "2.65 KG", references: [{ type: "customer-reference", number: "ORD-50029" }] },
  { status: "RETURNED TO SENDER", statusCode: "failure", description: "Shipment was undeliverable and is returning to the sender.", service: "parcel-nl", productName: "DHL Parcel", currentLocation: { addressLocality: "Eindhoven", countryCode: "NL", postalCode: "5611" }, origin: { addressLocality: "Utrecht", countryCode: "NL" }, destination: { addressLocality: "Antwerp", countryCode: "BE" }, weight: "1.10 KG", references: [{ type: "customer-reference", number: "ORD-50030" }] },
  { status: "SHIPMENT CANCELED", statusCode: "failure", description: "The shipment was cancelled before it entered the transport network.", service: "ecommerce", productName: "DHL eCommerce Ground", currentLocation: { addressLocality: "Prague", countryCode: "CZ", postalCode: "110 00" }, origin: { addressLocality: "Prague", countryCode: "CZ" }, destination: { addressLocality: "Bratislava", countryCode: "SK" }, weight: "0.60 KG", references: [{ type: "customer-reference", number: "ORD-50031" }] },
];

function formatPlace(place?: { address?: Address } | Address) {
  const address = place && "address" in place ? place.address : place;
  if (!address) return "Not available";
  return [address.addressLocality, address.countryCode].filter(Boolean).join(", ") || "Not available";
}

function asDate(offsetHours: number) {
  return new Date(Date.now() + offsetHours * 60 * 60 * 1000).toISOString();
}

function scenarioTracking(trackingNumber: string) {
  const number = Number(trackingNumber.replace(/\D/g, "")) || 1;
  const scenario = scenarios[(number - 1) % scenarios.length];
  const timestamp = new Date(Date.now() - (number % 11 + 1) * 60 * 60 * 1000).toISOString();
  const events = [
    { timestamp, statusCode: scenario.statusCode, status: scenario.status, description: scenario.description, location: { address: scenario.currentLocation } },
    { timestamp: new Date(Date.parse(timestamp) - 16 * 60 * 60 * 1000).toISOString(), statusCode: "transit", status: "PICKED UP", description: "Shipment accepted by DHL", location: { address: scenario.origin } },
    { timestamp: new Date(Date.parse(timestamp) - 30 * 60 * 60 * 1000).toISOString(), statusCode: "pre-transit", status: "LABEL CREATED", description: "Electronic shipping information received", location: { address: scenario.origin } },
  ];
  return normalizeShipment({
    id: trackingNumber,
    service: scenario.service,
    origin: { address: scenario.origin },
    destination: { address: scenario.destination },
    status: { timestamp, statusCode: scenario.statusCode, status: scenario.status, description: scenario.description, location: { address: scenario.currentLocation } },
    estimatedTimeOfDelivery: scenario.etaOffsetHours ? asDate(scenario.etaOffsetHours) : undefined,
    details: { product: { productName: scenario.productName }, weight: { value: scenario.weight.split(" ")[0], unitText: scenario.weight.split(" ")[1] }, references: scenario.references },
    events,
  }, "Scenario demo");
}

function normalizeShipment(shipment: Record<string, unknown>, source: "DHL demo API" | "Scenario demo") {
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
    source,
  };
}

export async function GET(request: NextRequest) {
  const trackingNumber = request.nextUrl.searchParams.get("trackingNumber")?.trim();
  if (!trackingNumber) return NextResponse.json({ error: "A tracking number is required." }, { status: 400 });

  if (trackingNumber.startsWith("PPDHLDEMO")) {
    return NextResponse.json({ message: "Mixed DHL-schema scenario generated for this demo code.", tracking: scenarioTracking(trackingNumber) });
  }

  try {
    const response = await fetch(`${DHL_URL}?trackingNumber=${encodeURIComponent(trackingNumber)}`, {
      headers: { Accept: "application/json", "DHL-API-Key": process.env.DHL_API_KEY ?? "demo-key" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`DHL returned ${response.status}`);
    const payload = await response.json() as { shipments?: Array<Record<string, unknown>> };
    const shipment = payload.shipments?.[0];
    if (!shipment) throw new Error("No shipment in DHL response");
    return NextResponse.json({ message: "Live response received from DHL's demo API.", tracking: normalizeShipment(shipment, "DHL demo API") });
  } catch {
    return NextResponse.json({ message: "DHL demo request failed; a realistic DHL-schema scenario was used.", tracking: scenarioTracking(trackingNumber) });
  }
}
