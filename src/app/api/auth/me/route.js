import { requireAuth } from "@/lib/guards";

export async function GET(req) {
  const { user, response } = await requireAuth(req);

  if (response) return response;

  return Response.json({
    status: "success",
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      role: user.role,
      is_active: user.is_active,
    },
  });
}
