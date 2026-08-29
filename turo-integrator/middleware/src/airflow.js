const express = require('express');
const axios = require('axios');
const router = express.Router();

// Airflow 3 REST API: /api/v2/...
function airflowClient() {
  const baseURL = process.env.AIRFLOW_URL;
  const token = process.env.AIRFLOW_TOKEN;

  if (!baseURL) throw new Error('AIRFLOW_URL not set in .env');
  if (!token) throw new Error('AIRFLOW_TOKEN not set in .env');

  return axios.create({
    baseURL: `${baseURL}/api/v1`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
}

// GET /api/airflow/dags — list all DAGs
router.get('/dags', async (req, res) => {
  try {
    const client = airflowClient();
    const { data } = await client.get('/dags?limit=200');
    res.json(data.dags);
  } catch (e) {
    console.error('Airflow /dags error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/airflow/dags/:dagId — single DAG details
router.get('/dags/:dagId', async (req, res) => {
  try {
    const client = airflowClient();
    const { data } = await client.get(`/dags/${req.params.dagId}`);
    res.json(data);
  } catch (e) {
    console.error('Airflow /dags/:dagId error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/airflow/dags/:dagId/tasks — tasks in a DAG (shows task dependencies)
router.get('/dags/:dagId/tasks', async (req, res) => {
  try {
    const client = airflowClient();
    const { data } = await client.get(`/dags/${req.params.dagId}/tasks`);
    res.json(data.tasks);
  } catch (e) {
    console.error('Airflow tasks error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/airflow/dags/:dagId/runs — recent DAG runs
router.get('/dags/:dagId/runs', async (req, res) => {
  try {
    const client = airflowClient();
    const { data } = await client.get(`/dags/${req.params.dagId}/dagRuns?limit=10&order_by=-start_date`);
    res.json(data.dag_runs);
  } catch (e) {
    console.error('Airflow runs error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
