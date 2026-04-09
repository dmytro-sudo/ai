import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/supabaseClient';

export function useWorkspace() {
  const { workspaceSlug } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    if (!workspaceSlug) {
      setLoading(false);
      return;
    }
    
    const init = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          setLoading(false);
          return;
        }

        // Get all workspaces - admin/super_admin can see all
        let allWorkspaces = [];
        try {
          allWorkspaces = await base44.entities.Workspace.list('-created_date', 100);
        } catch (e) {
          allWorkspaces = [];
        }
        
        // Get workspace assignments for this user
        const assignments = await base44.entities.WorkspaceUser.filter(
          { user_email: user.email },
          '-created_date',
          100
        );

        // Determine user role (from User entity)
        const userRole = user.role;

        // Internal platform team roles
        const isInternal = ['super_admin', 'internal_admin', 'project_manager', 'support_agent', 'admin'].includes(userRole);
        const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';

        // If super_admin and allWorkspaces is empty, try asServiceRole
        let workspacesForFilter = allWorkspaces;
        if (isSuperAdmin && allWorkspaces.length === 0) {
          try {
            workspacesForFilter = await base44.asServiceRole.entities.Workspace.list('-created_date', 100);
          } catch (e) {
            workspacesForFilter = allWorkspaces;
          }
        }

        // Filter based on role:
        let accessibleWorkspaces = [];

        if (isSuperAdmin) {
          // Super admin sees ALL workspaces
          accessibleWorkspaces = workspacesForFilter;
        } else if (isInternal) {
          // Internal team (internal_admin, project_manager, support_agent): see assigned workspaces
          accessibleWorkspaces = workspacesForFilter.filter(w =>
            assignments.some(a => a.workspace_id === w.id) ||
            w.owner_email === user.email ||
            w.assigned_pm === user.email ||
            w.assigned_admin === user.email ||
            w.assigned_support === user.email
          );
        } else {
          // client_user: see ONLY assigned workspaces
          accessibleWorkspaces = workspacesForFilter.filter(w =>
            assignments.some(a => a.workspace_id === w.id)
          );
        }

        setWorkspaces(accessibleWorkspaces);

        // Find workspace by slug from URL
        const selected = accessibleWorkspaces.find(w => w.slug === workspaceSlug);

        if (selected) {
          setWorkspace(selected);

          // Get user's role in this workspace (from WorkspaceUser)
          const assignment = assignments.find(a => a.workspace_id === selected.id);
          const wsRole = assignment?.role || (selected.owner_email === user.email ? 'workspace_owner' : null);
          setUserRole(wsRole);
        }
      } catch (error) {
        console.error('Workspace init error:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [workspaceSlug]);

  const switchWorkspace = (workspace) => {
    if (workspace && workspace.slug) {
      window.location.href = `/${workspace.slug}/dashboard`;
    }
  };

  return {
    workspace,
    workspaces,
    loading,
    userRole,
    switchWorkspace,
    canEdit: ['workspace_owner', 'workspace_admin', 'workspace_manager'].includes(userRole),
    canManageTeam: ['workspace_owner', 'workspace_admin'].includes(userRole),
    isInternalTeam: ['super_admin', 'admin', 'internal_admin', 'project_manager', 'support_agent'].includes(userRole),
    isSuperAdmin: userRole === 'super_admin' || userRole === 'admin',
  };
}