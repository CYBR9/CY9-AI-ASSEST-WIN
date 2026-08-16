/**
 * CY9 Master AI Prompt Architect & Code Project Blueprint Synthesizer
 * Generates world-class, production-grade system prompts and architectural specifications
 * for AI coding agents (Cursor, Windsurf, Claude 3.5 Sonnet, Antigravity, Gemini, ChatGPT).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class PromptEngineeringService {
  constructor() {
    this.promptTemplates = {
      fullstack: this.buildFullstackTemplate,
      web_app: this.buildWebAppTemplate,
      mobile_app: this.buildMobileTemplate,
      electron_desktop: this.buildElectronTemplate,
      backend_api: this.buildBackendTemplate,
      ai_agent: this.buildAIAgentTemplate
    };
  }

  /**
   * Synthesize a comprehensive, production-grade prompt blueprint
   */
  generateProjectPrompt(params = {}) {
    const {
      project_description = '',
      tech_stack = 'Modern Stack (TypeScript, React/Next.js, Node.js/FastAPI, Tailwind/Vanilla CSS, PostgreSQL/SQLite)',
      target_ai = 'Cursor / Claude / Antigravity',
      project_type = 'fullstack',
      language = 'ar', // 'ar', 'en', 'bilingual'
      save_to_file = true
    } = params;

    const desc = project_description || 'نظام وتطبيق متكامل فائق الذكاء والسرعة والأناقة';
    const timestamp = new Date().toISOString();
    const projectName = this.extractProjectName(desc);

    const isAr = language === 'ar' || language === 'bilingual';

    const promptContent = `
# 🚀 MASTER AI CODING DIRECTIVE: ${projectName.toUpperCase()}

> **Target AI Engine**: \`${target_ai}\`
> **Project Category**: \`${project_type.toUpperCase()}\`
> **Primary Tech Stack**: \`${tech_stack}\`
> **Architecture Standard**: Enterprise Grade // Clean Architecture // Modular Components

---

## 🎯 1. ROLE & CORE OBJECTIVE / الهوية والهدف الأساسي
You are an Elite Principal Software Architect and Lead Full-Stack Engineer. Your mission is to build the complete, production-ready, bug-free codebase for **"${desc}"**.

You must adhere to:
1. **Zero Placeholders**: Write fully functional, complete logic. Never leave \`// TODO\`, dummy stubs, or mock shortcuts.
2. **Top-Tier Aesthetics & UX**: Design a breathtaking, modern UI (curated glassmorphism, responsive grid, smooth micro-interactions, dark mode default, vibrant accents, fluid typography).
3. **Robust Security & Reliability**: Complete error handling, input validation, sanitize queries, robust state recovery, graceful fallbacks.
4. **Clean Code & Modularity**: Strict single-responsibility principle, DRY, comprehensive types/interfaces, documented public APIs.

---

## 🛠️ 2. RECOMMENDED TECH STACK & DEPENDENCIES / حزمة التقنيات
- **Frontend / Client**: ${this.suggestFrontend(tech_stack, project_type)}
- **Backend / Services**: ${this.suggestBackend(tech_stack, project_type)}
- **Database & Storage**: ${this.suggestDatabase(tech_stack)}
- **State Management & Data Fetching**: Modern Store (Zustand / Redux Toolkit / React Query / SWR)
- **Styling & Design System**: Modern CSS Tokens, Glassmorphism, Responsive Flex/Grid, Dark/Light Themes
- **Testing & Quality**: Unit Tests (Jest / Vitest / PyTest), E2E Smoke Tests

---

## 📂 3. DIRECTORY & FILE STRUCTURE / هيكل المجلدات والملفات
\`\`\`
${this.generateDirectoryTree(projectName, project_type)}
\`\`\`

---

## ⚡ 4. CORE FEATURES & DETAILED SPECIFICATION / الميزات الجوهرية والمنطق
1. **Authentication & User Management**:
   - Secure token/session management, password hashing, role-based access control (RBAC).
2. **Main Business Workflow**:
   - Implementation of primary user journey for **"${desc}"**.
   - Reactive real-time updates, optimistic UI, instant feedback toasts.
3. **Data Persistence & Cache Layer**:
   - Optimized CRUD operations, indexing, pagination, query filtering and caching.
4. **Native / System Integration (if applicable)**:
   - High-performance asynchronous background workers, file I/O safety, hardware acceleration.
5. **Real-Time Diagnostics & Telemetry**:
   - Health check endpoints, structured JSON logging, exception tracking.

---

## 🎨 5. UI/UX DESIGN TOKENS / هوية التصميم وتجربة المستخدم
- **Color Palette**: 
  - Primary Accent: \`#00f0ff\` (Cyber Cyan)
  - Secondary Accent: \`#00ff66\` (Emerald Pulse) / \`#b000ff\` (Hyper Purple)
  - Background Base: \`#030712\` (Deep Obsidian Noir)
  - Card Surfaces: \`rgba(15, 23, 42, 0.75)\` with \`backdrop-filter: blur(16px)\`
  - Border Accents: \`1px solid rgba(255, 255, 255, 0.12)\`
- **Typography**: Modern Sans-Serif (\`Inter\`, \`Plus Jakarta Sans\`, \`Outfit\`, or \`IBM Plex Arabic\`)
- **Interactive States**: Smooth hover lifts, active press scales, animated loading skeletons, pulsing status indicators.

---

## 📋 6. STEP-BY-STEP IMPLEMENTATION PROTOCOL / خطة التنفيذ خطوة بخطوة
- **Phase 1: Project Scaffolding & Configuration**:
  - Initialize repo, configure package manager, tsconfig/bundler, and design system tokens.
- **Phase 2: Data Models & Core Backend Architecture**:
  - Build database schemas, migrations, repositories, and API controllers with validation.
- **Phase 3: Frontend Component Library & Responsive Shell**:
  - Implement top navigation, sidebar, viewport container, theme provider, and atomic widgets.
- **Phase 4: Feature Integration & Business Logic**:
  - Connect client to backend endpoints, bind reactive state stores, implement full workflows.
- **Phase 5: Edge-Case Handling & Robustness**:
  - Add offline detection, retry mechanisms, input boundaries, and error modals.
- **Phase 6: Verification & Automated Tests**:
  - Execute test suite, run linting, verify cross-browser/cross-platform parity.

---

## 🤖 INSTRUCTIONS FOR THE AI ASSISTANT:
When you begin executing this directive:
1. Start by summarizing the exact architectural plan.
2. Generate each file in logical order with complete, runnable code.
3. Ensure every import statement matches the directory tree above.
4. Provide execution/build commands to run the application immediately.
`.trim();

    let savedFilePath = null;
    if (save_to_file) {
      try {
        const desktopDir = path.join(os.homedir(), 'Desktop');
        const fileName = `PROMPT_${projectName.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_')}.md`;
        savedFilePath = path.join(desktopDir, fileName);
        fs.writeFileSync(savedFilePath, promptContent, 'utf8');
      } catch (e) {
        console.warn('Could not save prompt file to Desktop:', e.message);
      }
    }

    return {
      success: true,
      projectName,
      targetAI: target_ai,
      projectType: project_type,
      promptMarkdown: promptContent,
      savedFilePath,
      message: `🎯 **تم إنشاء برومبت برمجي احترافي فائق القوة لمشروع (${projectName})**!`
    };
  }

  extractProjectName(desc) {
    const cleaned = desc.replace(/^(اكتب لي برومبت ل|صمم برومبت ل|برومبت مشروع|مشروع|تطبيق|نظام|موقع)\s*/i, '').trim();
    const words = cleaned.split(/\s+/).slice(0, 4).join(' ');
    return words || 'NextGen Project';
  }

  suggestFrontend(stack, type) {
    if (type === 'mobile_app') return 'Flutter / React Native with Expo & Tailwind (NativeWind)';
    if (type === 'electron_desktop') return 'Electron + Vanilla CSS / Vite React HUD with WebGL Canvas';
    if (stack.toLowerCase().includes('vue')) return 'Vue 3 + Vite + Pinia + TailwindCSS';
    return 'Next.js 14+ (App Router) / React 18+ with TypeScript & Vanilla CSS / Tailwind';
  }

  suggestBackend(stack, type) {
    if (stack.toLowerCase().includes('python') || stack.toLowerCase().includes('fastapi')) {
      return 'Python 3.12+ with FastAPI, Pydantic v2, and Uvicorn';
    }
    if (stack.toLowerCase().includes('go') || stack.toLowerCase().includes('golang')) {
      return 'Go 1.22+ with Gin / Fiber and GORM';
    }
    return 'Node.js 20+ / Bun with Express or Next.js Server Actions / NestJS';
  }

  suggestDatabase(stack) {
    if (stack.toLowerCase().includes('mongo')) return 'MongoDB Atlas with Mongoose ORM';
    if (stack.toLowerCase().includes('sqlite')) return 'SQLite with Prisma ORM / Better-SQLite3';
    return 'PostgreSQL / Supabase with Prisma ORM or Drizzle ORM + Redis Cache Layer';
  }

  generateDirectoryTree(name, type) {
    if (type === 'electron_desktop') {
      return `
├── main.js                 # Electron Main Process & Native IPC
├── preload.js              # Secure Context Bridge
├── src/
│   ├── index.html          # Holographic HUD Shell
│   ├── styles/
│   │   ├── hud.css         # Cyberpunk / Glassmorphism Design System
│   ├── services/           # Native OS & RPA Automation Services
│   └── renderer/
│       ├── app.js          # Core UI Controller & Reactive State
│       └── engines/        # Visualizers & Audio FX
├── package.json
└── README.md
      `.trim();
    }

    return `
├── src/
│   ├── app/                # Next.js App Router (Pages & API Routes)
│   ├── components/         # Atomic Reusable UI Components
│   │   ├── ui/             # Buttons, Modals, Cards, Inputs
│   │   └── modules/        # Domain-specific Feature Components
│   ├── lib/                # Database Clients, Auth & Utilities
│   ├── hooks/              # Custom React Hooks
│   ├── stores/             # Global State Management (Zustand)
│   ├── types/              # TypeScript Type Definitions & Schemas
│   └── styles/             # Global CSS & Design Tokens
├── public/                 # Static Assets & Icons
├── tests/                  # Automated Test Suite
├── package.json
└── tsconfig.json
    `.trim();
  }
}

module.exports = new PromptEngineeringService();
