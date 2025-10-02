# Privacy Policy — ChromEd

**Effective date:** 2025-10-01  

ChromEd is a personal project created to provide a fast, multi-tab text and code editor in Chrome with Google Drive support.

---

## What data we collect
ChromEd does **not** collect, transmit, or sell any personal data or file contents.  
All files you open and edit stay on your device or in your own Google Drive account.

---

## Google Drive integration
When you choose to connect Google Drive:
- ChromEd uses the Chrome Identity API (`chrome.identity`) to authenticate you directly with Google.
- ChromEd requests the **minimum necessary permissions**:
  - `drive.file` — allows creating, opening, and saving files that you select using ChromEd.
  - `drive.metadata.readonly` — (optional) allows listing metadata (like filenames) for files you select.
- ChromEd never requests full access to your Google Drive.
- Access tokens are handled securely by Chrome and are not stored permanently or shared with anyone.

---

## Permissions explained
- **storage** — used only to remember your tabs, settings, and unsaved files between sessions.  
- **identity** — used only for Google authentication to access Drive.  
- **tabs** — used for internal functionality (opening ChromEd, managing zoom).  

---

## Third-party services
ChromEd does not use analytics, advertising, or tracking.  
The only third-party service contacted is the **Google Drive API**, and only when you explicitly use the “Save to Drive” or “Open from Drive” features.

---

## Security
- All file operations happen locally or with your Google Drive account under your control.  
- No external servers, databases, or trackers are involved.  
- ChromEd never uploads files anywhere except where you explicitly save them.

---

## Contact
For questions or concerns about privacy, please contact:  
**alexander.katasonov@gmail.com**
