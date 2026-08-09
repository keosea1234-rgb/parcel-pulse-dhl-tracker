"use client";

import { FormEvent, useMemo, useState } from "react";

type TrackingEvent = { date: string; time: string; location: string; description: string; current?: boolean };
type TrackingResult = {
  trackingNumber: string;
  status: string;
  statusCode: string;
  statusDetail: string;
  statusTimestamp: string;
  currentLocation: string;
  service: string;
  productName: string;
  weight: string;
  references: Array<{ type: string; number: string }>;
  origin: string;
  destination: string;
  estimatedDelivery: string;
  events: TrackingEvent[];
  source: "DHL demo API" | "Scenario demo";
};
type QueueState = "queued" | "checking" | "complete" | "failed";
type BatchItem = { trackingNumber: string; state: QueueState; tracking?: TrackingResult };

const DEMO_CODES = Array.from({ length: 50 }, (_, index) => `PPDHLDEMO${String(index + 1).padStart(3, "0")}`).join("\n");
const RATE_LIMIT_MS = 5_100;

function parseTrackingNumbers(value: string) {
  return value.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean).filter((item, index, all) => all.indexOf(item) === index);
}

function queueStateLabel(state: QueueState) {
  return { queued: "Waiting", checking: "Checking", complete: "Complete", failed: "Unavailable" }[state];
}

function formatDateTime(value?: string) {
  if (!value || value === "Not available") return "Not supplied";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function statusTone(tracking?: TrackingResult) {
  if (!tracking) return "";
  if (tracking.statusCode === "failure") return "status-failure";
  if (tracking.statusCode === "delivered") return "status-delivered";
  if (tracking.statusCode === "pre-transit") return "status-pending";
  return "status-transit";
}

export default function Home() {
  const [batchText, setBatchText] = useState(DEMO_CODES);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [selected, setSelected] = useState<TrackingResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [notice, setNotice] = useState("Load the 50 mixed DHL-schema scenarios, or paste your own tracking numbers.");

  const completeCount = items.filter((item) => item.state === "complete").length;
  const checkingCount = items.filter((item) => item.state === "checking").length;
  const deliveredCount = items.filter((item) => item.tracking?.statusCode === "delivered").length;
  const exceptionCount = items.filter((item) => item.tracking?.statusCode === "failure").length;
  const parsedCount = useMemo(() => parseTrackingNumbers(batchText).length, [batchText]);

  function updateItem(index: number, update: Partial<BatchItem>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item));
  }

  function loadDemoCodes() {
    setBatchText(DEMO_CODES);
    setItems([]);
    setSelected(null);
    setNotice("50 mixed scenarios loaded: label, pickup, transit, customs, hold, delivery, exception, return and cancel.");
  }

  async function runBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trackingNumbers = parseTrackingNumbers(batchText);
    if (!trackingNumbers.length) return setNotice("Add at least one tracking number first.");
    if (trackingNumbers.length > 100) return setNotice("Please limit each batch to 100 unique tracking numbers.");

    const isScenarioBatch = trackingNumbers.every((trackingNumber) => trackingNumber.startsWith("PPDHLDEMO"));
    setItems(trackingNumbers.map((trackingNumber) => ({ trackingNumber, state: "queued" })));
    setSelected(null);
    setIsRunning(true);

    for (const [index, trackingNumber] of trackingNumbers.entries()) {
      updateItem(index, { state: "checking" });
      setNotice(isScenarioBatch ? `Generating mixed DHL-schema response ${index + 1} of ${trackingNumbers.length}.` : `Checking DHL response ${index + 1} of ${trackingNumbers.length}.`);
      try {
        const response = await fetch(`/api/track?trackingNumber=${encodeURIComponent(trackingNumber)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Tracking request failed");
        updateItem(index, { state: "complete", tracking: data.tracking });
        setSelected(data.tracking);
      } catch {
        updateItem(index, { state: "failed" });
      }
      if (index < trackingNumbers.length - 1) await new Promise((resolve) => setTimeout(resolve, isScenarioBatch ? 120 : RATE_LIMIT_MS));
    }

    setIsRunning(false);
    setNotice(isScenarioBatch ? "Mixed scenario batch complete. Select any row to inspect its full DHL-style response." : `Batch complete: ${trackingNumbers.length} tracking numbers processed.`);
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <nav className="topbar" aria-label="Main navigation"><a className="brand" href="#top"><span className="brand-mark">P</span><span>PARCEL PULSE</span></a><span className="single-user">PRIVATE WORKSPACE</span></nav>
        <div className="hero-copy" id="top"><p className="eyebrow"><span className="pulse-dot" /> DHL UNIFIED TRACKING</p><h1>See every response,<br /><em>not just delivered.</em></h1><p className="hero-description">Run a realistic mixed-scenario batch, then inspect the same operational fields a real DHL tracking response supplies.</p></div>
        <form className="batch-form" onSubmit={runBatch}>
          <div className="form-head"><label htmlFor="tracking-numbers">Tracking numbers</label><div><button className="demo-fill" type="button" onClick={loadDemoCodes} disabled={isRunning}>Load 50 mixed demos</button><span>{parsedCount} / 100 unique codes</span></div></div>
          <textarea id="tracking-numbers" value={batchText} onChange={(event) => setBatchText(event.target.value)} placeholder="Paste one code per line, or separate codes with commas" disabled={isRunning} />
          <div className="form-actions"><p className="connection-note" role="status"><span>●</span>{notice}</p><button type="submit" disabled={isRunning}>{isRunning ? "Batch running…" : "Run mixed batch"}<span aria-hidden="true">→</span></button></div>
        </form>
      </section>

      <section className="stats-grid" aria-label="Batch summary"><article><span>IN THIS BATCH</span><strong>{items.length || parsedCount}</strong><small>tracking numbers</small></article><article><span>CHECKED</span><strong>{completeCount}</strong><small>{isRunning ? "results arriving" : "responses ready"}</small></article><article><span>DELIVERED</span><strong>{deliveredCount}</strong><small>completed deliveries</small></article><article><span>EXCEPTIONS</span><strong className={exceptionCount ? "stat-alert" : ""}>{exceptionCount}</strong><small>{checkingCount ? "one response in progress" : "holds, returns, cancellations"}</small></article></section>

      <section className="batch-layout" aria-live="polite">
        <article className="batch-card">
          <div className="batch-card-head"><div><p className="section-label">BATCH RESULTS</p><h2>Full operational view</h2></div><span>{items.length ? `${completeCount} / ${items.length}` : "No batch yet"}</span></div>
          {items.length ? <div className="table-scroll"><div className="results-table" role="table" aria-label="Batch tracking results">
            <div className="result-row batch-result-row result-header" role="row"><span>Tracking number</span><span>Status / code</span><span>Estimated arrival</span><span>Last update</span><span>Current location</span><span>Service</span><span>Product</span><span>Weight</span><span>Source</span></div>
            {items.map((item) => <button className={`result-row batch-result-row ${statusTone(item.tracking)} state-${item.state}`} key={item.trackingNumber} type="button" onClick={() => item.tracking && setSelected(item.tracking)} disabled={!item.tracking}>
              <span className="code-cell">{item.trackingNumber}</span><span className="status-cell"><i className="result-dot" />{item.tracking ? <><b>{item.tracking.status}</b><small>{item.tracking.statusCode}</small></> : queueStateLabel(item.state)}</span><span>{item.tracking ? formatDateTime(item.tracking.estimatedDelivery) : "—"}</span><span>{item.tracking ? formatDateTime(item.tracking.statusTimestamp) : "—"}</span><span>{item.tracking?.currentLocation ?? "—"}</span><span>{item.tracking?.service ?? "—"}</span><span>{item.tracking?.productName ?? "—"}</span><span>{item.tracking?.weight ?? "—"}</span><span className="source-cell">{item.tracking?.source ?? "Queued"}</span>
            </button>)}
          </div></div> : <div className="empty-state"><span className="empty-count">50</span><h3>Ready for a realistic demo</h3><p>Run the loaded scenarios to see different DHL-style operational outcomes and response fields.</p></div>}
          <footer className="data-note"><span>●</span> Scenario demo fields follow DHL Unified Tracking response structure. “Delivered by Deutsche Post DHL Group”</footer>
        </article>

        <aside className="detail-card">
          <div className="detail-head"><div><p className="section-label">RESPONSE INSPECTOR</p><h2>{selected?.status ?? "Awaiting batch"}</h2></div>{selected && <span className={`status-badge ${statusTone(selected)}`}><span /> {selected.statusCode}</span>}</div>
          {selected ? <><p className="detail-copy">{selected.statusDetail}</p><div className="detail-meta"><span>TRACKING NUMBER<strong>{selected.trackingNumber}</strong></span><span>STATUS CODE<strong>{selected.statusCode}</strong></span><span>LAST UPDATE<strong>{formatDateTime(selected.statusTimestamp)}</strong></span><span>CURRENT LOCATION<strong>{selected.currentLocation}</strong></span><span>ESTIMATED DELIVERY<strong>{formatDateTime(selected.estimatedDelivery)}</strong></span><span>SERVICE<strong>{selected.service}</strong></span><span>PRODUCT<strong>{selected.productName}</strong></span><span>WEIGHT<strong>{selected.weight}</strong></span></div><div className="route-data"><span>ORIGIN<strong>{selected.origin}</strong></span><i aria-hidden="true">→</i><span>DESTINATION<strong>{selected.destination}</strong></span></div>{selected.references.length > 0 && <div className="reference-list"><span>REFERENCES</span>{selected.references.map((reference) => <small key={`${reference.type}-${reference.number}`}>{reference.type}: <b>{reference.number}</b></small>)}</div>}<ol className="mini-timeline">{selected.events.map((shipmentEvent, index) => <li key={`${shipmentEvent.date}-${index}`} className={shipmentEvent.current ? "is-current" : ""}><i /><div><strong>{shipmentEvent.description}</strong><span>{shipmentEvent.date} · {shipmentEvent.time} · {shipmentEvent.location}</span></div></li>)}</ol></> : <div className="awaiting-detail"><span className="pulse-dot" /><p>Run the mixed batch, then select a row to inspect status code, timestamps, location, product, weight, references and event history.</p></div>}
        </aside>
      </section>

      <section className="status-guide" aria-labelledby="status-guide-title"><div className="guide-intro"><p className="section-label">DHL TRACKING REFERENCE</p><h2 id="status-guide-title">What the API can tell you</h2><p>Exact codes and event names vary by DHL service. A real API key keeps the original DHL status, description and optional fields.</p></div><div className="guide-panel"><h3>Common delivery states</h3><div className="status-groups"><span>Label created</span><span>Picked up</span><span>In transit</span><span>At customs</span><span>On hold</span><span>Out for delivery</span><span>Available for pickup</span><span>Delivered</span><span>Delivery exception</span><span>Refused / returned</span><span>Cancelled</span></div><p>Scenario codes are intentionally mixed so the table is not limited to one delivered response.</p></div><div className="guide-panel"><h3>Available shipment information</h3><ul className="api-data-list"><li>Current location and route history</li><li>ETA and delivery time window, when supplied</li><li>Status, detailed event description and timestamp</li><li>Origin, destination, provider and tracking ID</li><li>Piece events, weight and dimensions, when available</li><li>Proof of delivery for eligible Express and Freight shipments</li></ul></div></section>
      <section className="integration-strip"><p><span className="pulse-dot" /> DHL-SCHEMA SCENARIOS</p><span>50 varied operational outcomes</span><span className="strip-divider" /><span>Real customer codes continue through the DHL API route</span></section>
    </main>
  );
}
