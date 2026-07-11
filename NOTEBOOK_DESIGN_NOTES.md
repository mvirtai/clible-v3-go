# Design Note: Notebook Ownership Model

## Overview

Notebooks use **direct user ownership** (`notebook.user_id`) rather than scope-chain ownership (`scope.user_id`). This is intentionally different from the `SavedSearch` and `SavedAnalysis` authorization pattern.

## Rationale

This design choice enables two key capabilities:

1. **Data Preservation**: Notebooks survive scope deletion (scope_id becomes NULL). User study notes are never lost when a workspace is archived or deleted.
2. **Scope Independence**: Notebooks can exist without a scope, enabling personal study notes and standalone notebook management.

## Ownership Model Comparison

| Model | Validation Strategy | On Scope Delete | Use Case |
|-------|-------------------|-----------------|----------|
| **SavedSearch/SavedAnalysis** | Check `scope_id IN (SELECT id FROM scopes WHERE user_id = ?)` | CASCADE DELETE | Workspace-bound research artifacts |
| **Notebooks** | Check `user_id` directly | SET NULL (orphan) | Personal study notes & data preservation |

## Cascade/Orphan Behavior

- **On scope deletion**: Notebooks are orphaned (scope_id → NULL). Data is preserved.
- **On user deletion**: Notebooks cascade-delete via user_id FK.
- **On notebook deletion**: Cells cascade-delete via notebook_id FK.

## Future Considerations

If collaborative workspaces (phase 3+) are added, this model should be revisited to align with `SavedSearch`/`SavedAnalysis` authorization via scope ownership chain. Until then, notebooks maintain their independent ownership model for data durability.

## Labeling Orphaned Notebooks

In future UI phases, consider labeling orphaned notebooks (where scope_id is NULL) as:
- "Unscoped Notebook"
- "Archived Study Notes"
- "Personal Notebook"

This provides users clarity on notebook lifecycle events.

---

**Last Updated**: 2026-07-11  
**Related PR**: [#51 - Notebooks database and backend](https://github.com/mvirtai/clible-v3-go/pull/51)
