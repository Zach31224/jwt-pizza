# Deliverable 5 — Test Driven Development TODO

## Update User (Frontend)

- [x] Create `tests/user.spec.ts` with initial `updateUser` test (register, navigate to diner dashboard)
- [x] Add Edit button & dialog stub to `dinerDashboard.tsx`
- [x] Add dialog open/close test assertions to `user.spec.ts`
- [x] Write failing test for name textbox interaction in `user.spec.ts`
- [x] Add name/email/password inputs to dialog in `dinerDashboard.tsx`
- [x] Add `setUser` prop to `DinerDashboard` interface and wire through `app.tsx`
- [x] Update `updateUser()` in `dinerDashboard.tsx` to set user state (no backend yet)
- [x] Add logout/login persistence test to `user.spec.ts` (should fail)
- [x] Add `updateUser` method to `pizzaService.ts` interface
- [x] Implement `updateUser` in `httpPizzaService.ts`
- [x] Call `pizzaService.updateUser()` inside `updateUser()` in `dinerDashboard.tsx`
- [x] Write additional update user tests (email change, password change, role variations)

## List Users — Backend TDD

- [ ] Add `GET /api/user` docs entry to `userRouter.js` (DDD first)
- [ ] Write failing test for list users (expect 404 before route exists)
- [ ] Add basic `GET /` route to `userRouter.js` returning `{}`
- [ ] Add `authenticateToken` middleware to `GET /api/user`
- [ ] Split into `list users unauthorized` (401) and `list users` (200) tests
- [ ] Implement full list users — return an array of users from DB
- [ ] Implement pagination (`page` & `limit` query params, return `more` flag)
- [ ] Implement name filter (`name` query param)
- [ ] Write backend tests for pagination and name filter edge cases

## Delete User — Backend TDD

- [ ] Add `DELETE /api/user/:userId` endpoint to `userRouter.js` with auth
- [ ] Write backend tests for delete user (unauthorized, own account, admin deletes other)

## List/Delete Users — Frontend (Admin Dashboard)

- [x] Add List/Delete users UI to `adminDashboard.tsx`
- [x] Add `listUsers` and `deleteUser` methods to `pizzaService.ts` interface
- [x] Implement `listUsers` and `deleteUser` in `httpPizzaService.ts`
- [x] Write frontend tests for admin list and delete user flows

## Completion

- [x] Verify ≥ 80% code coverage across all changes (87.94% statements, 86.57% lines)
- [ ] Submit on Canvas
