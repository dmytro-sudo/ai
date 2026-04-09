import { useState, useEffect } from 'react';
import { base44 } from '@/api/supabaseClient';
import { Plus, Mail, Shield, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '../components/PageHeader';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [message, setMessage] = useState('');

  const loadUsers = async () => {
    try {
      const allUsers = await base44.entities.User.list('-created_date', 100);
      setUsers(allUsers || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleInvite = async () => {
    if (!email) {
      setMessage('Email is required');
      return;
    }

    setInviting(true);
    setMessage('');

    try {
      const res = await base44.functions.invoke('createUser', { email, role });
      if (res.data?.success) {
        setMessage(`✓ ${email} invited as ${role}`);
        setEmail('');
        setRole('user');
        loadUsers();
      } else {
        setMessage(`Error: ${res.data?.error || 'Failed to invite user'}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setInviting(false);
    }
  };

  const roleColors = {
    super_admin: 'bg-destructive/10 text-destructive',
    internal_admin: 'bg-primary/10 text-primary',
    project_manager: 'bg-chart-2/10 text-chart-2',
    support_agent: 'bg-warning/10 text-warning',
    client_user: 'bg-secondary text-secondary-foreground',
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader 
        title="User Management" 
        subtitle="Create and manage user accounts with different roles"
      >
        <Button onClick={loadUsers} variant="outline" className="gap-2" disabled={loading}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </PageHeader>

      {/* Invite Form */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Invite New User
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Email Address</Label>
            <Input 
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border-border"
              disabled={inviting}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={inviting}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin — full platform access</SelectItem>
                <SelectItem value="internal_admin">Internal Admin — manage client workspaces</SelectItem>
                <SelectItem value="project_manager">Project Manager — assigned workspaces only</SelectItem>
                <SelectItem value="support_agent">Support Agent — troubleshoot & view</SelectItem>
                <SelectItem value="client_user">Client User — own workspace only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              onClick={handleInvite} 
              disabled={inviting || !email}
              className="w-full gap-2 rounded-xl h-9"
            >
              {inviting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Inviting...</>
              ) : (
                <><Mail className="w-3.5 h-3.5" /> Send Invite</>
              )}
            </Button>
          </div>
        </div>
        {message && (
          <p className={`text-sm mt-3 ${message.startsWith('✓') ? 'text-success' : 'text-destructive'}`}>
            {message}
          </p>
        )}
      </div>

      {/* Users List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4" /> Users ({users.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No users yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-foreground">Email</th>
                  <th className="px-6 py-3 text-left font-medium text-foreground">Full Name</th>
                  <th className="px-6 py-3 text-left font-medium text-foreground">Role</th>
                  <th className="px-6 py-3 text-left font-medium text-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4 text-foreground font-mono text-xs">{user.email}</td>
                    <td className="px-6 py-4 text-foreground">{user.full_name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${roleColors[user.role] || 'bg-muted text-muted-foreground'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {user.created_date ? new Date(user.created_date).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}