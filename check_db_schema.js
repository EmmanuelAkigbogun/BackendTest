import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');
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
  console.log("Inserting a dummy row...");
  // Use a dummy user_id that looks like a UUID or just check if it accepts any string.
  // We can try inserting a row.
  const { data: insertData, error: insertError } = await supabase
    .from('history')
    .insert([
      {
        type: 'text',
        content: 'TEMP_SCHEMA_CHECK_MESSAGE',
        file_name: null
      }
    ])
    .select('*');

  if (insertError) {
    console.error("Insert error:", insertError);
  } else {
    console.log("Successfully inserted and retrieved columns:", Object.keys(insertData[0]));
    console.log("Full row:", JSON.stringify(insertData[0], null, 2));

    // Clean up
    console.log("Cleaning up dummy row...");
    const { error: deleteError } = await supabase
      .from('history')
      .delete()
      .eq('id', insertData[0].id);
    if (deleteError) {
      console.error("Error deleting:", deleteError);
    } else {
      console.log("Cleanup complete!");
    }
  }
}

run();
