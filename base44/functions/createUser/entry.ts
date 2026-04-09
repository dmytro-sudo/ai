import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!['super_admin', 'internal_admin'].includes(user?.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { email, role = 'client_user' } = body;

    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    const validRoles = ['super_admin', 'internal_admin', 'project_manager', 'support_agent', 'client_user'];
    if (!validRoles.includes(role)) {
      return Response.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 });
    }

    await base44.users.inviteUser(email, role);

    return Response.json({ success: true, message: `User ${email} invited with role: ${role}` });
  } catch (error) {
    console.error('createUser error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});