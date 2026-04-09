import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const reqBody = await req.json().catch(() => ({}));
    const { reportTitle, reportSummary, campaigns, userEmail } = reqBody;

    if (!reportSummary || !campaigns) {
      return Response.json({ error: "reportSummary and campaigns required" }, { status: 400 });
    }

    // Calculate totals from real Meta API data
    const totalSpent = campaigns.reduce((s, c) => s + (c.spent || 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
    const totalLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0);
    const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
    const roas = totalSpent > 0 ? (totalRevenue / totalSpent).toFixed(2) : 0;
    const avgCpl = totalLeads > 0 ? (totalSpent / totalLeads).toFixed(2) : 0;

    // Build campaign table
    const campaignRows = campaigns.map(c => `
      <tr>
        <td>${c.name || 'N/A'}</td>
        <td>${c.platform || 'N/A'}</td>
        <td>${c.status || 'N/A'}</td>
        <td>$${(c.spent || 0).toLocaleString()}</td>
        <td>${(c.leads || 0).toLocaleString()}</td>
        <td>$${(c.revenue || 0).toLocaleString()}</td>
        <td>${(c.roas || 0).toFixed(1)}x</td>
      </tr>
    `).join('');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${reportTitle || "Marketing Performance Report"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 40px 20px; line-height: 1.6; color: #333; }
    .report { max-width: 1000px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
    .page { page-break-after: always; padding: 60px 50px; border-bottom: 1px solid #eee; }
    .page:last-child { border-bottom: none; }
    .cover { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; min-height: 600px; }
    .cover h1 { font-size: 48px; font-weight: 700; margin-bottom: 20px; }
    .cover p { font-size: 18px; opacity: 0.9; }
    h1 { font-size: 36px; font-weight: 700; margin-bottom: 30px; color: #667eea; }
    h2 { font-size: 24px; font-weight: 600; margin-top: 30px; margin-bottom: 15px; color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    p { margin-bottom: 15px; line-height: 1.8; }
    .metrics { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin: 25px 0; }
    .metric { background: #f9f9f9; padding: 20px; border-left: 4px solid #667eea; border-radius: 4px; text-align: center; }
    .metric-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .metric-value { font-size: 28px; font-weight: 700; color: #667eea; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    th { background: #667eea; color: white; padding: 12px; text-align: left; font-weight: 600; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) { background: #f9f9f9; }
    .summary { background: #f0f4ff; padding: 20px; border-radius: 4px; margin: 20px 0; }
    ul { margin-left: 20px; margin-bottom: 15px; }
    li { margin-bottom: 10px; }
    @media print { body { padding: 0; background: white; } .report { box-shadow: none; } .page { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="report">
    <div class="page cover">
      <h1>${reportTitle || "Marketing Performance Report"}</h1>
      <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="page">
      <h1>Executive Summary</h1>
      ${reportSummary.split('\n\n').map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`).join('')}
    </div>

    <div class="page">
      <h1>Key Performance Indicators</h1>
      <div class="metrics">
        <div class="metric">
          <div class="metric-label">Total Spent</div>
          <div class="metric-value">$${totalSpent.toLocaleString()}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Total Revenue</div>
          <div class="metric-value">$${totalRevenue.toLocaleString()}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Total Leads</div>
          <div class="metric-value">${totalLeads.toLocaleString()}</div>
        </div>
        <div class="metric">
          <div class="metric-label">ROAS</div>
          <div class="metric-value">${roas}x</div>
        </div>
      </div>

      <div class="metrics">
        <div class="metric">
          <div class="metric-label">Total Clicks</div>
          <div class="metric-value">${totalClicks.toLocaleString()}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Avg CPL</div>
          <div class="metric-value">$${avgCpl}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Active Campaigns</div>
          <div class="metric-value">${campaigns.filter(c => c.status === 'active').length}</div>
        </div>
        <div class="metric">
          <div class="metric-label">CTR</div>
          <div class="metric-value">${totalClicks > 0 ? ((totalClicks / (campaigns.reduce((s, c) => s + (c.impressions || 0), 0) || 1)) * 100).toFixed(2) : '0'}%</div>
        </div>
      </div>
    </div>

    ${campaigns.length > 0 ? `
    <div class="page">
      <h1>Campaign Performance Breakdown</h1>
      <table>
        <thead>
          <tr>
            <th>Campaign Name</th>
            <th>Platform</th>
            <th>Status</th>
            <th>Spent</th>
            <th>Leads</th>
            <th>Revenue</th>
            <th>ROAS</th>
          </tr>
        </thead>
        <tbody>
          ${campaignRows}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="page">
      <h1>Recommendations</h1>
      <div class="summary">
        <h2 style="margin-top: 0; border: none; color: #333;">Next Steps</h2>
        <ul>
          <li>Monitor campaign performance closely and adjust targeting based on engagement metrics</li>
          <li>Scale high-performing campaigns with positive ROAS</li>
          <li>Pause or optimize underperforming campaigns with low ROI</li>
          <li>Test new audience segments and creative variations</li>
          <li>Review budget allocation across platforms quarterly</li>
        </ul>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send to Gamma API
    const gammaApiKey = Deno.env.get("GAMMA_API_KEY");
    if (gammaApiKey) {
      try {
        const gammaResponse = await fetch("https://api.gamma.app/presentations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${gammaApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            request: {
              content: htmlContent,
              title: reportTitle || "Marketing Report",
            },
          }),
        });

        const gammaData = await gammaResponse.json();
        if (gammaData.success && gammaData.id) {
          return Response.json({
            success: true,
            gammaId: gammaData.id,
            gammaUrl: gammaData.url || `https://gamma.app/presentations/${gammaData.id}`,
            downloadUrl: gammaData.downloadUrl,
          });
        }
      } catch (gammaError) {
        console.error("Gamma API error:", gammaError.message);
      }
    }

    return Response.json({ error: "GAMMA_API_KEY not configured" }, { status: 500 });



  } catch (error) {
    console.error("generatePresentation error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});