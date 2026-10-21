# Marvel Rivals

## Mission
Create implementation-ready, token-driven UI guidance for Marvel Rivals that is optimized for consistency, accessibility, and fast delivery across dashboard web app.

## Brand
- Product/brand: Marvel Rivals
- URL: https://www.marvelrivals.com/heroes/index.html
- Audience: authenticated users and operators
- Product surface: dashboard web app

## Style Foundations
- Visual style: clean, functional, implementation-oriented
- Main font style: `font.family.primary=RefrigeratorDeluxeBold`, `font.family.stack=RefrigeratorDeluxeBold`, `font.size.base=14px`, `font.weight.base=400`, `font.lineHeight.base=normal`
- Typography scale: `font.size.xs=0px`, `font.size.sm=10.41px`, `font.size.md=14px`, `font.size.lg=15.61px`, `font.size.xl=17.34px`, `font.size.2xl=20.81px`, `font.size.3xl=34.69px`, `font.size.4xl=58.97px`
- Color palette: `color.text.primary=#ffffff`, `color.text.secondary=#0000ee`, `color.text.tertiary=#333333`, `color.text.inverse=#cbcbcd`, `color.surface.base=#000000`, `color.surface.muted=#f0f0f0`
- Spacing scale: `space.1=5.2px`, `space.2=6.94px`, `space.3=8.67px`, `space.4=10.41px`, `space.5=13.01px`, `space.6=32.95px`, `space.7=39.02px`, `space.8=39.89px`
- Radius/shadow/motion tokens: No reliable extraction yet; motion and shape tokens should be defined manually.

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
Concise, confident, implementation-focused.

## Rules: Do
- Use semantic tokens, not raw hex values, in component guidance.
- Every component must define states for default, hover, focus-visible, active, disabled, loading, and error.
- Component behavior should specify responsive and edge-case handling.
- Interactive components must document keyboard, pointer, and touch behavior.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.
- Do not ship component guidance without explicit state rules.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and semantic tokens.
3. Define component anatomy, variants, interactions, and state behavior.
4. Add accessibility acceptance criteria with pass/fail checks.
5. Add anti-patterns, migration notes, and edge-case handling.
6. End with a QA checklist.

## Required Output Structure
- Context and goals.
- Design tokens and foundations.
- Component-level rules (anatomy, variants, states, responsive behavior).
- Accessibility requirements and testable acceptance criteria.
- Content and tone standards with examples.
- Anti-patterns and prohibited implementations.
- QA checklist.

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.
- Include known page component density: links (107), tables (15), lists (6), cards (2).

## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Teams should prefer system consistency over local visual exceptions.
