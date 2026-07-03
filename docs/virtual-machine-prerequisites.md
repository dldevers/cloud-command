# Virtual Machine Prerequisites

This guide describes the minimum virtual-machine requirements for building a Kubernetes cluster that can be registered with CloudCommand.

CloudCommand does not depend on a particular hypervisor or virtualization platform.

You may create the virtual machines using any platform that can run Linux and provide working network connectivity between the nodes.

Examples include:

- UTM
- VMware
- Proxmox
- Hyper-V
- VirtualBox
- Public-cloud virtual machines
- Bare-metal systems
- Other compatible virtualization platforms

CloudCommand does not require platform-specific integration at this stage. The underlying platform is an implementation detail.

## Required Topology

The standard CloudCommand Kubernetes lab uses three machines:

| Role | Suggested hostname | Purpose |
|---|---|---|
| Control plane | `lacasa-cp1` | Runs the Kubernetes control plane |
| Worker node 1 | `lacasa-worker1` | Runs application workloads |
| Worker node 2 | `lacasa-worker2` | Runs application workloads |

You may use different hostnames, but each machine must have a unique and stable hostname.

## Operating-System Requirements

Each machine should run a supported Linux distribution.

The existing Kubernetes setup guide was written and tested using Ubuntu Server.

For the smoothest installation experience, use the same Ubuntu Server release on all three machines.

Each machine should have:

- A non-root administrative user
- `sudo` access
- SSH enabled
- A unique hostname
- A stable IP address
- Internet access during installation
- Network access to the other cluster nodes

## Suggested Resources

The exact resource requirements depend on the workloads you plan to run.

For a small development or demonstration cluster, the following is a reasonable starting point.

### Control-plane node

- 2 or more CPU cores
- 4 GB or more memory
- 25 GB or more storage

### Worker nodes

Each worker should have:

- 2 or more CPU cores
- 4 GB or more memory
- 25 GB or more storage

More CPU, memory, and storage can be assigned when available.

The three machines do not need to have identical hardware.

## Network Requirements

All three machines must be able to communicate directly with one another.

At minimum:

- The control-plane node must reach both workers.
- Each worker must reach the control-plane node.
- The worker nodes should reach one another.
- The administration machine must reach the control-plane node.
- The CloudCommand host must reach the Kubernetes API endpoint.
- SSH access should work from the administration machine to all three nodes.

The cluster nodes should remain on the same reachable network unless you have intentionally configured routing between networks.

CloudCommand does not require a specific network range.

## Stable IP Addresses

Each machine should have a stable IP address.

You may provide stable addressing using:

- Static IP configuration inside the guest operating system
- DHCP reservations on the router
- Hypervisor-managed network reservations
- Cloud-provider private IP assignments
- Another reliable addressing method

The important requirement is that the node addresses do not unexpectedly change after the cluster is configured.

Example addressing:

```text
192.168.64.10  lacasa-cp1
192.168.64.11  lacasa-worker1
192.168.64.12  lacasa-worker2
```

These addresses are examples only. Use addresses appropriate for your environment.

## Hostname Resolution

Each node must be able to resolve the hostnames of the other nodes.

You may use:

- Local DNS
- Router-provided DNS
- Cloud-provider DNS
- Entries in `/etc/hosts`

A simple `/etc/hosts` configuration might look like:

```text
192.168.64.10  lacasa-cp1
192.168.64.11  lacasa-worker1
192.168.64.12  lacasa-worker2
```

Use the actual IP addresses and hostnames from your environment.

## Validate the Hostnames

On each node, check the configured hostname:

```bash
hostname
hostnamectl
```

Expected examples:

```text
lacasa-cp1
lacasa-worker1
lacasa-worker2
```

Each machine must report a different hostname.

## Validate IP Addresses

On each node, inspect its network addresses:

```bash
ip address
```

A shorter view is available with:

```bash
hostname -I
```

Record the stable IP address assigned to each node.

## Validate Node-to-Node Connectivity

From the control-plane node, test both workers:

```bash
ping -c 3 lacasa-worker1
ping -c 3 lacasa-worker2
```

From worker node 1, test the control plane and worker node 2:

```bash
ping -c 3 lacasa-cp1
ping -c 3 lacasa-worker2
```

From worker node 2, test the control plane and worker node 1:

```bash
ping -c 3 lacasa-cp1
ping -c 3 lacasa-worker1
```

You may also test using IP addresses:

```bash
ping -c 3 CONTROL_PLANE_IP
ping -c 3 WORKER_1_IP
ping -c 3 WORKER_2_IP
```

All tests should complete without packet loss before you begin the Kubernetes installation.

## Validate SSH Access

From the administration machine, confirm that SSH access works for every node:

```bash
ssh USERNAME@CONTROL_PLANE_IP
ssh USERNAME@WORKER_1_IP
ssh USERNAME@WORKER_2_IP
```

Replace the placeholders with the username and IP addresses used in your environment.

Example:

```bash
ssh dave@192.168.64.10
ssh dave@192.168.64.11
ssh dave@192.168.64.12
```

You should be able to log in to all three machines and run commands with `sudo`.

## Validate Internet Access

Each node requires internet access while installing Kubernetes packages, container runtimes, and supporting software.

Test connectivity from every node:

```bash
ping -c 3 1.1.1.1
```

Then test DNS resolution:

```bash
ping -c 3 github.com
```

If the first command works but the second fails, the machine likely has a DNS configuration problem.

## Validate Time Synchronization

Kubernetes nodes should have synchronized system clocks.

Check the current time:

```bash
timedatectl
```

Confirm that the output reports synchronized time.

On Ubuntu, the following should normally be enabled:

```text
System clock synchronized: yes
NTP service: active
```

If necessary, enable network time synchronization:

```bash
sudo timedatectl set-ntp true
```

## Disable Conflicting Clones or Duplicate Identities

When virtual machines are created by cloning an existing machine, verify that each clone has its own:

- Hostname
- IP address
- Machine identity
- SSH host keys

Do not begin the Kubernetes installation while multiple machines share the same hostname or IP address.

## Preinstallation Checklist

Before continuing, verify all of the following:

- [ ] Three Linux machines are running.
- [ ] One machine is designated as the control plane.
- [ ] Two machines are designated as workers.
- [ ] Every machine has a unique hostname.
- [ ] Every machine has a stable IP address.
- [ ] All three machines can reach one another.
- [ ] Hostname resolution works between the nodes.
- [ ] SSH access works from the administration machine.
- [ ] The administrative user has `sudo` access.
- [ ] Every machine has internet access.
- [ ] DNS resolution works.
- [ ] System clocks are synchronized.
- [ ] No two machines share the same network identity.

## Continue the Kubernetes Installation

Once the three machines can communicate successfully, continue with the standard Kubernetes cluster setup process.

The current installation guide includes both the UTM virtual-machine workflow and the Kubernetes cluster configuration:

[Build the Kubernetes cluster on a Mac Mini with UTM](utm-mac-mini-setup.md)

Readers using another virtualization platform can skip the UTM-specific machine-creation steps and begin with the operating-system and Kubernetes configuration sections.

## Register the Finished Cluster

After the Kubernetes cluster is running and all nodes report `Ready`, register it with CloudCommand:

[Register the Kubernetes cluster in CloudCommand](cloudcommand-provider-setup.md)

CloudCommand discovers the cluster through the Kubernetes API and active kubeconfig.

The underlying virtualization platform does not affect the provider-registration workflow.
