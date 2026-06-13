# Standard Modular Page Pattern

This document describes the recommended modular pattern for pages that exceed 400 lines of code.

## Directory Structure

```
pages/
  PageName/
    index.tsx                 (Main component, <400 lines)
    components/
      ComponentName.tsx       (Feature-specific components)
      AnotherComponent.tsx
    hooks/
      usePageLogic.ts        (Complex logic extraction)
      useDataFetching.ts
    types.ts                 (TypeScript interfaces)
    constants.ts             (Constants and config)
    utils.ts                 (Utility functions)
```

## File Size Guidelines

- **index.tsx**: Main orchestrator, ~150-300 lines
  - Handles layout and component composition
  - State management for filters/UI
  - Event handlers delegation

- **Component files**: 100-250 lines each
  - Single responsibility principle
  - Reusable within and across pages
  - Accept props for all data/callbacks

- **Hook files**: 50-200 lines each
  - Complex logic extraction (fetching, filtering, calculations)
  - State management for specific features
  - Memoization for performance

- **types.ts**: 50-150 lines
  - Shared interfaces and types
  - Props interfaces for components

- **constants.ts**: 20-100 lines
  - Configuration values
  - Fixed arrays/objects
  - Magic strings centralized

- **utils.ts**: 50-150 lines
  - Pure functions for calculations
  - Formatting and parsing
  - Helper functions

## Benefits

1. **Maintainability**: Changes are isolated to specific files
2. **Testability**: Hooks and utils are easier to unit test
3. **Reusability**: Components and hooks can be shared across pages
4. **Performance**: Better memoization and re-render optimization
5. **Collaboration**: Team members can work on different modules simultaneously
6. **Readability**: Smaller files are easier to understand

## Example: Converting a 1000-line page

### Before
```
- OrderManagement.tsx (883 lines) - everything in one file
```

### After
```
- OrderManagement/
  - index.tsx (250 lines) - Main layout
  - components/
    - OrderCard.tsx (120 lines) - Order display
    - OrderFilters.tsx (150 lines) - Filter UI
    - CreateOrderModal.tsx (200 lines) - Order creation
  - hooks/
    - useOrderData.ts (180 lines) - Fetch and manage orders
    - useOrderFiltering.ts (150 lines) - Filter logic
  - types.ts (80 lines) - Order interfaces
  - constants.ts (40 lines) - Status options, etc.
  - utils.ts (100 lines) - Calculations, formatting
```

## Migration Checklist

For each page over 400 lines:

- [ ] Create page directory structure
- [ ] Extract types to `types.ts`
- [ ] Extract constants to `constants.ts`
- [ ] Extract utility functions to `utils.ts`
- [ ] Extract complex logic to hooks
- [ ] Break down JSX into components
- [ ] Create index.tsx as orchestrator (test line count < 400)
- [ ] Create main file as re-export: `export { default } from './PageName'`
- [ ] Update imports in route files if needed
- [ ] Test functionality thoroughly
- [ ] Update documentation/comments

## Keep in Sync

All modular pages should follow this pattern for consistency:
- Same folder naming conventions
- Similar file organization
- Consistent import paths (@/ for aliases)
- Standard component prop interfaces
