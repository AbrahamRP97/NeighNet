import { createClient } from '@supabase/supabase-js';


const SUPABASE_URL = 'https://srcqppppsjlqukxbhcsb.supabase.co'; // TU URL de Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyY3FwcHBwc2pscXVreGJoY3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MTc4MDYsImV4cCI6MjA2NTA5MzgwNn0.NCguMtuvOKKPsDF4z3OnCVWvbceIe5UCxm1n04LliYA'; // TU ANON KEY de Supabase

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
