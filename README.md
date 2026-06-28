# CloudPortal

CloudPortal is a provider-independent operations platform for managing workloads across on-premises and cloud infrastructure.

Its purpose is to provide a consistent operational interface for deploying and managing workloads across multiple infrastructure providers while hiding provider-specific implementation details behind standardized Resource Classes.

CloudPortal provides a consistent operational layer across infrastructure providers.

## Core Principle

Applications request capacity, not hardware.

An application should not need to know whether its capacity is implemented by:

- Kubernetes
- Virtual machines
- Bare metal
- Amazon EKS
- Azure AKS
- Google GKE
- A future infrastructure provider

Those details belong to the provider layer.

## Resource Domains

CloudPortal currently defines three resource domains:

### Compute

- C1
- C2
- C3

### Storage

- S1
- S2
- S3

### Network

- N1
- N2
- N3

Resource Classes describe operational capability rather than a specific product, platform, or machine type.

## Initial Architecture

CloudPortal will contain:

- A resource model
- A provider-neutral control plane
- Provider adapters
- Operational workflows and runbooks
- A user-facing operations interface
- State and observability for managed resources

The first implementation provider will target an on-premises Kubernetes cluster, but Kubernetes is an implementation detail rather than the CloudPortal product model.

## Project Status

CloudPortal is currently in the architecture and documentation phase.

The first development milestone is a narrow vertical slice in which:

1. An application requests a Resource Class.
2. CloudPortal validates the request.
3. A provider adapter translates the request.
4. The provider creates or assigns capacity.
5. CloudPortal reports the resulting state.

## Documentation

- [Architecture](docs/architecture.md)
- [Resource Model](docs/resource-model.md)
- [Provider Interface](docs/provider-interface.md)
- [Roadmap](docs/roadmap.md)
- [Architecture Decision Records](docs/decisions/)

## License

CloudPortal is licensed under the Apache License 2.0.
