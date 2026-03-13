const { execSync } = require('child_process');
try {
  const result = execSync('npx vercel env add NEXT_PUBLIC_SUPABASE_URL production', { 
      input: 'https://prcfmhrccfowsykkysld.supabase.co',
      stdio: ['pipe', 'inherit', 'inherit']
  });
  console.log("Success");
} catch(err) {
  console.error("Error setting env");
}
