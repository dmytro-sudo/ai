import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let message = "";
    try {
      const body = await req.json();
      message = body.message || "";
    } catch {}

    if (!message) return Response.json({ error: "Message required" }, { status: 400 });

    const response = await fetch(
      "https://kandy-unwinsome-brittaney.ngrok-free.dev/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "ClipCar test1"
        },
        body: JSON.stringify({ message })
      }
    );

    const data = await response.json();
    return Response.json({ reply: data.reply || data.result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});