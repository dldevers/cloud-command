# Resource Model

## Overview

The Resource Model is the foundation of CloudCommand.

Applications request Resource Classes. Providers satisfy those classes.

A Resource Class describes a capability and service expectation. It does not describe a specific server, cloud product, Kubernetes object, or hardware configuration.

## Resource Domains

### Compute

- C1
- C2
- C3

Compute classes describe progressively different compute capabilities and operational expectations.

Possible attributes include:

- CPU capacity
- Memory capacity
- Availability expectations
- Scheduling guarantees
- Workload isolation
- Scaling behavior

### Storage

- S1
- S2
- S3

Storage classes describe storage capabilities and operational expectations.

Possible attributes include:

- Capacity
- Persistence
- Performance
- Replication
- Backup expectations
- Recovery objectives

### Network

- N1
- N2
- N3

Network classes describe connectivity and traffic-handling capabilities.

Possible attributes include:

- Internal connectivity
- External exposure
- Bandwidth expectations
- Load balancing
- Address stability
- Network policy
- Encryption requirements

## Class Semantics

The exact definitions of C1-C3, S1-S3, and N1-N3 will be established through explicit versioned specifications.

Class definitions must be:

- Provider-independent
- Testable
- Observable
- Versioned
- Understandable by application teams
- Implementable by more than one provider where practical

## Composition

A workload request may combine classes from multiple domains.

Example:

```yaml
resources:
  compute: C1
  storage: S1
  network: N1

```

This request describes required capabilities. It does not prescribe how those capabilities are implemented.

## Provider Mapping

Each provider publishes the Resource Classes it supports and the implementation used to satisfy them.

For example, a Kubernetes provider might map:

- C1 to a namespace, resource quota, and workload policy
- S1 to a persistent volume class
- N1 to an internal service and network policy

Those mappings remain provider details and are not part of the application contract.

## Future Work

Each Resource Class will eventually define:

- Required capabilities
- Optional capabilities
- Service-level expectations
- Validation rules
- Provider conformance tests
- Upgrade and compatibility rules
