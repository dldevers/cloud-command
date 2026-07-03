const API_BASE_URL = 'http://localhost:3000';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const views = {
  loading: $('#loading-view'),
  onboarding: $('#onboarding-view'),
  providers: $('#providers-view'),
  detail: $('#provider-detail-view'),
};

const apiStatus = $('#api-status');
const providerForm = $('#provider-form');
const providerGrid = $('#provider-grid');
const dashboardProviderGrid = $('#dashboard-provider-grid');
const providerDetail = $('#provider-detail');

let currentStep = 1;
let discovery = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showView(name) {
  Object.values(views).forEach((view) => {
    if (view) {
      view.hidden = true;
    }
  });

  if (views[name]) {
    views[name].hidden = false;
  }
}

function setApiStatus(connected) {
  if (!apiStatus) {
    return;
  }

  apiStatus.classList.toggle('connected', connected);
  apiStatus.classList.toggle('disconnected', !connected);

  const statusLabel = apiStatus.querySelector('.status-label');

  if (statusLabel) {
    statusLabel.textContent = connected ? 'Connected' : 'Disconnected';
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      body.detail ||
        body.error ||
        `Request failed with status ${response.status}`,
    );
  }

  return body;
}

function providerPayload() {
  return {
    name: $('#provider-name').value.trim(),
    providerId: $('#provider-id').value.trim(),
    type: 'kubernetes',
    environment: $('#provider-environment').value,
    location: $('#provider-location').value.trim(),
    description: $('#provider-description').value.trim(),
    connectionMode: 'local-kubeconfig',
  };
}

function setStep(step) {
  currentStep = step;

  $$('[data-step-panel]').forEach((panel) => {
    panel.hidden = Number(panel.dataset.stepPanel) !== step;
  });

  $$('[data-step-indicator]').forEach((indicator) => {
    const number = Number(indicator.dataset.stepIndicator);

    indicator.classList.toggle('active', number === step);
    indicator.classList.toggle('complete', number < step);
  });

  if (step === 3) {
    testProviderConnection();
  }

  if (step === 4) {
    renderProviderReview();
  }
}

function parseCpu(value) {
  if (!value) {
    return 0;
  }

  const cpu = String(value);

  if (cpu.endsWith('m')) {
    return Number.parseInt(cpu, 10) / 1000;
  }

  return Number.parseFloat(cpu);
}

function parseMemoryKi(value) {
  if (!value) {
    return 0;
  }

  return Number.parseInt(String(value).replace('Ki', ''), 10);
}

function formatMemory(kibibytes) {
  return `${(kibibytes / 1024 / 1024).toFixed(1)} GiB`;
}

function renderDiscovery(inspection) {
  const nodes = inspection.nodes.items || [];

  const totalCpu = nodes.reduce(
    (sum, node) => sum + parseCpu(node.capacity?.cpu),
    0,
  );

  const totalMemory = nodes.reduce(
    (sum, node) => sum + parseMemoryKi(node.capacity?.memory),
    0,
  );

  $('#discovered-status').textContent = inspection.status;

  $('#discovered-nodes').textContent =
    `${inspection.nodes.ready} / ${inspection.nodes.total}`;

  $('#discovered-cpu').textContent = `${totalCpu} cores`;
  $('#discovered-memory').textContent = formatMemory(totalMemory);

  $('#discovered-node-list').innerHTML = nodes
    .map(
      (node) => `
        <article class="compact-node">
          <div>
            <strong>${escapeHtml(node.name)}</strong>
            <span>${escapeHtml((node.roles || []).join(', '))}</span>
          </div>

          <div>
            <span>${escapeHtml(node.internalIp)}</span>
            <span>${escapeHtml(node.kubernetesVersion)}</span>
          </div>

          <span class="status-badge ${
            node.ready ? 'healthy' : 'degraded'
          }">
            ${node.ready ? 'Ready' : 'Not Ready'}
          </span>
        </article>
      `,
    )
    .join('');
}

async function testProviderConnection() {
  const pending = $('#discovery-pending');
  const results = $('#discovery-results');
  const errorBox = $('#discovery-error');
  const continueButton = $('#continue-to-register');

  discovery = null;

  pending.hidden = false;
  results.hidden = true;
  errorBox.hidden = true;
  continueButton.disabled = true;

  try {
    const result = await apiRequest('/api/providers/test', {
      method: 'POST',
      body: JSON.stringify({
        type: 'kubernetes',
        connectionMode: 'local-kubeconfig',
      }),
    });

    discovery = result.inspection;

    renderDiscovery(discovery);

    pending.hidden = true;
    results.hidden = false;
    continueButton.disabled = false;
  } catch (error) {
    pending.hidden = true;
    errorBox.textContent =
      `Connection test failed: ${error.message}`;
    errorBox.hidden = false;
  }
}

function renderProviderReview() {
  const provider = providerPayload();

  $('#provider-review').innerHTML = `
    <dl class="review-list">
      <div>
        <dt>Provider name</dt>
        <dd>${escapeHtml(provider.name)}</dd>
      </div>

      <div>
        <dt>Provider ID</dt>
        <dd><code>${escapeHtml(provider.providerId)}</code></dd>
      </div>

      <div>
        <dt>Type</dt>
        <dd>Kubernetes</dd>
      </div>

      <div>
        <dt>Environment</dt>
        <dd>${escapeHtml(provider.environment)}</dd>
      </div>

      <div>
        <dt>Location</dt>
        <dd>${escapeHtml(provider.location)}</dd>
      </div>

      <div>
        <dt>Discovered capacity</dt>
        <dd>
          ${discovery?.nodes.ready ?? 0} of
          ${discovery?.nodes.total ?? 0} nodes ready
        </dd>
      </div>
    </dl>
  `;
}

function renderProviderCard(provider) {
  const card = document.createElement('article');

  card.className = 'provider-card';

  card.innerHTML = `
    <div class="provider-card-header">
      <div class="provider-symbol small">
        <span>K8s</span>
      </div>

      <span class="status-badge ${
        provider.status === 'healthy'
          ? 'healthy'
          : 'degraded'
      }">
        ${escapeHtml(provider.status)}
      </span>
    </div>

    <p class="provider-type">Kubernetes provider</p>

    <h2>${escapeHtml(provider.name)}</h2>

    <p class="provider-description">
      ${
        escapeHtml(provider.description) ||
        'Connected Kubernetes resource provider.'
      }
    </p>

    <div class="provider-metrics">
      <div>
        <span>Nodes</span>
        <strong>${provider.summary?.nodes ?? '—'}</strong>
      </div>

      <div>
        <span>Ready</span>
        <strong>${provider.summary?.readyNodes ?? '—'}</strong>
      </div>

      <div>
        <span>Environment</span>
        <strong>${escapeHtml(provider.environment)}</strong>
      </div>
    </div>

    <button class="secondary-button view-provider">
      View provider
    </button>
  `;

  card
    .querySelector('.view-provider')
    .addEventListener('click', () => {
      loadProviderDetails(provider.id);
    });

  return card;
}


function renderDashboardProvider(provider) {
  const discovery = provider.discovery || {};
  const summary = discovery.summary || {};
  const healthy =
    provider.status === 'healthy' ||
    summary.readyNodes === summary.totalNodes;

  return `
    <button
      class="dashboard-provider-node ${healthy ? 'healthy' : 'degraded'}"
      type="button"
      data-provider-id="${escapeHtml(provider.id)}"
    >
      <div class="node-status">
        <span class="status-dot"></span>
        ${healthy ? 'Healthy' : 'Degraded'}
      </div>

      <h3>${escapeHtml(provider.name)}</h3>

      <p>
        ${escapeHtml(provider.type || 'Kubernetes')}
        ·
        ${escapeHtml(provider.environment || 'Unknown')}
      </p>

      <div class="provider-node-metrics">
        <span>
          <strong>${escapeHtml(summary.readyNodes ?? 0)}</strong>
          ready
        </span>

        <span>
          <strong>${escapeHtml(summary.totalNodes ?? 0)}</strong>
          nodes
        </span>

        <span>
          <strong>${escapeHtml(summary.cpuCapacity || '—')}</strong>
          CPU
        </span>

        <span>
          <strong>${escapeHtml(summary.memoryCapacity || '—')}</strong>
          memory
        </span>
      </div>
    </button>
  `;
}

function renderDashboardProviders(providers) {
  if (!dashboardProviderGrid) {
    return;
  }

  dashboardProviderGrid.innerHTML = providers
    .map(renderDashboardProvider)
    .join('');

  dashboardProviderGrid
    .querySelectorAll('[data-provider-id]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        loadProviderDetail(button.dataset.providerId);
      });
    });
}

async function loadProviders() {
  showView('loading');

  try {
    const response = await apiRequest('/api/providers');

    setApiStatus(true);

    if (response.count === 0) {
      setStep(1);
      showView('onboarding');
      return;
    }

    providerGrid.replaceChildren(
      ...response.items.map(renderProviderCard),
    );

    renderDashboardProviders(response.items);
    showView('dashboard');
  } catch (error) {
    setApiStatus(false);

    views.loading.innerHTML = `
      <div class="message error">
        <strong>CloudCommand API is unavailable</strong>
        <span>${escapeHtml(error.message)}</span>
      </div>
    `;

    showView('loading');
  }
}

async function loadProviderDetails(providerId) {
  showView('loading');

  try {
    const response = await apiRequest(
      `/api/providers/${encodeURIComponent(providerId)}`,
    );

    const provider = response.provider;
    const inspection = response.inspection;

    providerDetail.innerHTML = `
      <div class="page-heading provider-detail-heading">
        <div>
          <p class="eyebrow">Resource Provider</p>
          <h1>${escapeHtml(provider.name)}</h1>
          <p>${escapeHtml(provider.description)}</p>
        </div>

        <span class="status-badge ${
          inspection.status === 'healthy'
            ? 'healthy'
            : 'degraded'
        }">
          ${escapeHtml(inspection.status)}
        </span>
      </div>

      <div class="metric-grid">
        <article class="metric-card">
          <span>Provider type</span>
          <strong>Kubernetes</strong>
        </article>

        <article class="metric-card">
          <span>Nodes ready</span>
          <strong>
            ${inspection.nodes.ready} /
            ${inspection.nodes.total}
          </strong>
        </article>

        <article class="metric-card">
          <span>Environment</span>
          <strong>${escapeHtml(provider.environment)}</strong>
        </article>

        <article class="metric-card">
          <span>Location</span>
          <strong>${escapeHtml(provider.location)}</strong>
        </article>
      </div>

      <section class="inner-panel">
        <div class="panel-heading">
          <h2>Kubernetes nodes</h2>
          <p>
            Provider-specific infrastructure discovered through
            the Kubernetes API.
          </p>
        </div>

        <div class="node-list">
          ${(inspection.nodes.items || [])
            .map(
              (node) => `
                <article class="compact-node detailed">
                  <div>
                    <strong>${escapeHtml(node.name)}</strong>
                    <span>
                      ${escapeHtml((node.roles || []).join(', '))}
                    </span>
                  </div>

                  <div>
                    <span>${escapeHtml(node.internalIp)}</span>
                    <span>
                      ${escapeHtml(node.operatingSystem)}
                    </span>
                  </div>

                  <div>
                    <span>
                      ${escapeHtml(node.kubernetesVersion)}
                    </span>
                    <span>
                      ${escapeHtml(node.containerRuntime)}
                    </span>
                  </div>

                  <span class="status-badge ${
                    node.ready ? 'healthy' : 'degraded'
                  }">
                    ${node.ready ? 'Ready' : 'Not Ready'}
                  </span>
                </article>
              `,
            )
            .join('')}
        </div>
      </section>
    `;

    showView('detail');
  } catch (error) {
    providerDetail.innerHTML = `
      <div class="message error">
        Unable to load provider:
        ${escapeHtml(error.message)}
      </div>
    `;

    showView('detail');
  }
}

async function registerProvider(event) {
  event.preventDefault();

  const errorBox = $('#registration-error');
  const button = $('#register-provider');

  errorBox.hidden = true;
  button.disabled = true;
  button.textContent = 'Registering…';

  try {
    await apiRequest('/api/providers', {
      method: 'POST',
      body: JSON.stringify(providerPayload()),
    });

    providerForm.reset();

    discovery = null;
    currentStep = 1;

    await loadProviders();
  } catch (error) {
    errorBox.textContent =
      `Registration failed: ${error.message}`;

    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = 'Register provider';
  }
}

$$('[data-next]').forEach((button) => {
  button.addEventListener('click', () => {
    if (
      currentStep === 2 &&
      !providerForm.reportValidity()
    ) {
      return;
    }

    setStep(Math.min(currentStep + 1, 4));
  });
});

$$('[data-back]').forEach((button) => {
  button.addEventListener('click', () => {
    setStep(Math.max(currentStep - 1, 1));
  });
});

$('#provider-name')?.addEventListener('input', (event) => {
  $('#provider-id').value = event.target.value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
});

$('#add-provider-button')?.addEventListener('click', () => {
  setStep(1);
  showView('onboarding');
});

$('#providers-add-button')?.addEventListener('click', () => {
  setStep(1);
  showView('onboarding');
});

$('#show-providers-button')?.addEventListener('click', () => {
  showView('providers');
});

$('#back-to-providers')?.addEventListener(
  'click',
  loadProviders,
);

providerForm?.addEventListener(
  'submit',
  registerProvider,
);

loadProviders();
