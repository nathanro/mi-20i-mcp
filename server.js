import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Middleware de autenticación básica
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="20i MCP Server"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Decodificar credenciales
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  // Verificar credenciales
  const validUsername = process.env.MCP_USERNAME;
  const validPassword = process.env.MCP_PASSWORD;

  if (!validUsername || !validPassword) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  if (username !== validUsername || password !== validPassword) {
    res.set('WWW-Authenticate', 'Basic realm="20i MCP Server"');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  next();
};

// Helper function para 20i API
async function make20iAPICall(endpoint) {
  const headers = {
    'User-Agent': 'MCP-Server/1.0',
    'Content-Type': 'application/json'
  };

  if (process.env.TWENTYI_COMBINED_KEY) {
    headers['Authorization'] = `Bearer ${process.env.TWENTYI_COMBINED_KEY}`;
  } else if (process.env.TWENTYI_OAUTH_KEY) {
    headers['Authorization'] = `Bearer ${process.env.TWENTYI_OAUTH_KEY}`;
  } else if (process.env.TWENTYI_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.TWENTYI_API_KEY}`;
  }

  if (process.env.TWENTYI_API_KEY) {
    headers['X-API-Key'] = process.env.TWENTYI_API_KEY;
  }

  return await axios.get(`https://api.20i.com${endpoint}`, { headers });
}

// Endpoints públicos (sin autenticación)
app.get('/', (req, res) => {
  res.json({
    message: '20i MCP Server',
    status: 'Authentication required for protected endpoints'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    auth_configured: !!(process.env.MCP_USERNAME && process.env.MCP_PASSWORD)
  });
});

// Endpoints protegidos (requieren usuario/contraseña)
app.get('/20i/domains', authenticateUser, async (req, res) => {
  try {
    const response = await make20iAPICall('/domain');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching domains:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

app.get('/20i/packages', authenticateUser, async (req, res) => {
  try {
    const response = await make20iAPICall('/package');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching packages:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

app.get('/20i/domain/:domain', authenticateUser, async (req, res) => {
  try {
    const response = await make20iAPICall(`/domain/${req.params.domain}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching domain info:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

app.listen(port, () => {
  console.log(`Secure 20i MCP server running on port ${port}`);
});