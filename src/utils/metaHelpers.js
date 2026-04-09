// Lead action types that match Meta Ads Manager "Results" column.
// Priority order: use the FIRST matching type found (no double-counting).
// - messaging_conversation_started_7d = Meta's standard result for Messages objective
// - onsite_conversion.lead = standard result for Lead Gen form objective
const LEAD_ACTION_TYPES_PRIORITY = [
  "onsite_conversion.messaging_conversation_started_7d",
];

/**
 * Extract leads from Meta actions array.
 * Sums all matching lead types (each campaign may use a different objective).
 * Uses priority list to avoid double-counting:
 * - messaging_conversation_started_7d for Messages objective
 * - onsite_conversion.lead for Lead Gen forms
 */
export function extractLeads(actions = []) {
  if (!actions || !actions.length) return 0;
  let total = 0;
  for (const type of LEAD_ACTION_TYPES_PRIORITY) {
    const match = actions.find(a => a.action_type === type);
    if (match) total += parseInt(match.value || 0);
  }
  return total;
}

/**
 * Format a Meta insights object into clean KPI values
 */
export function parseMetaInsights(ins) {
  if (!ins) return null;
  const leads = extractLeads(ins.actions);
  const spend = parseFloat(ins.spend || 0);
  const clicks = parseInt(ins.clicks || 0);
  const impressions = parseInt(ins.impressions || 0);
  const ctr = parseFloat(ins.ctr || 0);
  const cpc = parseFloat(ins.cpc || 0);
  const cpl = leads > 0 ? spend / leads : 0;
  return { leads, spend, clicks, impressions, ctr, cpc, cpl };
}