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

// Helper para llamadas API de 20i con codificación base64 correcta
async function make20iAPICall(endpoint, method = 'GET', data = null) {
  const headers = {
    'User-Agent': '20i-MCP-Server/1.0',
    'Content-Type': 'application/json'
  };

  // Obtener el token apropiado
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

  // Codificar el token en base64 como requiere 20i
  const base64Token = Buffer.from(token).toString('base64');
  headers['Authorization'] = `Bearer ${base64Token}`;

  const config = {
    method,
    url: `https://api.20i.com${endpoint}`,
    headers,
  };

  if (data) {
    config.data = data;
  }

  return await axios(config);
}

// Endpoints públicos
app.get('/', (req, res) => {
  res.json({
    message: '20i MCP Server - Complete Hosting Management',
    version: '2.0.0',
    features: [
      'Complete 20i API integration',
      'WordPress automation',
      'Database management',
      'Email services',
      'Security tools',
      'Backup & restore',
      'CDN management'
    ],
    endpoints: {
      account: ['/reseller-info', '/balance'],
      domains: ['/20i/domains', '/domain/:domain', '/dns/:domain'],
      hosting: ['/packages', '/package/:id'],
      wordpress: ['/wp/:packageId/status', '/wp/:packageId/plugins'],
      databases: ['/mysql/databases', '/mysql/database'],
      email: ['/email/accounts', '/email/account'],
      security: ['/security/blocked-ips', '/security/block-ip'],
      backups: ['/backups/snapshots', '/backups/snapshot'],
      cdn: ['/cdn/features', '/cdn/purge-cache']
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
    }
  });
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
app.get('/20i/domains', authenticateUser, async (req, res) => {
  try {
    const response = await make20iAPICall('/domain');
    res.json(response.data);
  } catch (error) {
    console.error('Domains error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

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

// === DATABASES ===
app.get('/mysql/databases', authenticateUser, async (req, res) => {
  try {
    const { packageId } = req.query;
    if (!packageId) {
      return res.status(400).json({ error: 'packageId query parameter required' });
    }
    const response = await make20iAPICall(`/package/${packageId}/database`);
    res.json(response.data);
  } catch (error) {
    console.error('MySQL databases error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

app.post('/mysql/database', authenticateUser, async (req, res) => {
  try {
    const { packageId, name } = req.body;
    if (!packageId || !name) {
      return res.status(400).json({ error: 'packageId and name required' });
    }
    const response = await make20iAPICall(`/package/${packageId}/database`, 'POST', { name });
    res.json(response.data);
  } catch (error) {
    console.error('Create MySQL database error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

// === EMAIL ===
app.get('/email/accounts', authenticateUser, async (req, res) => {
  try {
    const { packageId } = req.query;
    if (!packageId) {
      return res.status(400).json({ error: 'packageId query parameter required' });
    }
    const response = await make20iAPICall(`/package/${packageId}/email/account`);
    res.json(response.data);
  } catch (error) {
    console.error('Email accounts error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

app.post('/email/account', authenticateUser, async (req, res) => {
  try {
    const { packageId, username, password } = req.body;
    if (!packageId || !username || !password) {
      return res.status(400).json({ error: 'packageId, username and password required' });
    }
    const response = await make20iAPICall(`/package/${packageId}/email/account`, 'POST', { username, password });
    res.json(response.data);
  } catch (error) {
    console.error('Create email account error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

// === SECURITY ===
app.get('/security/blocked-ips', authenticateUser, async (req, res) => {
  try {
    const { packageId } = req.query;
    if (!packageId) {
      return res.status(400).json({ error: 'packageId query parameter required' });
    }
    const response = await make20iAPICall(`/package/${packageId}/security/blocked-ip`);
    res.json(response.data);
  } catch (error) {
    console.error('Blocked IPs error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

// === BACKUPS ===
app.get('/backups/snapshots', authenticateUser, async (req, res) => {
  try {
    const { packageId } = req.query;
    if (!packageId) {
      return res.status(400).json({ error: 'packageId query parameter required' });
    }
    const response = await make20iAPICall(`/package/${packageId}/timeline-storage/snapshot`);
    res.json(response.data);
  } catch (error) {
    console.error('Snapshots error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

app.listen(port, () => {
  console.log(`Complete 20i MCP Server running on port ${port}`);
  console.log(`Authentication: ${!!(process.env.MCP_USERNAME && process.env.MCP_PASSWORD) ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`20i Keys: ${!!(process.env.TWENTYI_API_KEY || process.env.TWENTYI_OAUTH_KEY || process.env.TWENTYI_COMBINED_KEY) ? 'Configured' : 'NOT CONFIGURED'}`);
});