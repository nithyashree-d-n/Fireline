# Project Operating Rules & AGENTS Directive

This document defines the strict project operating rules, conventions, and agent execution policies for the Fireline project.
These rules are binding on all agents working on this workspace and must be updated following user instructions.

---

## 1. Zero Emoji Policy (Strict)
- **Do not use emojis anywhere in the project**:
  - No emojis in Markdown files, code comments, UI labels, titles, buttons, toasts, tooltips, or Obsidian Vault notes.
  - Use clean text symbols, badges, or typographic indicators (e.g., "[High]", "[Active]", "[Success]", "[Close]", "-", "--") instead of Unicode pictorial emojis (no flames, lightning bolts, scales, pins, faces, checkmarks, crosses, etc.).
  - Keep all descriptions, headings, and messages clear, professional, and beginner-friendly.

---

## 2. Beginner-Friendly Documentation & Plain Language Rule
- **Tone and vocabulary**: Write all documentation, Obsidian Vault notes, and UI explanations in simple, everyday English so that a beginner can read and understand what each feature does immediately.
- **Format**: Use clear, concise, point-wise bullet lists instead of long or complicated text blocks.
- **Future Ideas Consolidation**: Keep all future feature and analytics ideas consolidated into **one single file** (`Nasa space challenge vault/Future App Ideas & Features.md`) explaining what each feature does, what it looks like on screen, and why it helps.
- **Avoid obscure jargon**: Replace complex technical words with straightforward terms (e.g. use "Emergency Wildfires" instead of "Thermal Radiance Blowup Exceedance", and "Fire Radiative Power (Heat Output in MW)" instead of "Geodetic Radiometric Flux").

---

## 3. Interactive Feature Reliability & Simple UI
- **Interactive UI components must work cleanly without silent failures**:
  - All button clicks (such as map popup actions, comparison side drawers, and CSV exports) must execute directly, with robust DOM event delegation and zero fragile timer delays.
  - Keep action descriptions concise, intuitive, and simple (e.g., "Compare Fire").
  - When a user adds an item to comparison, provide immediate UI feedback (toast message, counter update) and keep the side window accessible without obstruction.
  - Dynamic filtering:
    - Peak Season cards must display the primary peak month alongside ranked pills for the next 4 highest months in order, dynamically updating when the year filter changes.
    - Region cards must display the live count of fires corresponding to the user's active filter (selected year, month, and country) without displaying unnecessary sensor tags.
    - High-energy fire tiers must be clearly labeled as "Emergency Wildfires (Heat > 100 MW)" with an explanation that these are high-intensity crown blazes capable of burning canopy trees and resisting suppression.

---

## 4. Data Integrity & Repository Cleanliness
- **Multi-Year Harmonized Data Scope**: Support complete 8-year coverage (2018 through 2025) across all 200+ countries with calendar matrices, annual intensity tiers, and sampled fire dots.
- **Fast JSON Engine**: Use pre-aggregated, indexed JSON datasets (`global_country_analytics.json`) for instant map and metric filtering without raw CSV runtime parsing latency.
- **GitHub Push Rules**: Never commit or push raw multi-gigabyte CSV datasets (`Dataset/`, `data/`). Only push source code, configuration, scripts, and pre-aggregated analytics JSON files (`public/data/global_country_analytics.json`).

---

## 5. Visual Theme & NASA Guidelines
- **Color Palette**: Retain the clean NASA Earth Green (`#2a574d`) primary theme with sharp industrial borders (`border-radius: 3px`).
- **Thermal Heat Scale**: Use the standardized combustion thermal ramp on the map canvas (Yellow -> Amber -> Orange -> Vermilion -> Deep Crimson) in both Dark and Light modes. No purple or magenta dots.
- **Mandatory Photo Attribution**:
  - `Photo credit: The National Commission on Space Activities of Argentina (CONAE) • Data courtesy of NASA FIRMS`

---

## 6. Automatic Rules & AGENTS File Maintenance
- **Continuous Rule Sync**: After every user request, review and auto-update `RULES.md`, `AGENTS.md`, `Fireline/RULES.md`, `Fireline/AGENTS.md`, and the Obsidian Vault notes to reflect any newly agreed rules, preferences, and architectural adjustments.
