// Run migration via Supabase pg-meta REST API (direct column add)
// Using service_role key which bypasses RLS

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const SUPABASE_URL = 'https://nbdaxrfqdlezdmnhbtjz.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iZGF4cmZxZGxlemRtbmhidGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mzc5NSwiZXhwIjoyMDkwMzQ5Nzk1fQ.87DY474yliLrK71QiIC_q3gka6JM-6fz8jji4AvAR3s';

// Use pg-meta API (built into self-hosted Supabase)
// For Supabase cloud, try the /v1/query endpoint via pg
async function runSQL(sql) {
  const f = await import('node-fetch');
  const res = await f.default(`${SUPABASE_URL}/rest/v1/rpc/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

// Alternative: use the /pg endpoint which exists in some Supabase setups
async function runSQLAlt(sql) {
  const f = await import('node-fetch');
  // Try different endpoints
  const endpoints = [
    `${SUPABASE_URL}/pg/query`,
    `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
  ];
  for (const url of endpoints) {
    const res = await f.default(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    console.log(`[${url}] Status: ${res.status} | ${text.slice(0, 100)}`);
  }
}

async function main() {
  // First check what endpoints are available
  const f = await import('node-fetch');
  
  // The proper way: create a stored procedure via RPC that can run DDL
  // Step 1: Check if columns exist by trying to read them
  const checkRes = await f.default(
    `${SUPABASE_URL}/rest/v1/sessions?select=makeup_original_date&limit=1`,
    {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    }
  );
  
  const checkText = await checkRes.text();
  console.log('Check makeup_original_date column:', checkRes.status, checkText.slice(0, 100));
  
  if (checkRes.status === 200) {
    console.log('Columns already exist! Migration already done.');
    return;
  }
  
  // Columns don't exist - need to add them
  // Try using the Supabase admin API with service key
  console.log('Need to run migration. Trying pg-meta...');
  await runSQLAlt('SELECT 1');
}

main().catch(console.error);
