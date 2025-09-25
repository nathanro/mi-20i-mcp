import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Autenticación básica
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="20i MCP Server"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  const validUsername = process.env.MCP_USERNAME;
  const validPassword = process.env.MCP_PASSWORD;

  if (!validUsername || !validPassword || username !== validUsername || password !== validPassword) {
    res.set('WWW-Authenticate', 'Basic realm="20i MCP Server"');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  next();
};

// Helper para llamadas API de 20i - PROBANDO LOS 3 MÉTODOS
async function make20iAPICall(endpoint, method = 'GET', data = null) {
  let token = null;
  if (process.env.TWENTYI_COMBINED_KEY) {
    token = process.env.TWENTYI_COMBINED_KEY;
  } else if (process.env.TWENTYI_OAUTH_KEY) {
    token = process.env.TWENTYI_OAUTH_KEY;
  } else if (process.env.TWENTYI_API_KEY) {
    token = process.env.TWENTYI_API_KEY;
  }

  if (!token) {
    throw new Error('No 20i API token configured');
  }

  // MÉTODO 1: Authorization header con base64
  const headers1 = {
    'User-Agent': '20i-MCP-Server/1.0',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${Buffer.from(token).toString('base64')}`
  };

  // MÉTODO 2: Authorization header sin base64
  const headers2 = {
    'User-Agent': '20i-MCP-Server/1.0',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // MÉTODO 3: access_token en URL
  const separator = endpoint.includes('?') ? '&' : '?';
  const urlWithToken = `https://api.20i.com${endpoint}${separator}access_token=${token}`;

  console.log('=== 20i API DEBUG ===');
  console.log('Endpoint:', endpoint);
  console.log('Method:', method);
  console.log('Token length:', token.length);
  console.log('Token starts with:', token.substring(0, 10) + '...');
  console.log('Base64 token:', Buffer.from(token).toString('base64').substring(0, 20) + '...');

  // Probar los 3 métodos
  const methods = [
    { name: 'Bearer + Base64', config: { method, url: `https://api.20i.com${endpoint}`, headers: headers1 } },
    { name: 'Bearer + Raw', config: { method, url: `https://api.20i.com${endpoint}`, headers: headers2 } },
    { name: 'URL access_token', config: { method, url: urlWithToken, headers: { 'User-Agent': '20i-MCP-Server/1.0', 'Content-Type': 'application/json' } } }
  ];

  if (data) {
    methods[0].config.data = data;
    methods[1].config.data = data;
    methods[2].config.data = data;
  }

  for (const { name, config } of methods) {
    try {
      console.log(`Trying ${name}...`);
      console.log('URL:', config.url.substring(0, 100) + (config.url.length > 100 ? '...' : ''));
      const response = await axios(config);
      console.log(`✅ ${name} WORKED! Status:`, response.status);
      return response;
    } catch (error) {
      console.log(`❌ ${name} failed:`, error.response?.status, error.response?.statusText);
      if (error.response?.data) {
        console.log('Error details:', JSON.stringify(error.response.data).substring(0, 200));
      }
      if (error.response?.headers) {
        console.log('Response headers:', Object.keys(error.response.headers));
      }
    }
  }

  throw new Error('All 3 authentication methods failed');
}

// Endpoints públicos
app.get('/', (req, res) => {
  res.json({
    message: '20i MCP Server - Complete Hosting Management',
    version: '2.0.0-debug',
    features: [
      'Testing all 3 20i authentication methods',
      'Bearer + Base64',
      'Bearer + Raw token',
      'URL access_token parameter'
    ],
    endpoints: {
      test: ['/20i/domains - Test authentication'],
      account: ['/reseller-info', '/balance'],
      domains: ['/domain/:domain', '/dns/:domain'],
      hosting: ['/packages', '/package/:id'],
      wordpress: ['/wp/:packageId/status', '/wp/:packageId/plugins']
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    auth_configured: !!(process.env.MCP_USERNAME && process.env.MCP_PASSWORD),
    twentyi_keys: {
      api_key: !!process.env.TWENTYI_API_KEY,
      oauth_key: !!process.env.TWENTYI_OAUTH_KEY,
      combined_key: !!process.env.TWENTYI_COMBINED_KEY
    },
    debug_mode: true
  });
});

// === TEST ENDPOINT - DOMAINS ===
app.get('/20i/domains', authenticateUser, async (req, res) => {
  try {
    console.log('\n=== DOMAINS REQUEST START ===');
    const response = await make20iAPICall('/domain');
    console.log('SUCCESS: Got domains data');
    console.log('Response keys:', Object.keys(response.data));
    console.log('=== DOMAINS REQUEST END ===\n');
    res.json(response.data);
  } catch (error) {
    console.error('FINAL ERROR:', error.message);
    res.status(500).json({ 
      error: error.message,
      debug: 'Check server logs for detailed authentication attempts'
    });
  }
});

// === RESELLER & ACCOUNT ===
app.get('/reseller-info', authenticateUser, async (req, res) => {
  try {
    const response = await make20iAPICall('/reseller');
    res.json(response.data);
  } catch (error) {
    console.error('Reseller info error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

app.get('/balance', authenticateUser, async (req, res) => {
  try {
    const response = await make20iAPICall('/reseller/balance');
    res.json(response.data);
  } catch (error) {
    console.error('Balance error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

// === DOMAINS ===
app.get('/domain/:domain', authenticateUser, async (req, res) => {
  try {
    const response = await make20iAPICall(`/domain/${req.params.domain}`);
    res.json(response.data);
  } catch (error) {
    console.error('Domain info error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

app.get('/dns/:domain', authenticateUser, async (req, res) => {
  try {
    const response = await make20iAPICall(`/domain/${req.params.domain}/dns`);
    res.json(response.data);
  } catch (error) {
    console.error('DNS error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

// === HOSTING PACKAGES ===
app.get('/packages', authenticateUser, async (req, res) => {
  try {
    const response = await make20iAPICall('/package');
    res.json(response.data);
  } catch (error) {
    console.error('Packages error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

app.get('/package/:id', authenticateUser, async (req, res) => {
  try {
    const response = await make20iAPICall(`/package/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    console.error('Package info error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

// === WORDPRESS ===
app.get('/wp/:packageId/status', authenticateUser, async (req, res) => {
  try {
    const response = await make20iAPICall(`/package/${req.params.packageId}/wordpress`);
    res.json(response.data);
  } catch (error) {
    console.error('WordPress status error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

app.get('/wp/:packageId/plugins', authenticateUser, async (req, res) => {
  try {
    const response = await make20iAPICall(`/package/${req.params.packageId}/wordpress/plugin`);
    res.json(response.data);
  } catch (error) {
    console.error('WordPress plugins error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

app.listen(port, () => {
  console.log(`\n🚀 20i MCP Debug Server running on port ${port}`);
  console.log(`🔐 Authentication: ${!!(process.env.MCP_USERNAME && process.env.MCP_PASSWORD) ? '✅ Configured' : '❌ NOT CONFIGURED'}`);
  console.log(`🔑 20i Keys: ${!!(process.env.TWENTYI_API_KEY || process.env.TWENTYI_OAUTH_KEY || process.env.TWENTYI_COMBINED_KEY) ? '✅ Configured' : '❌ NOT CONFIGURED'}`);
  console.log(`🐛 Debug Mode: ON - Check logs for authentication details`);
  console.log(`📋 Test URL: https://yourapp.onrender.com/20i/domains\n`);
});