# Graph Report - .  (2026-07-17)

## Corpus Check
- Corpus is ~38,535 words - fits in a single context window. You may not need a graph.

## Summary
- 270 nodes · 458 edges · 14 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.77)
- Token cost: 10,023 input · 4,105 output

## Community Hubs (Navigation)
- Generation Server and Model APIs
- Runtime Dependency Ecosystem
- Prompt Parameter System
- Project Configuration and Scripts
- Application State and Generation Flow
- Core UI and Data Types
- TypeScript Compiler Configuration
- Asset Storage and Sidebar
- Product Architecture and Principles
- Image Editing and Preprocessing
- Graphify Project Navigation
- Precise Replacement Workflows
- Application Entry and Mount

## God Nodes (most connected - your core abstractions)
1. `App()` - 24 edges
2. `compilerOptions` - 15 edges
3. `Project` - 13 edges
4. `Task` - 12 edges
5. `react` - 10 edges
6. `getPromptAssets()` - 9 edges
7. `SidebarParams()` - 8 edges
8. `prepareImageForReference()` - 7 edges
9. `VisualTypeId` - 7 edges
10. `ReplacementModeId` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Gemini Multimodal Image Generation` --semantically_similar_to--> `Gemini Image Generation Pipeline`  [INFERRED] [semantically similar]
  README.md → AGENT_PROJECT_GUIDE.md
- `HistoryPage()` --references--> `react`  [EXTRACTED]
  src/components/HistoryPage.tsx → package.json
- `App()` --references--> `react`  [EXTRACTED]
  src/App.tsx → package.json
- `BrandAssetsPage()` --references--> `react`  [EXTRACTED]
  src/components/BrandAssetsPage.tsx → package.json
- `CustomSelect()` --references--> `react`  [EXTRACTED]
  src/components/CustomSelect.tsx → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Replacement Workflow Family** — handoff_pose_rebuild, handoff_product_only, handoff_multi_replace [EXTRACTED 1.00]
- **Graphify Scoped Navigation Commands** — agents_graphify_query, agents_graphify_path, agents_graphify_explain [EXTRACTED 1.00]

## Communities (14 total, 0 thin omitted)

### Community 0 - "Generation Server and Model APIs"
Cohesion: 0.08
Nodes (34): app, auditPromptStructure(), buildChinesePromptPreview(), buildGeminiPromptPreview(), buildImageParts(), classifyGeminiGenerationFailure(), enforcePromptStructure(), filterReferenceAssetsForWorkflow() (+26 more)

### Community 1 - "Runtime Dependency Ecosystem"
Cohesion: 0.06
Nodes (34): dotenv, express, file-saver, @google/genai, jszip, lucide-react, motion, dependencies (+26 more)

### Community 2 - "Prompt Parameter System"
Cohesion: 0.08
Nodes (30): ReplacementReferenceCategory, ASPECT_RATIO_OPTIONS, BASE_SCENE_OPTIONS, CAMERA_ANGLE_OPTIONS, CompiledPromptPackage, ENGLISH_ANGLES, ENGLISH_REPLACEMENT_MODES, ENGLISH_REPLACEMENT_NEGATIVES (+22 more)

### Community 3 - "Project Configuration and Scripts"
Cohesion: 0.06
Nodes (30): autoprefixer, esbuild, vite, devDependencies, autoprefixer, esbuild, tailwindcss, tsx (+22 more)

### Community 4 - "Application State and Generation Flow"
Cohesion: 0.17
Nodes (27): App(), createEmptyModeWorkspace(), DEMO_PROJECT, getActiveCharacterImages(), getActiveReferenceImages(), getCharacterPromptName(), getCharacterReferenceRole(), getClientGenerationFailure() (+19 more)

### Community 5 - "Core UI and Data Types"
Cohesion: 0.15
Nodes (19): BADIGAO_BRAND_ASSETS, BrandAssetsPageProps, CanvasAreaProps, HistoryPage(), HistoryPageProps, SidebarParamsProps, TaskPanelProps, ReplacementModeId (+11 more)

### Community 6 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 7 - "Asset Storage and Sidebar"
Cohesion: 0.16
Nodes (16): SidebarParams(), deleteImageData(), hydrateAsset(), hydrateProjectImages(), loadImageData(), openDatabase(), saveImageData(), CHARACTER_TEMPLATES (+8 more)

### Community 8 - "Product Architecture and Principles"
Cohesion: 0.18
Nodes (12): Badigao Brand Visual Workbench, Gemini Image Generation Pipeline, Local Persistence Model, Local Single-Page Web Architecture, OpenAI GPT Image 2 Backend Interface, Product Fidelity Before Creative Freedom, Structured Prompt Pipeline, End-to-End Visual Regression (+4 more)

### Community 9 - "Image Editing and Preprocessing"
Cohesion: 0.31
Nodes (8): EditorModal(), EditorModalProps, EditRequestStatus, ReplacementImage, loadImage(), PreparedImage, prepareImageForReference(), readFileAsDataUrl()

### Community 10 - "Graphify Project Navigation"
Cohesion: 0.33
Nodes (6): graphify explain, graphify-out Knowledge Graph, graphify path, graphify query, graphify update, Graphify Workflow

### Community 11 - "Precise Replacement Workflows"
Cohesion: 0.60
Nodes (5): Multi-Element Precise Replacement, Pose-Locked Reconstruction, Original-Image Product-Only Replacement, Reference Image Role Isolation, Three Replacement Workflows

### Community 12 - "Application Entry and Mount"
Cohesion: 0.67
Nodes (3): Application HTML Shell, src/main.tsx Entrypoint, Root Mount Element

## Knowledge Gaps
- **93 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+88 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependency Ecosystem` to `Project Configuration and Scripts`?**
  _High betweenness centrality (0.277) - this node is a cross-community bridge._
- **Why does `react` connect `Runtime Dependency Ecosystem` to `Image Editing and Preprocessing`, `Application State and Generation Flow`, `Core UI and Data Types`, `Asset Storage and Sidebar`?**
  _High betweenness centrality (0.262) - this node is a cross-community bridge._
- **Why does `App()` connect `Application State and Generation Flow` to `Runtime Dependency Ecosystem`, `Prompt Parameter System`, `Asset Storage and Sidebar`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _93 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Generation Server and Model APIs` be split into smaller, more focused modules?**
  _Cohesion score 0.07665505226480836 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependency Ecosystem` be split into smaller, more focused modules?**
  _Cohesion score 0.05873015873015873 - nodes in this community are weakly interconnected._
- **Should `Prompt Parameter System` be split into smaller, more focused modules?**
  _Cohesion score 0.0846774193548387 - nodes in this community are weakly interconnected._