---
name: Institutional Attendance QR System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#8d4b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#b15f00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is engineered for public-sector technical education institutions and vocational academies requiring rapid, verifiable classroom check-ins via dynamic QR codes. The tone is authoritative yet frictionless: it combines the civic dependability of institutional portals with the swift tactile clarity of progressive web applications.

The aesthetic blends **Modern Institutionalism** with subtle **Frosted Glass Utility**. High visual clarity, unmistakable verification states, and large tap-targets ensure that learners, instructors, and regional coordinators can confirm presence within split-seconds under varying classroom lighting conditions. Interfaces project rigor, cleanliness, and real-time responsiveness.

## Colors

The palette balances institutional integrity with instant semantic feedback:
- **Primary (`#059669` / `#10b981`)**: Institutional emerald green representing validated presence, certified compliance, and core operational CTAs.
- **Secondary (`#2563eb`)**: Academic indigo/blue utilized for scheduled sessions, group cohorts, calendar metrics, and active scanning states.
- **Tertiary (`#d97706`)**: Amber signal for pending verifications, location radius warnings, and late check-in grace periods.
- **Neutral (`#0f172a` to `#f8fafc`)**: Slate hierarchy ensuring WCAG AAA legibility, sharp structural contrast, and reduced visual fatigue on mobile screens.
- **Error / Denial Accent (`#e11d48`)**: High-visibility rose for invalid QR signatures, expired tokens, or out-of-bounds geofence attempts.

Default to a crisp, high-contrast light mode with clean background layering (`#f8fafc` canvas with pure white `#ffffff` cards), supported by saturated dark slate tokens for authoritative institutional hierarchy.

## Typography

The type scale relies entirely on **Inter** for its neutral geometry, optical robustness across low-end mobile viewports, and tabular number support (`tnum`). 

- Numeric telemetry (session timers, countdowns, attendance percentages) must always render with `font-feature-settings: "tnum" 1` to prevent jitter during dynamic updates.
- Micro-labels for state badges and institutional badges employ tight uppercase tracking (`letter-spacing: 0.04em`) to maintain legibility when small.
- Headings maintain negative tracking to command screen authority and establish strict structural boundaries without relying on heavy decorative lines.

## Layout & Spacing

This design system uses a mobile-first fluid grid that transitions to structured multi-column views on tablets and instructor dashboard workstations:
- **Mobile (< 640px)**: 4-column fluid layout with `1rem` margins and `0.75rem` gutters. All primary actions and QR interaction surfaces adhere to a thumb-accessible zone within the lower 60% of the viewport.
- **Tablet (640px - 1024px)**: 8-column layout with `1.5rem` margins and `1rem` gutters for dual-pane scanning and list management.
- **Desktop (> 1024px)**: 12-column layout max-width constrained to `1200px` centered, supporting institutional monitoring, bulk reporting, and cohort analytics.

Element gaps and card internal padding strictly follow the standard layout distance scale (`space-xs` through `space-xl`) to establish predictable visual cadence across disparate mobile display densities.

## Elevation & Depth

Visual depth is achieved through layered structural surfaces, selective glassmorphism, and subtle ambient shadows:
- **Base Canvas (`#f8fafc`)**: Sits at ground level.
- **Surface Level 1 (`#ffffff`)**: Default card state. Elevated using crisp, semi-transparent boundary borders (`1px solid rgba(15, 23, 42, 0.06)`) paired with a diffuse ambient shadow: `0 4px 16px -2px rgba(15, 23, 42, 0.04), 0 2px 6px -1px rgba(15, 23, 42, 0.02)`.
- **Surface Level 2 (Floating & Active Scanners)**: Modals, active QR projection surfaces, and camera viewfinders cast an institutional ambient shadow tinted by slate: `0 12px 32px -4px rgba(15, 23, 42, 0.10)`.
- **Glassmorphic Overlays**: Camera framing zones, floating attendance bars, and bottom sheets use a frosted backdrop filter (`backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.5)`). In dark viewfinder modes, transition to `rgba(15, 23, 42, 0.75)`.

## Shapes

The shape system employs generous, modern radii (`level 3` pill-leaning) to communicate an accessible, contemporary interface that offsets the rigidity of institutional bureaucracy. 

- **Primary Cards & Modals**: Use `rounded-2xl` (1.5rem) and `rounded-3xl` (2rem) to produce friendly, contained modules on mobile touchscreens.
- **Buttons, Verification Pills, and Input Fields**: Fully pill-shaped (`rounded-full` or 9999px) for status indicators, and rounded-xl (1rem) for form fields to preserve comfortable target ergonomics without awkward edge clipping.

## Components

### Buttons
- **Primary Action (Scan / Validate)**: Height 52px for mobile ergonomics. Background `#059669`, text `#ffffff`, font `label-lg`, radius `1rem`. Active state applies a scale transform (`scale(0.98)`).
- **Secondary Action (Cohort / Session Filter)**: Height 48px. Background `#eff6ff`, border `1px solid #bfdbfe`, text `#1d4999`.
- **Ghost Action**: Height 44px. Slate text `#334155` with `#f1f5f9` hover/press surface.

### Status Pills & Badges
- Pill-shaped (`rounded-full`), padding `0.25rem 0.75rem`, font `label-sm`.
- **Verified Present**: `#d1fae5` background, `#065f46` text, with a 6px pulsing emerald indicator dot.
- **Late / Grace Period**: `#fef3c7` background, `#92400e` text.
- **Absent / Expired**: `#ffe4e6` background, `#9f1239` text.
- **Session Scheduled**: `#dbeafe` background, `#1e40af` text.

### QR Code Generator & Scanner Viewfinder
- **Instructor Token Display**: Encased in an elevated `rounded-3xl` card with dynamic countdown ring, rotating tokens every 15-30 seconds, and high-contrast `#0f172a` QR pattern over solid `#ffffff`.
- **Student Scanner Viewfinder**: Edge-to-edge camera canvas with a centered 260x260px cut-out target bounded by 3px rounded emerald guide corners (`#10b981`) and a glassmorphic bottom readout shelf.

### Lists & Cohort Rosters
- Separated card-row style rather than simple hairpins. Each row is a `rounded-xl` container with `#ffffff` fill, containing learner avatar/initials, national ID indicator in `body-sm`, and right-aligned timestamp or instant toggle status.

### Form Inputs
- Background `#f8fafc`, border `1.5px solid #cbd5e1`, radius `0.75rem`, padding `0.875rem 1rem`. Focus state transitions to border `#059669` and subtle outer halo `0 0 0 4px rgba(5, 150, 105, 0.15)`.

### Cards & Summary Banners
- Institutional summary metrics (e.g., "94% Asistencia Total") are styled with high-contrast numerical highlights, nested inside `rounded-2xl` surfaces with micro-borders (`rgba(15, 23, 42, 0.08)`).