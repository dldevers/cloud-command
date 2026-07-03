const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const k8s = require('@kubernetes/client-node');

const app = express();
const port = Number.parseInt(process.env.PORT || '3000', 10);

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'cloudportal-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/cluster', async (req, res) => {
  try {
    const kubeConfig = new k8s.KubeConfig();

    if (process.env.KUBERNETES_SERVICE_HOST) {
      kubeConfig.loadFromCluster();
    } else {
      kubeConfig.loadFromDefault();
    }

    const coreApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
    const response = await coreApi.listNode();
    const nodes = response.items || [];

    const nodeDetails = nodes.map((node) => {
      const readyCondition = node.status?.conditions?.find(
        (condition) => condition.type === 'Ready',
      );

      const internalAddress = node.status?.addresses?.find(
        (address) => address.type === 'InternalIP',
      );

      const roles = Object.keys(node.metadata?.labels || {})
        .filter((label) => label.startsWith('node-role.kubernetes.io/'))
        .map((label) => label.replace('node-role.kubernetes.io/', ''))
        .filter(Boolean);

      return {
        name: node.metadata?.name || 'unknown',
        ready: readyCondition?.status === 'True',
        roles: roles.length > 0 ? roles : ['worker'],
        internalIp: internalAddress?.address || null,
        kubernetesVersion: node.status?.nodeInfo?.kubeletVersion || null,
        operatingSystem: node.status?.nodeInfo?.osImage || null,
        architecture: node.status?.nodeInfo?.architecture || null,
        containerRuntime:
          node.status?.nodeInfo?.containerRuntimeVersion || null,
      };
    });

    const readyNodes = nodeDetails.filter((node) => node.ready).length;

    res.json({
      name: process.env.CLUSTER_NAME || 'lacasa',
      status: readyNodes === nodeDetails.length ? 'healthy' : 'degraded',
      nodes: {
        total: nodeDetails.length,
        ready: readyNodes,
        items: nodeDetails,
      },
    });
  } catch (error) {
    console.error('Failed to read Kubernetes cluster:', error);

    res.status(503).json({
      status: 'unavailable',
      error: 'Unable to read Kubernetes cluster',
      detail: error.message,
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    status: 'not-found',
    path: req.originalUrl,
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`CloudPortal API listening on port ${port}`);
});
