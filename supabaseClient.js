import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Proyecto Supabase dedicado a Unánimo (solo se usa Realtime Broadcast,
// no hay tablas ni datos persistidos en base de datos).
const SUPABASE_URL = 'https://djuwyykqwlztvurpdsqu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqdXd5eWtxd2x6dHZ1cnBkc3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMDgxNjMsImV4cCI6MjEwNTY4NDE2M30.u_gdC5Zj5XNBrClQAWvOBSDcbQOM1OXtMC_KrrTlYzg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 20 } }
});
