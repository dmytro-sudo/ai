import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { workspaceId, entity, filters = {} } = body;

    if (!workspaceId) {
      return Response.json({ error: "workspaceId required" }, { status: 400 });
    }

    // Verify user has access to workspace
    const workspace = await base44.entities.Workspace.get(workspaceId);
    if (!workspace) {
      return Response.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Check authorization
    const isOwner = workspace.owner_email === user.email;
    if (!isOwner) {
      const assignment = await base44.entities.WorkspaceUser.filter(
        { workspace_id: workspaceId, user_email: user.email }
      );
      if (!assignment || assignment.length === 0) {
        return Response.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Fetch entity data for workspace
    if (entity === "campaigns") {
      const data = await base44.entities.Campaign.filter(
        { workspace_id: workspaceId, ...filters },
        "-created_date",
        100
      );
      return Response.json({ data });
    }

    if (entity === "reports") {
      const data = await base44.entities.Report.filter(
        { workspace_id: workspaceId, ...filters },
        "-created_date",
        100
      );
      return Response.json({ data });
    }

    if (entity === "analysis") {
      const data = await base44.entities.AIAnalysisReport.filter(
        { workspace_id: workspaceId, ...filters },
        "-created_date",
        50
      );
      return Response.json({ data });
    }

    if (entity === "team") {
      const data = await base44.entities.WorkspaceUser.filter(
        { workspace_id: workspaceId },
        "-created_date",
        100
      );
      return Response.json({ data });
    }

    if (entity === "integrations") {
      const data = await base44.entities.WorkspaceIntegration.filter(
        { workspace_id: workspaceId },
        "-created_date",
        50
      );
      return Response.json({ data });
    }

    return Response.json({ error: "Unknown entity" }, { status: 400 });

  } catch (error) {
    console.error("getWorkspaceData error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});