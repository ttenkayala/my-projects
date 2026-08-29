/**
 * /api/graph — Grafana Node Graph panel compatible endpoints
 *
 * Grafana Node Graph format:
 *   nodes: [{ id, title, mainStat, secondaryStat, arc__<color>, color }]
 *   edges: [{ id, source, target, mainStat }]
 *
 * Docs: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/node-graph/
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

function jenkinsClient() {
  const { JENKINS_URL, JENKINS_USER, JENKINS_API_TOKEN } = process.env;
  if (!JENKINS_URL) return null;
  return axios.create({
    baseURL: JENKINS_URL,
    auth: JENKINS_USER ? { username: JENKINS_USER, password: JENKINS_API_TOKEN } : undefined,
  });
}

function airflowClient() {
  const { AIRFLOW_URL, AIRFLOW_TOKEN } = process.env;
  if (!AIRFLOW_URL || !AIRFLOW_TOKEN) return null;
  return axios.create({
    baseURL: `${AIRFLOW_URL}/api/v1`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AIRFLOW_TOKEN}`,
    },
  });
}

// Map build result / dag state → node color
function jenkinsColor(color) {
  if (!color) return 'gray';
  if (color.includes('blue')) return 'green';
  if (color.includes('red')) return 'red';
  if (color.includes('yellow')) return 'orange';
  if (color.includes('anime')) return 'blue'; // running
  return 'gray';
}

function airflowColor(state) {
  const map = { success: 'green', failed: 'red', running: 'blue', queued: 'orange', paused: 'gray' };
  return map[state] || 'gray';
}

// ── Jenkins dependency graph ──────────────────────────────────────────────────
// GET /api/graph/jenkins
router.get('/jenkins', async (req, res) => {
  const client = jenkinsClient();
  if (!client) return res.json({ nodes: [], edges: [] });

  try {
    const { data } = await client.get(
      '/api/json?tree=jobs[name,color,url,downstreamProjects[name],upstreamProjects[name],lastBuild[result,duration]]'
    );

    const nodes = [];
    const edges = [];
    const edgeSet = new Set();

    for (const job of data.jobs) {
      const lastResult = job.lastBuild?.result || 'unknown';
      const durationSec = job.lastBuild?.duration ? Math.round(job.lastBuild.duration / 1000) : null;

      nodes.push({
        id: job.name,
        title: job.name,
        mainStat: lastResult,
        secondaryStat: durationSec ? `${durationSec}s` : '',
        arc__success: job.color?.includes('blue') ? 1 : 0,
        arc__failed: job.color?.includes('red') ? 1 : 0,
        arc__running: job.color?.includes('anime') ? 1 : 0,
        color: jenkinsColor(job.color),
      });

      for (const ds of (job.downstreamProjects || [])) {
        const edgeId = `${job.name}->${ds.name}`;
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({ id: edgeId, source: job.name, target: ds.name, mainStat: 'triggers' });
        }
      }
    }

    res.json({ nodes, edges });
  } catch (e) {
    console.error('graph/jenkins error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Airflow DAG dependency graph ──────────────────────────────────────────────
// GET /api/graph/airflow
// Shows DAG→task relationships for a given DAG, or DAG→DAG via shared datasets
router.get('/airflow', async (req, res) => {
  const client = airflowClient();
  if (!client) return res.json({ nodes: [], edges: [] });

  try {
    const { data: dagData } = await client.get('/dags?limit=200');
    const dags = dagData.dags || [];

    const nodes = [];
    const edges = [];

    for (const dag of dags) {
      nodes.push({
        id: dag.dag_id,
        title: dag.dag_id,
        mainStat: dag.is_paused ? 'paused' : (dag.last_parsed_time ? 'active' : 'inactive'),
        secondaryStat: dag.schedule_interval || dag.timetable_description || '',
        color: dag.is_paused ? 'gray' : 'green',
        arc__active: dag.is_paused ? 0 : 1,
        arc__paused: dag.is_paused ? 1 : 0,
      });
    }

    // Airflow 3: dataset-based dependencies via /datasets/events or /dags/{id}/datasets
    // We'll try to fetch dag dependencies from the newer endpoint
    try {
      const { data: depData } = await client.get('/dag_dependencies');
      for (const dep of (depData.dependencies || [])) {
        if (dep.dependency_type === 'dataset') {
          edges.push({
            id: `${dep.source}->${dep.target}`,
            source: dep.source,
            target: dep.target,
            mainStat: dep.dependency_id || 'dataset',
          });
        }
      }
    } catch (_) {
      // dag_dependencies endpoint may not exist on all Airflow 3 versions — skip
    }

    res.json({ nodes, edges });
  } catch (e) {
    console.error('graph/airflow error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Combined graph: Jenkins + Airflow ─────────────────────────────────────────
// GET /api/graph/combined
// Merges both graphs; requires explicit jenkins_dag_map in .env or body
router.get('/combined', async (req, res) => {
  const jClient = jenkinsClient();
  const aClient = airflowClient();

  const nodes = [];
  const edges = [];

  // Jenkins nodes
  if (jClient) {
    try {
      const { data } = await jClient.get(
        '/api/json?tree=jobs[name,color,downstreamProjects[name]]'
      );
      for (const job of data.jobs) {
        nodes.push({
          id: `jenkins:${job.name}`,
          title: `[J] ${job.name}`,
          mainStat: 'jenkins',
          color: jenkinsColor(job.color),
        });
        for (const ds of (job.downstreamProjects || [])) {
          edges.push({
            id: `jenkins:${job.name}->jenkins:${ds.name}`,
            source: `jenkins:${job.name}`,
            target: `jenkins:${ds.name}`,
            mainStat: 'triggers',
          });
        }
      }
    } catch (e) {
      console.warn('combined: jenkins error', e.message);
    }
  }

  // Airflow nodes
  if (aClient) {
    try {
      const { data } = await aClient.get('/dags?limit=200');
      for (const dag of (data.dags || [])) {
        nodes.push({
          id: `airflow:${dag.dag_id}`,
          title: `[A] ${dag.dag_id}`,
          mainStat: dag.is_paused ? 'paused' : 'active',
          color: dag.is_paused ? 'gray' : 'green',
        });
      }
    } catch (e) {
      console.warn('combined: airflow error', e.message);
    }
  }

  // Cross-system links defined in env: "jenkins_job_name:airflow_dag_id,..."
  const crossLinks = process.env.CROSS_LINKS || '';
  for (const link of crossLinks.split(',').filter(Boolean)) {
    const [jenkinsJob, airflowDag] = link.split(':');
    if (jenkinsJob && airflowDag) {
      edges.push({
        id: `jenkins:${jenkinsJob}->airflow:${airflowDag}`,
        source: `jenkins:${jenkinsJob}`,
        target: `airflow:${airflowDag}`,
        mainStat: 'triggers',
      });
    }
  }

  res.json({ nodes, edges });
});

module.exports = router;
