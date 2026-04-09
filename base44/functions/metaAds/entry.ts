import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
const AD_ACCOUNT_ID = Deno.env.get("META_AD_ACCOUNT_ID");
const BASE_URL = "https://graph.facebook.com/v19.0";

async function metaFetch(path, params = {}) {
  if (!ACCESS_TOKEN) throw new Error("META_ACCESS_TOKEN not configured");
  if (!AD_ACCOUNT_ID) throw new Error("META_AD_ACCOUNT_ID not configured");
  
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("access_token", ACCESS_TOKEN);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) {
    console.error("Meta API error:", data.error);
    // Check if token is expired (error code 190, subcode 463)
    if (data.error.code === 190 && data.error.error_subcode === 463) {
      const err = new Error("META_ACCESS_TOKEN expired. Please refresh credentials.");
      err.status = 401;
      throw err;
    }
    throw new Error(data.error.message);
  }
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, datePreset = "last_30d", campaignId, since, until, workspace_id } = body;
    
    // Try to get workspace-specific credentials first, fallback to env vars
    let accessToken = ACCESS_TOKEN;
    let accountId = AD_ACCOUNT_ID;
    
    if (workspace_id) {
      try {
        const integrations = await base44.asServiceRole.entities.WorkspaceIntegration.filter(
          { workspace_id, type: "meta_api" },
          "-created_date",
          1
        );
        if (integrations.length > 0) {
          const integ = integrations[0];
          accessToken = integ.api_key;
          accountId = integ.account_id;
        }
      } catch (e) {
        // Fall back to env vars if fetch fails
      }
    }

    // Build time params: custom range takes priority over preset
    const timeParams = since && until
      ? { time_range: JSON.stringify({ since, until }) }
      : { date_preset: datePreset };

    if (!accessToken || !accountId) {
      return Response.json({ error: "Meta API credentials not configured for this workspace" }, { status: 400 });
    }

    const acctId = accountId?.startsWith("act_") ? accountId : `act_${accountId}`;

    if (action === "getCampaigns") {
      const fields = "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time";
      const data = await metaFetch(`/${acctId}/campaigns`, {
        fields,
        limit: 100,
      });
      return Response.json({ campaigns: data.data || [] });
    }

    if (action === "getInsights") {
      const fields = "campaign_name,campaign_id,impressions,clicks,spend,reach,ctr,cpc,cpp,actions,action_values,frequency";
      const data = await metaFetch(`/${acctId}/insights`, {
        fields,
        ...timeParams,
        level: "campaign",
        limit: 50,
      });
      return Response.json({ insights: data.data || [] });
    }

    if (action === "getAccountInsights") {
      const fields = "impressions,clicks,spend,reach,ctr,cpc,frequency,actions,action_values";
      const data = await metaFetch(`/${acctId}/insights`, {
        fields,
        ...timeParams,
      });
      return Response.json({ insights: data.data?.[0] || {} });
    }

    if (action === "getDailyInsights") {
      const fields = "date_start,date_stop,impressions,clicks,spend,reach,actions,action_values";
      const data = await metaFetch(`/${acctId}/insights`, {
        fields,
        ...timeParams,
        time_increment: 1,
        limit: 100,
      });
      return Response.json({ insights: data.data || [] });
    }

    if (action === "getCampaignInsights" && campaignId) {
      const fields = "impressions,clicks,spend,reach,ctr,cpc,actions,action_values,date_start,date_stop";
      const data = await metaFetch(`/${campaignId}/insights`, {
        fields,
        ...timeParams,
        time_increment: 1,
        limit: 100,
      });
      return Response.json({ insights: data.data || [] });
    }

    if (action === "getAgeBreakdown") {
      const fields = "impressions,clicks,spend,reach,ctr,cpc,actions";
      const data = await metaFetch(`/${acctId}/insights`, {
        fields,
        ...timeParams,
        breakdowns: "age",
        limit: 50,
      });
      return Response.json({ insights: data.data || [] });
    }

    if (action === "getGenderBreakdown") {
      const fields = "impressions,clicks,spend,ctr,actions";
      const data = await metaFetch(`/${acctId}/insights`, {
        fields,
        ...timeParams,
        breakdowns: "gender",
        limit: 10,
      });
      return Response.json({ insights: data.data || [] });
    }

    if (action === "getPlacementBreakdown") {
      const fields = "impressions,clicks,spend,ctr,actions";
      const data = await metaFetch(`/${acctId}/insights`, {
        fields,
        ...timeParams,
        breakdowns: "publisher_platform",
        limit: 20,
      });
      return Response.json({ insights: data.data || [] });
    }

    if (action === "getCampaignAdSets" && campaignId) {
      const fields = "id,name,status,daily_budget,targeting,campaign_id";
      const data = await metaFetch(`/${acctId}/adsets`, { fields, filtering: JSON.stringify([{field:"campaign_id",operator:"EQUAL",value:campaignId}]), limit: 50 });
      return Response.json({ adsets: data.data || [] });
    }

    if (action === "getCampaignAgeBreakdown" && campaignId) {
      const fields = "impressions,clicks,spend,reach,ctr,cpc,actions";
      const data = await metaFetch(`/${campaignId}/insights`, { fields, ...timeParams, breakdowns: "age", limit: 20 });
      return Response.json({ insights: data.data || [] });
    }

    if (action === "getCampaignGenderBreakdown" && campaignId) {
      const fields = "impressions,clicks,spend,ctr,actions";
      const data = await metaFetch(`/${campaignId}/insights`, { fields, ...timeParams, breakdowns: "gender", limit: 10 });
      return Response.json({ insights: data.data || [] });
    }

    if (action === "updateCampaignBudget" && campaignId) {
      const { dailyBudget } = body;
      const url = new URL(`${BASE_URL}/${campaignId}`);
      url.searchParams.set("access_token", ACCESS_TOKEN);
      url.searchParams.set("daily_budget", String(dailyBudget));
      const res = await fetch(url.toString(), { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return Response.json({ success: true, id: data.id });
    }

    if (action === "getAdSets") {
      const fields = "id,name,status,daily_budget,targeting,campaign_id";
      const data = await metaFetch(`/${acctId}/adsets`, { fields, limit: 50 });
      return Response.json({ adsets: data.data || [] });
    }

    if (action === "getAds") {
      const fields = "id,name,status,creative,campaign_id,adset_id";
      const data = await metaFetch(`/${acctId}/ads`, { fields, limit: 50 });
      return Response.json({ ads: data.data || [] });
    }

    if (action === "getTodayInsights") {
      const fields = "impressions,clicks,spend,reach,actions,action_values";
      const data = await metaFetch(`/${acctId}/insights`, {
        fields,
        date_preset: "today",
      });
      return Response.json({ insights: data.data?.[0] || {} });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    const status = error.status || 500;
    return Response.json({ error: error.message }, { status });
  }
});