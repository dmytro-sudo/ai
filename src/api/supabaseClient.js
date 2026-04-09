import { createClient } from '@supabase/supabase-js';

const env = import.meta['env'] || {};
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://apcudnzuaxaguupvvhux.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwY3Vkbnp1YXhhZ3V1cHZ2aHV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MTMzMDUsImV4cCI6MjA5MTE4OTMwNX0.F62-MWK2P9-mwRigessx2GLEy_NQW3HVEMuvpphKkCQ';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ------------------------------------------------------------------
// Base44 API Compatibility Layer
// ------------------------------------------------------------------
export const base44 = {
  auth: {
    me: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user || { id: "local-dev-user", email: "demo@example.com" }; // Fallback
    },
    login: async (email, password) => {
      return supabase.auth.signInWithPassword({ email, password });
    },
    logout: async () => supabase.auth.signOut(),
  },
  entities: new Proxy({}, {
    get: (target, tableProp) => {
      if (typeof tableProp !== 'string') return undefined;
      
      const tableMap = {
        'Workspace': 'workspaces',
        'Campaign': 'campaigns',
        'Creative': 'creatives',
        'WorkspaceUser': 'workspace_users',
        'WorkspaceIntegration': 'workspace_integrations',
        'Notification': 'notifications',
        'Report': 'reports',
        'ScheduledAction': 'scheduled_actions'
      };
      const table = tableMap[tableProp] || tableProp.toLowerCase();
      
      return {
        create: async (data) => {
          const { data: res, error } = await supabase.from(table).insert(data).select().single();
          if (error) { console.error(`Supabase Insert Error (${table}):`, error); throw error; }
          return res || data;
        },
        update: async (id, data) => {
          const { data: res, error } = await supabase.from(table).update(data).eq('id', id).select().single();
          if (error) { console.error(`Supabase Update Error (${table}):`, error); throw error; }
          return res || { id, ...data };
        },
        delete: async (id) => {
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (error) throw error;
          return true;
        },
        get: async (id) => {
          const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
          if (error) throw error;
          return data;
        },
        filter: async (query = {}, options = {}) => {
          let req = supabase.from(table).select('*');
          if (Object.keys(query).length > 0) {
            req = req.match(query);
          }
          if (options.sort) {
            const [field, dir] = Object.entries(options.sort)[0];
            req = req.order(field, { ascending: dir === 1 });
          }
          if (options.limit) {
            req = req.limit(options.limit);
          }
          const { data, error } = await req;
          if (error) { console.error(`Supabase Filter Error (${table}):`, error); return []; }
          return data || [];
        },
        list: async (sort = '-created_at', limit = 100) => {
          let req = supabase.from(table).select('*');
          if (sort) {
            let field = sort.startsWith('-') ? sort.substring(1) : sort;
            const dir = sort.startsWith('-');
            
            // Map common field name discrepancies
            if (field === 'created_date') field = 'created_at';
            
            req = req.order(field, { ascending: !dir });
          }
          if (limit) {
            req = req.limit(limit);
          }
          const { data, error } = await req;
          if (error) { console.error(`Supabase List Error (${table}):`, error); return []; }
          return data || [];
        }
      }
    }
  }),
  functions: {
    invoke: async (funcName, body) => {
      const { data, error } = await supabase.functions.invoke(funcName, { body });
      if (error) throw error;
      return data;
    }
  },
  integrations: {
    Core: {
      InvokeLLM: async (opts) => {
        const { data, error } = await supabase.functions.invoke('InvokeLLM', { body: opts });
        if (error) throw error;
        return data;
      }
    }
  }
};
