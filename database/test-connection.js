/**
 * KaamSetu - Supabase Connection Tester
 * Member 3: Database Engineer
 * 
 * Run with: node database/test-connection.js
 */

const path = require('path');
const fs = require('fs');

// Check if .env file exists
const envPath = path.resolve(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
    console.log('---------------------------------------------------------');
    console.log('KaamSetu Database Connection Check:');
    console.log('---------------------------------------------------------');
    console.log('Notice: .env file was not found at:', envPath);
    console.log('Please copy .env.example to .env and add your Supabase credentials:');
    console.log('  cp .env.example .env');
    console.log('---------------------------------------------------------\n');
}

const { testConnection } = require('./supabaseClient');

async function run() {
    console.log('Testing Supabase PostgreSQL Connection...\n');

    const result = await testConnection();

    if (result.success) {
        console.log('[SUCCESS]', result.message);
        console.log('Your Node.js backend is ready to interact with KaamSetu database!');
    } else {
        console.log('[FAILED]', result.message);
        console.log('\nTroubleshooting Checklist:');
        console.log('1. Did you run `npm install @supabase/supabase-js dotenv`?');
        console.log('2. Did you set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env?');
        console.log('3. Did you execute `database/schema.sql` in the Supabase SQL Editor?');
    }
}

run();
