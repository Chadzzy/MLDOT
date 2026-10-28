import project from "../../backend/project.json";

export const validRoom = (room) => /^[a-f0-9]{48}$/.test(room || "");
export function newRoom() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
export function inspectorURL(room) {
  if (!validRoom(room)) throw new Error("Invalid inspector session.");
  const native =
    new URLSearchParams(window.location.search).get("native") === "1";
  const base = native
    ? "https://htmlpreview.github.io/?https://raw.githubusercontent.com/Chadzzy/MLDOT/codex/iphone-journey/ios/JourneyApp/Resources/journey.html"
    : window.location.href.split("#")[0];
  return `${base}#inspector/${room}`;
}

// Supabase's documented Realtime v1 protocol. Public, unguessable demo rooms;
// no user tokens, booking details or free-text preferences are transmitted.
export function connectDecisions(
  room,
  { onStatus, onMessage, onReady },
  Socket = WebSocket,
) {
  if (!validRoom(room)) throw new Error("Invalid inspector session.");
  const topic = `realtime:journey-inspector-${room}`;
  let socket,
    closed = false,
    joined = false,
    retry,
    heartbeat,
    timeout;
  let attempt = 0,
    ref = 0,
    heartbeatRef = null;
  const send = (event, payload, channel = topic) => {
    if (socket?.readyState !== 1) return null;
    const id = String(++ref);
    socket.send(
      JSON.stringify({
        topic: channel,
        event,
        payload,
        ref: id,
        join_ref: channel === topic ? "1" : undefined,
      }),
    );
    return id;
  };
  const clear = () => {
    clearTimeout(timeout);
    clearInterval(heartbeat);
  };
  const connect = () => {
    if (closed) return;
    joined = false;
    ref = 0;
    heartbeatRef = null;
    onStatus("connecting");
    socket = new Socket(
      `${project.url.replace("https:", "wss:")}/realtime/v1/websocket?apikey=${encodeURIComponent(project.publishableKey)}&vsn=1.0.0`,
    );
    timeout = setTimeout(() => socket.close(1000, "Reconnect"), 12000);
    socket.onopen = () =>
      send("phx_join", {
        config: {
          broadcast: { ack: false, self: false },
          presence: { enabled: false },
          private: false,
        },
      });
    socket.onmessage = ({ data }) => {
      if (typeof data !== "string" || data.length > 65536) return;
      let message;
      try {
        message = JSON.parse(data);
      } catch {
        return;
      }
      if (
        message.event === "phx_reply" &&
        message.ref === "1" &&
        message.topic === topic
      ) {
        clearTimeout(timeout);
        if (message.payload?.status !== "ok") {
          onStatus("unavailable");
          socket.close(1000, "Reconnect");
          return;
        }
        joined = true;
        attempt = 0;
        onStatus("connected");
        heartbeat = setInterval(() => {
          if (heartbeatRef) {
            socket.close(1000, "Reconnect");
            return;
          }
          heartbeatRef = send("heartbeat", {}, "phoenix");
        }, 25000);
        onReady?.();
      } else if (
        message.event === "phx_reply" &&
        message.ref === heartbeatRef &&
        message.topic === "phoenix"
      ) {
        heartbeatRef = null;
      } else if (message.event === "broadcast" && message.topic === topic) {
        const event = message.payload?.event;
        if (["snapshot", "request", "paused", "stopped"].includes(event))
          onMessage(event, message.payload.payload);
      } else if (["phx_error", "phx_close"].includes(message.event))
        socket.close(1000, "Reconnect");
    };
    socket.onerror = () => {
      onStatus("reconnecting");
      socket.close(1000, "Reconnect");
    };
    socket.onclose = () => {
      joined = false;
      clear();
      if (closed) return;
      onStatus("reconnecting");
      retry = setTimeout(
        connect,
        Math.min(30000, 1000 * 2 ** Math.min(attempt++, 5)),
      );
    };
  };
  connect();
  return {
    send(event, payload = {}) {
      if (!joined || closed) return false;
      return Boolean(send("broadcast", { type: "broadcast", event, payload }));
    },
    close() {
      closed = true;
      clearTimeout(retry);
      clear();
      socket?.close(1000, "Session closed");
    },
  };
}
