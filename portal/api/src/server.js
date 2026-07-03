const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const k8s = require('@kubernetes/client-node');

const app = express();
const port = Number.parseInt(process.env.PORT || '3000', 10);

const providersFile = path.resolve(
  __dirname,
  '../data/providers.json',
);

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function readProviders() {
  try {
    const contents = await fs.readFile(providersFile, 'utf8');
    const providers = JSON.parse(contents);

    return Array.isArray(providers) ? providers : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function writeProviders(providers) {
  await fs.mkdir(path.dirname(providersFile), {
    recursive: true,
  });

  await fs.writeFile(
    providersFile,
    `${JSON.stringify(providers, null, 2)}\n`,
    'utf8',
  );
}

function loadKubeConfig(connectionMode) {
  const kubeConfig = new k8s.KubeConfig();

  if (
    connectionMode === 'in-cluster' ||
    process.env.KUBERNETES_SERVICE_HOST
  ) {
    kubeConfig.loadFromCluster();
  } else {
    kubeConfig.loadFromDefault();
  }

  return kubeConfig;
}

async function inspectKubernetesProvider(provider = {}) {
  const kubeConfig = loadKubeConfig(
    provider.connectionMode || 'local-kubeconfig',
  );

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
      .filter((label) =>
        label.startsWith('node-role.kubernetes.io/'),
      )
      .map((label) =>
        label.replace('node-role.kubernetes.io/', ''),
      )
      .filter(Boolean);

    return {
      name: node.metadata?.name || 'unknown',
      ready: readyCondition?.status === 'True',
      roles: roles.length > 0 ? roles : ['worker'],
      internalIp: internalAddress?.address || null,
      kubernetesVersion:
        node.status?.nodeInfo?.kubeletVersion || null,
      operatingSystem:
        node.status?.nodeInfo?.osImage || null,
      architecture:
        node.status?.nodeInfo?.architecture || null,
      containerRuntime:
        node.status?.nodeInfo?.containerRuntimeVersion || null,
      capacity: {
        cpu: node.status?.capacity?.cpu || null,
        memory: node.status?.capacity?.memory || null,
        pods: node.status?.capacity?.pods || null,
      },
    };
  });

  const readyNodes = nodeDetails.filter(
    (node) => node.ready,
  ).length;

  return {
    status:
      readyNodes === nodeDetails.length
        ? 'healthy'
        : 'degraded',
    connected: true,
    discoveredAt: new Date().toISOString(),
    nodes: {
      total: nodeDetails.length,
      ready: readyNodes,
      items: nodeDetails,
    },
  };
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'cloudcommand-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/providers', async (req, res) => {
  try {
    const providers = await readProviders();

    res.json({
      count: providers.length,
      items: providers,
    });
  } catch (error) {
    console.error('Failed to read providers:', error);

    res.status(500).json({
      status: 'error',
      error: 'Unable to read resource providers',
      detail: error.message,
    });
  }
});

app.post('/api/providers/test', async (req, res) => {
  try {
    const {
      type,
      connectionMode = 'local-kubeconfig',
    } = req.body;

    if (type !== 'kubernetes') {
      return res.status(400).json({
        status: 'invalid-request',
        error: 'Only Kubernetes providers are supported currently',
      });
    }

    const inspection = await inspectKubernetesProvider({
      connectionMode,
    });

    return res.json({
      status: 'connected',
      providerType: 'kubernetes',
      connectionMode,
      inspection,
    });
  } catch (error) {
    console.error('Provider connection test failed:', error);

    return res.status(503).json({
      status: 'unavailable',
      error: 'Unable to connect to the Kubernetes provider',
      detail: error.message,
    });
  }
});

app.post('/api/providers', async (req, res) => {
  try {
    const {
      name,
      providerId,
      type,
      environment = 'local',
      location = 'local',
      description = '',
      connectionMode = 'local-kubeconfig',
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        status: 'invalid-request',
        error: 'Provider name and type are required',
      });
    }

    if (type !== 'kubernetes') {
      return res.status(400).json({
        status: 'invalid-request',
        error: 'Only Kubernetes providers are supported currently',
      });
    }

    const providers = await readProviders();
    const id = providerId || slugify(name);

    if (!id) {
      return res.status(400).json({
        status: 'invalid-request',
        error: 'A valid provider ID is required',
      });
    }

    if (providers.some((provider) => provider.id === id)) {
      return res.status(409).json({
        status: 'conflict',
        error: `Provider '${id}' already exists`,
      });
    }

    const inspection = await inspectKubernetesProvider({
      connectionMode,
    });

    const provider = {
      id,
      uid: crypto.randomUUID(),
      name,
      type,
      environment,
      location,
      description,
      connectionMode,
      connectionStatus: 'connected',
      status: inspection.status,
      createdAt: new Date().toISOString(),
      lastDiscoveredAt: inspection.discoveredAt,
      summary: {
        nodes: inspection.nodes.total,
        readyNodes: inspection.nodes.ready,
      },
      capabilities: {
        compute: true,
        storage: true,
        network: true,
      },
    };

    providers.push(provider);
    await writeProviders(providers);

    return res.status(201).json({
      status: 'created',
      provider,
      inspection,
    });
  } catch (error) {
    console.error('Failed to register provider:', error);

    return res.status(503).json({
      status: 'unavailable',
      error: 'Unable to register the resource provider',
      detail: error.message,
    });
  }
});

app.get('/api/providers/:providerId', async (req, res) => {
  try {
    const providers = await readProviders();

    const provider = providers.find(
      (item) => item.id === req.params.providerId,
    );

    if (!provider) {
      return res.status(404).json({
        status: 'not-found',
        error: 'Resource provider not found',
      });
    }

    const inspection = await inspectKubernetesProvider(provider);

    return res.json({
      provider: {
        ...provider,
        status: inspection.status,
        connectionStatus: 'connected',
      },
      inspection,
    });
  } catch (error) {
    console.error('Failed to inspect provider:', error);

    return res.status(503).json({
      status: 'unavailable',
      error: 'Unable to inspect the resource provider',
      detail: error.message,
    });
  }
});

/*
 * Temporary compatibility endpoint.
 * The provider-oriented API above is now the preferred model.
 */
app.get('/api/cluster', async (req, res) => {
  try {
    const inspection = await inspectKubernetesProvider({
      connectionMode: 'local-kubeconfig',
    });

    res.json({
      name: 'local-kubernetes',
      ...inspection,
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
  console.log(`CloudCommand API listening on port ${port}`);
});
