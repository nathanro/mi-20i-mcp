import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper function to make 20i API calls with proper authentication
async function make20iAPICall(endpoint) {
  const headers = {
    'User-Agent': 'MCP-Server/1.0',
    'Content-Type': 'application/json'
  };

  // Try different authentication methods
  if (process.env.TWENTYI_COMBINED_KEY) {
    headers['Authorization'] = `Bearer ${process.env.TWENTYI_COMBINED_KEY}`;
  } else if (process.env.TWENTYI_OAUTH_KEY) {
    headers['Authorization'] = `Bearer ${process.env.TWENTYI_OAUTH_KEY}`;
  } else if (process.env.TWENTYI_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.TWENTYI_API_KEY}`;
  }

  // Also try X-API-Key header
  if (process.env.TWENTYI_API_KEY) {
    headers['X-API-Key'] = process.env.TWENTYI_API_KEY;
  }

  return await axios.get(`https://api.20i.com${endpoint}`, { headers });
}

// 20i API endpoints
app.get('/20i/domains', async (req, res) => {
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

app.get('/20i/packages', async (req, res) => {
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

app.get('/20i/domain/:domain', async (req, res) => {
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env_vars: {
      has_api_key: !!process.env.TWENTYI_API_KEY,
      has_oauth_key: !!process.env.TWENTYI_OAUTH_KEY,
      has_combined_key: !!process.env.TWENTYI_COMBINED_KEY
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '20i MCP Server is running',
    endpoints: [
      'GET /health - Health check',
      'GET /20i/domains - List all domains',
      'GET /20i/packages - List all packages',
      'GET /20i/domain/:domain - Get domain info'
    ]
  });
});

app.listen(port, () => {
  console.log(`Multi-MCP server running on port ${port}`);
});