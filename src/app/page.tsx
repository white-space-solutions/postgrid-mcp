export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 32,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        background:
          "radial-gradient(900px 500px at 20% 0%, #d9ebe0, transparent), #f3f6f4",
        color: "#17201b",
      }}
    >
      <div style={{ maxWidth: 560 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "1.75rem" }}>
          PostGrid MCP
        </h1>
        <p style={{ margin: "0 0 20px", color: "#516057", lineHeight: 1.5 }}>
          Self-hostable, read-only MCP for PostGrid Print &amp; Mail. Connect
          from Claude Cowork as a custom remote connector.
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>
            MCP endpoint: <code>/api/mcp</code>
          </li>
          <li>
            OAuth metadata: <code>/.well-known/oauth-authorization-server</code>
          </li>
          <li>
            Protected resource:{" "}
            <code>/.well-known/oauth-protected-resource</code>
          </li>
        </ul>
        <p style={{ marginTop: 20, color: "#516057" }}>
          See the repository README for deploy and Cowork connect steps.
        </p>
      </div>
    </main>
  );
}
