const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function test() {
  console.log("Testing insert without user_id...");
  const { data, error } = await supabase
    .from('dispositivos')
    .upsert(
      { mac_address: 'ESP-DISCOVERY-TEST', status: 'PENDING' },
      { onConflict: 'mac_address' }
    );
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! user_id can be null.", data);
    // Cleanup
    await supabase.from('dispositivos').delete().eq('mac_address', 'ESP-DISCOVERY-TEST');
  }
}

test();
