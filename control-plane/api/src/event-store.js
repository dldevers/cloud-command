const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const EVENT_SPEC_VERSION = '1.0';
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function normalizeLimit(value) {
  if (value === undefined) {
    return DEFAULT_LIMIT;
  }

  const normalizedValue = String(value);

  if (!/^\d+$/.test(normalizedValue)) {
    throw new TypeError('Event limit must be a positive integer');
  }

  const limit = Number.parseInt(normalizedValue, 10);

  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError('Event limit must be a positive integer');
  }

  return Math.min(limit, MAX_LIMIT);
}

function createEventStore({
  filePath,
  clock = () => new Date(),
  randomUUID = () => crypto.randomUUID(),
}) {
  if (!filePath) {
    throw new TypeError('An event store file path is required');
  }

  let appendQueue = Promise.resolve();

  async function append({
    type,
    source,
    subject,
    operationId,
    actor,
    resource,
    data = {},
  }) {
    if (
      !type ||
      !source ||
      !subject ||
      !operationId ||
      !actor?.type ||
      !actor?.id ||
      !resource?.kind ||
      !resource?.id
    ) {
      throw new TypeError(
        'Event identity, actor, and resource fields are required',
      );
    }

    const event = {
      specVersion: EVENT_SPEC_VERSION,
      id: randomUUID(),
      type,
      source,
      subject,
      occurredAt: clock().toISOString(),
      operationId,
      actor,
      resource,
      data,
    };

    const write = async () => {
      await fs.mkdir(path.dirname(filePath), {
        recursive: true,
      });
      await fs.appendFile(
        filePath,
        `${JSON.stringify(event)}\n`,
        'utf8',
      );
    };

    const pendingWrite = appendQueue.then(write, write);
    appendQueue = pendingWrite.catch(() => {});
    await pendingWrite;

    return event;
  }

  async function read({
    type,
    operationId,
    resourceId,
    limit: requestedLimit,
  } = {}) {
    const limit = normalizeLimit(requestedLimit);
    let contents;

    try {
      contents = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }

      throw error;
    }

    const events = contents
      .split('\n')
      .filter(Boolean)
      .map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          throw new Error(
            `Invalid event data at line ${index + 1}: ${error.message}`,
          );
        }
      })
      .filter((event) => !type || event.type === type)
      .filter(
        (event) =>
          !operationId || event.operationId === operationId,
      )
      .filter(
        (event) =>
          !resourceId || event.resource?.id === resourceId,
      );

    return events.slice(-limit).reverse();
  }

  return {
    append,
    read,
  };
}

module.exports = {
  EVENT_SPEC_VERSION,
  createEventStore,
};
