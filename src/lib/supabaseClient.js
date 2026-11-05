import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://khwbukjkvtlkrbfvuduw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cLFWK-S8paGZu_vzrcVhdQ_ZQ3ma48q";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
