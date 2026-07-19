# Structured event foundation

CloudCommand records operational history as append-only structured events. The
first implemented lifecycle is Kubernetes provider registration. This is the
foundation for future operation history, audit views, CLI output, and deep
links; it is not yet the complete immutable audit system described in the
roadmap.

## Event envelope

Each newline-delimited JSON event contains:

- `specVersion`: event-envelope schema version.
- `id`: unique event identifier.
- `type`: versioned event type.
- `source`: component that created the event.
- `subject`: stable resource subject, such as `provider/lacasa-k8s`.
- `occurredAt`: UTC timestamp.
- `operationId`: identifier shared by events in one operation.
- `actor`: service or user responsible for the operation.
- `resource`: resource kind, stable ID, and UID when known.
- `data`: event-specific, non-secret facts.

Provider registration currently emits:

- `cloudcommand.provider.registration.requested.v1`
- `cloudcommand.provider.registration.completed.v1`
- `cloudcommand.provider.registration.failed.v1`

Events are stored in `control-plane/api/data/events.ndjson`. Runtime data is
ignored by Git.

## Reading events

`GET /api/events` returns newest events first. It accepts optional query
parameters:

- `type`
- `operationId`
- `resourceId`
- `limit` (default 100, maximum 500)

The endpoint is deliberately read-only. There is no update or delete operation.

## Current boundary

The NDJSON store serializes concurrent appends within one API process. It does
not yet provide multi-process coordination, transactional commits across the
provider and event stores, retention policy, signatures, or tamper-evident
hashing. Those belong to the later persistence and immutable-audit milestones.
