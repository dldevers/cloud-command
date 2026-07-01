# CloudCommand

> **Provider-independent control plane for hybrid multi-cloud environments.**

Applications request capacity. Providers satisfy that request.

---

## Overview

CloudCommand provides a unified operational model for managing applications across hybrid and multi-cloud environments.

Rather than exposing infrastructure, CloudCommand abstracts infrastructure providers behind standardized Resource Classes, allowing applications to request capacity without needing to understand how or where that capacity is implemented.

Whether capacity comes from:

- Kubernetes
- Bare metal
- Virtual machines
- Amazon EKS
- Azure AKS
- Google GKE
- Future providers

Applications interact with the same operational model.

---

## Philosophy

Infrastructure is an implementation detail.

Applications should request capacity—not hardware.

Providers satisfy those requests using the infrastructure best suited for the environment.

This separation allows workloads to move seamlessly between on-premises infrastructure and public cloud providers without changing the application model.

---

## Core Concepts

### Provider Independence

CloudCommand is designed to operate across heterogeneous infrastructure providers through a common abstraction layer.

### Resource Classes

Resource Classes define the capacity an application requires.

Providers implement Resource Classes using whatever infrastructure they manage.

### Operational Control Plane

CloudCommand provides a single operational interface for deploying, managing, scaling, and operating workloads regardless of where they execute.

---

## Goals

- Provider independence
- Hybrid cloud operations
- Multi-cloud orchestration
- Infrastructure abstraction
- Standardized operational workflows
- Resource-class driven architecture

---

## Status

CloudCommand is currently under active development as a proof-of-concept platform demonstrating provider-independent operations for hybrid and multi-cloud environments.

The initial implementation is being developed against the LaCasa on-prem Kubernetes environment and will expand to additional providers over time.

---

## License

Apache-2.0
