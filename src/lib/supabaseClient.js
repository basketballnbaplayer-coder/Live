import { createClient } from "@supabase/supabase-js";

// The URL and publishable/anon key are meant to be public — real
// protection comes from the Row Level Security policies in
// supabase/schema.sql, not from hiding these values.
const SUPABASE_URL = "https://rnrhqghemclbgqthdzjq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_FozM1TE-08bXw_DUMAFH6g_5w3Qmy29";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
