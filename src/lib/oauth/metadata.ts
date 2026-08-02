import { publicBaseUrl } from "@/lib/env";
import { MCP_SCOPES } from "./types";

export function authorizationServerMetadata(req: Request) {
  const base = publicBaseUrl(req);
  return {
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
    scopes_supported: [...MCP_SCOPES],
    client_id_metadata_document_supported: true,
  };
}

export function authServerIssuer(req: Request): string {
  return publicBaseUrl(req);
}
