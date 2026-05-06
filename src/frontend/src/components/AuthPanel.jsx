import { Badge, Card } from "./ui";
import { useState } from "react";

export default function AuthPanel({ sessionMessage, onLogin, loading, isAuthenticated }) {
  const [email, setEmail] = useState("student@unihub.local");
  const [password, setPassword] = useState("UniHub@123");

  async function handleSubmit(event) {
    event.preventDefault();
    await onLogin(email, password);
  }

  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-blue-950">Authentication and RBAC</h2>
          <p className="text-sm text-blue-800">Login with email/password. Role is resolved from backend RBAC claims.</p>
          <p className="mt-1 text-sm font-medium text-indigo-800">{sessionMessage}</p>
        </div>
        <div className="flex gap-2">
          <Badge tone={isAuthenticated ? "green" : "red"}>{isAuthenticated ? "JWT Active" : "JWT Missing"}</Badge>
          <Badge tone="blue">Refresh Token Stored</Badge>
          <Badge tone="yellow">Audit Logging Enabled</Badge>
        </div>
      </div>
      {!isAuthenticated ? (
        <form onSubmit={handleSubmit} className="mt-4 grid gap-2 md:grid-cols-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="rounded-lg border border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="rounded-lg border border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:bg-blue-400"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      ) : null}
    </Card>
  );
}
