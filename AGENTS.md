# AGENTS.md - Workspace Root Directives & Rules

## Core Operational Directives & Rules
1. **Strict Zero Emoji Policy**: Never output or include emojis anywhere in documentation, code comments, UI buttons, headers, or messages. Keep descriptions simple, clean, and concise.
2. **Beginner-Friendly Documentation & Plain Language**:
   - Write all guides and Obsidian Vault notes in simple, everyday English with short, point-wise bullet lists so any beginner can understand what each feature looks like and how it works.
   - Avoid obscure technical jargon or long complicated paragraphs.
   - Maintain only **one single file** for future suggestions: `Future App Ideas & Features.md`.
3. **Auto-Update Rule**: Maintain and auto-update `RULES.md`, `AGENTS.md`, `Fireline/RULES.md`, `Fireline/AGENTS.md`, and Obsidian Vault documentation after every user request to reflect latest requirements and fixes.
4. **Robust Interactive Controls & Plain Language UI**: All user interaction points (e.g. "Compare Fire", popups, filter dropdowns, CSV downloads) must be functionally verified and operate without fragile timeouts or silent failures.
5. **Dataset Security & Fast JSON Engine**: Never commit raw multi-GB CSV datasets. Push only source code, configuration, scripts, and pre-aggregated JSON (`global_country_analytics.json`) covering 2022-2025 across 200+ countries.
6. **Combustion Color Fidelity**: Map dots must follow standard combustion thermal spectrum (Yellow to Amber to Orange to Vermilion to Deep Crimson) without unrealistic purple/magenta hues.
