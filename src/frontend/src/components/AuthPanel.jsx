import { Badge, Card, Spinner } from "./ui";
import { useState } from "react";
import { AtSign, IdCard, Lock, LogIn, UserPlus, UserRound } from "lucide-react";

export default function AuthPanel({ sessionMessage, onLogin, onRegister, loading, isAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("New Student");
  const [studentCode, setStudentCode] = useState("");
  const [email, setEmail] = useState("huy.thai@student.edu.vn");
  const [password, setPassword] = useState("password123");
  const [errors, setErrors] = useState({});

  function validateForm() {
    const nextErrors = {};
    const trimmedEmail = email.trim();
    const trimmedFullName = fullName.trim();
    const trimmedStudentCode = studentCode.trim();
    const passwordValue = password || "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) nextErrors.email = "Email is required.";
    else if (!emailRegex.test(trimmedEmail)) nextErrors.email = "Please enter a valid email format.";

    if (!passwordValue) nextErrors.password = "Password is required.";
    else if (passwordValue.length < 6) nextErrors.password = "Password must be at least 6 characters.";

    if (mode === "register") {
      if (!trimmedFullName) nextErrors.fullName = "Full name is required.";
      else if (trimmedFullName.length < 2) nextErrors.fullName = "Full name must be at least 2 characters.";

      if (trimmedStudentCode && !/^[a-zA-Z0-9_-]{2,50}$/.test(trimmedStudentCode)) {
        nextErrors.studentCode = "Student code can only contain letters, numbers, _ and - (2-50 chars).";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;
    if (mode === "register") {
      await onRegister({
        fullName: fullName.trim(),
        studentCode: studentCode.trim(),
        email: email.trim(),
        password
      });
      return;
    }
    await onLogin(email.trim(), password);
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
        <form
          noValidate
          onSubmit={handleSubmit}
          className="mx-auto mt-4 flex w-full max-w-md flex-col gap-3 motion-safe:animate-fade-in"
        >
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrors({});
              }}
              className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 ${mode === "login" ? "bg-blue-900 text-white shadow-sm shadow-blue-200/70" : "border border-blue-300 text-blue-900 hover:bg-blue-50"}`}
            >
              <span className="inline-flex items-center gap-1">
                <LogIn size={14} />
                Login
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrors({});
              }}
              className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 ${mode === "register" ? "bg-blue-900 text-white shadow-sm shadow-blue-200/70" : "border border-blue-300 text-blue-900 hover:bg-blue-50"}`}
            >
              <span className="inline-flex items-center gap-1">
                <UserPlus size={14} />
                Register
              </span>
            </button>
          </div>
          {mode === "register" ? (
            <>
              <div className="relative">
                <UserRound size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: "" }));
                  }}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-blue-200 px-9 py-2 text-sm transition focus:-translate-y-0.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              {errors.fullName ? <p className="text-xs text-red-600">{errors.fullName}</p> : null}
              <div className="relative">
                <IdCard size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                <input
                  type="text"
                  value={studentCode}
                  onChange={(event) => {
                    setStudentCode(event.target.value);
                    if (errors.studentCode) setErrors((prev) => ({ ...prev, studentCode: "" }));
                  }}
                  placeholder="Student code (optional)"
                  className="w-full rounded-lg border border-blue-200 px-9 py-2 text-sm transition focus:-translate-y-0.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              {errors.studentCode ? <p className="text-xs text-red-600">{errors.studentCode}</p> : null}
            </>
          ) : null}
          <div className="relative">
            <AtSign size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
              }}
              placeholder="Email"
              className="w-full rounded-lg border border-blue-200 px-9 py-2 text-sm transition focus:-translate-y-0.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
          <div className="relative">
            <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
              }}
              placeholder="Password"
              className="w-full rounded-lg border border-blue-200 px-9 py-2 text-sm transition focus:-translate-y-0.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          {errors.password ? <p className="text-xs text-red-600">{errors.password}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-800 disabled:translate-y-0 disabled:bg-blue-400"
          >
            {loading ? (
              <>
                <Spinner />
                Submitting...
              </>
            ) : mode === "register" ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      ) : null}
    </Card>
  );
}
