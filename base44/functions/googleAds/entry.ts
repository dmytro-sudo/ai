import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, workspace_id, ...params } = body;
    const googleApiKey = Deno.env.get('Google_API');

    if (!googleApiKey) {
      return Response.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    // For now, return mock data structure that matches the Meta Ads format
    // In production, you would call the actual Google Ads API here
    
    if (action === 'getCampaigns') {
      // Mock Google Ads campaigns
      return Response.json({
        campaigns: [
          {
            id: 'gads_camp_1',
            name: 'Search Campaign - Services',
            status: 'active',
            daily_budget: 5000, // in cents
            created_time: new Date().toISOString(),
          },
          {
            id: 'gads_camp_2',
            name: 'Display Network - Brand',
            status: 'paused',
            daily_budget: 3000,
            created_time: new Date().toISOString(),
          },
        ]
      });
    }

    if (action === 'getAccountInsights') {
      // Mock account-level insights
      const datePreset = params.datePreset || 'last_30d';
      return Response.json({
        insights: {
          spend: '2450.75',
          clicks: 3420,
          impressions: 145200,
          ctr: '2.35',
          cpc: '0.72',
          conversions: 128,
          conversion_rate: '3.74',
          actions: [
            { action_type: 'onsite_conversion.lead', value: 128 }
          ],
          frequency: '1.8'
        }
      });
    }

    if (action === 'getDailyInsights') {
      // Mock daily insights for charting
      const days = 30;
      const insights = [];
      const now = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        insights.push({
          date_start: dateStr,
          spend: (Math.random() * 150 + 50).toFixed(2),
          clicks: Math.floor(Math.random() * 200 + 50),
          impressions: Math.floor(Math.random() * 8000 + 2000),
          ctr: (Math.random() * 3 + 1).toFixed(2),
          actions: [
            { action_type: 'onsite_conversion.lead', value: Math.floor(Math.random() * 10 + 3) }
          ]
        });
      }
      
      return Response.json({ insights });
    }

    if (action === 'getAgeBreakdown') {
      return Response.json({
        insights: [
          { age: '18-24', impressions: '12400', clicks: '285', ctr: '2.30', cpc: '0.68', spend: '193.80', actions: [{ action_type: 'onsite_conversion.lead', value: 8 }] },
          { age: '25-34', impressions: '42100', clicks: '1205', ctr: '2.86', cpc: '0.71', spend: '855.55', actions: [{ action_type: 'onsite_conversion.lead', value: 35 }] },
          { age: '35-44', impressions: '52300', clicks: '1450', ctr: '2.77', cpc: '0.74', spend: '1073.00', actions: [{ action_type: 'onsite_conversion.lead', value: 42 }] },
          { age: '45-54', impressions: '28400', clicks: '385', ctr: '1.36', cpc: '0.69', spend: '265.65', actions: [{ action_type: 'onsite_conversion.lead', value: 12 }] },
          { age: '55-64', impressions: '10000', clicks: '95', ctr: '0.95', cpc: '0.75', spend: '71.25', actions: [{ action_type: 'onsite_conversion.lead', value: 3 }] },
        ]
      });
    }

    if (action === 'getGenderBreakdown') {
      return Response.json({
        insights: [
          { gender: 'male', impressions: '78400', clicks: '2150', ctr: '2.74', cpc: '0.71', spend: '1526.50', actions: [{ action_type: 'onsite_conversion.lead', value: 58 }] },
          { gender: 'female', impressions: '66800', clicks: '1270', ctr: '1.90', cpc: '0.73', spend: '927.10', actions: [{ action_type: 'onsite_conversion.lead', value: 41 }] },
        ]
      });
    }

    if (action === 'getPlacementBreakdown') {
      return Response.json({
        insights: [
          { publisher_platform: 'Google Search', impressions: '89200', clicks: '2650', ctr: '2.97', cpc: '0.70', spend: '1855.00', actions: [{ action_type: 'onsite_conversion.lead', value: 72 }] },
          { publisher_platform: 'Google Display Network', impressions: '42000', clicks: '580', ctr: '1.38', cpc: '0.78', spend: '452.40', actions: [{ action_type: 'onsite_conversion.lead', value: 18 }] },
          { publisher_platform: 'YouTube', impressions: '14000', clicks: '190', ctr: '1.36', cpc: '0.68', spend: '129.20', actions: [{ action_type: 'onsite_conversion.lead', value: 9 }] },
        ]
      });
    }

    if (action === 'getInsights') {
      // For campaign-specific insights
      return Response.json({
        insights: [
          {
            campaign_id: 'gads_camp_1',
            spend: '1640.50',
            clicks: 2280,
            impressions: 98400,
            ctr: '2.32',
            conversions: 89,
            actions: [{ action_type: 'onsite_conversion.lead', value: 89 }]
          },
          {
            campaign_id: 'gads_camp_2',
            spend: '810.25',
            clicks: 1140,
            impressions: 46800,
            ctr: '2.44',
            conversions: 39,
            actions: [{ action_type: 'onsite_conversion.lead', value: 39 }]
          }
        ]
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});