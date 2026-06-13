# Quick Refactoring Guide for Remaining Pages

This guide shows how to refactor the remaining large pages following the pattern established by AdminDashboard and OrderManagement.

## Files Ready for Refactoring

### 1. Reports.tsx (1288 lines) → Reports/ directory

**Break down into:**

- `index.tsx` - Main layout (~200 lines)
- `hooks/useReportData.ts` - Data fetching
- `hooks/useReportGeneration.ts` - Report generation logic
- `components/ReportFilters.tsx` - Filter UI
- `components/ReportPreview.tsx` - Report display
- `components/ExportOptions.tsx` - Export settings
- `utils.ts` - Formatting functions
- `constants.ts` - Report templates, columns

### 2. ExpenseManagement.tsx (770 lines) → ExpenseManagement/ directory

**Break down into:**

- `index.tsx` - Main layout (~180 lines)
- `hooks/useExpenseData.ts` - Data fetching
- `components/ExpenseForm.tsx` - Form UI
- `components/ExpenseTable.tsx` - List display
- `components/ExpenseFilters.tsx` - Filters
- `utils.ts` - Calculation helpers
- `types.ts` - Expense interfaces

### 3. Other Large Files (Similar Pattern)

**Profile.tsx (772 lines)**

- `index.tsx` - Main profile layout
- `components/ProfileHeader.tsx` - Header section
- `components/ProfileForm.tsx` - Edit form
- `components/SecuritySettings.tsx` - Security options
- `hooks/useProfileData.ts`

**LoginPage.tsx (765 lines)**

- `index.tsx` - Main login layout
- `components/LoginForm.tsx` - Login form
- `components/RegisterForm.tsx` - Register form
- `hooks/useAuth.ts` - Already extracted!
- `utils.ts` - Validation helpers

**PaymentsItems.tsx (479 lines)**

- `index.tsx` - Main layout
- `components/PaymentsList.tsx`
- `components/PaymentDetails.tsx`
- `hooks/usePaymentData.ts`

**PerformanceManagement.tsx (466 lines)**

- `index.tsx` - Main layout
- `components/PerformanceChart.tsx`
- `components/EmployeeMetrics.tsx`
- `hooks/usePerformanceData.ts`

**UserManagement.tsx (408 lines)**

- `index.tsx` - Main layout
- `components/UserTable.tsx`
- `components/UserForm.tsx`
- `hooks/useUserData.ts`

## Quick Refactoring Checklist

For each file:

1. **Create directory structure:**

   ```bash
   mkdir -p src/pages/PageName/{components,hooks}
   ```

2. **Extract in order:**
   - [ ] Identify main data fetching logic → `hooks/usePageData.ts`
   - [ ] Identify filtering/calculation logic → `hooks/usePageLogic.ts`
   - [ ] Extract UI sections into components
   - [ ] Create `types.ts` and `constants.ts`
   - [ ] Create `index.tsx` as orchestrator
   - [ ] Update main `.tsx` file to re-export

3. **Validate:**
   - [ ] Run `wc -l src/pages/PageName/index.tsx`
   - [ ] Confirm < 400 lines
   - [ ] Test all functionality
   - [ ] Check imports work correctly

## Key Principles

1. **One responsibility per file** - Each component/hook does one thing well
2. **Composition > Inheritance** - Use props and composition
3. **Memoization** - Use `useMemo` for expensive calculations
4. **Type safety** - Define interfaces in `types.ts`
5. **Constants first** - Move magic strings to `constants.ts`
6. **Pure functions** - Keep utils pure and testable

## Template Files to Copy

When creating new page modules:

1. Copy constants pattern from: `AdminDashboard/constants.ts`
2. Copy hook pattern from: `AdminDashboard/hooks/useAdminDashboardData.ts`
3. Copy component pattern from: `AdminDashboard/components/WelcomeBanner.tsx`
4. Copy utils pattern from: `AdminDashboard/utils.ts`

## Automated Testing

After refactoring, verify:

```bash
# Check all page files are under 400 lines
find src/pages -name "index.tsx" -exec sh -c 'echo "{}: $(wc -l < {})"' \;

# Check import paths work
npm run build

# Check for unused imports
npm run lint
```

## Performance Improvements

The modular structure enables:

- Better tree-shaking
- Easier code splitting
- Component lazy loading
- Better memoization opportunities
- Smaller individual component re-renders
