# NodeRails Production Scaling Runbook

## Purpose
This document captures the scaling and production-readiness discussion for the current NodeRails EC2 deployment.

## Executive Summary
- API request handling is mostly stateless and can scale horizontally.
- Redis-backed components (rate limits, OTP, BullMQ) are shared and scale-friendly.
- The current server process also starts workers, pollers, and startup reconciliation jobs.
- Scaling API instances currently also scales background executors, which can increase duplicate scheduling risk and operational noise.

## Current Architecture Behavior

### What is already scale-safe
- JWT/cookie auth for request handling.
- Redis-backed rate limiting (shared counters across instances).
- Redis-backed OTP state.
- BullMQ queueing for webhook, subscription, settlement, and email background processing.

### What is coupled today
Each app instance starts all of the following at boot:
- Webhook worker
- Subscription workers
- Settlement worker
- Email worker
- SES SQS poller
- Startup reconciliation for subscriptions
- Startup reconciliation for settlements

Consequence:
- If N API instances run, these background components also run N times.

## Exact Risks When Scaling Without Separation

### 1) Startup reconciliation duplication
- Multiple instances can run reconciliation at the same time.
- This can enqueue overlapping jobs for the same business entity/period.

### 2) Subscription charging is at-least-once, not exactly-once
- BullMQ provides distributed processing, but failures/retries can still produce duplicate attempts.
- Deterministic job IDs are used for some paths, but not all retry/grace scheduling paths.
- Without a strict per-billing-cycle idempotency lock at DB level, duplicate charge attempts are possible in edge races.

### 3) Worker throughput multiplies with API scale
- More API nodes means more worker concurrency.
- This can amplify downstream load on MTXM, RPC providers, SES, and customer webhook targets.

### 4) SES poller multiplicity
- Multiple consumers on one SQS queue is valid, but scaling all API nodes as pollers can create unnecessary processing pressure.

## What Will Not Usually Break
- API requests themselves (auth/session handling) should continue working behind a load balancer.
- Redis-backed rate limiting remains coherent across instances.
- BullMQ generally prevents one exact queue job from being processed by many workers simultaneously.

## Recommended Target Topology

### Deployment roles
- API role: HTTP only
- Worker role: BullMQ workers + optional pollers
- Optional singleton role: startup reconciliation and one-off maintenance tasks

### Infra pattern
- ALB in front of API instances
- API Auto Scaling Group (min 2)
- Worker Auto Scaling Group (separate scaling policy)
- Shared Redis and PostgreSQL

## Minimal Safe Implementation Plan

### Phase 1 (fastest, 1-2 days)
- Add runtime flags for process role selection:
  - RUN_API
  - RUN_WORKERS
  - RUN_SES_POLLER
  - RUN_RECONCILIATION
- Default local/dev can keep all enabled.
- In production:
  - API nodes: RUN_API=true, others false
  - Worker nodes: RUN_WORKERS=true (and optionally RUN_SES_POLLER=true)
  - Optional singleton: RUN_RECONCILIATION=true

### Phase 2 (hardening, +2-4 days)
- Add leader lock for reconciliation jobs.
- Add DB idempotency key for subscription billing cycle execution.
- Move retry/grace scheduling to deterministic IDs where possible.
- Add queue-depth and failure-rate alarms.

## Idempotency Requirement for Subscription Charges
To reduce duplicate charge risk to near-zero, enforce:
- Unique business key per subscription cycle (example: subscriptionId + periodStart + periodEnd).
- Atomic check-and-claim before creating invoice/payment intent.
- Safe retry behavior that reuses existing cycle artifact when present.

## EC2 Rollout Checklist
- Add ALB target health check endpoint.
- Run at least 2 API instances.
- Separate worker group before major scale-up.
- Set CloudWatch alarms:
  - 5xx rate
  - p95 latency
  - queue depth
  - job failures
  - DB connection pressure
- Keep rolling deploy with minimum healthy capacity.

## Notes from Recent Build Issue
- A TypeScript build issue in admin feedback status update was resolved by using req.merchant instead of req.user.
- This was a typing mismatch with Express request augmentation.

## Decision Log
- Immediate priority: keep current behavior stable and avoid risky refactors under active deployment.
- Next safe step: role-based process startup via env flags.
- Full correctness step: subscription cycle idempotency lock.
