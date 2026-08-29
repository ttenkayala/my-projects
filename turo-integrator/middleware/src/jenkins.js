const express = require('express');
const axios = require('axios');
const router = express.Router();

function jenkinsClient() {
  const baseURL = process.env.JENKINS_URL;
  const user = process.env.JENKINS_USER;
  const token = process.env.JENKINS_API_TOKEN;

  if (!baseURL) throw new Error('JENKINS_URL not set in .env');

  return axios.create({
    baseURL,
    auth: { username: user, password: token },
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET /api/jenkins/jobs — list all jobs with last build status
router.get('/jobs', async (req, res) => {
  try {
    const client = jenkinsClient();
    const { data } = await client.get('/api/json?tree=jobs[name,url,color,lastBuild[number,result,timestamp,duration,url]]');
    res.json(data.jobs);
  } catch (e) {
    console.error('Jenkins /jobs error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/jenkins/jobs/:name — single job details + recent builds
router.get('/jobs/:name', async (req, res) => {
  try {
    const client = jenkinsClient();
    const { data } = await client.get(
      `/job/${encodeURIComponent(req.params.name)}/api/json?tree=name,url,color,builds[number,result,timestamp,duration,url]{0,10}`
    );
    res.json(data);
  } catch (e) {
    console.error('Jenkins /jobs/:name error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/jenkins/jobs/:name/downstream — upstream/downstream relationships
router.get('/jobs/:name/downstream', async (req, res) => {
  try {
    const client = jenkinsClient();
    const { data } = await client.get(
      `/job/${encodeURIComponent(req.params.name)}/api/json?tree=name,downstreamProjects[name,url],upstreamProjects[name,url]`
    );
    res.json({
      name: data.name,
      upstream: data.upstreamProjects || [],
      downstream: data.downstreamProjects || [],
    });
  } catch (e) {
    console.error('Jenkins downstream error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
