/**
 * KaamSetu - Supabase Client Configuration
 * Member 3: Database Engineer
 * 
 * Provides initialized Supabase client instances for the Node.js / Express backend.
 * Uses environment variables to prevent leaking credentials.
 */

const path = require('path');
// Load dotenv if available
try {
    require('dotenv').config();
} catch (e) {}
try {
    require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
} catch (e) {}
try {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} catch (e) {}

let createClient;
try {
    createClient = require('@supabase/supabase-js').createClient;
} catch (error) {
    try {
        createClient = require('../backend/node_modules/@supabase/supabase-js').createClient;
    } catch (e2) {
        // Silently handle if not installed
    }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function validateConfig() {
    const missing = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL');
    if (!supabaseAnonKey && !supabaseServiceRoleKey) {
        missing.push('SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
    }

    if (missing.length > 0 && process.env.NODE_ENV !== 'test' && supabaseUrl) {
        console.warn(`[KaamSetu DB Notice] Missing environment variables: ${missing.join(', ')}`);
    }
}

validateConfig();

let supabase = null;
let supabaseAdmin = null;

if (createClient && supabaseUrl) {
    // 1. Standard Client (uses ANON key if available, else service key)
    const clientKey = supabaseAnonKey || supabaseServiceRoleKey;
    if (clientKey) {
        supabase = createClient(supabaseUrl, clientKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });
    }

    // 2. Admin / Backend Client (uses SERVICE_ROLE key to bypass RLS safely in server-side APIs)
    if (supabaseServiceRoleKey) {
        supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });
    } else {
        supabaseAdmin = supabase;
    }
}

/**
 * Health check helper to test database connectivity from the Express server.
 * @returns {Promise<{success: boolean, message: string, timestamp?: string}>}
 */
async function testConnection() {
    const client = supabaseAdmin || supabase;
    if (!client) {
        return {
            success: false,
            message: 'Supabase client is not initialized. Check your environment variables.'
        };
    }

    try {
        const { data, error } = await client
            .from('users')
            .select('count', { count: 'exact', head: true });

        if (error) throw error;

        return {
            success: true,
            message: 'Connected to Supabase PostgreSQL database successfully!',
            userCount: data
        };
    } catch (err) {
        return {
            success: false,
            message: `Connection failed: ${err.message}`
        };
    }
}

module.exports = {
    supabase,
    supabaseAdmin,
    testConnection
};
