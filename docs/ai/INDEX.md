# AI Documentation Index

This folder contains documentation specifically designed for AI code assistants working on this project. All files are optimized for AI parsing and navigation.

## 📋 **Setup & Configuration**
- **[PROJECT_SETUP.md](./PROJECT_SETUP.md)** - Complete project setup guide for new workspaces
- **[CONVERSATION_CONTINUITY.md](./CONVERSATION_CONTINUITY.md)** - Guidelines for maintaining project context across sessions
- **[TESTING_STRATEGY.md](./TESTING_STRATEGY.md)** - Testing approach, coverage requirements, and exclusions

## 🔧 **Service Integration**
- **[LINEAR_REFERENCE.md](./LINEAR_REFERENCE.md)** - Linear workspace UUIDs and configuration
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Database configuration and connection details
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Deployment procedures and environment setup

## 📖 **Project Context**
- **[PROJECT_CHARTER (solo).md](./PROJECT_CHARTER%20(solo).md)** - Template for solo developer projects
- **[PROJECT_CHARTER (multi).md](./PROJECT_CHARTER%20(multi).md)** - Template for multi-developer projects

## 🎯 **Usage Guidelines**

### For AI Assistants
1. **Start with PROJECT_SETUP.md** when setting up a new project workspace
2. **Follow CONVERSATION_CONTINUITY.md** when user says "continue project"
3. **Reference TESTING_STRATEGY.md** before making testing-related decisions
4. **Use LINEAR_REFERENCE.md** for efficient Linear API operations
5. **Check service setup guides** before configuring external integrations

### File Organization
- All files use Markdown for optimal AI parsing
- Headers use consistent hierarchy for easy navigation
- Code examples include language tags for syntax highlighting
- Configuration values use placeholder format: ❇️PLACEHOLDER❇️

### Maintenance
- Update service reference files when UUIDs or configurations change
- Keep testing strategy current with project evolution
- Archive outdated setup procedures in `docs/local/` folder

## 🔄 **Quick Reference**

**Most Frequently Used:**
1. PROJECT_SETUP.md - New project initialization
2. TESTING_STRATEGY.md - Coverage decisions and test exclusions
3. LINEAR_REFERENCE.md - Task management operations

**Project-Specific:**
- Update PROJECT_CHARTER after copying template
- Customize SUPABASE_SETUP.md with new project credentials
- Modify DEPLOYMENT_GUIDE.md for project-specific deployment needs
