# Next extension behavior

## Keep the sidebar in sync with the active chat

When the user switches chats within ChatGPT, Claude, or Gemini, the sidebar should automatically show observations for the newly active conversation. It should clear or replace the previous chat's content promptly so findings never appear attached to the wrong chat. This includes in-app navigation that changes the URL without reloading the tab, browser back/forward, and switching browser tabs. Preserve each conversation's own timeline and selected state when practical.

Status: implemented for the ChatGPT POC. A conversation switch clears analysis and observations so the user can enable review for the new conversation. Chrome fixture checks cover navigation, stale opt-in rejection, and active-tab updates. Rehearse a signed-in conversation switch on the presentation setup. Per-conversation history retention and capture on Claude and Gemini remain open.
