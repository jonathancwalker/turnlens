# Push-aside extension checkpoint — 12 November 2026

The user asked whether the sidebar could push an existing chatbot aside rather than cover its text, and requested a new branch, testable Chrome extension, and screenshots of several states. Codex initialized Git because the folder had no repository, kept a baseline `main` reference, and created `feature/push-aside-extension`.

The first implementation uses a Manifest V3 content script and CSS width reduction. A local synthetic demo provides three illustrative observations for interaction testing; real chat pages receive the panel with no invented findings. Chrome screenshots show closed, timeline, and expanded-detail states. See the [experiment](../experiments.md) and [extension guide](../../extension/README.md). A live-site extension test is still pending.
