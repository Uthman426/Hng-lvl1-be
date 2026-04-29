import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export function errorResponse(message, status) {
  return Response.json({ status: "error", message }, { status });
}

export function requireApiVersion(req) {
  if (req.headers.get("x-api-version") !== "1") {
    return errorResponse("API version header required", 400);
  }

  return null;
}

export async function requireAuth(req) {
  await connectDB();

  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) return { response: errorResponse("Unauthorized", 401) };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ id: decoded.id });

    if (!user) return { response: errorResponse("Unauthorized", 401) };

    if (!user.is_active) {
      return { response: errorResponse("Forbidden", 403) };
    }

    return { user };
  } catch {
    return { response: errorResponse("Invalid or expired token", 401) };
  }
}

export function requireRole(user, roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];

  if (!allowed.includes(user.role)) {
    return errorResponse("Forbidden", 403);
  }

  return null;
}
