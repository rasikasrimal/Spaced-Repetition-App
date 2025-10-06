# PROMPTS_AI_HELP

## Guided prompts

| Category | Prompt | Description |
| --- | --- | --- |
| Study planning | "Build a 7-day cram plan for {{subject}}" | Uses timeline data to stage reviews before the exam date. |
| Risk insight | "Why is {{topic}} at risk?" | Summarises stability trend, last review, and missed checkpoints. |
| Workload balance | "How can I spread {{count}} overdue cards?" | Recommends rescheduling batches within the daily limit. |
| Confidence boost | "What did I improve this week?" | Highlights streak gains and retention lift. |

## Prompt template guidelines

- Always include subject/topic IDs in the metadata payload so the assistant can fetch retention context.
- Provide exam date and daily limit when asking for schedules.
- Strip personal identifiers before sending to the model.
- Reject queries that do not match educational intent with: "This question is not related to your studies. Please use me for your educational progress or exam preparation."

## Response format

```
{
  "summary": "Concise recommendation",
  "actions": [
    { "label": "Actionable step", "dueDate": "2025-05-12" }
  ],
  "references": [
    { "type": "topic", "id": "topic-123", "reason": "retrievability 0.28" }
  ]
}
```

- Include at most five action items.
- Reference topics/subjects with stable IDs to crosslink UI cards.
- Tone: encouraging, factual, no promises about grades.


## Metadata contract

- Include `topics` array with `{ id, title, stability, retrievability }`.
- Provide `subjects` array with exam dates to allow timeline-aware recommendations.
- Supply `preferences` object with retention trigger, daily limit, and timezone.
- Responses should never include raw personal names; map IDs back to friendly labels in the UI only.

## Roadmap extensions

- Add follow-up prompts that summarise what changed after a learner acts.
- Offer exam-specific prompt packs (SAT, MCAT, A-Levels) once templates launch.

[Back to Docs Index](../DOCS_INDEX.md)
