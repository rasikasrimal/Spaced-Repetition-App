# Test Cases

| ID | Title | Description | Pre-conditions | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| TC-001 | Create subject | Validate subject creation form | App running locally | 1. Navigate to Subjects page 2. Click “New subject” 3. Enter name, colour, icon 4. Save | Subject appears in list with correct details |
| TC-002 | Edit subject | Ensure updates propagate | Existing subject | 1. Open subject menu 2. Choose Edit 3. Change colour/icon 4. Save | Updated styling reflected across dashboard and timeline |
| TC-003 | Add topic | Verify topic creation | Subject exists | 1. Open subject 2. Click “Add topic” 3. Fill title + notes 4. Save | Topic listed under subject; review schedule initialised |
| TC-004 | Log review | Confirm review workflow | Topic due today | 1. Open Reviews page 2. Select topic 3. Choose review quality | Review history updated, next due date recalculated, due count decreases |
| TC-005 | Prevent duplicate review | Enforce daily limit | Topic reviewed today | 1. Attempt second review 2. Observe messaging | Message indicates review already completed; no new entry recorded |
| TC-006 | Timeline zoom | Validate zoom/pan controls | Topics with history | 1. Open Timeline 2. Drag to zoom 3. Use reset button | Timeline zooms appropriately and resets on command |
| TC-007 | Theme persistence | Check theme toggle | None | 1. Toggle to dark mode 2. Refresh page | Dark mode remains active |
| TC-008 | Settings retention | Verify retention threshold change | None | 1. Open Settings 2. Adjust retention slider 3. Refresh page | New threshold persisted and applied to due calculations |
| TC-009 | Export data | Ensure export works | Topics exist | 1. Open settings/export 2. Trigger export | Downloaded JSON includes subjects, topics, history |
| TC-010 | Accessibility audit | Manual check | App running | 1. Run axe DevTools/ Lighthouse 2. Tab through forms | No critical accessibility violations; focus order logical |
| TC-011 | Offline resilience | Validate offline use | Data seeded | 1. Load app 2. Disable network 3. Navigate between pages | App remains functional; no blocking errors |

Update this table as new features are introduced. Cross-reference with user stories to ensure coverage.
