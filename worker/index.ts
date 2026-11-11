import handler from "vinext/server/fetch-handler";
import { checkAccess } from "../lib/access";
import { removeTestSpins } from "../lib/site-cleanup";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  async fetch(
    request: Request,
    env: Cloudflare.Env,
    ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>,
  ) {
    if (
      env.DB &&
      env.ACCESS_MODE === "sites" &&
      request.method === "POST" &&
      new URL(request.url).pathname === "/api/internal/remove-test-spins"
    ) {
      return removeTestSpins(request, env.DB);
    }
    if (!import.meta.env.DEV) {
      const denied = await checkAccess(request, env);
      if (denied) return denied;
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt)
            return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return {
              status: "request_context_expired",
              message: "This request has expired. Please try again.",
            };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const handled = await runWithConnectorBinding(binding, () =>
      handler.fetch(request, env, ctx),
    );
    const response = new Response(handled.body, handled);
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "same-origin");
    if (
      new URL(request.url).pathname.startsWith("/api/") &&
      !response.headers.has("Cache-Control")
    )
      response.headers.set("Cache-Control", "no-store");
    return response;
  },
};

export default worker;
