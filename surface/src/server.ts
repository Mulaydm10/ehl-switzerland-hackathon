import { createServer as createHttpServer, type Server } from "node:http";
import type { State } from "@ehl/core";
import { readFile } from "node:fs/promises";
import { handle } from "./handler.js";
import { handleDemo, type DemoDeps } from "./demo.js";
import type { ServerDeps } from "./types.js";

const UI = new URL("../public/index.html", import.meta.url);

function readBody(stream: AsyncIterable<Buffer>): Promise<string> {
  return (async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8");
  })();
}

/** Thin transport over `handle`. All decisions live there so tests need no socket. */
export function createServer(deps: ServerDeps, demo?: DemoDeps, origin = "http://localhost"): Server {
  return createHttpServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", origin);
      const headers: Record<string, string> = {};
      for (const [name, value] of Object.entries(request.headers)) {
        if (typeof value === "string") headers[name.toLowerCase()] = value;
      }
      if (demo && (url.pathname === "/" || url.pathname === "/index.html")) {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(await readFile(UI, "utf8"));
        return;
      }

      const demoReply = demo
        ? await handleDemo({ method: request.method ?? "GET", path: url.pathname, query: url.searchParams }, deps, demo)
        : undefined;
      const reply = demoReply ?? await handle(
        {
          method: request.method ?? "GET",
          path: url.pathname,
          url: url.toString(),
          headers,
          body: await readBody(request),
        },
        deps,
      );
      response.writeHead(reply.status, {
        "content-type": "application/json",
        ...reply.headers,
        // Without this the browser hides the header the evidence lives in.
        "access-control-expose-headers": "PAYMENT-RESPONSE",
      });
      response.end(JSON.stringify(reply.body));
    })().catch(() => {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "surface failed" }));
    });
  });
}

/** The mutable holder `core/` deliberately does not provide. */
export function memoryStore(initial: State): ServerDeps["store"] {
  let state = initial;
  return { read: () => state, write: (next) => { state = next; } };
}
