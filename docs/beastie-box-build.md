# Beastie Box Build Record

- Status: Working configuration selected; purchases pending
- Last updated: 2026-07-17
- Purpose: CloudCommand and Daymark Kubernetes worker, local AI inference,
  development workloads, and expandable storage

This is the living source of truth for the Beastie Box. Prices are research
snapshots rather than guaranteed checkout totals. Record the seller, shipping,
tax, condition, warranty, and final delivered price before every purchase.

## Current direction

Build the system around AMD AM5. The Ryzen configuration is currently less
expensive, easier to cool, and more power-efficient than the Intel alternative.
The GPU remains NVIDIA because CUDA compatibility is more valuable to the AI
workload than the small purchase-price savings available from comparable AMD
graphics cards.

## Selected core components

| Component | Selection | Working price | Status |
|---|---|---:|---|
| CPU | AMD Ryzen 9 9900X, 12 cores / 24 threads, 120 W | MXN 9,190 | Selected |
| Motherboard | ASRock B650M Pro RS, micro-ATX, AM5, DDR5 | MXN 2,844 | Selected |
| GPU | MSI GeForce RTX 5060 Ti 16 GB Shadow 2X OC Plus | MXN 11,724-11,999 | Selected |

Working CPU-and-motherboard subtotal: **MXN 12,034**.

Working core subtotal including GPU: **MXN 23,758-24,033**.

Product links:

- Ryzen 9 9900X:
  https://www.amazon.com.mx/AMD-RyzenTM-9900X-computadora-Desbloqueado/dp/B0D6NN87T8
- ASRock B650M Pro RS:
  https://articulo.mercadolibre.com.mx/MLM-2792070749-asrock-b650m-pro-rs-am5-amd-b650-micro-atx-motherboard-_JM
- MSI RTX 5060 Ti 16 GB:
  https://www.amazon.com.mx/dp/B0F45KGZPY

## Capabilities established so far

- Four DDR5 UDIMM sockets
- Up to 256 GB memory according to AMD's current Ryzen 9 9900X specification;
  the exact motherboard BIOS and memory QVL must be checked before purchasing
  unusually large DIMMs
- One primary PCIe 4.0 x16 GPU slot
- One secondary physical x16 slot operating at PCIe 3.0 x4, suitable for an HBA
- Three onboard M.2 sockets
- Four onboard SATA 6 Gb/s ports
- Onboard 2.5 Gb Ethernet
- Hardware virtualization for KVM-based Kubernetes nodes
- 16 GB of NVIDIA VRAM for CUDA inference and small-model tuning

## Components still to select

### Memory

Use desktop **DDR5 UDIMMs**, not laptop SO-DIMMs.

Preferred staged plan:

1. Start with one 48 GB DDR5-5600 UDIMM if a trustworthy, returnable module is
   available at a reasonable delivered price.
2. Add a matching second 48 GB module later for 96 GB dual-channel capacity.
3. Prefer matched modules and verify the exact part number before purchase.

Kingston ValueRAM `KVR56U46BD8-48` is a reference candidate, not yet selected.

### Cooling

The Ryzen 9 9900X does not include a cooler. AMD lists a liquid cooler as the
recommended solution for optimal performance. Select the cooler only after the
case is locked so radiator, tower height, GPU, and drive clearances can be
checked together.

### Case

The Jonsbo N6 is the leading storage-oriented candidate because it provides a
compact desk-friendly enclosure with nine drive positions. It is not yet
locked. Before purchase, confirm all of the following against the final GPU,
cooler, motherboard, and power supply:

- GPU length, thickness, and airflow clearance
- radiator or CPU-tower clearance
- power-supply form factor and cable clearance
- exact 2.5-inch and 3.5-inch drive mounting combinations
- airflow across the CPU, GPU, HBA, and populated drive bays

### Power supply

Target an **850 W ATX 3.x, 80 Plus Gold** unit with the correct native GPU
power cable. The MSI MAG A850GL is a current candidate, not yet selected.

### Primary storage

Select at least one reliable M.2 NVMe SSD for the operating system, active VM
disks, containers, and databases. Additional SATA SSDs can be added gradually.

Do not buy nine drives merely because the chassis can hold them. Begin with the
capacity required by measured workloads and preserve simple recovery paths.

### SATA expansion

The motherboard directly supports four SATA drives. Add an LSI/Broadcom HBA in
IT mode only when the fifth SATA device is required. Confirm the exact HBA,
firmware mode, breakout cables, cooling, and Linux support before purchase.

### Display

The Suevery 32-inch 3840 x 2160 60 Hz monitor is a current budget candidate. At
approximately 138 PPI it should appear Retina-like from roughly 2.5-3 feet,
but it is not equivalent to a 27-inch 5K or 32-inch 6K Apple-class display.

## Intel alternative retained for comparison

| Component | Alternative | Working price |
|---|---|---:|
| CPU | Intel Core i9-14900K, 24 cores / 32 threads | MXN 9,871 |
| Motherboard | Gigabyte Z790M AORUS Elite AX ICE | approximately MXN 5,304 |
| Total | | **MXN 15,175** |

At the observed prices, AMD saves approximately **MXN 3,141** on the CPU and
motherboard. The Intel processor can also consume substantially more power
under sustained turbo workloads, increasing cooler cost, fan noise, and room
heat. Reconsider Intel only if delivered prices change materially or measured
CPU requirements justify the additional threads.

## Alternatives evaluated

- ASRock Radeon RX 9060 XT Challenger 16 GB: compact and officially supported
  by ROCm, but rejected for this build because the similarly priced RTX 5060 Ti
  offers the less complicated CUDA software path.
- Intel Core i9-14900KS: technically the fastest LGA1700 i9, but rejected
  because its small performance increase does not justify its additional cost
  and heat.
- Intel Core i9-14900K platform: viable, but currently more expensive and more
  difficult to cool than the selected Ryzen configuration.

## Intended service roles

- CloudCommand demonstration and management services
- Daymark development and backend inference
- Containerized CUDA inference runner
- QLoRA experiments with models that fit within 16 GB VRAM
- Kubernetes control-plane and worker VMs as required
- VM image, container image, backup, and Time Machine storage where practical
- Cloudflare Tunnel origin services

## Purchase and validation checklist

1. Recheck every delivered price immediately before purchase.
2. Confirm CPU support and install the latest stable motherboard BIOS.
3. Verify memory part numbers against the board QVL where possible.
4. Perform a complete clearance check before buying the case, cooler, and PSU.
5. Test memory before trusting the machine with cluster state.
6. Stress-test CPU, GPU, memory, NVMe, networking, and any HBA concurrently.
7. Record idle and sustained-load power, temperatures, noise, and throttling.
8. Record actual delivered prices and photograph the completed build.
9. Convert this working record into public site documentation only after the
   hardware has been assembled and measured.
