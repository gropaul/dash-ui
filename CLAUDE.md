# Claude Code Instructions

## Styling Guidelines

- **Never use custom/hardcoded colors** (e.g., `bg-white`, `text-gray-600`, `border-[#ededed]`, `#f7f9fb`)
- **Always use Tailwind CSS theme colors** that respect dark mode:
  - `bg-background` instead of `bg-white`
  - `text-foreground` instead of `text-black`
  - `text-muted-foreground` instead of `text-gray-500/600`
  - `border` instead of `border-gray-200` or `border-[#ededed]`
  - `bg-card` for card backgrounds
  - `bg-muted` for muted backgrounds

## Component Guidelines

- **Always prefer shadcn/ui components** over custom implementations
- Check `/src/components/ui/` for available components before creating new ones
- Common shadcn components: Button, Dialog, Dropdown, Tooltip, Toggle, Input, etc.

## Tech Stack

- Next.js with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui components
- @xyflow/react for workflow canvas
