# ADR 0002: Reference Lab Hardware and Memory Strategy

- Status: Hardware selection accepted; acquisition and memory upgrade pending
- Date: 2026-07-16
- Scope: CloudCommand reference Kubernetes lab

## Context

CloudCommand needs a quiet, compact, affordable lab that can run standard
upstream Kubernetes nodes and meaningful workloads while remaining practical
and low-cost in an off-site lab with commodity hardware.

The lab begins with virtual machines on a base-model Apple M4 Mac Mini with
16 GB of unified memory. The Mac Mini established the reference price point at
approximately USD 500 through Apple's education store at the time of purchase
for a complete physical host capable of running an entire small Kubernetes
cluster. The second host was selected against the same historical goal:
approximately USD 500-550 for another complete cluster-capable machine rather
than purchasing rack servers or assembling a lab from enterprise hardware.

That USD 500 figure is a historical acquisition price, not a current purchasing
claim. On 2026-07-16, Apple's U.S. Education Store listed Mac Mini models from
USD 699, compared with USD 799 through the standard U.S. store. Education
eligibility and verification requirements apply, and Apple may change prices or
configurations at any time.

Official purchase links:

- Apple U.S. Education Store: https://www.apple.com/us-edu/shop/buy-mac
- Apple U.S. standard store: https://www.apple.com/shop/buy-mac
- Apple education eligibility and sales policy:
  https://www.apple.com/us-edu/shop/browse/open/salespolicies/edu

The selection priority is Kubernetes compute and memory capacity rather than
gaming performance. The system must support Linux, hardware virtualization,
replaceable memory, NVMe storage, and sustained multi-VM use.

## Decision

Select the ACEMAGIC M5 configuration with an Intel Core i7-14650HX, 32 GB of
DDR4-3200 memory, and a 1 TB NVMe SSD as the next physical lab host, subject to
availability and final delivered price.

The manufacturer's Mexico site displayed MXN 9,699 on 2026-07-16 but did not
have purchasable stock. At the July budget's working exchange rate, that listed
price was approximately USD 558 and fit the intended price parity with the
USD 500 Mac Mini. The working acquisition budget is now MXN 11,800 through an
available marketplace seller. The unavailable manufacturer price must not be
used to make the current budget appear less constrained.

The manufacturer's published configuration includes:

- 16 CPU cores: 8 performance cores and 8 efficient cores
- 24 hardware threads
- two DDR4-3200 SO-DIMM slots
- 32 GB installed as 2 x 16 GB
- 64 GB supported maximum in this system
- two M.2 2280 storage interfaces
- one Gigabit Ethernet interface
- published Ubuntu/Linux support

Primary product source:
https://acemagic.mx/products/m5-minipc

Processor source:
https://www.intel.com/content/www/us/en/products/sku/235996/intel-core-i7-processor-14650hx-30m-cache-up-to-5-20-ghz/specifications.html

## Why this configuration

### Price parity with the first physical cluster

The reference-lab goal is not merely to buy a fast mini PC. It is to determine
whether each approximately USD 500 commodity host can run a complete,
reproducible Kubernetes cluster. The base-model M4 Mac Mini established the
first data point. The advertised M5 price, included memory and storage, and high
core count made it the closest x86-64 comparison at the time of selection.

The higher currently available marketplace price is a budget exception, not a
revision of the historical target. It is, however, close to Apple's current
USD 699 education starting price. Delivered cost and measured capability will
be recorded so the public comparison remains honest.

### Compute density

The i7-14650HX provides 16 physical cores and 24 threads. That core count is
useful for many small Kubernetes VMs even when individual nodes receive modest
vCPU allocations.

### Affordable memory path

The M5 uses DDR4-3200 SO-DIMMs. In the current Mexico retail market, DDR4 is
materially less expensive than the DDR5 required by alternatives such as the
MINISFORUM AI X1 Pro.

The initial 32 GB configuration is sufficient to bootstrap one dedicated
control-plane VM and several worker VMs. The preferred intermediate upgrade is
48 GB by replacing one installed 16 GB module with one 32 GB module. A later
64 GB upgrade remains possible by replacing the second 16 GB module.

### Asymmetric memory support

Intel documents Flex Memory behavior for unequal channel capacities. In a
32 GB plus 16 GB configuration, the matched capacity can operate in the
symmetric interleaved region while the unmatched remainder operates in the
asymmetric region. Actual behavior still depends on the M5 firmware and the
installed modules, so compatibility must be tested rather than assumed.

Intel source:
https://edc.intel.com/content/www/id/id/design/products/platforms/details/raptor-lake-s/13th-generation-core-processors-datasheet-volume-1-of-2/007/002/003/system-memory-controller-organization-mode-ddr4-5-only/

This is the defensible Intel-specific reason for the selection. The decision
does not depend on a general claim that one processor vendor is universally
more reliable than another.

### Sufficient networking for the initial topology

The first physical cluster interconnect will be Gigabit Ethernet. Faster or
additional interfaces are useful but not required for the initial workloads,
and they do not justify substantially more expensive memory.

### Storage expansion

The included 1 TB NVMe device is enough for the initial host. The second M.2
interface allows a later storage expansion after memory pressure and actual
workload I/O have been measured.

## Alternatives considered

### MINISFORUM AI X1 Pro with Ryzen AI 9 HX 370

Advantages include a stronger integrated GPU, DDR5 capacity up to 96 GB, and
newer connectivity. The processor has 12 cores and 24 threads. For this lab,
the additional graphics capability is secondary while DDR5 expansion is
currently much more expensive.

Sources:

- https://store.minisforum.com/products/minisforum-ai-x1-pro-370-mini-pc
- https://www.amd.com/en/products/processors/laptop/ryzen/ai-300-series/amd-ryzen-ai-9-hx-370.html

### ACEMAGIC M5 with Intel Core i9-14900HX

The i9 model offers more CPU capacity and remains a strong future option. It
was not selected for the initial expansion because availability was uncertain
and the i7 already provides sufficient VM density at a lower expected cost.

### Lower-cost Ryzen micro PCs

Systems such as the ACEMAGIC AM06 Pro reduce acquisition cost and may provide
adequate general-purpose performance. They offer fewer CPU cores for the VM
density targeted by this lab. They remain reasonable worker-host candidates if
price becomes the dominant constraint.

### Barebones desktop and Shuttle systems

Socketed processors, optical-drive bays, additional SATA devices, and PCIe
expansion are attractive. They require more components, space, power, and
cooling than the current bedside micro-PC installation permits.

## Memory purchase criteria

The intermediate upgrade requires one module with all of the following:

- 32 GB capacity, one module
- DDR4-3200 / PC4-25600
- 260-pin SO-DIMM
- 1.2 V
- non-ECC and unbuffered
- JEDEC-compatible timings; CL22 is preferred for compatibility
- return protection sufficient to test the mixed configuration
- target price no more than USD 250 delivered, before applying store credit

At the July budget's working exchange rate, USD 250 is approximately MXN 4,345.
Exchange rates, taxes, import fees, seller condition, and checkout totals must
be verified immediately before purchase.

## Memory purchase gate

The 32 GB module is desirable capacity insurance, especially for real service
workloads, but the standard Kubernetes bootstrap does not depend on it. Apply
the following gate:

1. Preserve enough cash for the flight and the required personal budget buffer.
2. Build and rehearse the documented 32 GB topology.
3. Measure host memory, VM resident memory, node allocatable memory, pod working
   sets, and peak pressure during bootstrap and Argo CD reconciliation.
4. Purchase the 32 GB module when the delivered price fits the remaining budget
   or when measurements show that 32 GB prevents the intended service stack.

The public demonstration must use conservative VM allocations and a rehearsed
bootstrap. Buying memory cannot substitute for validating the runbook,
networking, image availability, CNI behavior, and service resource requests.

## Retail research snapshot

Observed 2026-07-16. Marketplace search prices are volatile and do not
constitute a purchase recommendation until the exact seller, condition,
shipping, tax, return policy, and module part number are confirmed.

| Candidate | Observed price | Initial assessment |
|---|---:|---|
| Samsung 32 GB 2Rx8 PC4-3200AA SO-DIMM | MXN 2,814-3,091 | Strong price; verify that it is new, non-ECC, and the exact model shipped |
| SK hynix 32 GB DDR4-3200 laptop SO-DIMM | MXN 3,825 | Within target; confirm rank, voltage, condition, and return policy |
| Micron MTA16ATF4G64HZ-3G2 32 GB | MXN 4,200 | Within target; published as DDR4-3200, CL22, 1.2 V, non-ECC |
| Kingston Fury Impact KF432S20IB/32 | MXN 4,350 | Approximately at target; CL20 may still negotiate standard JEDEC operation, but verify |
| A-Tech 32 GB DDR4-3200 CL22 on Amazon US | USD 242.49 before Washington tax | Within pre-tax target; expected balance impact must include sales tax |

Marketplace searches:

- https://listado.mercadolibre.com.mx/memoria-ram-pc4-3200-32-gb-sodimm-ddr4-1x32
- https://listado.mercadolibre.com.mx/hynix-ddr4-3200
- https://listado.mercadolibre.com.mx/32gb-ddr4-sodimm-3200
- https://www.amazon.com.mx/s?k=32gb+ddr4+3200+sodimm+1x32
- https://www.amazon.com.mx/Kingston-3200Mhz-Memoria-KF432S20IB-32/dp/B097QJ74WQ

An expected MXN 1,000 Amazon Mexico return credit is reserved for the iPhone
purchase and is not treated as available RAM budget unless that allocation is
explicitly changed.

## Validation after purchase

1. Record the original installed module manufacturers, part numbers, ranks,
   voltage, timings, and slot placement.
2. Preserve both original 16 GB modules.
3. Replace one 16 GB module with the selected 32 GB module.
4. Confirm that firmware and Linux report 48 GB and the negotiated speed.
5. Run an extended bootable memory test before trusting the host with cluster
   state or databases.
6. Run concurrent VM, CPU, and memory pressure tests while monitoring
   temperatures, corrected hardware errors, kernel logs, and application
   behavior.
7. Record whether the expected asymmetric memory mode is observed.
8. Return or replace the module if errors occur; do not normalize intermittent
   memory faults.

## Consequences

- The 48 GB configuration sacrifices some uniform dual-channel capacity in
  exchange for a lower-cost increase in total memory.
- The first cluster remains constrained by one physical failure domain until a
  second host is incorporated.
- A 1 Gbps interconnect is adequate for initial development but will cap
  storage and cross-node throughput.
- The selection optimizes Kubernetes VM density and purchase cost rather than
  integrated graphics performance.
- Public documentation must be updated with delivered hardware, actual price,
  measured power, thermals, memory behavior, and workload results.
