import jwt from "jsonwebtoken";
import { config } from "./config.js";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, fullName: user.full_name },
    config.jwtSecret,
    { expiresIn: "8h" }
  );
}

export function signQrCode({ registrationId, workshopId, studentId }) {
  return jwt.sign(
    {
      type: "CHECKIN_QR",
      registrationId,
      workshopId,
      studentId
    },
    config.jwtSecret,
    { expiresIn: "14d" }
  );
}

export function verifyQrCode(qrCode) {
  return jwt.verify(qrCode, config.jwtSecret);
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden for this role" });
    }
    return next();
  };
}
