import { useEffect, useRef, useState } from "react";
import { useJourney } from "./context.js";
import { appendDecision } from "./journey-planner.js";
import {
  connectDecisions,
  inspectorURL,
  newRoom,
  validRoom,
} from "./decision-channel.js";
import { tracePacket, validTrace } from "./decision-trace.js";
import { time } from "./model.js";
import "./inspector.css";

export function useDecisionSharing(plan, lookup) {
  const [room, setRoom] = useState(null);
  const [status, setStatus] = useState("stopped");
  const history = useRef([]),
    latest = useRef(null),
    channel = useRef(null);
  history.current = appendDecision(history.current, plan);
  latest.current = tracePacket(plan, history.current, lookup);
  const decision = history.current.at(-1)?.key;
  useEffect(() => {
    channel.current?.send("snapshot", latest.current);
  }, [decision, lookup.result, lookup.error]);
  useEffect(() => {
    if (!room) {
      setStatus("stopped");
      return;
    }
    let active = true;
    const start = () => {
      if (channel.current || !active || document.hidden) return;
      channel.current = connectDecisions(room, {
        onStatus: setStatus,
        onReady: () => channel.current?.send("snapshot", latest.current),
        onMessage: (event) => {
          if (event === "request")
            channel.current?.send("snapshot", latest.current);
        },
      });
    };
    const stop = (event) => {
      channel.current?.send(event);
      channel.current?.close();
      channel.current = null;
      setStatus(event);
    };
    const visibility = () => {
      if (document.hidden || !active) stop("paused");
      else start();
    };
    const host = (event) => {
      active = event.detail === true;
      visibility();
    };
    const tick = setInterval(
      () => channel.current?.send("snapshot", latest.current),
      10000,
    );
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("journey-host-active", host);
    start();
    return () => {
      stop("stopped");
      clearInterval(tick);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("journey-host-active", host);
    };
  }, [room]);
  return {
    inspectorRoom: room,
    inspectorStatus: status,
    startInspector: () => {
      history.current = appendDecision([], latest.current.plan);
      setRoom(newRoom());
    },
    stopInspector: () => setRoom(null),
  };
}

export function InspectorControls() {
  const {
    plan,
    inspectorRoom: room,
    inspectorStatus: status,
    startInspector,
    stopInspector,
    toast,
  } = useJourney();
  const input = useRef(null);
  const link = room ? inspectorURL(room) : "";
  const copy = async () => {
    try {
      if (window.webkit?.messageHandlers?.journey)
        window.webkit.messageHandlers.journey.postMessage({
          type: "copyInspectorLink",
          room,
        });
      else await navigator.clipboard.writeText(link);
      toast("Inspector link copied");
    } catch {
      input.current?.focus();
      input.current?.select();
      toast("Select and copy the link below");
    }
  };
  return (
    <div className="inspector-controls">
      <h2>See why the journey changes</h2>
      <p className="intro">
        Open a read-only decision view on another screen while you move through
        the journey on this device.
      </p>
      <div className="context-note">
        <strong>{plan.action.title}</strong>
        <p>{plan.action.detail}</p>
      </div>
      <p className="subtle small">
        Shares this demonstration’s rules, timings and public flight
        observations. No passenger name, boarding code or request text is
        included. Anyone with the link can view the session. Updates pause when
        this app is in the background.
      </p>
      {!room ? (
        <button className="primary-button" onClick={startInspector}>
          Start decision inspector
        </button>
      ) : (
        <>
          <p role="status">
            {status === "connected"
              ? "Connected · updating the separate screen"
              : status === "paused"
                ? "Paused while inactive"
                : "Connecting to the inspector…"}
          </p>
          <label className="inspector-link">
            Open this link on your other screen
            <input
              ref={input}
              aria-label="Decision inspector link"
              value={link}
              readOnly
              onFocus={(e) => e.target.select()}
            />
          </label>
          <button className="primary-button" onClick={copy}>
            Copy inspector link
          </button>
          {!window.webkit?.messageHandlers?.journey && (
            <a
              className="secondary-button"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open separate screen
            </a>
          )}
          <button className="secondary-button" onClick={stopInspector}>
            Stop sharing decisions
          </button>
        </>
      )}
      <p className="subtle small">
        These are the application’s recorded facts and rule outcomes, not an
        AI’s private internal reasoning. This first planner uses deterministic
        rules; no prediction model is running.
      </p>
    </div>
  );
}

const reason = (code) => code.toLowerCase().replaceAll("_", " ");
export default function DecisionInspector() {
  const room = window.location.hash.split("/")[1];
  const [status, setStatus] = useState("connecting");
  const [packet, setPacket] = useState(null);
  const [received, setReceived] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!validRoom(room)) {
      setStatus("invalid");
      return;
    }
    const channel = connectDecisions(room, {
      onStatus: setStatus,
      onReady: () => channel.send("request"),
      onMessage: (event, data) => {
        if (event === "snapshot" && validTrace(data)) {
          setPacket(data);
          setReceived(Date.now());
          setStatus("connected");
        }
        if (["paused", "stopped"].includes(event)) setStatus(event);
      },
    });
    const leave = () => channel.close();
    window.addEventListener("pagehide", leave);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.removeEventListener("pagehide", leave);
      channel.close();
      clearInterval(tick);
    };
  }, [room]);
  const stale = received && now - received > 25000;
  const label =
    status === "invalid"
      ? "Invalid session link"
      : status === "stopped"
        ? "Sharing stopped"
        : status === "paused"
          ? "Phone inactive · updates paused"
          : stale
            ? "No recent update · showing last received decision"
            : status === "connected" && packet
              ? "Connected to the demonstration"
              : status === "connected"
                ? "Waiting for the phone’s first decision"
                : "Connecting · keep the phone session open";
  const p = packet?.plan;
  const o = packet?.observation;
  return (
    <main className="decision-inspector">
      <header>
        <div>
          <span className="inspector-eyebrow">
            DAY OF TRAVEL · OBSERVATION VIEW
          </span>
          <h1>Journey decision inspector</h1>
        </div>
        <span
          className={`inspector-status ${stale || status !== "connected" ? "muted" : ""}`}
          role="status"
        >
          {label}
        </span>
      </header>
      <p className="inspector-intro">
        The same rules that drive the passenger’s next action. This screen
        observes; journey controls stay on the phone.
      </p>
      {!p ? (
        <section>
          <h2>Ready when your journey is</h2>
          <p>
            Start the inspector from Journey simulation on your phone, then open
            the generated link here. No session is recorded by this view.
          </p>
        </section>
      ) : (
        <>
          <section className="inspector-recommendation">
            <span className="inspector-eyebrow">
              CURRENT RECOMMENDATION · SIMULATION
            </span>
            <h2>{p.action.title}</h2>
            <p>{p.action.detail}</p>
            <div className="inspector-facts">
              <span>
                Journey clock <b>{time(p.clock)} HKT</b>
              </span>
              <span>
                Flight state <b>{p.status}</b>
              </span>
              <span>
                Available activity time <b>{p.timing.availableMinutes} min</b>
              </span>
            </div>
            <small>
              {p.ruleVersion} · Received{" "}
              {new Date(received).toLocaleTimeString()}
            </small>
          </section>
          <div className="inspector-grid">
            <section>
              <h2>Evidence used</h2>
              {p.inputs.map((i, n) => (
                <div className="inspector-evidence" key={n}>
                  <small>{i.label}</small>
                  <strong>{i.value}</strong>
                  <p>{i.source}</p>
                </div>
              ))}
              <p className="inspector-footnote">
                Time budget reserves {p.timing.walkMinutes} min walking and{" "}
                {p.timing.bufferMinutes} min buffer. Both are demo planning
                allowances.
              </p>
            </section>
            <section>
              <h2>Rules applied</h2>
              <ul>
                {p.reasons.map((r) => (
                  <li key={r}>{reason(r)}</li>
                ))}
              </ul>
              <h2>Options evaluated</h2>
              {p.options.map((o) => (
                <div className="inspector-option" key={o.id}>
                  <strong>{o.title}</strong>
                  <span>
                    {o.eligible ? "Available to consider" : "Not recommended"}
                  </span>
                  <ul>
                    {o.reasons.map((r) => (
                      <li key={r}>{reason(r)}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          </div>
          <section>
            <h2>What changed</h2>
            <ol className="inspector-history">
              {[...packet.history].reverse().map((h, n) => (
                <li key={n}>
                  <time>{time(h.clock)} HKT</time>
                  <div>
                    <strong>{h.title}</strong>
                    {h.previous && <p>Previously: {h.previous}</p>}
                    <small>{h.reasons.map(reason).join(" · ")}</small>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section>
            <h2>Real flight observation · separate from this simulation</h2>
            {o ? (
              <>
                <p>
                  <strong>
                    {o.flight} · {o.status}
                  </strong>
                </p>
                <p>
                  Departure {o.departure} · Gate {o.gate}
                </p>
                <p>
                  {o.source} · Source updated {o.updatedAt}
                </p>
                <p>
                  {o.checkFailed
                    ? "Latest lookup failed; this is the previous observation."
                    : now - Date.parse(o.updatedAt) > 300000 ||
                        now - Date.parse(o.receivedAt) > 300000
                      ? "Observation is more than five minutes old."
                      : "Recent observation."}{" "}
                  It has not changed the demonstration itinerary.
                </p>
              </>
            ) : (
              <p>
                No real flight checked in this session. The recommendations
                above use the demonstration itinerary.
              </p>
            )}
          </section>
        </>
      )}
      <footer>
        Recorded inputs and rule outcomes · no AI chain of thought · no delay
        probability model connected. Keep this session link with your demo
        audience.
      </footer>
    </main>
  );
}
