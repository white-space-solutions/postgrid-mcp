export const MCP_SCOPES = ["postgrid:read"] as const;
export type McpScope = (typeof MCP_SCOPES)[number];

export const CLAUDE_CALLBACK =
  "https://claude.ai/api/mcp/auth_callback" as const;

export type AuthCodePayload = {
  typ: "code";
  sub: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: "S256";
  scope: string;
  iat: number;
  exp: number;
};

export type AccessTokenPayload = {
  typ: "access";
  sub: string;
  client_id: string;
  scope: string;
  aud: string;
  iat: number;
  exp: number;
};

export type RefreshTokenPayload = {
  typ: "refresh";
  sub: string;
  client_id: string;
  scope: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
};

export type ClientMetadata = {
  client_id: string;
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
};
