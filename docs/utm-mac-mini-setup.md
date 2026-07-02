# CloudCommand

**Provider-independent control plane for hybrid multi-cloud environments.**

> Applications request capacity. Providers satisfy that request.

CloudCommand is a provider-independent operations platform for deploying and managing workloads across on-premises and cloud infrastructure.

It provides a consistent operational interface while keeping infrastructure-specific implementation details behind standardized provider and resource abstractions.

CloudCommand manages the cloud as a service platform—not as a collection of individual machines.

## Project Philosophy

Cloud computing was never intended to expose infrastructure.

It was intended to provide capacity without requiring application teams to understand or manage the underlying implementation.

Applications should request **capacity**, not hardware.

Applications should not need to care whether that capacity is implemented using:

- Kubernetes
- Virtual machines
- Bare metal
- Amazon Web Services
- Microsoft Azure
- Google Cloud Platform
- Proxmox
- VMware
- Future infrastructure providers

Those implementation details belong to the provider layer.

CloudCommand exists to preserve that abstraction.

## Operational Model

![CloudCommand operational model showing how services run on clouds, clouds contain providers, providers contribute resource units, and services request and consume resource units.](docs/images/cloudportal-operational-model.png)

CloudCommand uses a provider-independent resource model:

- **Services** request capacity.
- **Clouds** provide an operational boundary.
- **Providers** contribute infrastructure capabilities.
- **Resource Units** describe the capacity available to services.

A cloud may contain one provider or many providers.

For example, a single CloudCommand environment could combine:

- An on-premises Kubernetes cluster
- Bare-metal compute nodes
- Amazon EKS
- Azure Kubernetes Service
- Google Kubernetes Engine
- Virtual-machine infrastructure
- Additional future providers

The application-facing resource model remains consistent regardless of how the underlying capacity is implemented.

## Resource Model

The Resource Model is the foundation of CloudCommand.

Applications request standardized **Resource Classes**.

Providers satisfy those requests.

Hardware is only one possible implementation.

### Compute Resources

- `C1`
- `C2`
- `C3`

### Storage Resources

- `S1`
- `S2`
- `S3`

### Network Resources

- `N1`
- `N2`
- `N3`

Resource Classes describe capabilities and service expectations rather than specific hardware models.

This allows the underlying provider implementation to change without requiring the application model to change.

## Provider Model

Providers make infrastructure capacity available to CloudCommand.

A provider may represent:

- An on-premises Kubernetes cluster
- A managed Kubernetes service
- A bare-metal environment
- A virtual-machine platform
- A public-cloud account
- A specialized storage or network service
- A future infrastructure implementation

Kubernetes is the first reference provider, but Kubernetes is not the CloudCommand product model.

It is one implementation of the provider interface.

## Kubernetes Reference Provider

The first CloudCommand provider targets an on-premises Kubernetes cluster.

This provider serves as:

- A working reference implementation
- A reproducible infrastructure environment
- A platform for testing CloudCommand functionality
- A practical demonstration of provider-independent operations
- A foundation for future provider integrations

The Kubernetes environment is built from commodity hardware and virtual machines, making it accessible to engineers who want to reproduce the architecture without purchasing enterprise infrastructure.

## Build Your Own Kubernetes Provider

You can reproduce the initial Kubernetes provider using a base-model Apple M4 Mac Mini and UTM virtual machines.

[Create Your Own Kubernetes Cloud Provider on a Base-Model M4 Mac Mini](docs/utm-mac-mini-setup.md)

The guide covers the initial virtual-machine environment, Kubernetes control-plane and worker-node configuration, networking, and the process for preparing the cluster as a CloudCommand provider.

## Current Status

CloudCommand is under active development.

Current work includes:

- Defining the provider-independent resource model
- Building the Kubernetes reference provider
- Creating reproducible infrastructure documentation
- Developing operational workflows and runbooks
- Designing provider registration and discovery
- Establishing service-to-resource mapping
- Building the CloudCommand operational interface

## Design Principles

CloudCommand is being developed around several core principles:

### Provider Independence

Applications interact with standardized resources rather than provider-specific infrastructure.

### Reproducibility

Infrastructure should be documented, version-controlled, and rebuildable from known components.

### Operational Clarity

System state, capacity, health, and operational actions should be visible through a consistent interface.

### Commodity Accessibility

A functional provider should be reproducible using widely available commodity hardware.

### Automation with Human Authority

CloudCommand should automate repeatable operational work while keeping important infrastructure decisions visible and controllable.

### Extensibility

New infrastructure providers should be able to integrate without changing the application-facing resource model.

## Repository Structure

```text
.
├── docs/
│   ├── images/
│   └── utm-mac-mini-setup.md
├── README.md
└── LICENSE
