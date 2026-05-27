---
source: Recovered
synced: 2026-05-11
modified: 2026-05-11
title: "Configuration Management and the AIGP Body of Knowledge: The Operational Layer the Curriculum Implies"
slug: configuration-management-and-the-aigp-body-of-knowledge
date: 2026-06-25
read_time: 11 min
author: Michele Fisher
category: AI Agent Governance
dek: "The AIGP Body of Knowledge defines what AI governance professionals are accountable for. Configuration management provides the operational mechanic that turns those accountabilities into runtime control."
series: Configuration Management for AI Agents
series_part: 6 of 6
---

# Configuration Management and the AIGP Body of Knowledge: The Operational Layer the Curriculum Implies

📅 July 2, 2026
⏲ 11 min read
By Michele Fisher

[← Back to Blog](/blog/)

This is the closing post in the main thread of a six-part series on configuration management for AI agents. The preceding posts staked out the latency gap in agentic AI governance, introduced a four-discipline framework that closes it, detailed the Key Risk Indicator tier model that turns measurement into actual control, mapped the framework to the NIST AI Risk Management Framework, and (in the bonus installment) sited the framework relative to Microsoft&rsquo;s Agent Governance Toolkit. A separate follow-up post walks through the framework&rsquo;s working implementation in the Prism dashboard; that one publishes once the agent monitoring extension is live, so the walkthrough describes actual governance of AI agents rather than the architectural blueprint for extending to them.

This post is for a specific audience: the people studying for the IAPP Artificial Intelligence Governance Professional certification, and the people who already hold it.

The argument is straightforward. The AIGP Body of Knowledge defines what AI governance professionals are accountable for. The community study material covers law, policy, and risk assessment thoroughly. What it covers thinly — and what configuration management provides directly — is the operational mechanic that turns governance accountabilities into runtime control. If you are studying for the cert and looking for the part of the curriculum that makes the work feel concrete rather than theoretical, the framework in this series is one practitioner’s answer.

## What the AIGP is, and why it matters

The IAPP launched the [AIGP certification](https://iapp.org/certify/aigp) in 2023 to formalize the AI governance role as a profession distinct from privacy or security. The certification is policy-neutral, vendor-neutral, and aligned to the standards governance professionals are most often accountable to &mdash; NIST AI RMF, ISO/IEC 42001, the EU AI Act, sectoral regulations including healthcare, financial services, and federal contracting requirements.

The Body of Knowledge version 2.1, effective February 2, 2026, defines four domains:

* **Domain I:** Foundations of AI governance.
* **Domain II:** How laws, standards, and frameworks apply to AI.
* **Domain III:** Governing AI development.
* **Domain IV:** Governing AI deployment and use.

The certification has grown quickly. AIGP holders work in compliance, risk, legal, privacy, and operations functions across regulated industries. The exam tests whether the candidate can describe the AI lifecycle, identify and categorize risks, apply the relevant legal and ethical frameworks, and reason through deployment decisions. The work the certification credentials is real, important, and not yet fully scoped at the operational level.

## The gap in the community study material

The community study reference for the AIGP &mdash; [Oliver Patel&rsquo;s unofficial resource guide](https://oliverpatel.substack.com/p/the-unofficial-aigp-resource-guide), maintained as IAPP faculty &mdash; is a curated list of roughly 100 resources covering legal frameworks, risk assessment methodologies, AI ethics literature, sectoral regulations, and the major standards. It is foundational and policy-centric. Read carefully against the BoK, it is also explicitly thin on operational governance mechanics.

Configuration management vocabulary does not appear in the curated resources. Drift thresholds do not appear. Key Risk Indicator frameworks do not appear. Agentic-specific governance, as distinct from static-model governance, is largely absent. The standards the BoK references — NIST AI RMF, ISO/IEC 42001 — are catalogued but not crosswalked. Patel’s guide is not failing the candidates. It is reflecting the state of the field accurately. The operational layer has not yet been written into the canon.

This is not unusual for a young profession. The privacy field went through the same evolution. CIPP material in the early 2000s was heavy on law and light on the operational practices — privacy impact assessments, data inventories, breach response runbooks — that became standard later. The standards came first; the operational discipline followed. AI governance is in the same phase. The framework in this series is one attempt at the operational discipline.

## Where the framework slots in

The Prism CM-AI Framework consists of four configuration management disciplines — Baseline, Change Control, Drift Detection, Audit & Remediation, abbreviated BCDA — applied across three delivery layers, with the Key Risk Indicator tier model layered over the whole. The framework maps most cleanly to BoK Domains III and IV, which together describe the operational scope of the AI governance role.

### Domain III — Governing AI development

Domain III covers what governance looks like during the build phase of the AI lifecycle. The subdomains include data governance, design specifications, documentation, model selection and design, and pre-deployment evaluation.

The framework’s contributions to Domain III are:

**Baseline definition as a development artifact.** The BoK is explicit that AI governance must establish documentation throughout the lifecycle. The framework treats the baseline — model version, system prompt content hash, tool inventory, data scope, expected behavior distribution, latency band, refusal rate, cost-per-action target — as a first-class development artifact, version-controlled alongside the code. Most current AI development practice treats prompts as configuration that lives in someone’s local environment or in a deployment YAML that no one has reviewed. The framework treats them as auditable artifacts.

**Change control extended to prompts and tools.** Domain III names policies and procedures throughout the AI life cycle as a governance accountability. Most organizations have change control for code and model upgrades. Few have change control for prompt revisions, tool inventory changes, or data-scope expansions. The framework requires a defined approval path for every change to any baseline element, with documented authority and audit trail. This is the operational mechanic the BoK implies but does not specify.

**Pre-deployment baseline validation.** Domain III covers pre-deployment assessment. The framework requires the development team to validate that the agent’s behavior, evaluated against its planned baseline, meets the thresholds the organization is willing to defend. This is not optional. Without it, the deployment phase has no reference point against which to measure drift.

### Domain IV — Governing AI deployment and use

Domain IV is where the framework lands hardest. The subdomains cover operational monitoring, incident response, post-market activities, and ongoing risk management.

The framework’s contributions to Domain IV are:

**Drift detection as operational discipline, not dashboard.** Domain IV requires ongoing monitoring of deployed AI systems. The framework specifies what that monitoring looks like in practice: continuous comparison of live agent behavior against the documented baseline, with predefined thresholds and predefined responses, running at the speed of the agent rather than the speed of human attention. The third post in this series details the KRI tier model that operationalizes this requirement — Tier 1 warnings investigated within 24 hours, Tier 2 actions triggering auto-throttle and human review, Tier 3 interventions activating kill-switch and rollback.

**Incident response with tested rollback.** Domain IV covers incident handling and recovery. The framework requires that the rollback procedure for each production agent be documented, tested before it is needed, and rehearsed periodically. Most current AI deployments have logs, which support post-hoc forensics. Few have a tested rollback path, which is what allows the organization to actually recover. The first time the rollback procedure runs is the time it has to work.

**Audit trail that satisfies the regulator’s question.** The BoK is explicit that AI governance produces evidence. The framework requires that any agent action be traceable to the baseline that authorized it — model version, prompt hash, tool inventory, data scope, change history, approval record. This is the artifact that answers the question every auditor and regulator eventually asks: *was the agent that took this action operating within the configuration the organization approved?* Most current AI deployments cannot produce this artifact. The framework makes producing it routine.

### Domain II — Standards crosswalk

Domain II tests how the major standards apply to AI. The fourth post in this series provides the explicit crosswalk between the framework and NIST AI RMF (Govern → Change Control, Map → Baseline, Measure → Drift Detection + KRIs, Manage → Audit & Remediation). The full white paper extends the crosswalk to ISO/IEC 42001:2023 — where the framework operationalizes the Plan-Do-Check-Act cycle — and the EU AI Act’s post-market monitoring requirements under Article 72.

For AIGP candidates, the crosswalk is study-aid material in addition to operational reference. The standards are the curriculum’s testable surface. The framework is one way to remember how the surfaces connect.

### Domain I — Foundations

Domain I covers the foundational concepts of AI governance — what AI is, why governance is needed, who the stakeholders are, what the lifecycle looks like. The framework does not extend Domain I directly. It assumes the candidate has the foundational vocabulary and is looking for the operational layer that sits on top of it. If you are studying for the AIGP and Domain I is where you are spending most of your time, the framework will land more usefully after you have moved into Domains III and IV.

## What this means for AIGP candidates

If you are preparing for the exam, the framework is most useful as a structural memory aid for Domains III and IV. The BCDA acronym — Baseline, Change Control, Drift Detection, Audit & Remediation — captures the four operational practices that produce the governance outcomes the BoK requires. The KRI tier model captures how monitoring becomes a control rather than a dashboard. The crosswalks against NIST AI RMF, ISO/IEC 42001, and the EU AI Act tie the operational practices back to the standards Domain II asks you to apply.

The framework is a practitioner’s attempt to give the operational layer the same structure the policy layer already has. It is not affiliated with or endorsed by IAPP and does not replace the official body of knowledge — it is offered alongside it as the operational mechanic the curriculum implies.

## What this means for AIGP holders

If you already hold the certification and are now responsible for implementing AI governance in your organization, the framework is the operational scaffolding. The five posts that precede this one walk through how the disciplines work in practice — what to baseline, what to change-control, what to monitor, what thresholds to set, what to put in the audit trail, what to test before you need it.

The framework is published with two companion documents available on request: the Prism CM-AI Framework reference, which documents the disciplines and the delivery model, and the Prism CM-AI KRI Starter Set, which provides default thresholds and tier mappings for the most common categories of risk indicator. Both are designed to be implementable by a working AI governance team without requiring tooling investment beyond what most organizations already have.

## Closing the series

![Governance drives delivery — only when built into the operational layer](/assets/img/blog/cm-ai-deck/image18.png)

The argument of this series, restated for the last time: AI governance frameworks define policy outcomes. Configuration management is the discipline that produces them. The two are not in tension, and neither is sufficient on its own. The latency gap between agent speed and human attention is closed by combining the two — policy at the top, configuration management at the bottom, KRIs and tiered escalation as the connective tissue.

For AIGP candidates and certified professionals, the framework is offered as the operational layer the curriculum implies but does not yet fully detail. For everyone else, the framework is offered as a way to govern AI agents at the speed they actually operate. Either audience is welcome. Both are reading the same series.

Thank you for reading.

*This closes the main thread of the series on Configuration Management for AI Agents. A follow-up implementation post &mdash; walking through the framework as applied to AI agents in production &mdash; publishes when the Prism dashboard&rsquo;s agent monitoring extension goes live. The framework reference, the KRI starter set, and the supporting white paper are available through the Prism Resources hub.*

## Sources cited

- IAPP, *Artificial Intelligence Governance Professional (AIGP)* certification. [iapp.org/certify/aigp](https://iapp.org/certify/aigp)
- IAPP, *AIGP Body of Knowledge v2.1* (effective 2026-02-02). PDF reference linked from the IAPP cert page.
- Oliver Patel (IAPP faculty), *The Unofficial AIGP Resource Guide*. [oliverpatel.substack.com/p/the-unofficial-aigp-resource-guide](https://oliverpatel.substack.com/p/the-unofficial-aigp-resource-guide)
- NIST, *AI Risk Management Framework 1.0*. [nist.gov/itl/ai-risk-management-framework](https://www.nist.gov/itl/ai-risk-management-framework)
- ISO/IEC 42001:2023, *AI management systems*. [iso.org/standard/81230.html](https://www.iso.org/standard/81230.html)
- EU AI Act (Regulation (EU) 2024/1689). [artificialintelligenceact.eu/the-act](https://artificialintelligenceact.eu/the-act/)

### Studying for the AIGP, or Implementing One?

Prism AI Analytics provides AIGP-aligned operational governance for AI agent deployments. The Prism CM-AI Framework is the implementation layer for what the AIGP Body of Knowledge defines as governance accountabilities — usable as a study reference and as a working operational scaffold.

[Request the Framework + KRI Starter Set](/#contact)
