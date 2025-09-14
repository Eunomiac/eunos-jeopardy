# AI Documentation Index

This folder contains documentation specifically designed for AI code assistants working on this project. All files are optimized for AI parsing and navigation.

## 📖 **Project Context**
- **[CURRENT_STATUS.md](./CURRENT_STATUS.md)** - Real-time project status and immediate next steps
- **[PROJECT_MANAGEMENT.md](./PROJECT_MANAGEMENT.md)** - Project structure, issues, and static information

## 🔧 **Service Integration & Configuration References**
- **[LINEAR_REFERENCE.md](./reference/LINEAR_REFERENCE.md)** - Linear workspace UUIDs and configuration
- **[SUPABASE_REFERENCE.md](./reference/SUPABASE_REFERENCE.md)** - Database configuration and connection details
- **[DEPLOYMENT_REFERENCE.md](./reference/DEPLOYMENT_REFERENCE.md)** - Deployment procedures and environment setup
- **[TESTING_REFERENCE.md](./reference/TESTING_REFERENCE.md)** - Testing configuration and technical setup

## 📋 **Strategy & Best Practices**
- **[SCSS_STYLING_GUIDELINES.md](./SCSS_STYLING_GUIDELINES.md)** - SCSS styling conventions and best practices
- **[strategy/TESTING_STRATEGY.md](./reference/strategy/TESTING_STRATEGY.md)** - Comprehensive testing strategy and best practices

## 🌟 **Extended Feature Descriptions**
- **[DAILY_DOUBLE_ALGORITHM.md](./features/DAILY_DOUBLE_ALGORITHM.md)** - Automatic Daily Double placement specification

## 🎯 **Current Focus & Active Development**
- **[/issues/](./issues/)** - Issue-specific documentation for active development
  - Active issues in the root of the `issues` folder
  - Completed issues in the `issues/completed` folder
  - Future issues in the `issues/future` folder

## 📁 **Archive**
- **[archive/](./archive/)** - Historical documents and outdated prompts
  - **[prompts/](./archive/prompts/)** - Archived issue-specific prompts

## 🎯 **Usage Guidelines**

### For AI Assistants
1. **Start with CURRENT_STATUS.md** for immediate project status and active work
2. **Review PROJECT_MANAGEMENT.md** for project structure and issue definitions
3. **Check active issues** in the `issues` folder for detailed implementation guidance
4. **Reference service configuration** in the `reference` folder for external integrations
5. **Use testing strategy** in `reference/strategy` for testing approach (coverage handled by remote agents)

### File Organization
- All files use Markdown for optimal AI parsing
- Headers use consistent hierarchy for easy navigation
- Code examples include language tags for syntax highlighting
- Configuration values use placeholder format: ❇️PLACEHOLDER❇️

### Maintenance
- Update service reference files when UUIDs or configurations change
- Keep testing strategy current with project evolution
- Archive outdated documents in the `archive/` folder

## 🔄 **Quick Reference**

**Most Frequently Used:**
1. **CURRENT_STATUS.md** - Real-time project status and immediate next steps
2. **PROJECT_MANAGEMENT.md** - Project structure, issues, and static information
3. **issues/** - Current active issue specification (and proposed modifications) should be the only issues in the root of this folder

**Service Configuration:**
- **SUPABASE_REFERENCE.md** - Database configuration and RLS policies
- **DEPLOYMENT_REFERENCE.md** - Production deployment procedures
- **LINEAR_REFERENCE.md** - Linear workspace configuration

**Implementation Details:**
- **DAILY_DOUBLE_ALGORITHM.md** - CSV parsing and automatic Daily Double placement
- **reference/strategy/TESTING_STRATEGY.md** - Testing approach and best practices
- **SCSS_STYLING_GUIDELINES.md** - SCSS styling conventions and best practices
