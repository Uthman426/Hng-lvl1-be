export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin":
        process.env.WEB_URL || "http://localhost:3001",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
