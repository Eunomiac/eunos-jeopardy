# Conversation Continuity Guide

This document provides guidelines for maintaining project context and continuity across conversation sessions.

## 🔄 **When User Says "Continue Project"**

**Automatically perform these steps in order:**

1. **🔴 CRITICAL - Check PROJECT_MANAGEMENT.md**: Review current project status, priorities, and identify next task. The AI has **proactive responsibility** for maintaining project hygiene:
   - **Ensure actionable tasks exist**: There should be at least one task marked "in progress". If none exist, identify the most logical next task from available candidates and update it to "in progress" after user confirmation.
   - **Resolve priority conflicts**: If multiple tasks are "in progress", engage the user to determine priority and update Linear accordingly.
   - **Recognize planning gaps**: Before proceeding with any task, evaluate whether it's sufficiently detailed for implementation. Issues with vague descriptions, broad scope, or unclear requirements should trigger a planning conversation.
   - **Take initiative on breakdown**: When high-level issues lack actionable sub-issues, proactively propose a breakdown structure to the user. Don't wait to be asked - it's the AI's responsibility to identify when more planning is needed.
   - **Maintain project structure**: Update PROJECT_MANAGEMENT.md throughout the work session - mark completed issues, update progress, and ensure the project state accurately reflects current reality.

2. **🟡 IMPORTANT - Verify dev environment**: Confirm dev server is running at `http://localhost:5173/`

3. **🟡 IMPORTANT - Check recent commits**: Review latest GitHub commits to understand current code state

4. **🔴 CRITICAL - Proceed with specific task**: Reference issue numbers (e.g., Issue #3) and begin work

## 🎯 **Current Project Status (2025-09-11)**

**Active Sprint**: Game Host Dashboard Implementation
**Current Focus**: Issue #3 - Game Host Dashboard (60% Complete)
**Critical Blockers**:
- RLS policy needed for games table INSERT operations
- 8 failing tests in GameCreator component
- Test coverage at 71.61% (target: 90%+)

**Immediate Next Actions**:
1. Fix database RLS policy for games table
2. Resolve 8 failing tests in GameCreator component
3. Achieve 90%+ test coverage
4. Complete real-time features for Issue #3

## 📋 **General Continuity Practices**

### **Before Ending Conversations**
- **🔴 CRITICAL - Commit all changes**: Ensure no work is lost
- **🟡 IMPORTANT - Update Linear with progress**: Mark completed tasks, update status
- **🟡 IMPORTANT - Note next priority clearly**: Document what should be worked on next

### **Maintaining Persistent State**
- **🔴 CRITICAL - Use PROJECT_MANAGEMENT.md as source of truth**: All project status and priorities
- **🟡 IMPORTANT - Keep dev server running**: Maintain development environment
- **🟡 IMPORTANT - Update documentation**: Keep project docs current with changes

### **Context Provision**
- **🔴 CRITICAL - Reference specific issue numbers**: Use issue numbers (e.g., Issue #3), not general "continue project" language
- **🟡 IMPORTANT - Provide implementation context**: Explain what was done and why
- **🟢 PREFERRED - Link related work**: Connect current task to broader project goals

## 🎯 **Linear Project Management Priorities**

The AI has **proactive responsibility** for maintaining Linear project hygiene:

### **🔴 CRITICAL Responsibilities**
- Ensure at least one task is always "in progress"
- Break down vague or overly broad issues into actionable sub-tasks
- Update task status throughout work sessions
- Catch planning gaps before they block development

### **🟡 IMPORTANT Responsibilities**
- Resolve conflicts when multiple tasks are "in progress"
- Propose task breakdowns for complex issues
- Maintain accurate project state in Linear
- Connect work to specific issue numbers

### **🟢 PREFERRED Practices**
- Anticipate next logical tasks
- Suggest project structure improvements
- Link related issues and dependencies
