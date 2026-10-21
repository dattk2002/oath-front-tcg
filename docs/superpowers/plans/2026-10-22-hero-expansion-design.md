# Fourteen-hero Design Delivery Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to complete this plan inline and sequentially. Design artifacts need asset/data/visual validation, not artificial software unit tests.

**Goal:** Deliver fourteen original hero designs and review current OathFront against Pen and game rules.
**Architecture:** A separate design-only content manifest and source-art package. Runtime content, API and saved games remain unchanged.
**Tech Stack:** Markdown, JSON, built-in image generation, PNG alpha inspection, static HTML gallery, existing Playwright/CI evidence.
**Spec:** `docs/superpowers/specs/2026-10-22-hero-expansion-design.md`

## Global constraints

All visible expansion copy must be English. Runtime remains six heroes while playable scope is pending. Preserve frozen Pen digest, core_v1 and user-owned audio work. Fourteen signatures are draft values; no balance claim. Commit/push is authorized; deployment is excluded.

## Review focus

- Extra heroes must not appear as playable API IDs or fabricated Pen nodes.
- Full-body props and anatomy must remain inside solid-alpha image bounds.
- Pierce, movement, block timing and target disappearance must follow existing rules.
- Gallery must load all fourteen local images at desktop/tablet/mobile without horizontal overflow.
- Review must distinguish exact Pen frames from inherited game layouts and avoid claiming device/performance/balance acceptance from CI.

## H1 — Character bible and contract

Files: spec above; `docs/design/heroes-expansion/{roster.json,prompts.json,README.md}`.
- [x] Define seven heroes per faction, classes, silhouettes, four-power kits and counterplay.
- [x] Define draft-only IDs, baseline deck references and unchanged saved-game boundary.
- [x] Builder check: no important questions remain for design/artwork and current-app review; pending playable scope remains excluded.
- [x] Verify named shared powers and effect wording against core content and English presentation.

## H2 — Artwork

Files: `assets/source/heroes-expansion-v1/heroes/*.png`, asset manifest, local gallery.
- [x] Generate one original full-body image per hero with the built-in tool.
- [x] Save all fourteen originals into the repository.
- [x] Inspect image anatomy/equipment, real alpha, dimensions and solid-edge bounds.
- [x] Finish gallery browser checks at 1440, 1024 and 375px; record hashes and visual review.

## H3 — Whole-app review

Files: `docs/implementation/app-design-review.md`, Pen contract addendum.
- [x] Review public/editorial/gameplay families against actual Pen coverage and existing browser evidence.
- [x] Audit game invariants and inspect exact-commit CI outcome.
- [x] Record independent reviewer findings and disposition; fix evidenced in-scope issues.
- [x] Link design expansion without changing existing implementation readiness or source mappings.

## H4 — Verify and deliver

- [x] Validate JSON uniqueness, class/power/deck compatibility, image paths/hashes and document links.
- [x] Run frozen Pen checker/tests; review scoped diff and exclude user-owned files.
- [x] Prepare verified design and review commits for the authorized main push.
- [x] Record implementation/design boundaries and remaining gates; final delivery confirms the pushed remote SHA.
