export default {
  async fetch(request, env) {
    const allowedOrigin = "https://ikramyassin1209-jpg.github.io";
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": origin === allowedOrigin ? allowedOrigin : "null",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return Response.json({ ok: true, service: "Harmotiva API proxy" }, { headers: cors });
    }

    if (!env.MAGIC_HOUR_API_KEY) {
      return Response.json({ error: "La clé API du serveur n'est pas configurée." }, { status: 500, headers: cors });
    }

    if (origin !== allowedOrigin) {
      return Response.json({ error: "Origine non autorisée." }, { status: 403, headers: cors });
    }

    if (url.pathname === "/api/generate" && request.method === "POST") {
      let input;
      try { input = await request.json(); }
      catch { return Response.json({ error: "JSON invalide." }, { status: 400, headers: cors }); }

      const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
      const seconds = Number(input.seconds || 5);
      const ratio = input.aspect_ratio;
      const allowedRatios = ["9:16", "16:9", "1:1"];
      if (!prompt || prompt.length > 1800 || !Number.isInteger(seconds) || seconds < 1 || seconds > 15 || !allowedRatios.includes(ratio)) {
        return Response.json({ error: "Description, durée (1 à 15 secondes) ou format invalide." }, { status: 400, headers: cors });
      }

      const payload = {
        name: "Harmotiva AI Video",
        end_seconds: seconds,
        aspect_ratio: ratio,
        style: { prompt },
        model: "ltx-2.5",
        resolution: "480p",
        audio: true
      };

      const upstream = await fetch("https://api.magichour.ai/v1/text-to-video", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.MAGIC_HOUR_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await upstream.text();
      return new Response(data, {
        status: upstream.status,
        headers: { ...cors, "Content-Type": upstream.headers.get("Content-Type") || "application/json" }
      });
    }

    const statusMatch = url.pathname.match(/^\/api\/status\/([A-Za-z0-9_-]+)$/);
    if (statusMatch && request.method === "GET") {
      const upstream = await fetch("https://api.magichour.ai/v1/video-projects/" + encodeURIComponent(statusMatch[1]), {
        headers: { "Authorization": `Bearer ${env.MAGIC_HOUR_API_KEY}` }
      });
      const data = await upstream.text();
      return new Response(data, {
        status: upstream.status,
        headers: { ...cors, "Content-Type": upstream.headers.get("Content-Type") || "application/json" }
      });
    }

    return Response.json({ error: "Route inconnue." }, { status: 404, headers: cors });
  }
};