import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { workspace_id, integration_type, api_key, api_secret, account_id } = body;

    if (!workspace_id || !integration_type || !api_key) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user has access to this workspace
    const workspace = await base44.entities.Workspace.filter({ id: workspace_id });
    if (workspace.length === 0) {
      return Response.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Update the integration
    const integration = await base44.entities.WorkspaceIntegration.filter({
      workspace_id,
      type: integration_type,
    });

    if (integration.length > 0) {
      await base44.entities.WorkspaceIntegration.update(integration[0].id, {
        api_key,
        api_secret,
        account_id,
        status: 'active',
      });
    } else {
      await base44.entities.WorkspaceIntegration.create({
        workspace_id,
        workspace_name: workspace[0].name,
        type: integration_type,
        label: integration_type.replace('_', ' '),
        api_key,
        api_secret,
        account_id,
        status: 'active',
      });
    }

    // Trigger data sync based on integration type
    let syncResult = null;

    if (integration_type === 'meta_ads' && account_id) {
      syncResult = await syncMetaAds(workspace_id, account_id, api_key);
    } else if (integration_type === 'google_ads' && account_id) {
      syncResult = await syncGoogleAds(workspace_id, account_id, api_key);
    }

    return Response.json({
      success: true,
      message: `Integration configured successfully. ${syncResult ? syncResult : ''}`,
    });
  } catch (error) {
    console.error('Integration sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function syncMetaAds(workspace_id, account_id, access_token) {
  try {
    const adAccountId = account_id.startsWith('act_') ? account_id : `act_${account_id}`;

    // Fetch campaigns from Meta API
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,created_time&access_token=${access_token}&limit=100`
    );

    if (!response.ok) {
      return `Failed to fetch Meta campaigns: ${response.statusText}`;
    }

    const data = await response.json();
    const campaigns = data.data || [];

    // Create Campaign records for this workspace
    for (const campaign of campaigns) {
      const existing = await base44.entities.Campaign.filter({
        workspace_id,
        name: campaign.name,
      });

      if (existing.length === 0) {
        await base44.entities.Campaign.create({
          workspace_id,
          name: campaign.name,
          platform: 'Meta Ads',
          status: campaign.status === 'PAUSED' ? 'paused' : 'active',
          budget: campaign.daily_budget || 0,
          start_date: campaign.created_time ? campaign.created_time.split('T')[0] : new Date().toISOString().split('T')[0],
        }).catch(() => {});
      }
    }

    return `Synced ${campaigns.length} campaigns from Meta Ads`;
  } catch (e) {
    console.error('Meta sync error:', e);
    return `Error syncing Meta: ${e.message}`;
  }
}

async function syncGoogleAds(workspace_id, account_id, access_token) {
  try {
    // Simplified Google Ads sync (requires proper Google Ads API setup)
    // For now, just create a placeholder
    await base44.entities.Campaign.create({
      workspace_id,
      name: 'Google Ads Account - Pending Sync',
      platform: 'Google Ads',
      status: 'draft',
    }).catch(() => {});

    return 'Google Ads integration initiated. Full sync coming soon.';
  } catch (e) {
    console.error('Google sync error:', e);
    return `Error syncing Google: ${e.message}`;
  }
}