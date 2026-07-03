const API_URL = 'http://localhost:3000/api/cluster';
const REFRESH_INTERVAL_MS = 30000;

const clusterStatus = document.querySelector('#cluster-status');
const nodeSummary = document.querySelector('#node-summary');
const lastUpdated = document.querySelector('#last-updated');
const nodesGrid = document.querySelector('#nodes-grid');
const errorMessage = document.querySelector('#error-message');
const refreshButton = document.querySelector('#refresh-button');

function text(value, fallback = 'Unknown') {
  return value ?? fallback;
}

function renderNode(node) {
  const card = document.createElement('article');
  card.className = 'node-card';

  const roles = Array.isArray(node.roles)
    ? node.roles.join(', ')
    : 'worker';

  card.innerHTML = `
    <div class="node-card-header">
      <h3>${text(node.name)}</h3>
      <span class="badge ${node.ready ? 'ready' : 'not-ready'}">
        ${node.ready ? 'Ready' : 'Not Ready'}
      </span>
    </div>

    <dl class="node-details">
      <div>
        <dt>Role</dt>
        <dd>${roles}</dd>
      </div>
      <div>
        <dt>Internal IP</dt>
        <dd>${text(node.internalIp)}</dd>
      </div>
      <div>
        <dt>Kubernetes</dt>
        <dd>${text(node.kubernetesVersion)}</dd>
      </div>
      <div>
        <dt>Operating system</dt>
        <dd>${text(node.operatingSystem)}</dd>
      </div>
      <div>
        <dt>Architecture</dt>
        <dd>${text(node.architecture)}</dd>
      </div>
      <div>
        <dt>Runtime</dt>
        <dd>${text(node.containerRuntime)}</dd>
      </div>
    </dl>
  `;

  return card;
}

function renderCluster(data) {
  clusterStatus.textContent = data.status;
  clusterStatus.style.color =
    data.status === 'healthy' ? '#6ee7a0' : '#ffca72';

  nodeSummary.textContent =
    `${data.nodes.ready} / ${data.nodes.total}`;

  nodesGrid.replaceChildren(
    ...data.nodes.items.map(renderNode),
  );

  lastUpdated.textContent =
    new Date().toLocaleTimeString();
}

async function loadCluster() {
  refreshButton.disabled = true;
  errorMessage.hidden = true;

  try {
    const response = await fetch(API_URL, {
      headers: {
        Accept: 'application/json',
      },
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(
        body.detail ||
        body.error ||
        `Request failed with status ${response.status}`,
      );
    }

    renderCluster(body);
  } catch (error) {
    console.error('Unable to load cluster:', error);

    errorMessage.textContent =
      `Unable to load cluster data: ${error.message}`;

    errorMessage.hidden = false;
    clusterStatus.textContent = 'Unavailable';
    clusterStatus.style.color = '#ff8f8f';
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener('click', loadCluster);

loadCluster();
setInterval(loadCluster, REFRESH_INTERVAL_MS);
