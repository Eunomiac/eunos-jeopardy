# Linear Workspace Reference

This document contains Linear workspace configuration details for efficient API usage.

## Team Information
- **Team Name**: Euno's Jeopardy
- **Team Key**: EJ
- **Team ID**: << PENDING - NEED TO RETRIEVE VIA API >>

## Workflow States

### State IDs (UUIDs)

- **Backlog**: << INSERT UUID >>
- **Todo**: << INSERT UUID >>
- **In Progress**: << INSERT UUID >>
- **In Review**: << INSERT UUID >>
- **Done**: << INSERT UUID >>
- **Canceled**: << INSERT UUID >>
- **Duplicate**: << INSERT UUID >>

### Priority Levels
- **Urgent**: 1
- **High**: 2
- **Medium**: 3
- **Low**: 4

## Labels

### Label IDs (UUIDs)

#### Phase Labels
- **Phase 0 - Workspace Setup**: << INSERT UUID >>
<< ADD ADDITIONAL PHASES & UUIDS AS NEEDED >>

#### Category Labels
- **Infrastructure**: << INSERT UUID >>
- **Database**: << INSERT UUID >>
- **Frontend & UI**: << INSERT UUID >>
<< ADD ADDITIONAL CATEGORIES & UUIDS AS NEEDED >>

## User Information
- **User ID**: `39f27296-cc69-477a-b81b-bdf385dea282`
- **Name**: Ryan West
- **Email**: ryan.o.west@gmail.com

## Common Linear API Patterns

### Update Issue State
```
Update issue [IDENTIFIER] to state with UUID [STATE_UUID]
```

### Create Issue
```
Create issue with title "[TITLE]" and description "[DESCRIPTION]" in team UUID 2de9825f-eec3-4b26-9f23-8f3e5855634c
```

### Assign Issue
```
Assign issue [IDENTIFIER] to user UUID 39f27296-cc69-477a-b81b-bdf385dea282
```

---

**Note**: This reference document contains all current Linear workspace UUIDs for efficient API operations. Update as needed when workspace configuration changes.
