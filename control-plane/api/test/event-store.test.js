const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const test = require('node:test');

const {
  EVENT_SPEC_VERSION,
  createEventStore,
} = require('../src/event-store');

async function temporaryEventStore(t) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'cloudcommand-events-'),
  );

  t.after(() => fs.rm(directory, {
    recursive: true,
    force: true,
  }));

  let uuid = 0;
  let time = 0;

  return createEventStore({
    filePath: path.join(directory, 'events.ndjson'),
    randomUUID: () => `event-${++uuid}`,
    clock: () => new Date(`2026-07-19T06:00:0${time++}.000Z`),
  });
}

function providerEvent(overrides = {}) {
  return {
    type: 'cloudcommand.provider.registration.requested.v1',
    source: 'cloudcommand.control-plane.api',
    subject: 'provider/lacasa-k8s',
    operationId: 'operation-1',
    actor: {
      type: 'service',
      id: 'cloudcommand-api',
    },
    resource: {
      kind: 'Provider',
      id: 'lacasa-k8s',
      uid: null,
    },
    data: {
      providerType: 'kubernetes',
    },
    ...overrides,
  };
}

test('appends immutable event envelopes and reads newest first', async (t) => {
  const store = await temporaryEventStore(t);

  const requested = await store.append(providerEvent());
  const completed = await store.append(providerEvent({
    type: 'cloudcommand.provider.registration.completed.v1',
  }));
  const events = await store.read();

  assert.equal(requested.specVersion, EVENT_SPEC_VERSION);
  assert.equal(requested.id, 'event-1');
  assert.equal(requested.occurredAt, '2026-07-19T06:00:00.000Z');
  assert.deepEqual(events, [completed, requested]);
});

test('serializes concurrent appends without losing events', async (t) => {
  const store = await temporaryEventStore(t);

  await Promise.all([
    store.append(providerEvent({ operationId: 'operation-1' })),
    store.append(providerEvent({ operationId: 'operation-2' })),
    store.append(providerEvent({ operationId: 'operation-3' })),
  ]);

  const events = await store.read();

  assert.equal(events.length, 3);
  assert.deepEqual(
    new Set(events.map((event) => event.operationId)),
    new Set(['operation-1', 'operation-2', 'operation-3']),
  );
});

test('filters events and applies the requested limit', async (t) => {
  const store = await temporaryEventStore(t);

  await store.append(providerEvent({ operationId: 'operation-1' }));
  await store.append(providerEvent({
    operationId: 'operation-2',
    resource: {
      kind: 'Provider',
      id: 'other-provider',
      uid: null,
    },
  }));
  await store.append(providerEvent({
    type: 'cloudcommand.provider.registration.completed.v1',
    operationId: 'operation-1',
  }));

  const events = await store.read({
    operationId: 'operation-1',
    resourceId: 'lacasa-k8s',
    limit: 1,
  });

  assert.equal(events.length, 1);
  assert.equal(
    events[0].type,
    'cloudcommand.provider.registration.completed.v1',
  );
});

test('rejects invalid limits', async (t) => {
  const store = await temporaryEventStore(t);

  await assert.rejects(
    () => store.read({ limit: '1-event' }),
    /positive integer/,
  );
});

test('rejects an event without actor and resource identity', async (t) => {
  const store = await temporaryEventStore(t);

  await assert.rejects(
    () => store.append(providerEvent({ actor: undefined })),
    /identity, actor, and resource fields/,
  );
});
