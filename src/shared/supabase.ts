import { createClient, SupabaseClient } from '@supabase/supabase-js'


console.log(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export const CONJUNCTION_TABLE = (tableName: string) => supabase.from(tableName);

// console.log("Supabase");
// console.log(supabase);