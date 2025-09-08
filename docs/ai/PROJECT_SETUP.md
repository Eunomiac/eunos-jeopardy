# Project Setup Guide for AI Assistants

This guide provides step-by-step instructions for setting up a new project workspace using this template. Follow these steps in order, prompting the user for information as needed.

## 🤖 **AI Assistant Guidelines**

**When setting up a new project workspace from this template:**

1. **🔴 CRITICAL - Follow this guide completely**: Reference every step in this document for complete setup
2. **🟡 IMPORTANT - Use intelligent prompting**: Start by gathering project description and infer application type when possible
3. **🔴 CRITICAL - Validate folder naming**: Ensure workspace folder name matches project kebab-case name
4. **🔴 CRITICAL - Complete all phases**: Template customization → Service integration → Development environment
5. **🔴 CRITICAL - Verify setup**: Run final placeholder check and test all tools before declaring setup complete

**Key setup responsibilities:**
- **🟡 IMPORTANT - Automate where possible**: Handle service configurations and placeholder replacements automatically
- **🟡 IMPORTANT - Guide user through manual steps**: Provide clear instructions for tasks requiring user interaction
- **🔴 CRITICAL - Catch common mistakes**: Validate folder names, check for missed placeholders, ensure service alignment
- **🔴 CRITICAL - Maintain setup quality**: Don't skip verification steps or leave incomplete configurations

## 🎯 **Overview**

This template provides a complete React + TypeScript + Vite project with:
- Professional SCSS architecture
- Jest testing with SonarQube integration
- Supabase database integration
- Linear project management integration
- Comprehensive tooling and configuration

## 🚀 **Phase 1: Template Customization**

### Step 1.1: Gather Project Information

**Start by prompting the user:**

```
Let's start by giving me a brief description of the project you're building. This will help me understand the context and generate a name for the project if you don't have one in mind already. Please provide a few sentences describing the project, its purpose, and what you hope to achieve with it.

If you'd like to provide a name for the project, please do so now. Otherwise, I will generate a name for you based on your description.
```

**After receiving the description and name preference:**

Did the user provide enough information in their description for you to know whether this project is meant for the user's own solo use, or if it is a multiplayer application?

**If not, prompt the user:**

```
What type of application is this?

1. Solo application - For your personal use on your own PC (no user authentication, minimal security requirements)
2. Multi-user application - Will support multiple users with authentication, online hosting, and security considerations
```

**After receiving the necessary information:**
- If no name provided, generate an appropriate project name from the description
- Derive the kebab-case name from the workspace folder name (use the current workspace directory name).
  - **Important:** If there appears to be a significant mismatch between the project name and the kebab-case folder name, this might indicate the user hasn't properly named the subfolder in which this project resides.  You should prompt the user for clarification in this case.

### Step 1.2: Replace Placeholder Values and Set Up Charter

**Search and replace the following placeholders throughout all files:**

- ❇️PROJECT_NAME❇️ → [Display project name]
- ❇️PROJECT_NAME_KEBAB_CASE❇️ → [Workspace folder name in kebab-case]
- ❇️PROJECT_DESCRIPTION❇️ → [Project description]

**Files to update:**
- `package.json`
- `README.md`
- `index.html`
- `src/app/App.tsx`
- `src/app/App.test.tsx`
- `.augment-guidelines`

**Charter setup based on application type:**
- If solo application: Keep `PROJECT_CHARTER (solo).md`, delete the multi version
- If multi-user application: Keep `PROJECT_CHARTER (multi).md`, delete the solo version
- Rename the kept file to `PROJECT_CHARTER.md`
- Fill in the remaining placeholders in the charter

---

## 🔧 **Phase 2: Service Integration**

### Step 2.0: MCP Integrations Assessment

Assess additional integrations beyond the always‑use tools (Linear, GitHub, Notion, Supabase, Context 7, Playwright (Agent), Sequential thinking). These are excluded from assessment by default.

1) Clarify needs for this project (ask questions about analytics/monitoring, payments, CI/CD, data stores, knowledge bases, issue tracking, browser automation, etc.)
2) Evaluate candidate services/MCPs including but not limited to: Confluence, Jira, Stripe, Sentry, Redis, MongoDB, CircleCI, Context 7 (repo‑level usage if applicable), Playwright (repo E2E via @playwright/test), and ANY OTHER MCPs the agent knows that may fit project goals.
3) For each recommended integration, provide:
   - Rationale / use‑cases for this project
   - Required secrets/scopes and where to configure them
   - Minimal setup steps and verification plan
4) After user confirmation, document chosen integrations in docs (README + docs/ai/PROJECT_CHARTER.md), and create initial Linear issues for setup and verification.
5) Produce a consolidated dependency plan and add the entries to package.json using npm pkg set (no install). Then continue to Step 2.1 to install dependencies.

### Step 2.1: Install Dependencies

Install base dependencies and any additional packages selected during Step 2.0.

```bash
# Base install
npm install

# If Step 2.0 selected extra integrations, add them now (examples):
# npm i @sentry/react @sentry/vite-plugin        # Sentry
# npm i @stripe/stripe-js                        # Stripe client
# npm i mongodb                                  # MongoDB client (if used from client)
# npm i redis ioredis                            # Redis client (server-side/edge)
# npm i -D @playwright/test                      # E2E tests (already added to devDependencies in this template)
```

Note: Always use package manager commands (npm/pnpm/yarn). Install dependencies now to enable typings, tests, and smooth editor experience.

**Verify installation completed successfully.**

### Step 2.2: GitHub Repository Setup

**Option 1: AI-Assisted (Preferred)**
If you have GitHub API access, create the repository automatically:
1. Use GitHub API to create private repository with name: [PROJECT_NAME_KEBAB_CASE]
2. Set description: [PROJECT_DESCRIPTION]
3. Initialize with README (will be overwritten)
4. Add repository secret SONAR_TOKEN with value from SonarQube setup
5. Push initial commit to the new repository

**Option 2: User-Guided**
If GitHub API is not available, guide the user:
```
Let's create the GitHub repository:

1. In VS Code, open Source Control panel (Ctrl+Shift+G)
2. Click "Publish to GitHub"
3. Choose "Publish to GitHub private repository"
4. Repository name: [PROJECT_NAME_KEBAB_CASE]
5. Description: [PROJECT_DESCRIPTION]
6. Keep it private initially

After publishing, please provide the repository URL so I can update the documentation.
```

**After repository creation:**
- Update ❇️REPOSITORY_URL❇️ placeholders with the actual repository URL
- Update `docs/ai/DEPLOYMENT_GUIDE.md` with repository information

### Step 2.3: Supabase Setup

Follow docs/ai/SUPABASE_SETUP.md end-to-end. Execute steps 1–4 now and update that document with actual project values as you go.

**Tell the user:**
```
Now we need to set up a new Supabase project. Please:

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose the organization: "eunomiac"
4. Set project name: [PROJECT_NAME]
5. Generate a strong database password
6. Choose region: "Central Canada (ca-central-1)" (or closest to you)
7. Click "Create new project"

Once created, please provide:
- Project URL (format: https://[project-id].supabase.co)
- Anon key (from Settings > API)
- Database password you set
```

**After receiving the information:**
1. Update `docs/ai/SUPABASE_SETUP.md` with the new project details
2. Update `jest.config.js` with the correct Supabase URL and anon key
3. Edit `.env.local` file with the environment variables (file already exists in template)
4. Search and replace ❇️SUPABASE_PROJECT_ID❇️ and ❇️SUPABASE_ANON_KEY❇️ placeholders throughout all files

### Step 2.4: Linear Workspace Setup

**Tell the user:**
```
We'll set up Linear project management. Please:

1. Go to https://linear.app/eunomiac
2. Create a new Team for this project:
   - Team name: [PROJECT_NAME]
   - Team key: [Generate 3-4 letter abbreviation from project name]

I'll handle setting up the workflow states and creating initial issues automatically once you provide the Team ID.
```

**After team creation:**
1. Use Linear API to get the team ID and workflow state IDs
2. Update `docs/ai/LINEAR_REFERENCE.md` with the new team information
3. Automatically set up default workflow states if not already present
4. Create 3-5 initial project issues (setup, documentation, first feature, testing, deployment)

### Step 2.5: SonarQube Project Setup

**Tell the user:**
```
Setting up SonarQube for code quality monitoring:

1. Go to https://sonarcloud.io/projects/create
2. Choose "Manually"
3. Set organization: "eunomiac"
4. Project key: "Eunomiac_[PROJECT_NAME_KEBAB_CASE]"
5. Display name: [PROJECT_NAME]
6. Set up as private project
7. Generate a project token

Please provide the project token for GitHub Actions setup.
```

**After SonarQube setup:**
1. Update `sonar-project.properties` with correct project key and name
2. Set up GitHub repository secrets for SONAR_TOKEN
3. Confirm all replacements have been made by searching for ❇️SONAR_PROJECT_KEY❇️ to confirm it's been replaced.

### Step 2.6: Final Checks
- Perform a full workspace search for the character '❇️' to ensure all placeholders have been replaced.  If you find any, stop and investigate before proceeding (note: '❇️' in guideance files like this one are not considered a problem).
---

## 💻 **Phase 3: Development Environment**

### Step 3.1: Verify Setup

**Run the following commands to verify everything works:**

```bash
# Run linting
npm run lint

# Run tests
npm run test:ci

# Build project
npm run build

# Start development server
npm run dev
```

**Expected results:**
- Linting should pass with no errors
- All tests should pass (basic App component tests)
- Build should complete successfully
- Dev server should start on http://localhost:5173

### Step 3.2: Initial Commit

**Create initial commit:**
```bash
git add .
git commit -m "feat: initial project setup from template

- Set up React + TypeScript + Vite project structure
- Configure Jest testing with SonarQube integration
- Set up Supabase database connection
- Configure Linear project management
- Add comprehensive SCSS architecture
- Include professional tooling and linting"
```

---

## ✅ **Setup Complete**

**Congratulations! Your project is now set up with:**

- ✅ Complete React + TypeScript development environment
- ✅ Professional SCSS architecture with design system
- ✅ Jest testing with coverage reporting
- ✅ SonarQube code quality monitoring
- ✅ Supabase database integration
- ✅ Linear project management
- ✅ GitHub repository with CI/CD
- ✅ Comprehensive documentation

**Next steps:**
1. Review the PROJECT_CHARTER.md for project-specific details
2. Start building your application features
3. Use Linear for task management and progress tracking
4. Maintain test coverage as you add new functionality

**For ongoing development:**
- Reference `docs/ai/TESTING_STRATEGY.md` for testing decisions
- Use `docs/ai/LINEAR_REFERENCE.md` for efficient Linear operations
- Check `docs/ai/INDEX.md` for all available AI documentation

---

## 📋 **Setup Completion Checklist**

Use this checklist to verify all setup steps were completed successfully:

### Phase 1: Template Customization
- [ ] Project description and name gathered from user
- [ ] All ❇️PLACEHOLDER❇️ values replaced throughout files
- [ ] Appropriate PROJECT_CHARTER template selected and renamed
- [ ] Charter placeholders filled in

### Phase 2: Service Integration
- [ ] Dependencies installed successfully (`npm install`)
- [ ] Supabase project created and configured
- [ ] Linear team created with initial issues
- [ ] SonarQube project set up with token
- [ ] GitHub repository published with secrets configured

### Phase 3: Development Environment
- [ ] Linting passes (`npm run lint`)
- [ ] Tests pass (`npm run test:ci`)
- [ ] Build succeeds (`npm run build`)
- [ ] Dev server starts (`npm run dev`)
- [ ] Initial commit created and pushed
