# Create Your Own Kubernetes Cloud Provider on a Base-Model M4 Mac Mini

This guide walks through building a three-node Kubernetes cluster on a base-model Apple M4 Mac Mini using UTM and Ubuntu Server.

The finished environment consists of:

- One Kubernetes control-plane VM
- Two Kubernetes worker VMs
- Ubuntu Server for ARM64
- Kubernetes installed with `kubeadm`
- Containerd as the container runtime
- A reproducible foundation for the CloudCommand Kubernetes reference provider

The completed virtual cluster can be used as:

- A CloudCommand reference provider
- A Kubernetes development environment
- An infrastructure automation lab
- A platform for testing runbooks
- A reproducible SRE portfolio project

> CloudCommand is provider-independent. Kubernetes is the first reference provider, not the CloudCommand product model.

## Architecture

The Kubernetes provider uses three Ubuntu Server virtual machines:

| Virtual Machine | Role | vCPUs | Memory | Disk |
|---|---|---:|---:|---:|
| `k8s-control-1` | Kubernetes control plane | 2 | 4 GB | 20 GB |
| `k8s-worker-1` | Kubernetes worker | 2 | 4 GB | 20 GB |
| `k8s-worker-2` | Kubernetes worker | 2 | 4 GB | 20 GB |

The virtual disks are thin-provisioned, so UTM does not immediately consume the full configured disk capacity.

The three VMs require a combined maximum allocation of:

- 6 virtual CPU cores
- 12 GB of memory
- 60 GB of thin-provisioned storage

This configuration is intentionally modest so that the cluster can run on a base-model M4 Mac Mini while leaving resources available for macOS and CloudCommand development.

## Prerequisites

Before beginning, you need:

- A base-model Apple M4 Mac Mini
- macOS
- At least 60 GB of available storage
- A working internet connection
- Administrative access to the Mac
- Basic familiarity with Linux commands

## Download UTM

Download UTM directly from the official UTM website:

[Download UTM from the official website](https://mac.getutm.app/)

The direct-download version is free and provides the functionality needed for this guide.

Install UTM by opening the downloaded disk image and dragging UTM into the macOS Applications folder.

## Download Ubuntu Server for ARM64

Download the current Ubuntu Server LTS release for ARM64:

[Download Ubuntu Server for ARM64](https://ubuntu.com/download/server/arm)

The downloaded installer should be an ARM64 ISO image.

Do not download the AMD64 or x86-64 installer. The M4 Mac Mini uses Apple Silicon, so the virtual machines should run the ARM64 version of Ubuntu.

## Create the First Ubuntu Virtual Machine

The first VM will become the template for all three Kubernetes nodes.

Open UTM and select:

1. **Create a New Virtual Machine**
2. **Virtualize**
3. **Linux**

Choose virtualization rather than emulation. Virtualization allows the ARM64 Ubuntu guest to run efficiently on Apple Silicon.

## Select the Ubuntu ISO

On the Linux configuration screen:

1. Enable **Boot from kernel image** only if required by the UTM version you are using.
2. Select the downloaded Ubuntu Server ARM64 ISO as the boot image.
3. Continue to the hardware configuration.

In most current versions of UTM, selecting the ISO under the boot media or CD/DVD field is sufficient.

## Configure VM Hardware

Configure the first VM with the following resources:

- **Memory:** `4096 MiB`
- **CPU cores:** `2`
- **Storage:** `20 GB`
- **Architecture:** ARM64
- **Virtualization:** Apple Virtualization or QEMU virtualization
- **Display output:** Enabled
- **Hardware OpenGL acceleration:** Disabled

Leave the virtual disk thin-provisioned.

The first VM can temporarily be named:

```text
ubuntu-k8s-template
```

This VM will be prepared, shut down, and cloned to create the three Kubernetes nodes.

## Configure Networking

Use UTM's shared networking mode for the initial provider environment.

Shared networking gives each VM:

- Outbound internet access
- A private virtual IP address
- Connectivity to the other VMs on the same UTM network
- Isolation from the physical LAN

In the VM configuration, confirm that a virtual network adapter exists and that its network mode is set to:

```text
Shared Network
```

Use a paravirtualized network adapter when available.

Common adapter choices include:

```text
virtio-net-pci
```

or the default network adapter selected by UTM.

## Install Ubuntu Server

Start the VM and boot from the Ubuntu Server ISO.

Follow the Ubuntu installer prompts.

Recommended settings:

- Language: English
- Keyboard layout: Your preferred layout
- Installation type: Ubuntu Server
- Network configuration: DHCP
- Proxy: Leave blank unless required
- Storage: Use the entire virtual disk
- OpenSSH server: Install
- Additional server packages: None required

Create a Linux user account.

For example:

```text
Username: dave
```

Choose a secure password that you can enter through the UTM console.

During installation, enable the OpenSSH server so that the nodes can be managed from the macOS Terminal after installation.

When installation is complete:

1. Reboot the VM.
2. Eject or remove the Ubuntu installer ISO if UTM does not remove it automatically.
3. Log in to Ubuntu.

## Update Ubuntu

After logging in, update the operating system:

```bash
sudo apt update
sudo apt full-upgrade -y
```

Install several useful administration packages:

```bash
sudo apt install -y \
  curl \
  ca-certificates \
  gnupg \
  apt-transport-https \
  software-properties-common \
  vim \
  git \
  jq
```

Reboot if the upgrade installed a new kernel:

```bash
sudo reboot
```

## Determine the VM IP Address

After the VM restarts, display its IP addresses:

```bash
hostname -I
```

You can also inspect the network interfaces:

```bash
ip address
```

Look for the private address assigned to the primary network interface.

Test SSH access from the Mac:

```bash
ssh dave@VM_IP_ADDRESS
```

Replace `VM_IP_ADDRESS` with the address shown inside Ubuntu.

Example:

```bash
ssh dave@192.168.64.4
```

UTM shared-network IP addresses may change after a VM is restarted. Static addressing or DHCP reservations can be introduced later if the environment requires persistent addresses.

## Prepare the Ubuntu Template

Before cloning the VM, perform the operating-system configuration that every Kubernetes node requires.

### Disable Swap

Kubernetes nodes should not use traditional swap unless Kubernetes has been explicitly configured to support it.

Disable swap immediately:

```bash
sudo swapoff -a
```

Prevent swap from returning after a reboot:

```bash
sudo sed -i.bak '/\sswap\s/s/^/#/' /etc/fstab
```

Confirm that swap is disabled:

```bash
swapon --show
```

The command should produce no output.

### Load Required Kernel Modules

Create a module configuration file:

```bash
cat <<'EOF' | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
```

Load the modules:

```bash
sudo modprobe overlay
sudo modprobe br_netfilter
```

Verify that they are loaded:

```bash
lsmod | grep -E 'overlay|br_netfilter'
```

### Configure Kubernetes Networking Parameters

Create the Kubernetes sysctl configuration:

```bash
cat <<'EOF' | sudo tee /etc/sysctl.d/99-kubernetes-cri.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
```

Apply the settings:

```bash
sudo sysctl --system
```

Verify IP forwarding:

```bash
sysctl net.ipv4.ip_forward
```

Expected output:

```text
net.ipv4.ip_forward = 1
```

## Install Containerd

Install containerd:

```bash
sudo apt install -y containerd
```

Create the containerd configuration directory:

```bash
sudo mkdir -p /etc/containerd
```

Generate the default configuration:

```bash
containerd config default | sudo tee /etc/containerd/config.toml > /dev/null
```

Configure containerd to use the systemd cgroup driver:

```bash
sudo sed -i \
  's/SystemdCgroup = false/SystemdCgroup = true/' \
  /etc/containerd/config.toml
```

Restart and enable containerd:

```bash
sudo systemctl restart containerd
sudo systemctl enable containerd
```

Confirm that it is running:

```bash
sudo systemctl status containerd --no-pager
```

The service should report:

```text
active (running)
```

## Install Kubernetes Packages

Create the Kubernetes APT keyring directory:

```bash
sudo mkdir -p -m 755 /etc/apt/keyrings
```

The Kubernetes package repository is organized by minor release. Set the desired release channel before installing.

For example:

```bash
KUBERNETES_MINOR="v1.36"
```

Download and install the repository signing key:

```bash
curl -fsSL \
  "https://pkgs.k8s.io/core:/stable:/${KUBERNETES_MINOR}/deb/Release.key" \
  | sudo gpg --dearmor \
  -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
```

Add the Kubernetes package repository:

```bash
echo \
  "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/${KUBERNETES_MINOR}/deb/ /" \
  | sudo tee /etc/apt/sources.list.d/kubernetes.list
```

Update the package index:

```bash
sudo apt update
```

Install the Kubernetes components:

```bash
sudo apt install -y kubelet kubeadm kubectl
```

Prevent the packages from being upgraded unexpectedly:

```bash
sudo apt-mark hold kubelet kubeadm kubectl
```

Enable the kubelet service:

```bash
sudo systemctl enable kubelet
```

The kubelet may repeatedly restart at this stage. That is expected because the node has not yet been initialized or joined to a Kubernetes cluster.

## Clean the Template Before Cloning

The VMs must not share the same machine identity.

Clear the machine ID from the template:

```bash
sudo truncate -s 0 /etc/machine-id
```

Remove the D-Bus machine ID if it exists:

```bash
sudo rm -f /var/lib/dbus/machine-id
```

Regenerate the SSH host keys independently on each clone by removing the template keys:

```bash
sudo rm -f /etc/ssh/ssh_host_*
```

Clear the cloud-init instance state:

```bash
sudo cloud-init clean --logs
```

Clear the shell history:

```bash
history -c
```

Shut down the template:

```bash
sudo shutdown -h now
```

Do not start the template again before cloning it.

## Clone the Template

In UTM, duplicate the prepared VM three times.

Create the following VMs:

```text
k8s-control-1
k8s-worker-1
k8s-worker-2
```

Keep the original template powered off as a reusable recovery image.

Each cloned VM should retain:

- 2 virtual CPU cores
- 4 GB of memory
- 20 GB of thin-provisioned storage
- Shared UTM networking
- The ARM64 Ubuntu installation
- Containerd
- Kubernetes packages

## Configure the Control-Plane Node

Start:

```text
k8s-control-1
```

Log in through the UTM console.

Set its hostname:

```bash
sudo hostnamectl set-hostname k8s-control-1
```

Recreate the machine ID:

```bash
sudo systemd-machine-id-setup
```

Regenerate the SSH host keys:

```bash
sudo ssh-keygen -A
```

Reboot:

```bash
sudo reboot
```

After the VM restarts, verify the hostname:

```bash
hostname
```

Expected result:

```text
k8s-control-1
```

Determine its IP address:

```bash
hostname -I
```

Record the address. It will be used to initialize the Kubernetes API server.

## Configure the First Worker Node

Start:

```text
k8s-worker-1
```

Set its hostname:

```bash
sudo hostnamectl set-hostname k8s-worker-1
```

Recreate its machine ID:

```bash
sudo systemd-machine-id-setup
```

Regenerate its SSH host keys:

```bash
sudo ssh-keygen -A
```

Reboot:

```bash
sudo reboot
```

After the reboot, verify the hostname and IP address:

```bash
hostname
hostname -I
```

## Configure the Second Worker Node

Start:

```text
k8s-worker-2
```

Set its hostname:

```bash
sudo hostnamectl set-hostname k8s-worker-2
```

Recreate its machine ID:

```bash
sudo systemd-machine-id-setup
```

Regenerate its SSH host keys:

```bash
sudo ssh-keygen -A
```

Reboot:

```bash
sudo reboot
```

After the reboot, verify the hostname and IP address:

```bash
hostname
hostname -I
```

## Verify Node-to-Node Connectivity

Before initializing Kubernetes, confirm that all three nodes can communicate.

From the control-plane node, ping each worker:

```bash
ping -c 3 k8s-worker-1
ping -c 3 k8s-worker-2
```

If hostname resolution is not available, use the worker-node IP addresses:

```bash
ping -c 3 WORKER_1_IP
ping -c 3 WORKER_2_IP
```

Perform the same test from each worker to the control-plane IP address.

## Optional Local Hostname Resolution

When local DNS is not available, add all three nodes to `/etc/hosts` on every VM.

Example:

```text
192.168.64.4  k8s-control-1
192.168.64.5  k8s-worker-1
192.168.64.6  k8s-worker-2
```

Edit the file:

```bash
sudo vim /etc/hosts
```

Use the actual addresses assigned to your VMs.

Verify resolution:

```bash
getent hosts k8s-control-1
getent hosts k8s-worker-1
getent hosts k8s-worker-2
```

## Initialize the Kubernetes Control Plane

Run the following command on `k8s-control-1`.

Replace `CONTROL_PLANE_IP` with the control-plane VM's actual IP address:

```bash
sudo kubeadm init \
  --apiserver-advertise-address=CONTROL_PLANE_IP \
  --pod-network-cidr=192.168.0.0/16
```

Example:

```bash
sudo kubeadm init \
  --apiserver-advertise-address=192.168.64.4 \
  --pod-network-cidr=192.168.0.0/16
```

The initialization process may take several minutes.

When it completes, `kubeadm` prints:

- Commands for configuring `kubectl`
- A `kubeadm join` command for worker nodes

Save the worker join command.

It will look similar to:

```bash
sudo kubeadm join 192.168.64.4:6443 \
  --token abcdef.0123456789abcdef \
  --discovery-token-ca-cert-hash \
  sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

The values in your command will be different.

## Configure kubectl

Run these commands on the control-plane node as the normal Linux user:

```bash
mkdir -p "$HOME/.kube"
```

```bash
sudo cp -i /etc/kubernetes/admin.conf "$HOME/.kube/config"
```

```bash
sudo chown "$(id -u):$(id -g)" "$HOME/.kube/config"
```

Verify access:

```bash
kubectl get nodes
```

The control-plane node may initially show:

```text
NotReady
```

This is expected until a container network interface plugin is installed.

## Install the Pod Network

Install a Kubernetes-compatible container network interface plugin.

The cluster initialization command in this guide uses:

```text
192.168.0.0/16
```

as the pod network, which is compatible with a standard Calico configuration.

Install Calico using the current operator and custom-resource manifests provided by the Calico project.

After installing the network plugin, watch the system pods:

```bash
kubectl get pods -A --watch
```

Wait until the networking components and core Kubernetes services are running.

Then check the node:

```bash
kubectl get nodes
```

The control-plane node should eventually report:

```text
Ready
```

## Join the Worker Nodes

Run the saved `kubeadm join` command on both worker nodes.

On `k8s-worker-1`:

```bash
sudo kubeadm join CONTROL_PLANE_IP:6443 \
  --token YOUR_TOKEN \
  --discovery-token-ca-cert-hash sha256:YOUR_HASH
```

On `k8s-worker-2`:

```bash
sudo kubeadm join CONTROL_PLANE_IP:6443 \
  --token YOUR_TOKEN \
  --discovery-token-ca-cert-hash sha256:YOUR_HASH
```

Replace the placeholders with the values produced by `kubeadm init`.

## Generate a New Join Command

The original token expires after a limited period.

To generate a new worker join command, run this on the control-plane node:

```bash
kubeadm token create --print-join-command
```

Copy the resulting command and run it with `sudo` on the worker node.

## Verify the Cluster

On the control-plane node, run:

```bash
kubectl get nodes
```

Expected result:

```text
NAME              STATUS   ROLES           AGE   VERSION
k8s-control-1     Ready    control-plane   ...   ...
k8s-worker-1      Ready    <none>          ...   ...
k8s-worker-2      Ready    <none>          ...   ...
```

Inspect all system pods:

```bash
kubectl get pods -A
```

Inspect the cluster endpoints:

```bash
kubectl cluster-info
```

Display detailed node information:

```bash
kubectl get nodes -o wide
```

## Test Workload Scheduling

Create a simple NGINX deployment:

```bash
kubectl create deployment nginx-test --image=nginx
```

Scale the deployment to three replicas:

```bash
kubectl scale deployment nginx-test --replicas=3
```

Watch the pods start:

```bash
kubectl get pods -o wide --watch
```

Expose the deployment inside the cluster:

```bash
kubectl expose deployment nginx-test \
  --port=80 \
  --target-port=80 \
  --type=ClusterIP
```

Verify the deployment:

```bash
kubectl get deployments
kubectl get pods -o wide
kubectl get services
```

Delete the test workload after verification:

```bash
kubectl delete service nginx-test
kubectl delete deployment nginx-test
```

## Install the Kubernetes Metrics Server

The Metrics Server provides resource-usage information for commands such as:

```bash
kubectl top nodes
kubectl top pods -A
```

Install Metrics Server using its official Kubernetes manifest or Helm chart.

UTM lab environments may use kubelet certificates that do not contain the VM IP addresses as certificate subject alternative names.

If Metrics Server reports an error similar to:

```text
x509: cannot validate certificate because it does not contain any IP SANs
```

add the following argument to the Metrics Server deployment:

```text
--kubelet-insecure-tls
```

This workaround is suitable for an isolated development lab. A production environment should use properly issued kubelet certificates rather than disabling certificate verification.

After Metrics Server is running, verify it:

```bash
kubectl get deployment metrics-server -n kube-system
```

Then test:

```bash
kubectl top nodes
```

## Access the Cluster from macOS

To use `kubectl` directly from the Mac, first install it with Homebrew:

```bash
brew install kubectl
```

On the control-plane node, display the administrator configuration:

```bash
sudo cat /etc/kubernetes/admin.conf
```

Copy the configuration securely to the Mac.

Create the local Kubernetes configuration directory:

```bash
mkdir -p "$HOME/.kube"
```

Save the configuration as:

```text
~/.kube/config
```

Confirm that the `server` field points to an IP address reachable from macOS:

```yaml
server: https://CONTROL_PLANE_IP:6443
```

Test access from the Mac:

```bash
kubectl get nodes
```

Do not commit the administrator kubeconfig file to Git. It contains credentials that provide administrative access to the cluster.

## Shut Down the Cluster Safely

Shut down worker nodes before shutting down the control-plane node.

On each worker:

```bash
sudo shutdown -h now
```

After the workers are stopped, shut down the control-plane node:

```bash
sudo shutdown -h now
```

UTM can then be closed safely.

## Start the Cluster

Start the VMs in this order:

1. `k8s-control-1`
2. `k8s-worker-1`
3. `k8s-worker-2`

Wait for the control-plane VM to finish booting before starting the workers.

Verify the cluster after startup:

```bash
kubectl get nodes
kubectl get pods -A
```

## Snapshot Strategy

Create UTM snapshots at useful recovery points.

Recommended snapshot stages include:

### Ubuntu Base

Create this after:

- Ubuntu has been installed
- System updates have completed
- SSH access works

### Kubernetes Prerequisites

Create this after:

- Swap has been disabled
- Kernel modules have been configured
- Containerd has been installed
- Kubernetes packages have been installed

### Initialized Control Plane

Create this after:

- `kubeadm init` has completed
- The pod network is working
- The control-plane node reports `Ready`

### Completed Cluster

Create this after:

- Both workers have joined
- All three nodes report `Ready`
- A test deployment has run successfully

Snapshots do not replace configuration management or backups, but they make experimentation and recovery faster.

## Troubleshooting

### A Node Reports NotReady

Check node conditions:

```bash
kubectl describe node NODE_NAME
```

Check system pods:

```bash
kubectl get pods -A
```

Check kubelet logs on the affected node:

```bash
sudo journalctl -u kubelet -n 100 --no-pager
```

Common causes include:

- The pod network is not installed
- Containerd is not running
- Swap is enabled
- Required kernel modules are missing
- Nodes cannot reach the Kubernetes API server
- The VM IP address changed

### Containerd Is Not Running

Check the service:

```bash
sudo systemctl status containerd --no-pager
```

Review recent logs:

```bash
sudo journalctl -u containerd -n 100 --no-pager
```

Restart it:

```bash
sudo systemctl restart containerd
```

### Kubelet Is Restarting

Before the node joins a cluster, repeated kubelet restarts may be normal.

After initialization or joining, inspect the logs:

```bash
sudo journalctl -u kubelet -n 100 --no-pager
```

Confirm that swap remains disabled:

```bash
swapon --show
```

Confirm that containerd is running:

```bash
sudo systemctl is-active containerd
```

### Worker Cannot Join the Cluster

Confirm that the worker can reach the API server:

```bash
curl -k https://CONTROL_PLANE_IP:6443
```

A response such as `403 Forbidden` is acceptable because it confirms that the API server is reachable.

Generate a new join command:

```bash
kubeadm token create --print-join-command
```

If the worker contains a failed partial configuration, reset it:

```bash
sudo kubeadm reset -f
```

Restart containerd:

```bash
sudo systemctl restart containerd
```

Then run the new join command.

### Duplicate Machine IDs

Check the machine ID on every VM:

```bash
cat /etc/machine-id
```

Each VM must have a different value.

To regenerate it:

```bash
sudo rm -f /etc/machine-id
sudo rm -f /var/lib/dbus/machine-id
sudo systemd-machine-id-setup
sudo reboot
```

### Duplicate SSH Host Keys

Regenerate the keys on the affected VM:

```bash
sudo rm -f /etc/ssh/ssh_host_*
sudo ssh-keygen -A
sudo systemctl restart ssh
```

Remove the old host key from the Mac when necessary:

```bash
ssh-keygen -R VM_IP_ADDRESS
```

### VM IP Address Changed

Display the current address from the UTM console:

```bash
hostname -I
```

Update:

- `/etc/hosts`
- SSH commands
- Local kubeconfig entries
- Any CloudCommand provider configuration that references the old address

For a more durable environment, configure stable IP addressing before treating the cluster as a persistent provider.

## Reset the Kubernetes Cluster

To remove Kubernetes state from a node:

```bash
sudo kubeadm reset -f
```

Remove the local CNI state:

```bash
sudo rm -rf /etc/cni/net.d
sudo rm -rf /var/lib/cni
```

Remove the local Kubernetes configuration:

```bash
rm -rf "$HOME/.kube"
```

Restart containerd:

```bash
sudo systemctl restart containerd
```

The node can then be initialized again or joined to a new cluster.

## Provider Readiness Checklist

Before registering the cluster as a CloudCommand provider, confirm that:

- [ ] All three VMs are running
- [ ] All three nodes have unique hostnames
- [ ] All three nodes have unique machine IDs
- [ ] The control-plane node is reachable
- [ ] Both worker nodes are reachable
- [ ] Containerd is running on every node
- [ ] Swap is disabled on every node
- [ ] All Kubernetes nodes report `Ready`
- [ ] Core Kubernetes pods are healthy
- [ ] The pod network is operating
- [ ] Workloads can be scheduled on both workers
- [ ] Cluster metrics are available
- [ ] Administrative kubeconfig files are protected
- [ ] VM snapshots have been created
- [ ] Provider configuration is stored outside the cluster

## Next Steps

After the cluster is operational, it can be integrated with CloudCommand as the first reference provider.

Future implementation areas include:

- Provider registration
- Provider health reporting
- Node discovery
- Capacity reporting
- Resource Class mapping
- Workload placement
- Node promotion and demotion
- Operational runbooks
- Service health reporting
- CloudCommand web controls

The Kubernetes cluster is the implementation layer.

CloudCommand provides the operational abstraction above it.

Applications request capacity. Providers satisfy that request.

---

## Next Step: Register the Cluster in CloudCommand

Once the Kubernetes cluster is running and all nodes are ready, connect it to CloudCommand for provider discovery, health monitoring, and capacity management.

[Register your Kubernetes cluster in CloudCommand](cloudcommand-provider-setup.md)
