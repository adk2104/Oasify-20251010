# Feature: Bulk Reply to Comments

**Status:** Planned  
**Priority:** Medium  
**Estimated Effort:** 6-8 hours (full), 2-3 hours (MVP)

## Overview

Enable the chatbot to identify comments that are questions and generate/post replies in bulk, with user approval before sending.

## User Story

> "Hey chatbot, can you reply to all my comments that have questions?"

The chatbot would:
1. Find all comments containing questions
2. Generate contextual replies for each
3. Present them for approval
4. Post approved replies to YouTube/Instagram

## Implementation Phases

### Phase 1: MVP - Suggestions Only (2-3 hours)

**Scope:** Chatbot generates reply suggestions, user copy/pastes manually

- [ ] Add question detection logic (Gemini classification or heuristics)
- [ ] Create bulk suggestion generator in chat API
- [ ] Format suggestions nicely in chat response
- [ ] Track which comments are questions in UI

**Trigger phrases:**
- "Reply to comments with questions"
- "Help me answer my audience questions"
- "Generate replies for questions"

### Phase 2: Approval UI (3-4 hours)

**Scope:** Review interface before posting

- [ ] New route: `/dashboard/bulk-reply`
- [ ] List view with comment + suggested reply
- [ ] Edit inline capability
- [ ] Select/deselect individual replies
- [ ] "Send All Selected" button

### Phase 3: Auto-Posting Integration (2-3 hours)

**Scope:** Actually post replies via API

- [ ] Integrate with existing `api.comments.reply.tsx`
- [ ] Batch processing with rate limiting
- [ ] Progress indicator during posting
- [ ] Error handling for partial failures
- [ ] Mark comments as "replied" in database

## Technical Considerations

### YouTube API Quotas
- Daily quota: ~10,000 units
- Comment reply cost: ~50 units each
- **Max replies per day:** ~200
- Need quota tracking/warnings

### Question Detection Approaches

**Option A: Heuristics (fast, free)**
```javascript
const isQuestion = (text) => {
  return text.includes('?') || 
         /^(what|how|why|when|where|who|can|do|does|is|are|will)/i.test(text);
};
```

**Option B: Gemini Classification (smarter, costs tokens)**
```
Classify if this comment is asking a question that expects a response:
"{comment}"
Reply: YES or NO
```

### Reply Generation Prompt
```
You are replying to a comment on a video titled "{video_title}".

Comment: "{comment_text}"

Write a friendly, helpful reply (1-2 sentences max). 
Be conversational, not robotic. Match the creator's voice.
If it's a compliment, thank them warmly.
If it's a question, answer helpfully or say you'll cover it in a future video.
```

### Database Changes

Add to comments table:
```sql
ALTER TABLE comments ADD COLUMN replied_at TIMESTAMP;
ALTER TABLE comments ADD COLUMN reply_text TEXT;
```

## UI Mockup (Approval Screen)

```
┌─────────────────────────────────────────────────────────┐
│  Bulk Reply to Questions (23 comments)                  │
│  ☑️ Select All                          [Send Selected] │
├─────────────────────────────────────────────────────────┤
│ ☑️ @user123 on "How to Cook Pasta"                      │
│    "What brand of olive oil do you use?"                │
│    ┌─────────────────────────────────────────────────┐  │
│    │ I love using Kirkland Organic! Great quality    │  │
│    │ for the price 🫒                                │  │
│    └─────────────────────────────────────────────────┘  │
│    [✏️ Edit] [❌ Skip]                                   │
├─────────────────────────────────────────────────────────┤
│ ☑️ @foodie99 on "How to Cook Pasta"                     │
│    "How long do you boil the pasta for?"                │
│    ┌─────────────────────────────────────────────────┐  │
│    │ About 8-10 minutes until al dente! Taste test   │  │
│    │ a piece to check 👨‍🍳                            │  │
│    └─────────────────────────────────────────────────┘  │
│    [✏️ Edit] [❌ Skip]                                   │
└─────────────────────────────────────────────────────────┘
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| YouTube quota exceeded | Can't post replies | Quota tracker, daily limits, warnings |
| Low quality AI replies | Bad creator reputation | Always require approval, easy editing |
| Duplicate replies | Spam appearance | Track replied_at, filter already-replied |
| Rate limiting | Partial failures | Retry queue, progress tracking |

## Success Metrics

- Time saved per comment batch (target: 80% reduction)
- Reply approval rate (target: >70% approved as-is)
- User satisfaction with suggested replies

## Related Files

- `app/routes/api.comments.reply.tsx` - Existing single reply logic
- `app/routes/api.chat.server.tsx` - Chat API (add bulk detection here)
- `app/components/ChatPanel.tsx` - Chat UI

---

*Created: 2025-02-03*
