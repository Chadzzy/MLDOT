import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { flightQuery } from "../src/flight-data.js";
const run = promisify(execFile);
const script = fileURLToPath(
  new URL("../../backend/flight_lookup.py", import.meta.url),
);
// Development-only adapter. Production iPhone uses its fixed native HTTP adapter.
export function flightDevServer() {
  let lastRequest = 0,
    pending = false;
  return {
    name: "journey-flight-lookup",
    configureServer(server) {
      server.middlewares.use("/api/journey-flight", (req, res) => {
        const send = (status, body) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify(body));
        };
        if (req.method !== "POST")
          return send(405, { error: "Use a flight lookup POST." });
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
          if (body.length > 1024) req.destroy();
        });
        req.on("end", async () => {
          let query;
          try {
            const q = JSON.parse(body);
            query = flightQuery(q.flightNumber, q.travelDate);
          } catch {
            return send(400, {
              error: "Invalid flight number or departure date.",
            });
          }
          if (pending || Date.now() - lastRequest < 30000)
            return send(429, {
              error: "Wait 30 seconds between flight checks.",
            });
          pending = true;
          lastRequest = Date.now();
          try {
            const { stdout } = await run(
              "python3",
              [
                script,
                "--flight",
                query.flightNumber,
                "--date",
                query.travelDate,
              ],
              { timeout: 15000, maxBuffer: 1100000 },
            );
            send(200, JSON.parse(stdout));
          } catch (error) {
            let message = "Flight source unavailable. Try again later.";
            try {
              message = JSON.parse(error.stdout).error || message;
            } catch {
              /* no provider data to expose */
            }
            send(502, { error: message });
          } finally {
            pending = false;
          }
        });
      });
    },
  };
}
