# Conversation Continuity Guide

This document provides guidelines for maintaining project context and continuity across conversation sessions.

## 🔄 **When User Says "Continue Project"**

**Automatically perform these steps in order:**

1. **🔴 CRITICAL - Check & Validate Linear**: Query current project status, priorities, and identify next task. The AI has **proactive responsibility** for maintaining Linear project hygiene:
   - **Ensure actionable tasks exist**: There should be at least one task marked "in progress". If none exist, identify the most logical next task from available candidates and update it to "in progress" after user confirmation.
   - **Resolve priority conflicts**: If multiple tasks are "in progress", engage the user to determine priority and update Linear accordingly.
   - **Recognize planning gaps**: Before proceeding with any task, evaluate whether it's sufficiently detailed for implementation. Issues with vague descriptions, broad scope, or unclear requirements should trigger a planning conversation.
   - **Take initiative on breakdown**: When high-level issues lack actionable sub-issues, proactively propose a breakdown structure to the user. Don't wait to be asked - it's the AI's responsibility to identify when more planning is needed.
   - **Maintain project structure**: Update Linear throughout the work session - mark completed sub-issues, update progress, and ensure the project state accurately reflects current reality.

2. **🟡 IMPORTANT - Verify dev environment**: Confirm dev server is running at `http://localhost:5173/`

3. **🟡 IMPORTANT - Check recent commits**: Review latest GitHub commits to understand current code state

4. **🔴 CRITICAL - Proceed with specific task**: Reference Linear issue numbers (e.g., PROJ-29) and begin work

## 📋 **General Continuity Practices**

### **Before Ending Conversations**
- **🔴 CRITICAL - Commit all changes**: Ensure no work is lost
- **🟡 IMPORTANT - Update Linear with progress**: Mark completed tasks, update status
- **🟡 IMPORTANT - Note next priority clearly**: Document what should be worked on next

### **Maintaining Persistent State**
- **🔴 CRITICAL - Use Linear as source of truth**: All project status and priorities
- **🟡 IMPORTANT - Keep dev server running**: Maintain development environment
- **🟡 IMPORTANT - Update documentation**: Keep project docs current with changes

### **Context Provision**
- **🔴 CRITICAL - Reference specific Linear issues**: Use issue numbers, not general "continue project" language
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
