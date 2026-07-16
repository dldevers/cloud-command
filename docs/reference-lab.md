# CloudCommand Reference Kubernetes Lab

## Purpose

The reference lab tests whether affordable, low-power micro PCs can reproduce
enough of a larger Kubernetes environment to support serious development,
training, integration testing, failure exercises, and public technical
demonstrations without requiring a rack-scale lab.

The hardware is not presented as equivalent to a production datacenter. The
goal is to reproduce the operational model faithfully: separate control-plane
and worker roles, standard Kubernetes lifecycle operations, scheduling,
networking, GitOps, observability, upgrades, recovery, and eventually multiple
physical failure domains.

## Committed software baseline

The first version is a standard upstream Kubernetes cluster built with
`kubeadm`, with multiple Linux virtual machines running on one base-model Apple
M4 Mac Mini with 16 GB of memory:

- one dedicated control-plane VM
- multiple dedicated worker VMs
- Ubuntu Server
- `containerd` as the container runtime
- `kubelet`, `kubeadm`, and `kubectl` from the upstream Kubernetes package
  repositories
- one documented CNI selected during implementation
- Argo CD and application workloads scheduled on worker nodes
- repeatable configuration, commands, checks, and decisions captured in this
  repository

This is not a K3s, MicroK8s, minikube, or managed-Kubernetes environment.

## Initial topology

The initial cluster runs on one base-model Apple M4 Mac Mini acquired for
approximately USD 500 through Apple's education store. It has a real multi-node
Kubernetes topology but only one physical failure domain.

The acquisition price is historical. On 2026-07-16, Apple's U.S. Education
Store listed Mac Mini models from USD 699. Current price, configuration, and
education eligibility must be verified before using the Mac Mini as a purchasing
comparison:

https://www.apple.com/us-edu/shop/buy-mac

| Role | Initial allocation | Scheduling policy |
|---|---:|---|
| Control plane | 2 vCPU, 2 GiB RAM | Retain the standard control-plane `NoSchedule` taint |
| Worker VM | 2 vCPU, 4 GiB RAM | Run platform services and application workloads |
| Additional workers | Add within host limits | Increase node count only while preserving host headroom |

The control plane is reserved for `kube-apiserver`, `etcd`,
`kube-controller-manager`, and `kube-scheduler`. Node-level DaemonSets may run
there when required. A deliberately selected infrastructure or diagnostic pod
may tolerate the control-plane taint, but ordinary workloads must not be
scheduled there.

Two GiB is the starting allocation, not a permanent ceiling. Memory pressure,
component restarts, or OOM events are evidence to resize the VM to 3-4 GiB.

## Capacity envelope

The bootstrap itself is not expected to require a 48 GB host. Capacity must be
reserved instead of assigning all physical memory to virtual machines.

For a 32 GB x86-64 host, the initial safe envelope is:

- 4-6 GB reserved for the host and hypervisor
- one 2 GB control-plane VM
- four 4 GB worker VMs
- 8-10 GB left uncommitted for hypervisor overhead, filesystem cache, temporary
  spikes, and measured growth

This is enough to bootstrap Kubernetes and run a useful non-HA development
stack that includes Argo CD, ingress, certificate management, metrics, a small
database, and representative services. Heavy observability retention, multiple
databases, CI runners, and broad failure simulations should be introduced only
after measuring the baseline.

A 48 GB host materially increases workload headroom, but it is not a bootstrap
prerequisite. The 32 GB baseline must be tested before the documentation claims
that an upgrade is required.

## Bootstrap demonstration

The clean rebuild will be both a reproducible runbook and a screen-recorded
public demonstration:

1. Provision clean Ubuntu Server VMs.
2. Assign stable hostnames and addresses and validate node-to-node access.
3. Configure kernel modules, forwarding, cgroups, and swap policy.
4. Install and configure `containerd`.
5. Install version-matched `kubelet`, `kubeadm`, and `kubectl` packages.
6. Initialize the control plane with `kubeadm init`.
7. Install and validate the selected CNI.
8. Join worker nodes with `kubeadm join`.
9. Verify node readiness, CoreDNS, pod networking, service networking, and
   workload scheduling.
10. Install Argo CD on workers and bootstrap the GitOps repository.
11. Capture versions, commands, output, failures, corrections, and validation
    evidence in the repository.

The recording should distinguish the observed result from the intended result.
Failures and corrections are part of the evidence rather than material to hide.

Before recording, run the entire process as a rehearsal using the same VM
sizes, Kubernetes version, CNI, network, and service manifests. Destroy and
recreate the rehearsal cluster for the recorded run. Record only after the
following checks pass:

- the host retains memory headroom throughout `kubeadm init` and worker joins
- required images can be pulled successfully
- every worker reaches `Ready`
- CoreDNS and the CNI are healthy
- Argo CD reconciles the demonstration application on workers
- the service stack survives a controlled worker restart

This controls demo risk without presenting a prebuilt cluster as a fresh
bootstrap.

## Expansion to a second physical host

The planned ACEMAGIC M5 adds x86-64 capacity and a second physical machine. It
allows the lab to test mixed-architecture images where supported, node loss,
placement constraints, resource pressure, rescheduling, and the practical
limits of a commodity micro-PC lab.

Adding a second host does not by itself create a production-grade highly
available control plane. Physical failure-domain claims must match the actual
placement of control-plane and worker VMs.

## Public decision process

Material decisions should be documented before or when they are implemented:

- the problem or constraint
- alternatives considered
- verified specifications and prices, with observation dates
- the chosen option and reasons
- risks and rejected tradeoffs
- validation criteria
- evidence collected after implementation

Hardware selection and the current memory strategy are recorded in
[ADR 0002](decisions/0002-reference-lab-hardware-and-memory.md).

## Success criteria

The first public baseline is complete when another person can use the
repository to recreate the cluster and verify:

- upstream Kubernetes was bootstrapped with `kubeadm`
- the control plane is isolated from ordinary workloads
- Argo CD runs on worker capacity and reconciles a repository-defined workload
- cluster DNS and pod/service networking work
- a node can be removed and rejoined predictably
- resource pressure and component health can be observed
- the documentation states the remaining single-host limitations honestly

## Primary sources

- Kubernetes `kubeadm` cluster creation:
  https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Kubernetes highly available `kubeadm` topology:
  https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/
- Argo CD installation options:
  https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
