---
title: Reviewing my own Oracle Cloud network
date: Nov 3, 2026
dateTime: 2026-11-03
topic: Cloud
summary: I audited a network I had built in Oracle Cloud a year earlier, found three design and security issues, and fixed the most urgent one: SSH open to the whole internet.
source: https://github.com/emmanuelrukevwe123-lgtm/Cloud-Security_Labzen/blob/main/projects/oci-01-vcn-security-review/README.md
---

**What:** I audited a virtual cloud network I had created a year earlier in Oracle Cloud (OCI), found three design and security issues, and fixed the most urgent one.
**Why:** finding what already exists and checking it against least privilege is the first job in any cloud security role (NIST CSF: *Identify*, then *Protect*).
**Cost:** $0 (Always Free)

| | |
| --- | --- |
| **Provider / region** | Oracle Cloud Infrastructure · Canada Southeast (Toronto) |
| **Compartment** | `sandbox` |
| **VCN** | `VCN TORONTO` · `10.0.0.0/16` · created 30 Oct 2025 |
| **Skills** | Cloud networking (VCN, subnets, gateways, routing), firewall rule review, least privilege, IP planning |

## 1. What I found

![VCN overview](/blog/oracle-cloud-network-review/01-vcn-overview.png)

```mermaid
flowchart TB
    NET["Internet"] --- IGW["Internet gateway"]
    subgraph VCN["VCN TORONTO 10.0.0.0/16"]
        PUB["Public subnet 10.0.0.0/24<br/>(regional)"]
        PRIV["Private subnet 10.0.1.0/24<br/>(regional)"]
    end
    IGW --- PUB
    PRIV -. "outbound only (NAT)" .-> NET
```

![Subnets](/blog/oracle-cloud-network-review/02-subnets.png)

| Subnet | CIDR | Access |
| --- | --- | --- |
| public subnet | 10.0.0.0/24 | Public (regional): resources can have public IPs |
| private subnet | 10.0.1.0/24 | Private (regional): no public IPs |

## 2. The firewall rules (default security list), rule by rule

![Default security list, before](/blog/oracle-cloud-network-review/03-default-security-list-before.png)

All rules are **stateful** (Stateless = No): replies to allowed traffic return automatically.

| # | Direction | Rule | What it allows | Verdict |
| --- | --- | --- | --- | --- |
| 1 | Ingress | TCP 22 from `0.0.0.0/0` | Anyone on the internet can attempt SSH | ⚠️ **Too open**, fixed below |
| 2 | Ingress | ICMP 3,4 from `0.0.0.0/0` | "Fragmentation needed" messages | ✅ Keep: path MTU discovery needs it |
| 3 | Ingress | ICMP 3 from `10.0.0.0/16` | "Destination unreachable" inside the VCN | ✅ Keep: troubleshooting |
| 4 | Egress | All protocols to `0.0.0.0/0` | Instances can connect anywhere | ⚠️ Not least privilege; accepted for a learning lab |

## 3. Findings

| ID | Finding | Risk | Severity | Action |
| --- | --- | --- | --- | --- |
| F1 | SSH (22) open to the whole internet | Automated brute-force and exploit attempts against any instance in the subnet | **High** | ✅ Restricted to my home public IP (`/32`) |
| F2 | Egress allows all traffic everywhere | A compromised instance could reach any server (command and control, data theft) | Medium | Accepted for the lab. Production: allow only 80/443 (updates), 53 (DNS), 123 (NTP) |
| F1b | First SSH fix used a VPN exit IP (shared, changing), not my home IP | The /32 would admit other VPN users and break when the exit changed | Medium | ✅ Corrected to my real ISP IP |
| F3 | VCN range `10.0.0.0/16` overlaps my home lab (LAN 10.0.1.0/24 is *identical* to this private subnet) | Connecting the networks later (VPN) would break routing | Low (design) | Documented. Future OCI networks use `10.50.0.0/16`, AWS uses `10.40.0.0/16` |

## 4. The fix (F1)

1. Found my public IP (`curl -s https://ifconfig.me`). All my home devices share it through NAT.
2. Edited ingress rule 1: source `0.0.0.0/0` → `MY.PUBLIC.IP/32`, description "SSH from my home only".

![Security list after the fix: SSH only from my /32](/blog/oracle-cloud-network-review/04-security-list-after.png)

SSH now accepts connections from exactly one address (my home public IP, blurred). The ICMP rules are unchanged.

**Lesson: check which IP the cloud really sees.** My first fix used the address whatismyip showed, but it was a Cloudflare range (`104.28.x.x`): I was browsing through a VPN. A VPN exit IP is shared with other users and changes often, so the rule allowed the VPN rather than my home. With the VPN off, my real ISP address appeared, and I updated the rule to that `/32`. When connecting, the VPN must stay off.

**Trade-off:** my ISP gives a dynamic IP, so the rule must be updated when it changes. The stronger long-term option is **OCI Bastion** (time-limited SSH sessions with no port open to the internet), the equivalent of AWS Session Manager.

## 5. Still to check

- [ ] Which security list is attached to each subnet (default vs private)?
- [ ] Route tables: public → internet gateway; private → NAT gateway?
- [ ] Any compute instances still running in this VCN from 2025?

## 6. How this maps to AWS

| OCI | AWS |
| --- | --- |
| VCN | VPC |
| Public / private subnet | Public / private subnet |
| Security list | Network ACL (but stateful by default) |
| Network security group (NSG) | Security group |
| Internet gateway / NAT gateway | Internet gateway / NAT gateway |
| OCI Bastion | Systems Manager Session Manager |

## 7. What I learned

- A subnet is public because of its **route to an internet gateway**, not because of its name.
- Default rules are written for convenience, not security; reviewing them is part of the job.
- Not every "open to the world" rule is bad: ICMP type 3 code 4 must stay open or connections can silently fail.
- IP planning matters even in labs: overlapping ranges block future connections.

## Explain it back (my answers)

1. **Why allow ICMP type 3 code 4 from anywhere?** It carries "fragmentation needed" messages, which servers use for **path MTU discovery** (learning the largest packet size the path can carry). Blocking it makes connections open but then hang when large data flows, a very hard problem to troubleshoot, and the message itself carries little risk.
2. **What's the risk of egress to anywhere?** If an instance is compromised, the attacker can download tools, connect to a command-and-control server, send stolen data out, or use my server to attack others. Least privilege means allowing only the outbound traffic needed (443 updates, 53 DNS, 123 NTP).
3. **What happens to a bot trying SSH now?** The security list drops its packets silently. The bot gets no reply (the port looks *filtered*), and SSH on the instance never sees the attempt: no load, no password guessing, no exploit attempts.
