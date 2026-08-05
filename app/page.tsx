"use client";

import { FormEvent, useMemo, useState } from "react";

type TrackingEvent = { date: string; time: string; location: string; description: string; current?: boolean };
type TrackingResult = {
  trackingNumber: string;
  status: string;
  statusDetail: string;
  service: string;
  origin: string;
  destination: string;
  estimatedDelivery: string;
  events: TrackingEvent[];
  source: "DHL demo API" | "Showcase data";
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

export default function Home() {
  const [batchText, setBatchText] = useState(DEMO_CODES);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [selected, setSelected] = useState<TrackingResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [notice, setNotice] = useState("Paste up to 100 tracking numbers, then run one batch.");

  const completeCount = items.filter((item) => item.state === "complete").length;
  const checkingCount = items.filter((item) => item.state === "checking").length;
  const deliveredCount = items.filter((item) => item.tracking?.status.toLowerCase().includes("deliver")).length;
  const parsedCount = useMemo(() => parseTrackingNumbers(batchText).length, [batchText]);

  function updateItem(index: number, update: Partial<BatchItem>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item));
  }

  function loadDemoCodes() {
    setBatchText(DEMO_CODES);
    setItems([]);
    setSelected(null);
    setNotice("50 unique DHL demo codes loaded. They return DHL's mocked demo response.");
  }

  async function runBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trackingNumbers = parseTrackingNumbers(batchText);
    if (!trackingNumbers.length) {
      setNotice("Add at least one tracking number first.");
      return;
    }
    if (trackingNumbers.length > 100) {
      setNotice("Please limit each batch to 100 unique tracking numbers.");
      return;
    }

    setItems(trackingNumbers.map((trackingNumber) => ({ trackingNumber, state: "queued" })));
    setSelected(null);
    setIsRunning(true);
    setNotice(`Batch started: 0 of ${trackingNumbers.length} checked.`);

    for (const [index, trackingNumber] of trackingNumbers.entries()) {
      updateItem(index, { state: "checking" });
      setNotice(`Checking ${index + 1} of ${trackingNumbers.length}. DHL rate limit is being respected.`);
      try {
        const response = await fetch(`/api/track?trackingNumber=${encodeURIComponent(trackingNumber)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Tracking request failed");
        updateItem(index, { state: "complete", tracking: data.tracking });
        setSelected(data.tracking);
      } catch {
        updateItem(index, { state: "failed" });
      }
      if (index < trackingNumbers.length - 1) await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS));
    }

    setIsRunning(false);
    setNotice(`Batch complete: ${trackingNumbers.length} tracking numbers processed.`);
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <nav className="topbar" aria-label="Main navigation">
          <a className="brand" href="#top" aria-label="Parcel Pulse home"><span className="brand-mark">P</span><span>PARCEL PULSE</span></a>
          <span className="single-user">PRIVATE WORKSPACE</span>
        </nav>
        <div className="hero-copy" id="top">
          <p className="eyebrow"><span className="pulse-dot" /> DHL UNIFIED TRACKING</p>
          <h1>100 shipments,<br /><em>one calm workflow.</em></h1>
          <p className="hero-description">Paste a list, run one batch, and let the dashboard deliver every shipment status without manual lookups.</p>
        </div>
        <form className="batch-form" onSubmit={runBatch}>
          <div className="form-head"><label htmlFor="tracking-numbers">Tracking numbers</label><div><button className="demo-fill" type="button" onClick={loadDemoCodes} disabled={isRunning}>Load 50 demo codes</button><span>{parsedCount} / 100 unique codes</span></div></div>
          <textarea id="tracking-numbers" value={batchText} onChange={(event) => setBatchText(event.target.value)} placeholder="Paste one code per line, or separate codes with commas" disabled={isRunning} />
          <div className="form-actions"><p className="connection-note" role="status"><span>●</span>{notice}</p><button type="submit" disabled={isRunning}>{isRunning ? "Batch running…" : "Run batch"}<span aria-hidden="true">→</span></button></div>
        </form>
      </section>

      <section className="stats-grid" aria-label="Batch summary">
        <article><span>IN THIS BATCH</span><strong>{items.length || parsedCount}</strong><small>tracking numbers</small></article>
        <article><span>CHECKED</span><strong>{completeCount}</strong><small>{isRunning ? "results arriving" : "results ready"}</small></article>
        <article><span>DELIVERED</span><strong>{deliveredCount}</strong><small>from completed results</small></article>
        <article><span>QUEUE STATUS</span><strong className={isRunning ? "stat-active" : ""}>{isRunning ? "Active" : "Ready"}</strong><small>{checkingCount ? "one secure request in progress" : "DHL demo connection"}</small></article>
      </section>

      <section className="batch-layout" aria-live="polite">
        <article className="batch-card">
          <div className="batch-card-head"><div><p className="section-label">BATCH RESULTS</p><h2>Shipment statuses</h2></div><span>{items.length ? `${completeCount} / ${items.length}` : "No batch yet"}</span></div>
          {items.length ? <div className="results-table" role="table" aria-label="Batch tracking results">
            <div className="result-row result-header" role="row"><span>Tracking number</span><span>Status</span><span>Service</span><span>Source</span></div>
            {items.map((item) => <button className={`result-row state-${item.state}`} key={item.trackingNumber} type="button" onClick={() => item.tracking && setSelected(item.tracking)} disabled={!item.tracking}>
              <span className="code-cell">{item.trackingNumber}</span>
              <span><i className="result-dot" />{item.tracking ? item.tracking.status : queueStateLabel(item.state)}</span>
              <span>{item.tracking?.service ?? "—"}</span>
              <span className="source-cell">{item.tracking?.source ?? "Queued"}</span>
            </button>)}
          </div> : <div className="empty-state"><span className="empty-count">100</span><h3>Ready for your shipment list</h3><p>Paste up to 100 DHL tracking numbers above. Each line becomes a result row here.</p></div>}
          <footer className="data-note"><span>●</span> Data presented via DHL Unified Tracking. “Delivered by Deutsche Post DHL Group”</footer>
        </article>

        <aside className="detail-card">
          <div className="detail-head"><div><p className="section-label">LATEST RESULT</p><h2>{selected?.status ?? "Awaiting batch"}</h2></div>{selected && <span className="status-badge"><span /> {selected.status}</span>}</div>
          {selected ? <>
            <p className="detail-copy">{selected.statusDetail}</p>
            <div className="detail-meta"><span>TRACKING NUMBER<strong>{selected.trackingNumber}</strong></span><span>ESTIMATED DELIVERY<strong>{selected.estimatedDelivery}</strong></span></div>
            <ol className="mini-timeline">{selected.events.slice(0, 3).map((shipmentEvent, index) => <li key={`${shipmentEvent.date}-${index}`} className={shipmentEvent.current ? "is-current" : ""}><i /><div><strong>{shipmentEvent.description}</strong><span>{shipmentEvent.date} · {shipmentEvent.time} · {shipmentEvent.location}</span></div></li>)}</ol>
          </> : <div className="awaiting-detail"><span className="pulse-dot" /><p>Select a completed row to see its most recent DHL event and delivery details.</p></div>}
        </aside>
      </section>

      <section className="integration-strip"><p><span className="pulse-dot" /> RATE-SAFE BATCHING</p><span>One paste, one batch, up to 100 codes</span><span className="strip-divider" /><span>DHL’s entry key is paced at one request every five seconds</span></section>
    </main>
  );
}
