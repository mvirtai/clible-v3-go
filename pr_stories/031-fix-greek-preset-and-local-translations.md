# PR Story: Fix Greek Preset URL and Introduce Local XML Translations

## Business Context

Users experienced failures when trying to install the Greek New Testament (SBLGNT) translation from the presets menu in the Translation Management page. Investigation revealed that the preset URL, which pointed to the `scott-fleischman/sblgnt-osis` GitHub repository, was returning a HTTP 404 error because the repository had been deleted.

To resolve this issue and make the application more resilient to upstream link changes, we have updated the preset URL to a functioning repository and downloaded local backups of the most common translations into the workspace.

## Architectural Changes

### Frontend Presets Update

* **Modified** [TranslationManager.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/TranslationManager.tsx)
  * Changed the download URL for `sblgnt` (SBL Greek New Testament) from the deleted Scott Fleischman repository to the Beblia organization's repository:
    `https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/GreekSBLGNTBible.xml`
  * The Beblia XML format is a simple, structured format containing `<bible>`, `<testament>`, `<book>`, `<chapter>`, and `<verse>` tags, which is fully supported out of the box by our backend `xml_parser.go`.

### Local XML Backups

* **Added** `xml_translations/` folder at the root directory of the workspace.
* Downloaded and saved the following XML files locally to prevent future link failures and allow developers/users to easily import them offline using the "Import Custom XML" feature:
  * `greeksblgnt.xml` (Greek SBLGNT New Testament)
  * `heb-leningrad.usfx.xml` (Hebrew Leningrad Codex — fixed a known upstream syntax typo `<ook id="EST">` to `<book id="EST">` on line 1030 using sed)
  * `fin-biblia-33-38.osis.xml` (Finnish Kirkkoraamattu 1933/38)
  * `fin-1992.xml` (Finnish Kirkkoraamattu 1992)
  * `fin-1776.xml` (Finnish Biblia 1776)

## Testing & Verification Plan

### Automated Checks

* The developer runs local sanity checks and linters:

  ```bash
  task check
  ```

### Manual Verification

* Verified that the Beblia SBLGNT XML structure matches the backend Beblia parser format by inspecting the XML file headers and test outputs.
