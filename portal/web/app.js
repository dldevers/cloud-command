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


function renderCapacitySegments(allocated, total, className = 'cloudcommand') {
  const safeTotal = Math.max(Number(total) || 0, 1);
  const safeAllocated = Math.min(Math.max(Number(allocated) || 0, 0), safeTotal);

  return Array.from({ length: safeTotal }, (_, index) => {
    const state = index < safeAllocated ? `used ${className}` : 'free';
    return `<span class="segment ${state}"></span>`;
  }).join('');
}

function buildProviderGaugeStyle(c1Allocated, s1Allocated, n1Allocated, totalCapacity) {
  const total = Math.max(Number(totalCapacity) || 0, 1);
  const c1 = Math.max(Number(c1Allocated) || 0, 0);
  const s1 = Math.max(Number(s1Allocated) || 0, 0);
  const n1 = Math.max(Number(n1Allocated) || 0, 0);

  const c1End = (c1 / total) * 100;
  const s1End = ((c1 + s1) / total) * 100;
  const n1End = ((c1 + s1 + n1) / total) * 100;

  return `
    --provider-gauge:
      conic-gradient(
        rgba(39, 165, 230, 0.78) 0% ${c1End}%,
        rgba(51, 207, 146, 0.72) ${c1End}% ${s1End}%,
        rgba(167, 139, 250, 0.72) ${s1End}% ${n1End}%,
        rgba(78, 111, 132, 0.16) ${n1End}% 100%
      );
  `;
}

function renderDashboardProvider(provider) {
  const discovery = provider.discovery || {};
  const summary = discovery.summary || {};
  const nodes = discovery.nodes || [];

  const totalNodes =
    provider.summary?.nodes ??
    summary.totalNodes ??
    discovery.totalNodes ??
    provider.totalNodes ??
    nodes.length ??
    0;

  const readyNodes =
    provider.summary?.readyNodes ??
    summary.readyNodes ??
    discovery.readyNodes ??
    provider.readyNodes ??
    nodes.filter((node) => node.ready || node.status === 'Ready').length ??
    0;

  const resourceClasses =
    provider.resourceClasses ??
    provider.summary?.resourceClasses ??
    discovery.resourceClasses ??
    {};

  const c1Capacity = resourceClasses.C1?.total ?? resourceClasses.c1?.total ?? 24;
  const s1Capacity = resourceClasses.S1?.total ?? resourceClasses.s1?.total ?? 16;
  const n1Capacity = resourceClasses.N1?.total ?? resourceClasses.n1?.total ?? 12;

  const c1Allocated = resourceClasses.C1?.allocated ?? resourceClasses.c1?.allocated ?? 14;
  const s1Allocated = resourceClasses.S1?.allocated ?? resourceClasses.s1?.allocated ?? 6;
  const n1Allocated = resourceClasses.N1?.allocated ?? resourceClasses.n1?.allocated ?? 3;

  const totalCapacity = c1Capacity + s1Capacity + n1Capacity;
  const totalAllocated = c1Allocated + s1Allocated + n1Allocated;

  const healthy =
    provider.status === 'healthy' ||
    (totalNodes > 0 && readyNodes === totalNodes);

  return `
    <button
      class="dashboard-provider-node provider-capacity-card ${healthy ? 'healthy' : 'degraded'}"
      type="button"
      data-provider-id="${escapeHtml(provider.id)}"
    >
      <div class="provider-card-title">
        <strong>${escapeHtml(provider.name)}</strong>
        <span>${healthy ? 'Healthy' : 'Degraded'}</span>
      </div>

      <p class="provider-class-summary">
        ${escapeHtml(provider.type || 'Kubernetes')}
        ·
        ${escapeHtml(provider.environment || 'Unknown')}
        ·
        ${escapeHtml(readyNodes)} ready / ${escapeHtml(totalNodes)} nodes
      </p>

      <div class="provider-card-body">
        <div
          class="provider-gauge"
          style="${buildProviderGaugeStyle(c1Allocated, s1Allocated, n1Allocated, totalCapacity)}"
          aria-label="${escapeHtml(totalAllocated)} of ${escapeHtml(totalCapacity)} provider units allocated"
        >
          <div class="provider-gauge-inner">
            <strong>
              <span class="gauge-used healthy">${escapeHtml(totalAllocated)}</span><span class="gauge-divider">/</span><span class="gauge-total">${escapeHtml(totalCapacity)}</span>
            </strong>
          </div>
        </div>

        <div class="provider-class-legend">
          <div class="provider-class-row provider-class-c1">
            <strong>C1</strong>

            <span>
              Compute
              <em>${escapeHtml(c1Allocated)} / ${escapeHtml(c1Capacity)}</em>
            </span>

            <div class="provider-mini-rail">
              ${renderCapacitySegments(c1Allocated, c1Capacity, 'cloudcommand')}
            </div>

            <span class="provider-unit-count healthy">
              <strong>${escapeHtml(c1Allocated)}</strong> / ${escapeHtml(c1Capacity)}
            </span>
          </div>

          <div class="provider-class-row provider-class-s1">
            <strong>S1</strong>

            <span>
              Storage
              <em>${escapeHtml(s1Allocated)} / ${escapeHtml(s1Capacity)}</em>
            </span>

            <div class="provider-mini-rail">
              ${renderCapacitySegments(s1Allocated, s1Capacity, 'telemetry')}
            </div>

            <span class="provider-unit-count healthy">
              <strong>${escapeHtml(s1Allocated)}</strong> / ${escapeHtml(s1Capacity)}
            </span>
          </div>

          <div class="provider-class-row provider-class-n1">
            <strong>N1</strong>

            <span>
              Network
              <em>${escapeHtml(n1Allocated)} / ${escapeHtml(n1Capacity)}</em>
            </span>

            <div class="provider-mini-rail">
              ${renderCapacitySegments(n1Allocated, n1Capacity, 'network')}
            </div>

            <span class="provider-unit-count healthy">
              <strong>${escapeHtml(n1Allocated)}</strong> / ${escapeHtml(n1Capacity)}
            </span>
          </div>
        </div>
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
