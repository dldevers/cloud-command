# Registering a Kubernetes Cluster in CloudCommand

This guide explains how to connect an existing Kubernetes cluster to CloudCommand, test the connection, discover cluster capacity, and register the cluster as a resource provider.

CloudCommand uses the Kubernetes configuration already installed on the machine where the CloudCommand API is running:

```text
~/.kube/config
```

## Prerequisites

Before continuing, confirm that:

- The Kubernetes cluster is running.
- All expected nodes are in the `Ready` state.
- `kubectl` works from the machine running CloudCommand.
- The current Kubernetes context points to the cluster you want to register.
- The CloudCommand API and web interface are running.

Verify Kubernetes access:

```bash
kubectl cluster-info
kubectl get nodes -o wide
```

A healthy three-node cluster should show one control-plane node and two worker nodes in the `Ready` state.

## Start CloudCommand

From the repository root, start the CloudCommand API:

```bash
cd control-plane/api
npm install
npm start
```

The API listens on port `3000`.

Open the CloudCommand web interface in your browser.

When the interface loads successfully, the connection indicator in the upper-right corner should display:

```text
Connected
```

## Add a Resource Provider

From the CloudCommand dashboard, select:

```text
Add resource provider
```

CloudCommand will open the provider registration wizard.

## Step 1: Select the Provider Type

Choose the Kubernetes provider option.

This tells CloudCommand to discover the resource provider through the Kubernetes API using the active local kubeconfig.

Continue to the next step.

## Step 2: Describe the Provider

Enter a stable identity for the cluster.

### Display Name

Enter a human-readable name for the provider.

Example:

```text
LaCasa Kubernetes
```

### Provider ID

Enter a lowercase identifier containing only letters, numbers, and hyphens.

Example:

```text
lacasa-kubernetes
```

The provider ID should remain stable because CloudCommand uses it to identify the provider internally.

### Environment

Choose the environment that best describes the cluster:

- Local
- Development
- Staging
- Production

For a lab or proof-of-concept cluster, use:

```text
Development
```

### Location

Enter a descriptive physical or logical location.

Example:

```text
Melaque Lab
```

### Description

Add a short explanation of the provider.

Example:

```text
Three-node Kubernetes test cluster running in local UTM virtual machines.
```

CloudCommand uses the Kubernetes configuration already installed on the machine:

```text
~/.kube/config
```

Select:

```text
Test connection
```

## Step 3: Discover Provider Capacity

CloudCommand connects to the Kubernetes API without saving the provider and inspects the resources it exposes.

During discovery, CloudCommand reads:

- Node names
- Node roles
- Kubernetes versions
- Node readiness
- Total CPU capacity
- Total memory capacity

While discovery is running, the interface displays:

```text
Testing Kubernetes connection…
```

A successful test displays:

```text
Connection successful
```

Review the discovery results carefully.

Confirm that:

- Provider status is healthy.
- The expected number of nodes is ready.
- CPU capacity appears reasonable.
- Memory capacity appears reasonable.
- All expected node names are listed.

For the three-node Mac Mini UTM cluster, the result should show:

```text
3 of 3 nodes ready
```

Select:

```text
Continue
```

## Step 4: Register the Provider

Review the provider identity and discovered cluster information.

Confirm that the following values are correct:

- Display name
- Provider ID
- Environment
- Location
- Description
- Provider status
- Discovered node count
- CPU capacity
- Memory capacity

Select:

```text
Register provider
```

CloudCommand saves the provider and returns to the provider dashboard.

## Verify the Registration

The provider should now appear as a card on the CloudCommand dashboard.

Confirm that the provider card displays:

- The correct provider name
- Kubernetes as the provider type
- A healthy status
- The expected node-readiness count
- CPU capacity
- Memory capacity
- The correct environment
- The correct location

The global connection indicator in the upper-right corner should display:

```text
Connected
```

A successful three-node registration should report:

```text
Healthy
3 of 3 nodes ready
```

## Troubleshooting

### CloudCommand Displays Disconnected

Confirm that the API is running:

```bash
cd control-plane/api
npm start
```

Check that port `3000` is listening:

```bash
lsof -i :3000
```

Refresh the browser after the API starts.

### Kubernetes Connection Test Fails

Confirm that the kubeconfig exists:

```bash
ls -l ~/.kube/config
```

Confirm that the current context is correct:

```bash
kubectl config current-context
kubectl config get-contexts
```

Test the same connection directly:

```bash
kubectl get nodes
```

If `kubectl get nodes` fails, CloudCommand discovery will also fail.

### One or More Nodes Are Not Ready

Inspect node status:

```bash
kubectl get nodes -o wide
```

Inspect the affected node:

```bash
kubectl describe node NODE_NAME
```

Check cluster services:

```bash
kubectl get pods -A
```

Resolve the Kubernetes issue before registering the provider.

### Incorrect Cluster Was Discovered

CloudCommand uses the active kubeconfig context.

Check the active context:

```bash
kubectl config current-context
```

List available contexts:

```bash
kubectl config get-contexts
```

Switch to the correct context:

```bash
kubectl config use-context CONTEXT_NAME
```

Then repeat the provider connection test.

### Provider ID Is Rejected

Use only lowercase letters, numbers, and hyphens.

Valid example:

```text
lacasa-kubernetes
```

Invalid examples:

```text
LaCasa Kubernetes
lacasa_kubernetes
```

### Provider Does Not Appear After Registration

Refresh the browser and confirm that the CloudCommand API is still running.

You can also test the provider API directly:

```bash
curl http://localhost:3000/api/providers
```

A registered provider should appear in the returned JSON.

## Next Steps

After registering the cluster, CloudCommand can begin treating it as a provider of standardized infrastructure capacity.

Future workflow stages include:

- Defining Resource Classes
- Mapping Kubernetes capacity to Resource Classes
- Registering additional providers
- Comparing provider capacity
- Deploying workloads through CloudCommand
- Promoting a provider from development to production
