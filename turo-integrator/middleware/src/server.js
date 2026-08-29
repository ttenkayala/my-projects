const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const jenkinsRouter = require('./jenkins');
const airflowRouter = require('./airflow');
const graphRouter = require('./graph');
const statusRouter = require('./status');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// API routes
app.use('/api/jenkins', jenkinsRouter);
app.use('/api/airflow', airflowRouter);
app.use('/api/graph', graphRouter);
app.use('/api/status', statusRouter);

app.listen(PORT, () => {
  console.log(`Turo Integrator middleware running on http://localhost:${PORT}`);
});
