# Experiments and testing

No experiments have been recorded yet.
# Experiments

## push-aside-preview — Can a fixed extension panel preserve chat text?
Date: 2026-11-12
Status: run on synthetic local preview; live-site test pending

Question: Can the page reflow beside a 350px panel without covering the messages?

Method: A Manifest V3 content script toggles an attribute on the document root. CSS reduces its width by 350px while a fixed panel occupies the freed right edge. The same files were loaded on a local synthetic chat page in Chrome. Closed, timeline, and expanded-detail states were inspected at the browser's available 2560px viewport. The script and manifest parsed successfully.

Observed result: In the local preview, chat text and composer shifted within the remaining width and stayed visible. Timeline rows opened the contextual detail. Screenshots: [closed](assets/exports/2026-11-12-extension-closed.png), [timeline](assets/exports/2026-11-12-extension-timeline.png), [detail](assets/exports/2026-11-12-extension-detail.png).

Limits: This test uses a synthetic host page and manually authored findings. It does not demonstrate injection into a live chatbot, narrow-window quality, or detection accuracy. Earlier screenshot passes exposed a panel font mismatch; CSS was corrected and the timeline/detail screenshots were recaptured. The closed screenshot predates the font correction but the panel is hidden in that state.

Next: Test loaded content-script behavior on a supported chat site and at a laptop-width viewport; assess whether any native fixed elements overlap the panel.
