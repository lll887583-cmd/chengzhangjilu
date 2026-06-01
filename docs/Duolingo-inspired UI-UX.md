---
name: Growth Buddy
colors:
  surface: '#faf9f9'
  surface-dim: '#dadada'
  surface-bright: '#faf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f3'
  surface-container: '#eeeeed'
  surface-container-high: '#e9e8e8'
  surface-container-highest: '#e3e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#3f4a36'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f0f0'
  outline: '#6f7b64'
  outline-variant: '#becbb1'
  surface-tint: '#2b6c00'
  primary: '#2b6c00'
  on-primary: '#ffffff'
  primary-container: '#58cc02'
  on-primary-container: '#1e5000'
  inverse-primary: '#6be026'
  secondary: '#755b00'
  on-secondary: '#ffffff'
  secondary-container: '#fec700'
  on-secondary-container: '#6e5400'
  tertiary: '#8c5000'
  on-tertiary: '#ffffff'
  tertiary-container: '#ff9c27'
  on-tertiary-container: '#683a00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  background: '#faf9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e3e2e2'
typography:
  headline-lg:
    fontFamily: Quicksand
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.5px
  headline-lg-mobile:
    fontFamily: Quicksand
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Quicksand
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  body-lg:
    fontFamily: Nunito Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-md:
    fontFamily: Nunito Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  label-lg:
    fontFamily: Quicksand
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
  label-sm:
    fontFamily: Quicksand
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: auto
---

# Growth Buddy UI/UX Rules for 成长记录

## Brand & Style

The design system turns growth tracking into a joyful, gamified experience for parents and children. It uses Duolingo-style minimalism as inspiration, while keeping all visuals original for 成长记录.

The visual language is playful geometry: ultra-rounded corners, thick expressive borders, and tactile 3D depth. Every interaction should feel like a small win with squishy, responsive feedback.

## Colors

- Primary Green: growth milestones, progress completion, main actions.
- Secondary Yellow: streaks, rewards, point highlights.
- Tertiary Orange: alerts, tips, lottery/exchange moments.
- Accent Blue: informative UI, navigation, profile/Firebase notes.
- Surfaces: mostly white cards on a warm off-white background.
- Borders: every interactive element uses a defined 2px border.

## Typography

- Headlines and labels use Quicksand Bold.
- Body copy uses Nunito Sans Medium/SemiBold.
- Avoid light weights. The interface should feel chunky and legible.

## Layout & Spacing

- Mobile side margin: 20px.
- Tablet layout: 2-column where useful.
- Spacing follows an 8px rhythm, with common gaps of 12px, 24px, and 40px.
- Cards should float as distinct objects and never touch screen edges.

## Elevation & Depth

- Use tonal 3D depth instead of soft blur shadows.
- Buttons and active cards use a 4px-6px solid bottom offset.
- On press, the element moves downward and the offset disappears.
- Modals use a dark translucent backdrop, with the same chunky 2px border.

## Shapes

- Default radius: 24px.
- Large surfaces: 32px-48px.
- Pills: 9999px.
- Corners below 12px are not allowed.

## Components

### Chunky Buttons

Primary buttons use green fill, dark green 2px border, and 6px dark green bottom offset. Text is Quicksand Bold and centered.

### Progress Bars

Progress bars are at least 16px tall, with a grey track and vibrant green fill.

### Playful Cards

Cards use white backgrounds, 2px borders, and 4px flat grey depth. Each card should have a clear icon or visual anchor.

### Input Fields

Inputs are pill-shaped with a 2px border that turns blue when focused. Font size should be at least 18px for data entry.

### Navigation

Bottom navigation uses oversized icons. Active state is a colored pill with a 3D base and slight upward jump.
