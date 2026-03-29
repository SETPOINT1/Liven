import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  extra: {
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:8083/api',
  },
});
