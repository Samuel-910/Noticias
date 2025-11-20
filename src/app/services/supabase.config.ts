import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mjompchhwvbqpnjnqlma.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qb21wY2hod3ZicXBuam5xbG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNjQwMzUsImV4cCI6MjA2Nzc0MDAzNX0.NxlJDoQQK2gJhs5nDF0cIRHaes3rH4wnhehin5y3ck4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
