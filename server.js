import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 20i API endpoints
app.get('/20i/domains', async (req, res) => {
  try {
    const response = await axios.get('https://api.20i.com/domain', {
      headers: { Authorization: `Bearer ${process.env.TWENTYI_API_KEY}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/20i/packages', async (req, res) => {
  try {
    const response = await axios.get('https://api.20i.com/package', {
      headers: { Authorization: `Bearer ${process.env.TWENTYI_API_KEY}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/20i/domain/:domain', async (req, res) => {
  try {
    const response = await axios.get(`https://api.20i.com/domain/${req.params.domain}`, {
      headers: { Authorization: `Bearer ${process.env.TWENTYI_API_KEY}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Multi-MCP server running on port ${port}`);
});