import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  // Try reading current history entries to see existing type values
  const { data, error } = await supabase.from('history').select('*');
  if (error) {
    console.log('Select error:', error);
    return;
  }
  console.log('Existing data:', JSON.stringify(data, null, 2));
  console.log('Number of rows:', data.length);

  // Also try to GET the root OpenAPI or schema
  try {
    const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/?`, {
      headers: {
        'apikey': env.VITE_SUPABASE_ANON_KEY,
        'Accept': 'application/json',
      }
    });
    console.log('Root status:', res.status);
    const txt = await res.text();
    console.log('Root body:', txt.substring(0, 1000));
  } catch(e) {
    console.log('Root error:', e.message);
  }
}

run();
