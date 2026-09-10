/**
 * stdio entrypoint: `node --import tsx surface/scripts/mcp.ts`.
 *
 * stdio, not HTTP, because the host launches this as a subprocess and the
 * grant tree then lives and dies with that host session — there is no shared
 * server on which one agent's revocation could silently reshape another's
 * authority.
 *
 * stdout belongs to the protocol. Anything this process wants to say goes to
 * stderr, or it corrupts the JSON-RPC stream.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { emptyState } from "@ehl/core";
import { createMcpServer, stateStore } from "../src/mcp.js";

const server = createMcpServer({
  store: stateStore(emptyState),
  now: () => Math.floor(Date.now() / 1000),
  fetcher: (url) => fetch(url),
});

await server.connect(new StdioServerTransport());
