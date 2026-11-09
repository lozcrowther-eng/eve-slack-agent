# Harbourline Bank: technical call notes

## 2026-10-30: Security architecture review

**Attendees:** Grace Mitchell (Security Architect), Owen Clarke (Platform Engineering Manager), Leila Haddad (GM Digital Channels); Daniel Okafor (SA), Sophie Tran (AE)

**Summary:** First CPS 234 review session. Harbourline runs onboarding and loan-application frontends on CloudFront + ECS managed by platform engineering with Terraform.

**Buying signals**
- Leila: "We ship onboarding changes every two weeks. Our competitors ship daily. I need that gap closed this financial year."
- Grace was satisfied with SOC 2 Type II, ISO 27001 and the shared responsibility model; asked for Secure Compute details for private connectivity to core banking APIs.
- Leila has budget allocated under the digital transformation program.

**Risks**
- Owen: "We've invested three years in this pipeline. I'd rather put two more engineers on it than add another vendor." He views the decision as build-on-AWS vs buy.
- Bank requires SSO via Entra ID with SCIM provisioning; not yet demonstrated.
- Procurement onboarding for a new vendor takes 10-12 weeks.

**Next steps**
- Secure Compute + SSO/SCIM walkthrough for Grace and Owen.
- Build a cost model comparing two additional platform FTEs vs Vercel Enterprise.

## 2026-11-05: Platform team deep-dive

**Attendees:** Owen Clarke, two platform engineers; Daniel Okafor (SA)

**Summary:** Technical deep-dive on how Vercel fits with their AWS estate.

**Buying signals**
- Engineers liked that Terraform provider can manage Vercel projects alongside their AWS resources.
- Owen conceded preview deployments would remove their shared staging bottleneck.

**Risks**
- Owen still prefers to keep building: "If we can get CloudFront Functions doing the personalization, we don't need this."
- No executive sponsor above Leila yet; CIO hasn't been briefed.

**Next steps**
- Daniel to deliver the FTE vs platform cost model by 2026-11-13.
- Leila to brief the CIO.
