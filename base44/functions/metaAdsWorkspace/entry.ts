import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { workspaceId, action, datePreset = "last_30d", since, until } = body;

    if (!workspaceId) {
      return Response.json({ error: "workspaceId required" }, { status: 400 });
    }

    // Verify workspace access
    const workspace = await base44.entities.Workspace.get(workspaceId);
    if (!workspace) {
      return Response.json({ error: "Workspace not found" }, { status: 404 });
    }

    const isOwner = workspace.owner_email === user.email;
    if (!isOwner) {
      const assignment = await base44.entities.WorkspaceUser.filter(
        { workspace_id: workspaceId, user_email: user.email }
      );
      if (!assignment || assignment.length === 0) {
        return Response.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Get workspace's Meta Ads integration
    const integration = await base44.entities.WorkspaceIntegration.filter(
      { workspace_id: workspaceId, type: "meta_ads", status: "active" }
    );

    if (!integration || integration.length === 0) {
      return Response.json({ error: "Meta Ads not configured for this workspace" }, { status: 400 });
    }

    const meta = integration[0];
    const accessToken = meta.api_key;
    const accountId = meta.account_id?.startsWith("act_") ? meta.account_id : `act_${meta.account_id}`;
    const BASE_URL = "https://graph.facebook.com/v19.0";

    async function metaFetch(path, params = {}) {
      const url = new URL(`${BASE_URL}${path}`);
      url.searchParams.set("access_token", accessToken);
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data;
    }

    const timeParams = since && until
      ? { time_range: JSON.stringify({ since, until }) }
      : { date_preset: datePreset };

    // Handle different actions
    if (action === "getCampaigns") {
      const fields = "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time";
      const data = await metaFetch(`/${accountId}/campaigns`, { fields, limit: 100 });
      return Response.json({ campaigns: data.data || [] });
    }

    if (action === "getAccountInsights") {
      const fields = "impressions,clicks,spend,reach,ctr,cpc,frequency,actions,action_values";
      const data = await metaFetch(`/${accountId}/insights`, { fields, ...timeParams });
      return Response.json({ insights: data.data?.[0] || {} });
    }

    if (action === "getDailyInsights") {
      const fields = "date_start,date_stop,impressions,clicks,spend,reach,actions,action_values";
      const data = await metaFetch(`/${accountId}/insights`, {
        fields,
        ...timeParams,
        time_increment: 1,
        limit: 100,
      });
      return Response.json({ insights: data.data || [] });
    }

    if (action === "getInsights") {
      const fields = "campaign_name,campaign_id,impressions,clicks,spend,reach,ctr,cpc,cpp,actions,action_values,frequency";
      const data = await metaFetch(`/${accountId}/insights`, {
        fields,
        ...timeParams,
        level: "campaign",
        limit: 50,
      });
      return Response.json({ insights: data.data || [] });
    }

    if (action === "getAgeBreakdown") {
      const fields = "impressions,clicks,spend,reach,ctr,cpc,actions";
      const data = await metaFetch(`/${accountId}/insights`, {
        fields,
        ...timeParams,
        breakdowns: "age",
        limit: 50,
      });
      return Response.json({ insights: data.data || [] });
    }

    if (action === "getGenderBreakdown") {
      const fields = "impressions,clicks,spend,ctr,actions";
      const data = await metaFetch(`/${accountId}/insights`, {
        fields,
        ...timeParams,
        breakdowns: "gender",
        limit: 10,
      });
      return Response.json({ insights: data.data || [] });
    }

    if (action === "getPlacementBreakdown") {
      const fields = "impressions,clicks,spend,ctr,actions";
      const data = await metaFetch(`/${accountId}/insights`, {
        fields,
        ...timeParams,
        breakdowns: "publisher_platform",
        limit: 20,
      });
      return Response.json({ insights: data.data || [] });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    console.error("metaAdsWorkspace error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});