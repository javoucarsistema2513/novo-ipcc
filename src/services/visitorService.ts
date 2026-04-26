import { supabase } from '../lib/supabase';
import { Visitor } from '../types';

export const visitorService = {
  async testConnection() {
    try {
      const { error } = await supabase.from('visitors').select('id').limit(1);
      if (error) throw error;
    } catch (error) {
      console.error("Supabase connection error:", error);
    }
  },

  async addVisitor(visitorData: Omit<Visitor, 'id' | 'createdAt' | 'createdBy'>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('visitors')
        .insert([
          {
            ...visitorData,
            created_by: user.id,
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase Insert Error:', error);
      throw error;
    }
  },

  async getVisitors() {
    try {
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Map Supabase fields to our Visitor interface if needed
      return data.map(v => ({
        id: v.id,
        name: v.name,
        phone: v.phone,
        address: v.address,
        createdAt: { seconds: new Date(v.created_at).getTime() / 1000 },
        createdBy: v.created_by
      })) as Visitor[];
    } catch (error) {
      console.error('Supabase Fetch Error:', error);
      throw error;
    }
  }
};
