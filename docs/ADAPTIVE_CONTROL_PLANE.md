# CloudCommand Adaptive Control Plane

CloudCommand is a universal control plane for managing applications across clouds.

This document defines the adaptive control-plane model behind CloudCommand Core: how CloudCommand understands application intent, profiles Runtime Containers, observes real behavior, evaluates Resource Providers, and makes placement, scaling, migration, and recovery decisions.

## Core Principle

Intent starts the model.

Observation corrects the model.

Policy guides the action.

## Product Boundary

CloudCommand does not manage infrastructure directly.

CloudCommand manages application intent across Resource Providers.

Resource Providers are responsible for translating CloudCommand intent into provider-specific implementation details.

CloudCommand should avoid exposing provider-specific infrastructure unless it is required for an application-level control decision.

## Control Model

Applications express intent.

Services compose applications.

Runtime Containers run services.

Resource Classes describe required capacity.

Resource Providers satisfy capacity.

Events describe state transitions.

Commands express operator intent.

Policies guide automated or assisted action.

CloudCommand reconciles desired state against provider reality.

## Runtime Container

A Runtime Container is the CloudCommand execution abstraction for a Service.

A Runtime Container is where a Service runs.

Runtime Containers may be backed by provider-specific implementations such as containers, pods, VMs, serverless functions, managed runtimes, jobs, local processes, or future execution models.

CloudCommand does not require the operator to manage those provider-specific details directly.

## Profile Truth Model

CloudCommand treats user-configured profiles as hints.

A declared profile expresses expected runtime shape, but it is not authoritative fact.

Declared profiles are intent.

Observed profiles are evidence.

Decision profiles are CloudCommand's current best model.

## Declared Profile

The Declared Profile is what the user, artifact, template, or manifest believes the Runtime Container needs.

It is a starting assumption, not truth.

## Test Profile

The Test Profile is what CloudCommand observes during controlled profiling.

A test profile may be created by running the Runtime Container in a local provider, development provider, staging provider, or controlled profiling environment.

## Observed Profile

The Observed Profile is what CloudCommand sees during real runtime.

It is based on events, pressure signals, failures, provider behavior, scaling history, migration history, and runtime telemetry.

## Decision Profile

The Decision Profile is CloudCommand's current best model for action.

It is the profile CloudCommand trusts for placement, scaling, migration, and recovery decisions.

## Adaptive Control Loop

CloudCommand does not simply deploy applications.

CloudCommand learns their runtime shape.

The adaptive control loop is:

Declared Profile
→ Test Profile
→ Observed Profile
→ Decision Profile
→ Placement / Scaling / Migration / Recovery Action
→ New Events
→ Updated Observed Profile
→ Updated Decision Profile

## Resource Classes

Resource Classes describe provider-independent capacity.

Initial Resource Class domains:

- C: Compute
- M: Memory
- S: Storage
- N: Network

Memory should be treated as a first-class Resource Class domain because many services are memory-sensitive, including Kafka, Redis, Postgres, JVM services, caches, AI services, and worker pools.

## Provider Capability Map

A Resource Provider should expose its available capacity and capabilities in CloudCommand terms.

CloudCommand should translate provider-specific resource names into Resource Classes.

CloudCommand should avoid forcing operators to reason about provider-specific names such as cloud instance types, Kubernetes node labels, storage class names, cloud disk names, VM sizes, or provider-specific network constructs.

## Provider Trust Profile

A Resource Provider may be technically healthy but still undesirable for a workload.

CloudCommand should track provider trust across multiple dimensions:

- health reliability
- performance reliability
- cost reliability
- capacity reliability
- billing predictability
- latency reliability
- migration reliability
- data locality fit
- policy compliance
- observed drift from declared capability

CloudCommand assumes Resource Providers are honest, but verifies provider behavior through observed application state, events, runtime pressure, and outcomes.

## Placement Policy

Placement Policy guides CloudCommand decisions.

A policy may express business priorities in simple terms, such as cost, performance, reliability, and latency.

Placement Policy allows CloudCommand to make recommendations or automated decisions that match business intent.

## Autopilot Modes

CloudCommand should support multiple automation modes:

### Manual

CloudCommand shows state and options. Human acts.

### Assisted

CloudCommand recommends actions. Human approves.

### Autopilot

CloudCommand executes approved action classes within policy.

### Emergency Autopilot

CloudCommand can act immediately to preserve service health, then reports what it did.

## CloudCommand Core

CloudCommand Core should run on the control plane.

Core responsibilities include:

- receiving application intent
- managing Runtime Container Profiles
- managing Resource Classes
- managing Provider Capability Maps
- managing Provider Trust Profiles
- evaluating Placement Policies
- reconciling desired state against provider reality
- emitting events
- accepting commands
- scheduling Runtime Containers
- pausing Runtime Containers
- restarting Runtime Containers
- migrating Runtime Containers
- draining providers or nodes
- coordinating Resource Provider adapters

## Resource Provider Adapter

A Resource Provider Adapter connects CloudCommand Core to a Resource Provider.

Adapter responsibilities may include reporting capacity, reporting health, translating Resource Classes, executing placement commands, executing scaling commands, executing migration commands, emitting provider events, and reporting runtime pressure.

## AI-Assisted Control

Future AI-assisted control should operate from structured CloudCommand facts.

AI should not make decisions from raw dashboard noise or generic best practices.

Useful AI inputs include:

- Runtime Container Profile
- Observed Profile
- Decision Profile
- Provider Capability Map
- Provider Trust Profile
- Placement Policy
- recent events
- failure history
- migration history
- cost reliability
- performance reliability

AI-assisted decisions should remain bounded by policy and action class.

## Design Mantras

CloudCommand operates above provider infrastructure.

CloudCommand manages application intent, not provider plumbing.

User-configured profiles are hints, not truth.

Intent starts the model.

Observation corrects the model.

Policy guides the action.

## Migration Strategy

Migration is not just moving a Runtime Container.

Migration is preparing a valid mirror, proving it works, then cutting over safely.

CloudCommand should model migration as a staged control-plane process, not a single provider operation.

A mature migration flow may include:

1. Prepare target Resource Provider
2. Create Mirrored Runtime Containers
3. Sync configuration and state
4. Validate target health
5. Optionally mirror traffic
6. Compare source and target behavior
7. Cut over active placement
8. Monitor post-cutover state
9. Retire source Runtime Containers when safe

This mirrors established enterprise deployment practices such as staged deployment, blue-green deployment, canary release, and controlled cutover, but expresses them through CloudCommand control-plane language.

## Mirrored Runtime Containers

A Mirrored Runtime Container is a temporary Runtime Container created on a target Resource Provider to mirror the state, configuration, profile, and expected behavior of an existing Runtime Container before migration or cutover.

CloudCommand may use Mirrored Runtime Containers to prepare, validate, and compare target placements before migration cutover.

CloudCommand migrations are staged cutovers, not blind moves.

