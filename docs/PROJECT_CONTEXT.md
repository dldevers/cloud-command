CloudCommand Project Context

Purpose

CloudCommand is a control plane for inspecting, understanding, and managing Kubernetes clusters, cloud-like environments, services, runtimes, providers, and related systems through one coherent interface.

The project is intended to make complex operational environments easier to understand without hiding the underlying systems or removing operator control.

CloudCommand should be useful both as:

* a practical operations interface
* a learning environment for DevOps and SRE concepts
* a proof-of-work project demonstrating systems design, Kubernetes, automation, and interface design

CloudCommand is not a generic portal. Use the term control plane.

Avoid using the word infrastructure in product language when a more precise term works. Prefer terms such as:

* cloud
* systems
* runtime
* provider
* resources
* control plane
* service layer
* backing systems
* environment

Core Operating Principle

CloudCommand should provide one place to understand and coordinate many machines, workloads, and services.

The central idea is similar to the original appeal of Kubernetes: multiple machines and workloads can be coordinated through one operational layer.

CloudCommand should not pretend that operational complexity disappears. It should make that complexity visible, understandable, testable, and manageable.

Safety Principle

Do not experiment on production.

CloudCommand should strongly favor:

* lab-safe testing
* state inspection before action
* validation
* dry runs
* generated plans
* explicit operator approval
* CI/CD promotion
* safe retries
* observable execution
* rollback awareness

Bootstrap and management operations should be idempotent.

Every operation should inspect the current state before changing anything, then skip, repair, or continue as appropriate.

Product Name and Command Names

Product name:

CloudCommand

Primary installed CLI command:

cloud-command

Optional convenience alias:

cloudcommand

Do not write the command as:

cloud command

Documentation should introduce commands such as:

cloud-command version
cloud-command help

Main Interface Terminology

Control Plane

The CloudCommand application and operational interface are called the control plane.

Do not call it a portal.

Star Map

The central operational map is called the star map.

The star map is a spatial interface where objects representing applications, clusters, runtimes, providers, services, migrations, and other systems can appear as scalable nodes or icons.

Expected behavior:

* mouse or trackpad movement can pan the map
* scrolling can zoom the view
* zooming out makes objects smaller
* clicking an object focuses or magnifies it
* focusing an object reveals more context and available actions
* related objects can appear around the focused object
* hovering over an object should produce a subtle cyan pulse or illuminated border
* the interface should use minimal text inside the main map
* reusable SVG icons should represent object types
* an outer-edge legend may be used where helpful

The cyan dashed star-map region may also be called the starm or starm panel while the terminology is being evaluated.

Command Console

The command area should feel like a CloudCommand-native console rather than a conventional terminal emulator.

The command input should support a visible active border while typing.

The CloudCommand mark may serve as the control that opens or restores the terminal area.

Current Design Language

The interface currently uses:

* midnight navy background
* subtle grid
* cyan or silvery-cyan text
* dim cyan borders
* cyan dashed regions
* high-contrast wire-model objects
* restrained glow
* minimal permanent text
* spatial relationships rather than conventional dashboard cards

Cyan and silvery-cyan are primary neutral and informational colors.

Status colors should remain distinct from neutral interface cyan.

Urgent errors and empty-state failures should use a reusable floating alert pattern with:

* glowing red border
* bold red warning headline
* dark background
* high-contrast warning copy
* primary action button
* acknowledgment support

Acknowledged warnings should not repeatedly interrupt the operator unless their state materially changes.

Prototype Location

Current prototype directory:

control-plane/prototype/v-01

Current main files include:

control-plane/prototype/v-01/index.html
control-plane/prototype/v-01/assets/css/v-01.css
control-plane/prototype/v-01/assets/js/v-01.js
control-plane/prototype/v-01/assets/img/cloudcommand-mark.svg

The current prototype is a local static interface prototype.

The current HTML loads:

<script type="module" src="./assets/js/v-01.js"></script>

Current Prototype State

The current interface includes:

* main CloudCommand control-plane frame
* star-map area
* draggable or pannable spatial view
* application and environment objects
* zoom and focus behavior
* CloudCommand terminal shell
* command input surface
* CloudCommand mark
* terminal collapse control
* terminal close control

Recent feedback and active design work:

* click-and-drag map movement works well
* object hover currently needs visible feedback
* hovering should briefly illuminate the object border in light cyan
* clicking an object should focus or zoom into its object view
* command input active-state styling still needs refinement
* the command input should show a clear dim-cyan or cyan outline while active
* unnecessary title-bar elements should be minimized
* the interface should remain spatial and uncluttered

Architecture Model

CloudCommand separates observation, decision-making, and provider-specific execution.

Runtime Container

A Runtime Container declares what it can prove about its own state and capabilities.

Runtime Agent

A Runtime Agent is optional.

It:

* runs runtime-local checks
* returns structured evidence
* emits runtime-local signals
* may expose limited lifecycle hooks
* does not accept arbitrary control
* reports runtime-local truth

CloudCommand Core

CloudCommand Core:

* receives evidence
* evaluates evidence against policy
* builds plans
* coordinates approved actions
* maintains system-wide operational context
* decides what should happen

Provider Agent

A Provider Agent:

* maps approved actions to provider-specific behavior
* performs provider-local operations
* reports execution results
* does not independently decide global policy

The governing model is:

Runtime Container declares what it can prove.
Runtime Agent runs checks and returns evidence.
CloudCommand Core evaluates that evidence against policy.
Provider Agent maps approved action to provider-specific behavior.

This separation allows CloudCommand to control or coordinate objects without giving every component unrestricted authority.

Kubernetes and Cluster Model

CloudCommand should discover facts from the connected Kubernetes environment rather than assuming that all facts were captured during installation.

Examples include:

kubectl get nodes
kubectl cluster-info
kubectl get namespaces
kubectl get deployments --all-namespaces

Bootstrap should be safe to rerun against:

* the developer’s local cluster
* another user’s cluster
* a partially configured cluster
* an upgraded cluster
* a repaired cluster

CloudCommand should verify existing state and avoid blindly recreating resources.

Lab Philosophy

CloudCommand development favors practical, low-power lab systems rather than noisy rack servers.

The committed reference implementation uses standard upstream Kubernetes
bootstrapped with kubeadm. It does not use K3s, MicroK8s, minikube, or a managed
Kubernetes service. The purpose is to preserve the normal Kubernetes component,
node, upgrade, networking, and failure model in an affordable environment.

The preferred lab model is a fleet of mini PCs that can function as:

* Kubernetes control-plane nodes
* Kubernetes workers
* test environments
* migration targets
* observability nodes
* CloudCommand development systems

The control-plane node should remain relatively light and act as a truth and coordination node rather than the primary workload engine.

Noisy workloads should generally run on worker nodes.

Argo CD, platform add-ons, and application workloads should run on worker nodes
unless a documented infrastructure-specific reason requires an explicit
control-plane toleration. Retain the standard control-plane NoSchedule taint.

A lightweight CloudCommand Core or coordinating agent may run on a control-plane node when appropriate.

The first multi-node cluster may run as virtual machines on one base-model Apple
M4 Mac Mini with 16 GB of memory. This is a valid Kubernetes topology but a
single physical failure domain. Public documentation must state that limitation
and distinguish topology testing from physical high availability.

See docs/reference-lab.md and
docs/decisions/0002-reference-lab-hardware-and-memory.md for the current
reference-lab baseline and decision record.

Migration Vision

CloudCommand may eventually coordinate migrations between environments or clusters.

A possible future flow:

1. inspect source state
2. inspect destination capabilities
3. compare runtime requirements
4. gather evidence
5. generate a migration plan
6. validate network and ingress requirements
7. dry-run applicable changes
8. obtain operator approval
9. coordinate provider-specific actions
10. observe migration state
11. validate the destination
12. shift traffic
13. preserve rollback options

Migration control should support secure communication between CloudCommand components without granting arbitrary execution authority.

User and Role Direction

The interface may represent the active user or role with a role badge rather than using a conventional avatar.

Potential future identity integrations may include directory services, but CloudCommand should not prematurely commit to Active Directory or another enterprise identity provider.

Identity and authorization should be designed around clear CloudCommand permissions first.

Icon Inventory

Maintain an icon inventory as the interface evolves.

For each icon, record:

* icon name
* object or action represented
* where it appears
* purpose
* current status
* whether an asset exists
* whether a new asset is needed
* notes about scale or interaction behavior

The inventory should eventually cover:

* application
* cluster
* node
* runtime
* provider
* service
* migration
* user
* role
* alert
* command
* terminal
* focus
* zoom
* navigation
* health
* degraded state
* unknown state

Documentation Workflow

The primary project context file is:

docs/PROJECT_CONTEXT.md

This file may be committed to the private GitHub repository so ChatGPT can read it through the connected GitHub account.

Local-only or sensitive notes should go in:

docs/PROJECT_CONTEXT.local.md

The local file should not be committed.

Never place the following in either committed documentation or source control:

* passwords
* access tokens
* private keys
* recovery codes
* session cookies
* personal secrets
* production credentials

Context Recovery Shorthand

The user may write:

cu

This means:

1. read docs/PROJECT_CONTEXT.md
2. read any documents referenced by it as needed
3. re-establish the current CloudCommand project context
4. continue from the documented current state

The user may write:

ct

This means:

check terminal

Editing Workflow

When replacing or creating prototype files:

1. provide the exact vim <path> command
2. handle one file uniquely and explicitly
3. provide the complete replacement contents
4. do not use piecemeal patch scripts unless specifically requested

After giving the Vim command, use the phrase:

copy this block:

Do not repeat Vim editing instructions.

The user will handle clearing the existing file, pasting the provided block, and saving it.

Repository Safety

The repository may remain private on GitHub.

The working copy remains on the Mac mini.

GitHub serves as the private remote copy and allows authorized connected tools to inspect committed project context.

Before committing, verify that no sensitive local information has been added.

Useful checks include:

git status --short
git diff
git diff --cached

Immediate Next Work

The current interface experiment should continue with star-map object interaction.

Next likely task:

* add hover illumination to star-map objects
* use a brief light-cyan border pulse or glow
* preserve the current selected or focused state
* ensure hover does not interfere with drag behavior
* click an object to enter or magnify its object view

After that:

* refine command-input focus styling
* inspect terminal open, collapse, and close behavior
* continue reducing unnecessary interface chrome
* update the icon inventory
* capture the next stable prototype state

Project Values

CloudCommand should be:

* operator-controlled
* explicit
* observable
* safe to retry
* safe to test
* understandable
* spatial
* extensible
* provider-aware
* runtime-aware
* useful in a small home lab
* credible in a larger operational environment

CloudCommand should help an operator understand what exists, what is happening, what can safely happen next, and why.
