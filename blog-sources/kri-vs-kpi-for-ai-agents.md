---
source: Recovered
synced: 2026-05-11
modified: 2026-05-11
title: "KRIs vs KPIs for Autonomous Agents: Borrowing 30 Years of Discipline from Financial Services"
slug: kri-vs-kpi-for-ai-agents
date: 2026-06-04
read_time: 12 min
author: Michele Fisher
category: AI Agent Governance
dek: "The most common failure mode in production AI is treating a Key Performance Indicator as if it were a Key Risk Indicator. Borrowed discipline from financial services, applied to autonomous agents."
hero_image: /assets/img/blog/cm-ai-deck/image10.png
series: Configuration Management for AI Agents
series_part: 3 of 6
---

# KRIs vs KPIs for Autonomous Agents: Borrowing 30 Years of Discipline from Financial Services

📅 June 4, 2026
⏲ 12 min read
By Michele Fisher

[← Back to Blog](/blog/)

The most common failure mode I see in production AI deployments is treating a Key Performance Indicator as if it were a Key Risk Indicator. The two are not the same. They answer different questions, they get reviewed by different people, and they trigger different responses. When organizations conflate them, they end up with dashboards that show an agent producing a high volume of output and assume that means the agent is operating safely. It does not mean that.

This post is the third in a series on configuration management for AI agents. The first post staked out the latency gap between the speed at which agents act and the speed at which humans intervene. The second introduced the four-discipline framework &mdash; Baseline, Change Control, Drift Detection, Audit & Remediation &mdash; that closes that gap. This post goes deep on the signature element of the framework: the Key Risk Indicator tier model, adapted from financial-services operational risk practice.

I spent the first decade of my career building Key Risk Indicator frameworks at Fortune 500 financial institutions. The discipline is older than the AI governance conversation by more than two decades. It works. It transfers to AI agents almost without translation. The reason it has not yet shown up in mainstream AI governance frameworks is that the AI governance conversation has been led by ML practitioners, not by people who have run operational risk programs in regulated industries.

## What a KPI is

![KPIs measure system value. KRIs measure system survival](/assets/img/blog/cm-ai-deck/image10.png)

A Key Performance Indicator measures whether the agent is producing value. Output volume, conversion lift, hours saved, cost reduction, deal velocity, ticket resolution rate, customer satisfaction score. KPIs answer a business question: *is this agent worth what it costs to run?* They get reviewed weekly or monthly. The audience is the business owner and the executive sponsor. When a KPI moves the wrong way, the response is usually optimization — tune the prompt, expand the tool inventory, retrain on better data, adjust the routing logic.

KPIs are necessary. They are how the organization decides whether to keep funding the agent. But they are not, by themselves, safety signals. A high-performing agent producing harmful or out-of-policy outputs is the worst possible failure mode, and it is largely invisible to a KPI dashboard.

## What a KRI is

A Key Risk Indicator measures whether the agent is still operating within the boundaries the organization approved. Hallucination rate, refusal-rate inversion, tool-call error rate, output distribution shift, cost-per-action drift, authentication failure rate, baseline configuration drift. KRIs answer a different question: *is the agent currently behaving the way it was approved to behave?* They get monitored continuously. The audience is risk, compliance, and operations. When a KRI threshold is breached, the response is escalation — not optimization, not tuning, but a defined action that runs at the speed of the agent rather than the speed of human attention.

The distinction matters because the responses are different in kind, not in degree. A KPI miss prompts a meeting. A KRI breach prompts a control. If the only metric the organization is watching is a KPI, then by definition the response to a problem will arrive at human meeting speed, which is not fast enough to govern a system that operates at machine speed.

|  | KPI | KRI |
| --- | --- | --- |
| Question | Is the agent producing value? | Is the agent still within approved boundaries? |
| Direction | Higher is usually better | Threshold breach is the signal |
| Audience | Business owners, executives | Risk, compliance, operations |
| Cadence | Reviewed weekly or monthly | Monitored continuously |
| Action | Optimize | Escalate per tier |
| Example | "Agent resolved 1,200 tickets this week" | "Agent’s hallucination rate exceeded 2% — Tier 2 triggered" |

## What financial services figured out

Banks have been required for more than two decades to operate KRI frameworks under various regulatory regimes &mdash; the Basel Committee&rsquo;s operational risk framework (published 2003, revised 2014 and 2021), the Federal Reserve&rsquo;s [SR 11-7 guidance on model risk management](https://www.federalreserve.gov/supervisionreg/srletters/sr1107.htm) (2011), and the [OCC&rsquo;s parallel 2011-12 bulletin](https://www.occ.gov/news-issuances/bulletins/2011/bulletin-2011-12.html). The requirement is not that banks measure operational metrics. The requirement is that they detect deviation from approved operating parameters and intervene before deviation becomes loss.

The discipline that emerged from those decades of practice has three structural properties that AI governance, as currently practiced, does not yet have.

First, every KRI is paired with a defined threshold. The threshold is not chosen arbitrarily. It is derived from the metric’s observed baseline distribution, the operational tolerance the organization has documented as acceptable, and the level beyond which the organization cannot defensibly explain the behavior to an auditor or regulator. Without thresholds, KRIs are decoration.

Second, every threshold is paired with a defined response. The response specifies what happens automatically when the threshold is breached, who is notified, what authority they have to act, and how long they have to act. The response is documented, tested before it is needed, and rehearsed periodically. Without responses, thresholds are alarms that nobody answers.

Third, the responses are tiered. Not every breach is an emergency. A statistical drift outside the expected band is a warning that warrants investigation. A material breach of operational tolerance requires immediate action and human review. A breach of the boundary beyond which the organization cannot defend the behavior triggers an automated kill-switch and a documented incident response process. The tier model is what allows the discipline to scale — most KRI breaches are Tier 1 events that don’t escalate, which is what makes the rare Tier 3 event survivable.

## The three-tier model applied to AI agents

![The automated escalation staircase removes the human bottleneck](/assets/img/blog/cm-ai-deck/image12.png)

The same three-tier structure transfers to AI agents directly. Here is how I implement it on every Prism engagement.

**Tier 1 — Warning.** Statistical drift detected. The metric has moved outside the expected band but has not exceeded operational tolerance. Response time: investigate within 24 hours. Action: document the cause. If the drift is intentional — an intended scope change, expected seasonality, planned behavior expansion — update the baseline. If unintentional, remediate. Authority: engineering or operations on-call.

**Tier 2 — Action.** Drift exceeds operational tolerance. The metric is materially outside the approved range. Response time: immediate. Action: auto-throttle, rate-limit, or restrict the agent’s scope. Human review required before continued operation. Notify compliance and the business owner. Authority: engineering manager or compliance lead.

**Tier 3 &mdash; Intervention.** Operational risk threshold breached. The agent&rsquo;s behavior is materially outside what the organization can defensibly explain to a regulator, auditor, or board. Response time: immediate. Action: kill-switch activates. Rollback to last approved baseline. Incident report filed. Post-incident review within five business days. Disclosure path determined &mdash; regulator, customer, board, insurer &mdash; based on materiality. Authority: pre-defined incident commander; legal and executive notification required.

| Tier | Trigger | Response time | Action | Authority |
|---|---|---|---|---|
| **Tier 1 &mdash; Warning** | Statistical drift detected, within operational tolerance | Within 24 hours | Investigate; document cause; update baseline or remediate | Engineering or operations on-call |
| **Tier 2 &mdash; Action** | Drift exceeds operational tolerance | Immediate | Auto-throttle or restrict scope; human review required | Engineering manager or compliance lead |
| **Tier 3 &mdash; Intervention** | Operational risk threshold breached | Immediate | Kill-switch; rollback to last approved baseline; incident report; post-incident review within 5 business days | Pre-defined incident commander; legal + executive notification |

The tier model is what allows KRIs to operate as actual controls rather than as elaborate dashboards. A Tier 1 breach does not page anyone at 3 a.m. A Tier 3 breach takes the agent offline before a human is in the loop. Both are appropriate responses to their respective severity, and both are documented in advance so the team is not improvising under pressure.

## Concrete KRIs for production AI agents

![Translating statistical drift into runtime intervention](/assets/img/blog/cm-ai-deck/image13.png)

The starter set Prism deploys covers four categories. These are starting points, not commitments — every organization tunes them against its actual baselines, regulatory environment, and risk appetite.

**Output integrity.** Hallucination rate (sampled and reviewed): Tier 1 above 1% over a 24-hour rolling window, Tier 2 above 3%, Tier 3 above 5% or any single high-severity hallucination in regulated content. Refusal-rate inversion: a sudden drop in the agent’s refusal rate on prompts the policy classifies as off-limits — this is one of the strongest signals of a successful prompt-injection or policy-classifier degradation, and it is rarely measured. Output distribution shift: statistical divergence — Population Stability Index or a comparable measure — between current and baseline output distributions, with thresholds at 0.10 and 0.25.

**Behavioral integrity.** Tool-call error rate. Out-of-scope tool invocation — the agent attempts to call a tool not in its approved inventory — any single occurrence is a Tier 2 event. Out-of-scope data access — the agent queries data outside its approved scope — any single occurrence is a Tier 3 event. Loop or recursion depth exceeding the defined limit. Multi-agent handoff failure rate.

**Operational integrity.** Cost per action drift, with Tier 2 triggered at a doubling above baseline (often the first signal of a runaway loop or successful prompt injection that has the agent calling tools or models excessively). Latency drift, authentication failure rate, request volume anomalies.

**Configuration integrity.** Live agent configuration drift from approved baseline &mdash; any unauthorized prompt, tool, or model variance. Unapproved model version in production &mdash; any occurrence is Tier 3. Missing audit log periods.

| Category | Sample KRIs | Default tier triggers |
|---|---|---|
| **Output integrity** | Hallucination rate; refusal-rate inversion; output distribution shift (PSI) | Tier 1 at &gt; 1% hallucination / 24h; Tier 2 at &gt; 3%; Tier 3 at &gt; 5% or high-severity in regulated content |
| **Behavioral integrity** | Tool-call error rate; out-of-scope tool invocation; out-of-scope data access; recursion depth | Out-of-scope tool: Tier 2 on any occurrence. Out-of-scope data access: Tier 3 on any occurrence |
| **Operational integrity** | Cost per action drift; latency drift; auth failure rate; request volume anomaly | Tier 1 at +25% cost / 24h; Tier 2 at +100% cost (likely loop or injection) |
| **Configuration integrity** | Baseline drift; unapproved model in production; missing audit log | Unapproved model: Tier 3 on any occurrence. Audit log gap &gt; 1h: Tier 3 |

The full starter set with thresholds, tier mappings, and a methodology for tuning is published as the Prism CM-AI KRI Starter Set, available with the framework reference document.

## How to set thresholds

![Deriving defensible KRI thresholds from live telemetry](/assets/img/blog/cm-ai-deck/image11.png)

Thresholds are derived, not chosen. The starter values published with the framework are reasonable defaults; the implementation work is replacing them with values grounded in the agent’s actual behavior. The methodology has four steps.

First, establish baseline distributions over a 14- to 30-day observation window. Collect each metric across a representative period of normal operation. Without baselines, thresholds are guesses.

Second, define operational tolerance. Tier 1 typically sits at the 95th percentile of baseline behavior. Tier 2 at the 99th. Tier 3 at the level beyond which the organization cannot defensibly explain the behavior. The tier definitions are organizational policy decisions, not technical defaults — they require sign-off from risk, compliance, and the business owner.

Third, validate against historical incidents. If the agent has had an incident before, the threshold should have caught it. If the proposed threshold would not have caught the incident, the threshold is wrong. This step is what separates real KRI design from theatrical KRI design.

Fourth, review quarterly. Drift in the agent’s environment, in user behavior, and in regulatory expectations all move thresholds over time. A KRI catalog that is not reviewed becomes a KRI catalog that is not trusted.

## Why this matters now

The gap between AI governance policy and AI governance practice is, in my experience, almost entirely the absence of this discipline. Organizations have policies. They have ethics committees. They have observability platforms that produce dashboards. What they do not have is the mechanic that translates policy into runtime control: a documented baseline, a defined threshold, a defined response, a tested rollback. That mechanic is exactly what financial services KRI frameworks provide, and it is exactly what configuration management frameworks have provided in enterprise IT for the same length of time.

The rest of the framework — Baseline, Change Control, Drift Detection, Audit & Remediation — describes the structure within which KRIs operate. The KRI tier model is the part of the structure that does the actual governing. If the rest of the framework is the building, KRIs are the load-bearing walls. Take them out and the structure does not stand.

The next post in this series maps the framework explicitly to the NIST AI Risk Management Framework — translating between the policy language compliance teams already use and the operational discipline this post describes. After that, the series crosswalks the discipline against the IAPP AIGP Body of Knowledge for governance professionals studying for the certification. A separate follow-up post walks through the framework&rsquo;s working implementation in the Prism dashboard once the agent monitoring extension is in production.

Governance that operates at human meeting speed cannot govern a system that operates at machine speed. KRIs are how the discipline catches up.

*This is part 3 of a six-part series on Configuration Management for AI Agents. Part 1 stakes out the latency gap. Part 2 introduces the four-discipline framework. Part 4 maps the framework to NIST AI RMF, and Part 6 crosswalks the discipline against the IAPP AIGP Body of Knowledge.*

## Sources cited

- Federal Reserve, *SR 11-7: Supervisory Guidance on Model Risk Management* (2011). [federalreserve.gov/supervisionreg/srletters/sr1107.htm](https://www.federalreserve.gov/supervisionreg/srletters/sr1107.htm)
- Office of the Comptroller of the Currency, *Bulletin 2011-12: Sound Practices for Model Risk Management*. [occ.gov/news-issuances/bulletins/2011/bulletin-2011-12.html](https://www.occ.gov/news-issuances/bulletins/2011/bulletin-2011-12.html)
- Basel Committee on Banking Supervision, *Principles for the Sound Management of Operational Risk*. [bis.org/bcbs](https://www.bis.org/bcbs/)
- Krishan Sharma (SVP Model Risk Management, Citigroup), "SR 11-7 in the Age of Agentic AI: Where the Framework Holds &mdash; and Where It Strains," GARP *Risk Intelligence*, 2026-02-27. [garp.org/risk-intelligence/operational/sr-11-7-age-agentic-ai-260227](https://www.garp.org/risk-intelligence/operational/sr-11-7-age-agentic-ai-260227)

### Need a KRI Starter Set for Your AI Agents?

The Prism CM-AI KRI Starter Set documents the full catalog — output integrity, behavioral integrity, operational integrity, and configuration integrity — with default thresholds, tier mappings, and a tuning methodology. We share it under NDA with organizations actively scaling AI agent deployments.

[Request the KRI Starter Set](/#contact)
