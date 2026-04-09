import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ------------------------------------------------------------------
// Base44 API Compatibility Layer
// ------------------------------------------------------------------
// This proxy wrapper ensures the entire app codebase keeps working
// with its existing syntax (base44.entities.Model.create, etc.)
// while actually storing and fetching data from Supabase.
// You can progressively migrate away from this wrapper syntax.

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
    get: (target, table) => ({
      create: async (data) => {
        const { data: res, error } = await supabase.from(table).insert(data).select().single();
        if (error) { console.error(`Supabase Insert Error (${table}):`, error); throw error; }
        return res || data; // Fallback if RLS blocks read
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
           req = req.match(query); // simple equality match
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
      }
    })
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
