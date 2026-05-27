---
source: Recovered
synced: 2026-05-11
modified: 2026-05-11
title: "Inside the Prism Dashboard: A CM Control Plane in Production"
slug: inside-the-prism-cm-ai-control-plane
date: 2026-06-25
read_time: 12 min
author: Michele Fisher
category: AI Agent Governance
dek: "An evidence walkthrough of the four-discipline framework running in production at Prism today — not a product demo. What the implementation does, and what it does not yet do."
hero_image: /assets/img/blog/inside-the-prism-cm-ai-control-plane/hero.png
series: Configuration Management for AI Agents
series_part: 5 of 6
---

# Inside the Prism Dashboard: A CM Control Plane in Production

📅 June 25, 2026
⏲ 12 min read
By Michele Fisher

[← Back to Blog](/blog/)

The framework I have been describing across this series — Baseline, Change Control, Drift Detection, Audit & Remediation, layered with a Key Risk Indicator tier model — is not theoretical. It is operating right now, on production infrastructure, governing the operational state of the firm that publishes this blog.

This post walks through the implementation. It is honest about what the implementation does today and what it does not. The dashboard described here governs Prism AI Analytics' own business operations — clients, projects, financials, the daily-review cadence, the activity log. It is not yet wired up against autonomous AI agents in production. The architectural patterns are the same; the asset class being governed is different.

Two reasons to publish this walkthrough rather than wait until we have a fully agent-governing version:

First, the framework’s claim is that the disciplines that worked for systems work for agents. Demonstrating the disciplines on a working system is honest. Claiming we already run them on agents we have not yet deployed would be dishonest. The post is an evidence walkthrough, not a product demo.

Second, most organizations evaluating CM discipline for AI agents do not have specialized tooling either. They have what we have — a single-server stack, a SQLite or Postgres database, an Express or FastAPI route layer, a vanilla frontend. The framework was deliberately designed to be implementable in that environment. This walkthrough shows it is.

## What the dashboard is

The Prism dashboard is a single-file Express.js backend (`server.js`, just over 6,000 lines as of May 2026), backed by a SQLite database with WAL mode enabled, serving a vanilla HTML and JavaScript frontend from a `public/` directory. There is no bundler, no framework, no TypeScript, no microservices. The deploy target is a single Railway service. The total operational footprint is about what a small business accounting package would consume.

It runs Prism’s CRM with a twelve-stage pipeline, integrates Stripe for payments and QuickBooks for accounting, ingests daily review notes from an Obsidian vault via a sync script, captures a Claude Code activity log, scores AI readiness assessments using a documented rubric, syncs canonical state to Notion, and serves the AI-readiness assessment landing page.

It is, in other words, the operational mission-control surface for a small consultancy. That is what makes it instructive. Most organizations deploying AI agents will be running them inside a similarly-sized operational stack. The CM discipline scales down before it scales up.

## Where the four disciplines show up today

### Baseline

The dashboard maintains documented baselines for every operational asset it tracks. A CRM customer record carries a `crm_status` field constrained to one of twelve allowed values, an `adoption_stage` field validated against an allow-list before storage, an associated industry resolved against an industries table, and an `is_active` flag governing soft-delete state. The combination defines what a customer record is supposed to look like at any point in time. Drift from that baseline — a status outside the allow-list, an orphaned industry reference, a record where `is_active = 0` but referenced by an active project — is detectable.

The same discipline runs across other asset classes. Projects have a `status` constrained to a defined set. Invoices have a status enum the financials integration validates. The notion-sync adapter (`notionAdapter`) has a defined contract for which fields are canonical to Notion versus local — when the canonical contract changes, every read path through the adapter is required to follow.

This is configuration management as applied to business records, not AI agents. The mechanics are the same.

### Change Control

The dashboard’s CRM has change control built into the data model. Every status transition is recorded with a `crm_last_status_change` timestamp. Every assessment submission auto-advances the customer’s CRM stage from `assessment` to `proposal` only if specific preconditions are met, and logs a warning if the auto-advance is skipped. Every webhook submission records its source attribution explicitly — `data.source || 'website_contact_form'` — so that the audit trail captures which surface generated the lead.

At the code-deployment layer, change control runs through a documented protocol. The dashboard repo enforces a strict workflow: WIP=1, branch-per-task, never push to main, squash-merge only. The protocol exists because production was wiped twice; the incident findings document is required reading before any work begins. Every code change to the dashboard goes through a defined approval path — a written PR description, an automated reviewer pass, a human merge. The audit trail is the git log plus the PR comments plus the deploy events.

Applied to AI agents, the same discipline would govern prompt revisions, tool inventory changes, and model version upgrades. The mechanics are unchanged.

### Drift Detection

Two layers of drift detection run today. The first is on operational data. The CRM has a `/api/crm/triggers` endpoint that returns customers whose current stage has an urgent flag set — *"customers with urgent pending actions."* The endpoint exists because the human team cannot continuously poll the customer list; the system surfaces the cases that need attention. This is drift detection at the operational layer: the customer’s last status change exceeded the SLA for that stage, so the system raises it.

The second layer runs on financial reconciliation. The `/api/financials/kpis` endpoint pulls aggregated values from Stripe (payments, balance, subscriptions), QuickBooks (P&L, invoices), and the local database (CRM-attributed pipeline value). Discrepancies between the three sources — a Stripe payment that does not appear in QuickBooks, a local invoice with no corresponding Stripe charge — are visible to the operator. The cache layer (`cacheService`) ensures the comparison runs against fresh data without hammering the upstream APIs.

Neither of these is yet a full KRI tier model. Both demonstrate the architectural pattern that scales to one. The instrumentation point exists; the threshold and tier definition is the design work.

### Audit & Remediation

The dashboard captures an activity log on multiple surfaces. The Claude Code usage data is read from `~/.claude/usage-data` and surfaced through the dashboard. The `prismStudioActivityLog` service captures operational events. The CRM customer record carries a `crm_last_status_change` field that supports reconstruction of the customer’s lifecycle. The Notion sync adapter writes a record of every successful and failed sync attempt.

Rollback is supported at the data layer through the soft-delete pattern (`is_active = 0` rather than DELETE), at the code layer through the squash-merge protocol (every change is one commit, revertible), and at the infrastructure layer through Railway’s deploy history (every deploy is named, taggable, and rollbackable). The deploy runbook documents the rollback procedure explicitly. It has been exercised in production — twice, in fact, after the incidents that produced the workflow protocol now in place.

## The CRM stage model as a tier-escalation prototype

The clearest existing analog to the KRI tier model is the dashboard’s twelve-stage CRM definition. Each stage carries:

* A defined trigger action (*"Send intro email within 24 hrs"*)
* An SLA (*"24 hours"*, *"48 hours"*, *"5 days"*, etc.)
* A next-stage lifecycle pointer
* An urgent flag (binary today)

The pattern matches the KRI tier model in shape but not yet in granularity. The current implementation is binary — urgent or not — where the framework specifies three tiers. Extending the model is straightforward: replace the boolean urgent flag with a tier enum, define Tier 1 for stages where missing the SLA produces a warning to the on-call operator, Tier 2 for stages where missing the SLA auto-throttles outbound activity until human review, and Tier 3 for stages where missing the SLA triggers an executive notification and a written incident summary.

The fact that the existing implementation already encodes the trigger action, the SLA, and the urgent flag in the same data structure is the point. The discipline is in place. The tier granularity is incremental work, not a rebuild.

## What it would take to extend this to AI agents

The honest answer to *"how do you operationalize this framework?"* is: the same way Prism operationalized it for its own business records.

If Prism deployed an autonomous AI agent in production tomorrow &mdash; say, an outbound sales agent generating discovery-call follow-up emails &mdash; the extension would look like this:

| Step | Discipline added | Reuses existing dashboard pattern |
|---|---|---|
| 1. Add agent to asset inventory | Baseline (asset registry) | `clients` table &rarr; new `production_agents` table |
| 2. Define the baseline | Baseline (behavioral profile) | Observation window pattern from CRM KPIs |
| 3. Wire change control | Change Control | PR-and-merge protocol (already enforced on the dashboard repo) |
| 4. Instrument drift detection | Drift Detection | KPI emission pattern + `/api/crm/triggers` mirror |
| 5. Define tier escalation | KRI tier overlay | `CRM_STAGES` constants block pattern |
| 6. Add rollback path | Audit &amp; Remediation | Soft-delete + Railway deploy-rollback patterns |

**Effort:** ~3 weeks of engineering for the first agent, declining to ~3 days per additional agent once the patterns are factored.

1. **Add the agent to the asset inventory.** A new row in a `production_agents` table. Columns capturing model identifier, model version, system prompt content hash, tool inventory JSON, data scope JSON, owner, baseline-approved date, current-status enum.

1. **Define the baseline.** Output distribution profile from a 14- to 30-day observation window. Latency band. Refusal rate baseline. Cost-per-action target. All written into a baseline record linked to the agent.

1. **Wire the change control.** Any modification to the agent’s row in `production_agents` requires the same PR-and-merge protocol the dashboard already uses. The audit trail is the git log plus the dashboard’s existing change-tracking columns.

1. **Instrument drift detection.** Per-agent metrics emitted to the same KPI table that already serves the dashboard’s financial reconciliation. New columns for hallucination rate, output distribution shift, tool-call error rate, refusal-rate inversion. The `/api/agents/triggers` endpoint mirrors `/api/crm/triggers` — agents whose current behavior has crossed a tier threshold.

1. **Define the tier escalation table.** A new constants block in `server.js` parallel to `CRM_STAGES`. Per-agent overrides for organizations whose risk appetite differs from the starter set defaults.

1. **Add the rollback path.** A `/api/agents/:id/rollback` endpoint that replaces the agent’s active baseline with the most recent prior approved version. Tested before the agent enters production. Rehearsed quarterly.

The total estimated effort: about three weeks of engineering for the first agent, declining to about three days per additional agent once the patterns are factored. The point is that the patterns are already factored — for business records. Extending them to agents is a known shape of work.

## The framework’s architectural claim

The dashboard is the existence proof for an architectural claim the framework makes: configuration management for AI agents does not require new tooling. It requires the discipline of treating every agent in production as a configuration item with a documented baseline, governed by a defined change control process, monitored by a tiered KRI escalation model, and audited against the baseline that authorized any given action.

The infrastructure to do this is the infrastructure most operational teams already have. A database. A route layer. A defined enum of approved states. A change-tracking timestamp. A tier-aware escalation endpoint. A rollback procedure that has been exercised before it was needed.

What is rare is not the tooling. What is rare is the discipline. The dashboard described here is the discipline applied to one class of asset. Extending it to autonomous agents is the next class. The mechanics are the same.

## What this post is not

This post is not a vendor pitch for the Prism dashboard as an AI agent governance platform. The dashboard is internal infrastructure. We do not license it, sell it, or position it as a product. The dashboard is offered here as evidence — that the framework is implementable inside a small operational footprint, that the disciplines transfer cleanly from business records to agents, and that the architecture is straightforward enough to describe in a 1,800-word blog post.

The framework reference document and the KRI starter set are the deliverables. The dashboard is the proof that we use them on ourselves.

The final post in this series crosswalks the framework against the IAPP AIGP Body of Knowledge for governance professionals studying for the certification. It is the closing of the series — the operational layer the AIGP curriculum implies but does not yet fully detail.

*This is part 5 of a six-part series on Configuration Management for AI Agents. Part 1 stakes out the latency gap. Part 2 introduces the four-discipline framework. Part 3 details the KRI tier model. Part 4 maps the framework to NIST AI RMF. Part 6 crosswalks the framework against the AIGP Body of Knowledge.*

### Implementing the Framework Against Your Own Operational Stack?

Prism AI Analytics works with organizations that want to extend their existing operational dashboards into AI agent governance — using the infrastructure they already have rather than purchasing dedicated control planes. Engagement starts with a baseline assessment of the assets in scope and the current monitoring infrastructure.

[Schedule a CM-AI Implementation Review](/#contact)
