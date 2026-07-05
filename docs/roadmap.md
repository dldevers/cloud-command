# CloudCommand Roadmap

## Phase 1: Architecture Baseline

- Define the CloudCommand purpose and boundaries
- Establish the Resource Model
- Define the conceptual provider interface
- Record foundational architecture decisions
- Keep documentation synchronized with implementation

## Phase 2: Domain Model

- Define the resource-request schema
- Define application and provider identities
- Define desired and observed state
- Define operation and error models
- Add schema validation

## Phase 3: Kubernetes Provider

- Discover provider capabilities
- Map initial Resource Classes to Kubernetes behavior
- Validate resource requests
- Plan provider operations
- Apply one workload
- Report workload status
- Reconcile desired and observed state

## Phase 4: First Vertical Slice

Demonstrate an end-to-end workflow:

1. Submit an application capacity request.
2. Validate the request.
3. Resolve Resource Classes.
4. Select the Kubernetes provider.
5. Apply the workload.
6. Observe provider state.
7. Report status through CloudCommand.

## Phase 5: Operational Interface

- Add API endpoints
- Add operation history
- Add health and readiness reporting
- Add runbook execution
- Add a minimal user interface

## Phase 6: Additional Providers

- Add a second provider implementation
- Validate that the resource model remains provider-independent
- Compare provider capabilities
- Introduce provider-selection policy

## Near-Term Definition of Done

The initial proof of concept is complete when an application can request a provider-neutral resource bundle and CloudCommand can satisfy it through Kubernetes without exposing Kubernetes as the application contract.
