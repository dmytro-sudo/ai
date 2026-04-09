import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const GHL_BASE = "https://services.leadconnectorhq.com";
const API_KEY = Deno.env.get("GHL_API_KEY");

const headers = {
  "Authorization": `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
  "Version": "2021-07-28",
};

async function ghlFetch(path, options = {}) {
  const res = await fetch(`${GHL_BASE}${path}`, { headers, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `GHL API error: ${res.status}`);
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, locationId: bodyLocationId, limit = 20, query, contactId, pipelineId } = body;

    // Auto-resolve locationId from WorkspaceIntegration if not provided
    let locationId = bodyLocationId;
    if (!locationId && action !== "getLocations") {
      const integrations = await base44.asServiceRole.entities.WorkspaceIntegration.filter({ type: "ghl", status: "active" });
      const firstGhl = integrations?.[0];
      if (firstGhl) locationId = firstGhl.account_id || firstGhl.extra_field_1;
    }

    // Verify location access
    if (action === "getLocations") {
      // With location-level API key, just validate the locationId
      if (!locationId) return Response.json({ error: "locationId required" }, { status: 400 });
      const data = await ghlFetch(`/locations/${locationId}`);
      return Response.json({ locations: [data.location || data] });
    }

    if (!locationId) {
      return Response.json({ error: "locationId is required" }, { status: 400 });
    }

    if (action === "getContacts") {
      const qs = new URLSearchParams({ locationId, limit });
      if (query) qs.set("query", query);
      const data = await ghlFetch(`/contacts/?${qs}`);
      return Response.json({ contacts: data.contacts || [], total: data.total || 0 });
    }

    if (action === "getContact") {
      const data = await ghlFetch(`/contacts/${contactId}`);
      return Response.json({ contact: data.contact });
    }

    if (action === "getPipelines") {
      const data = await ghlFetch(`/opportunities/pipelines?locationId=${locationId}`);
      return Response.json({ pipelines: data.pipelines || [] });
    }

    if (action === "getOpportunities") {
      const qs = new URLSearchParams({ location_id: locationId, limit });
      if (pipelineId) qs.set("pipeline_id", pipelineId);
      const data = await ghlFetch(`/opportunities/search?${qs}`);
      return Response.json({ opportunities: data.opportunities || [], total: data.total || 0 });
    }

    if (action === "getConversations") {
      const qs = new URLSearchParams({ locationId, limit });
      const data = await ghlFetch(`/conversations/search?${qs}`);
      return Response.json({ conversations: data.conversations || [], total: data.total || 0 });
    }

    if (action === "getStats") {
      // Parallel fetch contacts + opportunities
      const [contactsData, oppsData] = await Promise.all([
        ghlFetch(`/contacts/?locationId=${locationId}&limit=1`),
        ghlFetch(`/opportunities/search?location_id=${locationId}&limit=100`),
      ]);

      const opps = oppsData.opportunities || [];
      const totalValue = opps.reduce((s, o) => s + (o.monetaryValue || 0), 0);
      const wonOpps = opps.filter(o => o.status === "won");
      const lostOpps = opps.filter(o => o.status === "lost");
      const openOpps = opps.filter(o => o.status === "open");

      return Response.json({
        stats: {
          totalContacts: contactsData.total || 0,
          totalOpportunities: opps.length,
          pipelineValue: totalValue,
          wonDeals: wonOpps.length,
          lostDeals: lostOpps.length,
          openDeals: openOpps.length,
          wonValue: wonOpps.reduce((s, o) => s + (o.monetaryValue || 0), 0),
          conversionRate: opps.length > 0 ? ((wonOpps.length / opps.length) * 100).toFixed(1) : 0,
        }
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});