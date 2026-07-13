# ADR 0001: Applications Request Resource Classes

- Status: Accepted
- Date: 2026-06-27

## Context

Infrastructure platforms commonly expose implementation details directly to application teams.

This creates coupling between applications and technologies such as:

- Kubernetes
- Virtual machines
- Bare metal
- Cloud instance types
- Provider-specific storage
- Provider-specific networking

That coupling makes infrastructure migrations, hybrid environments, and provider replacement unnecessarily difficult.

CloudCommand requires a stable application-facing model that can survive changes in infrastructure implementation.

## Decision

Applications will request capacity through standardized Resource Classes.

Applications will not directly request infrastructure implementations such as Kubernetes, virtual machines, bare metal, EKS, AKS, or GKE.

Providers will map Resource Classes to implementation-specific resources and operations.

## Consequences

### Positive

- Applications remain independent of provider implementation.
- Providers can evolve without changing the application contract.
- Hybrid and multi-provider operation becomes possible.
- Resource requirements can be validated consistently.
- Provider implementations can be tested for conformance.

### Negative

- Resource Classes require careful definition.
- Some provider capabilities may not map cleanly to a common model.
- The abstraction must avoid becoming either too vague or too provider-specific.
- Provider-specific escape hatches may eventually be necessary.

## Notes

The initial Kubernetes provider will test this decision.

Kubernetes is the first implementation target, not the CloudCommand application model.
