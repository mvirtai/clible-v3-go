# PR Story: Fix Notebook Handler Test Assertions

## Business Context

This PR resolves a discrepancy in the backend api testing suite where two test cases under the Notebook Handler test suite were failing due to incorrect expected HTTP status codes.

## Architectural Changes

No architectural changes were made to the codebase. The REST API correctly enforces permission and scope authorization.

## Bug Fixes

### Testing Suite

* **Fixed Test Assertions** ([notebook_handler_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/notebook_handler_test.go)):
  * In `TestNotebookHandler_UpdateNotebook`, changed the expected HTTP status code of the `"returns 403 for unauthorized user"` subtest from `404 Not Found` to `403 Forbidden`. The handler correctly returned `403 Forbidden` since the notebook exists but is not owned by the requesting user, but the test case was incorrectly asserting `404`.
  * In `TestNotebookHandler_DeleteNotebook`, changed the expected HTTP status code of the `"returns 403 for unauthorized user"` subtest from `404 Not Found` to `403 Forbidden` for the same reason.

## Testing Strategy

### Automated Tests

* Verified all tests pass successfully using the project test suite.

  ```bash
  task check
  # Output: All local quality checks passed flawlessly!
  ```
