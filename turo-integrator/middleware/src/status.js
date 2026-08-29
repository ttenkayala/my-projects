/**
 * /api/status — Flat job status data optimised for Grafana Table + Stat panels
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

function jenkinsClient() {
  const { JENKINS_URL, JENKINS_USER, JENKINS_API_TOKEN } = process.env;
  if (!JENKINS_URL) throw new Error('JENKINS_URL not set in .env');
  return axios.create({
    baseURL: JENKINS_URL,
    auth: { username: JENKINS_USER, password: JENKINS_API_TOKEN },
  });
}

function colorToStatus(color) {
  if (!color) return 'unknown';
  if (color.includes('blue'))     return 'success';
  if (color.includes('red'))      return 'failed';
  if (color.includes('anime'))    return 'running';
  if (color === 'disabled')       return 'disabled';
  if (color === 'notbuilt')       return 'never run';
  return color;
}

// GET /api/status/jenkins
// Returns flat rows: name, status, result, duration_sec, last_run, url
router.get('/jenkins', async (req, res) => {
  try {
    const client = jenkinsClient();
    const { data } = await client.get(
      '/api/json?tree=jobs[name,url,color,lastBuild[number,result,timestamp,duration]]'
    );

    const rows = data.jobs.map(job => ({
      name: job.name,
      status: colorToStatus(job.color),
      result: job.lastBuild?.result || 'N/A',
      duration_sec: job.lastBuild?.duration ? Math.round(job.lastBuild.duration / 1000) : null,
      last_run: job.lastBuild?.timestamp ? new Date(job.lastBuild.timestamp).toISOString() : null,
      build_number: job.lastBuild?.number || null,
      url: job.url,
    }));

    res.json(rows);
  } catch (e) {
    console.error('status/jenkins error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/status/jenkins/summary
// Returns counts by status for Stat panels
router.get('/jenkins/summary', async (req, res) => {
  try {
    const client = jenkinsClient();
    const { data } = await client.get('/api/json?tree=jobs[color]');

    const summary = { total: 0, success: 0, failed: 0, disabled: 0, running: 0, never_run: 0 };
    for (const job of data.jobs) {
      summary.total++;
      const s = colorToStatus(job.color);
      if (s === 'success')  summary.success++;
      else if (s === 'failed')   summary.failed++;
      else if (s === 'disabled') summary.disabled++;
      else if (s === 'running')  summary.running++;
      else if (s === 'never run') summary.never_run++;
    }

    res.json(summary);
  } catch (e) {
    console.error('status/jenkins/summary error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
