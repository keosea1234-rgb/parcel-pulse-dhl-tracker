"use client";

import { FormEvent, useMemo, useState } from "react";

type TrackingEvent = {
  date: string;
  time: string;
  location: string;
  description: string;
  current?: boolean;
};

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

const initialResult: TrackingResult = {
  trackingNumber: "7777777770",
  status: "In transit",
  statusDetail: "Shipment is moving through the DHL network",
  service: "DHL Express Worldwide",
  origin: "Prague, Czech Republic",
  destination: "Amsterdam, Netherlands",
  estimatedDelivery: "Tomorrow, by end of day",
  source: "DHL demo API",
  events: [
    {
      date: "Today",
      time: "09:42",
      location: "Leipzig, Germany",
      description: "Processed at DHL facility",
      current: true,
    },
    {
      date: "Today",
      time: "04:18",
      location: "Leipzig, Germany",
      description: "Arrived at DHL sort facility",
    },
    {
      date: "Yesterday",
      time: "17:35",
      location: "Prague, Czech Republic",
      description: "Shipment picked up",
    },
  ],
};

export default function Home() {
  const [trackingNumber, setTrackingNumber] = useState(initialResult.trackingNumber);
  const [result, setResult] = useState<TrackingResult>(initialResult);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("Connected in DHL demo mode");

  const eventCount = useMemo(() => result.events.length, [result.events]);

  async function trackShipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const number = trackingNumber.trim();
    if (!number) {
      setNotice("Enter a tracking number to continue.");
      return;
    }

    setIsLoading(true);
    setNotice("Checking DHL tracking data…");

    try {
      const response = await fetch(`/api/track?trackingNumber=${encodeURIComponent(number)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to retrieve tracking data.");
      setResult(data.tracking);
      setNotice(data.message);
    } catch {
      setNotice("The DHL demo is unavailable right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <nav className="topbar" aria-label="Main navigation">
          <a className="brand" href="#top" aria-label="Parcel Pulse home">
            <span className="brand-mark">P</span>
            <span>PARCEL PULSE</span>
          </a>
          <span className="single-user">PRIVATE WORKSPACE</span>
        </nav>

        <div className="hero-copy" id="top">
          <p className="eyebrow"><span className="pulse-dot" /> DHL UNIFIED TRACKING</p>
          <h1>Every shipment,<br /><em>clear at a glance.</em></h1>
          <p className="hero-description">A focused DHL shipment status dashboard for the moments when your team needs a confident answer.</p>
        </div>

        <form className="tracker-form" onSubmit={trackShipment}>
          <label htmlFor="tracking-number">Tracking number</label>
          <div className="tracker-row">
            <input
              id="tracking-number"
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="e.g. 7777777770"
              autoComplete="off"
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Tracking…" : "Track shipment"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <p className="connection-note" role="status"><span>●</span>{notice}</p>
        </form>
      </section>

      <section className="content-grid" aria-live="polite">
        <article className="shipment-card">
          <div className="card-topline">
            <div>
              <p className="section-label">CURRENT STATUS</p>
              <h2>{result.status}</h2>
              <p className="status-detail">{result.statusDetail}</p>
            </div>
            <span className="status-badge"><span /> {result.status}</span>
          </div>

          <div className="shipment-meta">
            <div>
              <span>TRACKING NUMBER</span>
              <strong>{result.trackingNumber}</strong>
            </div>
            <div>
              <span>SERVICE</span>
              <strong>{result.service}</strong>
            </div>
            <div>
              <span>ESTIMATED DELIVERY</span>
              <strong>{result.estimatedDelivery}</strong>
            </div>
          </div>

          <div className="route-card">
            <div className="route-place">
              <span className="place-label">FROM</span>
              <strong>{result.origin}</strong>
            </div>
            <div className="route-line" aria-hidden="true"><i /><b>→</b><i /></div>
            <div className="route-place destination">
              <span className="place-label">TO</span>
              <strong>{result.destination}</strong>
            </div>
          </div>

          <footer className="data-note"><span>●</span> Data presented via {result.source}. “Delivered by Deutsche Post DHL Group”</footer>
        </article>

        <aside className="timeline-card">
          <div className="timeline-head">
            <div>
              <p className="section-label">MOVEMENT</p>
              <h2>Shipment journey</h2>
            </div>
            <span>{eventCount} events</span>
          </div>
          <ol className="timeline">
            {result.events.map((shipmentEvent, index) => (
              <li key={`${shipmentEvent.date}-${shipmentEvent.time}-${index}`} className={shipmentEvent.current ? "is-current" : ""}>
                <span className="timeline-marker" aria-hidden="true" />
                <div className="timeline-time"><strong>{shipmentEvent.date}</strong><span>{shipmentEvent.time}</span></div>
                <div className="timeline-event"><strong>{shipmentEvent.description}</strong><span>{shipmentEvent.location}</span></div>
              </li>
            ))}
          </ol>
        </aside>
      </section>

      <section className="integration-strip">
        <p><span className="pulse-dot" /> API READY</p>
        <span>Demo mode uses DHL’s Unified Tracking endpoint</span>
        <span className="strip-divider" />
        <span>Replace the demo key with your approved DHL key when ready</span>
      </section>
    </main>
  );
}
