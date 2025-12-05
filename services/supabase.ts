import { createClient } from '@supabase/supabase-js';

// Substitua abaixo pelos códigos que estão em Project Settings > API no site do Supabase
const supabaseUrl = 'https://bytvpqoiyxdvdllnytrj.supabase.co';
const supabaseKey = 'sb_publishable_ca6P77OpbYn15UDSrtpoxA_l1tUsPk8';

export const supabase = createClient(supabaseUrl, supabaseKey);