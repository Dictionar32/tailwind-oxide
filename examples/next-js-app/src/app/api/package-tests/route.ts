import { NextResponse } from "next/server";

interface TestResult {
  name: string;
  passed: boolean;
  result?: string;
  error?: string;
}

interface PackageTestResult {
  name: string;
  importPath: string;
  category: string;
  status: "pass" | "fail" | "skipped";
  tests: TestResult[];
  skipReason?: string;
  importError?: string;
  durationMs?: number;
  exportCount?: number;
}

type PackageModule = Record<string, unknown>;
type PackageTestFn = (mod: PackageModule) => TestResult[];

const dynamicImport = new Function(
  "specifier",
  "return import(specifier)"
) as (specifier: string) => Promise<PackageModule>;

function runTest(name: string, fn: () => unknown): TestResult {
  try {
    const result = fn();
    return {
      name,
      passed: true,
      result:
        typeof result === "string"
          ? result
          : result != null
            ? JSON.stringify(result).slice(0, 120)
            : "ok",
    };
  } catch (e: unknown) {
    return {
      name,
      passed: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function testPackage(
  name: string,
  importPath: string,
  category: string,
  testFn: PackageTestFn
): Promise<PackageTestResult> {
  const startedAt = performance.now();

  try {
    const mod = await dynamicImport(importPath);
    const tests = testFn(mod);
    const allPassed = tests.every((test) => test.passed);

    return {
      name,
      importPath,
      category,
      status: allPassed ? "pass" : "fail",
      tests,
      exportCount: Object.keys(mod).length,
      durationMs: Math.round(performance.now() - startedAt),
    };
  } catch (e: unknown) {
    return {
      name,
      importPath,
      category,
      status: "fail",
      tests: [],
      importError: e instanceof Error ? e.message : String(e),
      durationMs: Math.round(performance.now() - startedAt),
    };
  }
}

function skippedPackage(
  name: string,
  importPath: string,
  category: string,
  reason: string
): PackageTestResult {
  return { name, importPath, category, status: "skipped", tests: [], skipReason: reason };
}

function createMockElement(className: string): Element {
  const classTokens = className.split(/\s+/).filter(Boolean);
  const classSet = new Set(classTokens);
  const classList = {
    contains(token: string) {
      return classSet.has(token);
    },
    *[Symbol.iterator]() {
      for (const token of classTokens) {
        yield token;
      }
    },
  };

  return { className, classList } as unknown as Element;
}

// test functions

function testAtomic(mod: PackageModule): TestResult[] {
  return [
    runTest("parseAtomicClass('p-4')", () => {
      const r = (mod.parseAtomicClass as (c: string) => unknown)("p-4");
      if (!r) throw new Error("returned null");
      return JSON.stringify(r);
    }),
    runTest("toAtomicClasses('p-4 m-2')", () => {
      const r = (mod.toAtomicClasses as (c: string) => unknown)("p-4 m-2");
      if (!r) throw new Error("returned null");
      return JSON.stringify(r);
    }),
    runTest("getAtomicRegistry()", () => {
      const r = (mod.getAtomicRegistry as () => unknown)();
      if (!(r instanceof Map)) throw new Error("not a Map");
      return `Map(${(r as Map<unknown, unknown>).size})`;
    }),
    runTest("clearAtomicRegistry()", () => {
      (mod.clearAtomicRegistry as () => void)();
      return "ok";
    }),
  ];
}

function testShared(mod: PackageModule): TestResult[] {
  return [
    runTest("LRUCache basic ops", () => {
      const Cache = mod.LRUCache as new <K, V>(max: number) => {
        set(k: K, v: V): void;
        get(k: K): V | undefined;
        size: number;
      };
      const c = new Cache<string, number>(2);
      c.set("a", 1);
      c.set("b", 2);
      c.set("c", 3);
      const v = c.get("a");
      if (v !== undefined) throw new Error("LRU eviction failed");
      return `size=${c.size}`;
    }),
    runTest("createLogger('test')", () => {
      const logger = (mod.createLogger as (n: string) => { info: (...a: unknown[]) => void })("test");
      if (!logger.info) throw new Error("no info method");
      return "logger created";
    }),
    runTest("hashContent('hello')", () => {
      const h = (mod.hashContent as (s: string) => string)("hello");
      if (typeof h !== "string" || h.length === 0) throw new Error("empty hash");
      return h;
    }),
    runTest("parseVersion('5.0.4')", () => {
      const v = (mod.parseVersion as (s: string) => unknown)("5.0.4");
      return JSON.stringify(v);
    }),
    runTest("debounce exists", () => {
      if (typeof mod.debounce !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("throttle exists", () => {
      if (typeof mod.throttle !== "function") throw new Error("not a function");
      return "function";
    }),
  ];
}

function testPreset(mod: PackageModule): TestResult[] {
  return [
    runTest("defaultPreset exists", () => {
      if (!mod.defaultPreset) throw new Error("undefined");
      return typeof mod.defaultPreset;
    }),
    runTest("defaultGlobalCss is string", () => {
      if (typeof mod.defaultGlobalCss !== "string") throw new Error("not a string");
      return `${(mod.defaultGlobalCss as string).length} chars`;
    }),
    runTest("defaultThemeCss is string", () => {
      if (typeof mod.defaultThemeCss !== "string") throw new Error("not a string");
      return `${(mod.defaultThemeCss as string).length} chars`;
    }),
    runTest("designTokens is object", () => {
      if (typeof mod.designTokens !== "object") throw new Error("not an object");
      return `keys: ${Object.keys(mod.designTokens as object).join(", ")}`;
    }),
    runTest("generateTailwindConfig is function", () => {
      if (typeof mod.generateTailwindConfig !== "function") throw new Error("not a function");
      return "function";
    }),
  ];
}

function testPluginApi(mod: PackageModule): TestResult[] {
  return [
    runTest("createPluginRegistry()", () => {
      const r = (mod.createPluginRegistry as () => { registerTransform: unknown })();
      if (!r.registerTransform) throw new Error("missing registerTransform");
      return "registry created";
    }),
    runTest("getGlobalRegistry()", () => {
      const r = (mod.getGlobalRegistry as () => unknown)();
      if (!r) throw new Error("returned null");
      return typeof r;
    }),
    runTest("createTw() context", () => {
      const ctx = (mod.createTw as (config?: unknown) => unknown)();
      if (!ctx) throw new Error("returned null");
      return typeof ctx;
    }),
    runTest("resetGlobalRegistry()", () => {
      (mod.resetGlobalRegistry as () => void)();
      return "ok";
    }),
  ];
}

function testTesting(mod: PackageModule): TestResult[] {
  return [
    runTest("getClassList(element)", () => {
      const el = createMockElement("p-4 m-2 text-sm");
      const list = (mod.getClassList as (el: Element) => string[])(el);
      if (!Array.isArray(list)) throw new Error("not an array");
      return JSON.stringify(list);
    }),
    runTest("toHaveClass factory", () => {
      const matcher = (mod.toHaveClass as (c: string) => unknown)("bg-blue-500");
      if (typeof matcher !== "function") throw new Error("not a function");
      return "matcher factory ok";
    }),
    runTest("tailwindMatchers object", () => {
      const m = mod.tailwindMatchers as Record<string, unknown>;
      if (!m.toHaveClass || !m.toHaveClasses) throw new Error("missing matchers");
      return Object.keys(m).join(", ");
    }),
    runTest("expectClasses is function", () => {
      if (typeof mod.expectClasses !== "function") throw new Error("not a function");
      return "function";
    }),
  ];
}

function testStorybookAddon(mod: PackageModule): TestResult[] {
  return [
    runTest("enumerateVariantProps()", () => {
      const r = (mod.enumerateVariantProps as (m: unknown) => unknown)({
        intent: ["primary", "secondary"],
        size: ["sm", "md"],
      });
      if (!Array.isArray(r)) throw new Error("not an array");
      return `${(r as unknown[]).length} combinations`;
    }),
    runTest("generateArgTypes()", () => {
      const r = (mod.generateArgTypes as (c: unknown) => unknown)({
        intent: {
          options: ["primary", "secondary"],
          control: { type: "select" },
        },
      });
      if (!r) throw new Error("returned null");
      return `keys: ${Object.keys(r as object).join(", ")}`;
    }),
    runTest("getVariantClass()", () => {
      const r = (mod.getVariantClass as (c: unknown, p: unknown) => string)(
        { intent: { primary: "bg-blue-500", secondary: "bg-gray-500" } },
        { intent: "primary" }
      );
      if (typeof r !== "string") throw new Error("not a string");
      return r;
    }),
    runTest("createVariantStoryArgs()", () => {
      const r = (mod.createVariantStoryArgs as (c: unknown) => unknown)({
        intent: ["primary", "secondary"],
      });
      if (!r) throw new Error("returned null");
      return typeof r;
    }),
  ];
}

function testAnimate(mod: PackageModule): TestResult[] {
  return [
    runTest("animate is function", () => {
      if (typeof mod.animate !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("keyframes is function", () => {
      if (typeof mod.keyframes !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("compileAnimation is function", () => {
      if (typeof mod.compileAnimation !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("animations preset exists", () => {
      if (!mod.animations) throw new Error("undefined");
      return typeof mod.animations;
    }),
    runTest("extractAnimationCss()", () => {
      const css = (mod.extractAnimationCss as () => string)();
      return typeof css === "string" ? `${css.length} chars` : "ok";
    }),
    runTest("createAnimationRegistry()", () => {
      const r = (mod.createAnimationRegistry as () => unknown)();
      if (!r) throw new Error("null");
      return typeof r;
    }),
  ];
}

function testCore(mod: PackageModule): TestResult[] {
  return [
    runTest("cn('p-4', 'm-2')", () => {
      const r = (mod.cn as (...a: string[]) => string)("p-4", "m-2");
      if (typeof r !== "string") throw new Error("not a string");
      return r;
    }),
    runTest("cx conditional merge", () => {
      const r = (mod.cx as (...a: unknown[]) => string)("p-4", false, "m-2");
      if (typeof r !== "string") throw new Error("not a string");
      return r;
    }),
    runTest("cv is function", () => {
      if (typeof mod.cv !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("tw is object", () => {
      if (typeof mod.tw !== "object" && typeof mod.tw !== "function") {
        throw new Error("not an object/function");
      }
      return typeof mod.tw;
    }),
    runTest("parseTailwindClasses()", () => {
      const r = (mod.parseTailwindClasses as (s: string) => unknown)("p-4 m-2 hover:text-sm");
      return JSON.stringify(r).slice(0, 100);
    }),
    runTest("liveToken()", () => {
      const r = (mod.liveToken as (v: string) => unknown)("blue-500");
      return typeof r;
    }),
    runTest("tokenVar()", () => {
      const r = (mod.tokenVar as (n: string) => string)("colors.primary");
      if (typeof r !== "string") throw new Error("not a string");
      return r;
    }),
    runTest("tokenRef()", () => {
      const r = (mod.tokenRef as (n: string) => string)("colors.primary");
      if (typeof r !== "string") throw new Error("not a string");
      return r;
    }),
    runTest("createTheme()", () => {
      const r = (mod.createTheme as (t: unknown) => unknown)({ colors: { primary: "blue-500" } });
      return typeof r;
    }),
    runTest("server is object", () => {
      if (!mod.server) throw new Error("undefined");
      return typeof mod.server;
    }),
  ];
}

function testDevtools(mod: PackageModule): TestResult[] {
  return [
    runTest("TwDevTools is function", () => {
      if (typeof mod.default !== "function" && typeof mod.TwDevTools !== "function") {
        throw new Error("not a function");
      }
      return typeof (mod.TwDevTools ?? mod.default);
    }),
  ];
}

function testRuntimeCss(mod: PackageModule): TestResult[] {
  return [
    runTest("TwCssInjector is function", () => {
      if (typeof mod.TwCssInjector !== "function") throw new Error("not a function");
      return "React component";
    }),
  ];
}

function testRuntime(mod: PackageModule): TestResult[] {
  return [
    runTest("cx is function", () => {
      if (typeof mod.cx !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("cx('p-4', 'm-2')", () => {
      const r = (mod.cx as (...a: string[]) => string)("p-4", "m-2");
      if (typeof r !== "string") throw new Error("not a string");
      return r;
    }),
    runTest("createComponent is function", () => {
      if (typeof mod.createComponent !== "function") throw new Error("not a function");
      return "function";
    }),
  ];
}

function testTheme(mod: PackageModule): TestResult[] {
  return [
    runTest("defineThemeContract()", () => {
      const r = (mod.defineThemeContract as (s: unknown) => unknown)({
        colors: { primary: "string" },
      });
      return typeof r;
    }),
    runTest("ThemeRegistry class", () => {
      if (typeof mod.ThemeRegistry !== "function") throw new Error("not a class");
      const reg = new (mod.ThemeRegistry as new () => { names: () => string[] })();
      return `names: ${reg.names().join(",")}`;
    }),
    runTest("liveToken()", () => {
      const r = (mod.liveToken as (v: string) => unknown)("blue-500");
      return typeof r;
    }),
    runTest("tokenVar()", () => {
      const r = (mod.tokenVar as (n: string) => string)("colors.primary");
      return r;
    }),
    runTest("tokenRef()", () => {
      const r = (mod.tokenRef as (n: string) => string)("colors.primary");
      return r;
    }),
    runTest("compileDesignTokens()", () => {
      const r = (mod.compileDesignTokens as (t: unknown) => string)({
        colors: { primary: "blue-500" },
      });
      return typeof r === "string" ? `${r.length} chars` : typeof r;
    }),
  ];
}

function testCompiler(mod: PackageModule): TestResult[] {
  return [
    runTest("extractAllClasses is function", () => {
      if (typeof mod.extractAllClasses !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("mergeClassesStatic is function", () => {
      if (typeof mod.mergeClassesStatic !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("normalizeClasses is function", () => {
      if (typeof mod.normalizeClasses !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("transformSource is function", () => {
      if (typeof mod.transformSource !== "function") throw new Error("not a function");
      return "function";
    }),
  ];
}

function testEngine(mod: PackageModule): TestResult[] {
  return [
    runTest("createEngine is function", () => {
      if (typeof mod.createEngine !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("parseEngineOptions is function", () => {
      if (typeof mod.parseEngineOptions !== "function") throw new Error("not a function");
      return "function";
    }),
  ];
}

function testScanner(mod: PackageModule): TestResult[] {
  return [
    runTest("isScannableFile('src/App.tsx')", () => {
      const r = (mod.isScannableFile as (f: string) => boolean)("src/App.tsx");
      if (typeof r !== "boolean") throw new Error("not boolean");
      return String(r);
    }),
    runTest("DEFAULT_EXTENSIONS", () => {
      const ext = mod.DEFAULT_EXTENSIONS as string[];
      if (!Array.isArray(ext)) throw new Error("not array");
      return ext.join(", ");
    }),
    runTest("DEFAULT_IGNORES", () => {
      const ign = mod.DEFAULT_IGNORES as string[];
      if (!Array.isArray(ign)) throw new Error("not array");
      return ign.join(", ");
    }),
    runTest("scanSource is function", () => {
      if (typeof mod.scanSource !== "function") throw new Error("not a function");
      return "function";
    }),
  ];
}

function testAnalyzer(mod: PackageModule): TestResult[] {
  return [
    runTest("classToCss is function", () => {
      if (typeof mod.classToCss !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("__internal.normalizeClassInput", () => {
      const internal = mod.__internal as Record<string, unknown>;
      if (typeof internal.normalizeClassInput !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("__internal.splitVariantAndBase", () => {
      const internal = mod.__internal as Record<string, unknown>;
      if (typeof internal.splitVariantAndBase !== "function") throw new Error("not a function");
      return "function";
    }),
  ];
}

function testDashboard(mod: PackageModule): TestResult[] {
  return [
    runTest("currentMetrics()", () => typeof (mod.currentMetrics as () => unknown)()),
    runTest("getMetricsSummary()", () => typeof (mod.getMetricsSummary as () => unknown)()),
    runTest("normalizeMetrics()", () =>
      typeof (mod.normalizeMetrics as (m: unknown) => unknown)({ buildMs: 100, scanMs: 50 })
    ),
    runTest("resetHistory()", () => {
      (mod.resetHistory as () => void)();
      return "ok";
    }),
    runTest("events is EventEmitter", () => {
      if (!mod.events) throw new Error("undefined");
      return typeof mod.events;
    }),
  ];
}

function testNext(mod: PackageModule): TestResult[] {
  return [
    runTest("withTailwindStyled is function", () => {
      if (typeof mod.withTailwindStyled !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("parseNextAdapterOptions()", () =>
      JSON.stringify((mod.parseNextAdapterOptions as (o: unknown) => unknown)({ autoClientBoundary: true })).slice(0, 100)
    ),
  ];
}

function testRspack(mod: PackageModule): TestResult[] {
  return [
    runTest("TailwindStyledRspackPlugin is class", () => {
      if (typeof mod.TailwindStyledRspackPlugin !== "function") throw new Error("not a class");
      return "class";
    }),
    runTest("parseRspackPluginOptions()", () =>
      JSON.stringify((mod.parseRspackPluginOptions as (o: unknown) => unknown)({ include: [/src/] })).slice(0, 80)
    ),
  ];
}

function testVite(mod: PackageModule): TestResult[] {
  return [
    runTest("tailwindStyledPlugin is function", () => {
      if (typeof mod.tailwindStyledPlugin !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("parseVitePluginOptions()", () =>
      JSON.stringify((mod.parseVitePluginOptions as (o: unknown) => unknown)({ include: [/src/] })).slice(0, 80)
    ),
  ];
}

function testPlugin(mod: PackageModule): TestResult[] {
  return [
    runTest("createTwPlugin is function", () => {
      if (typeof mod.createTwPlugin !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("re-exports: createPluginRegistry", () => {
      if (typeof mod.createPluginRegistry !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("re-exports: getGlobalRegistry", () => {
      if (typeof mod.getGlobalRegistry !== "function") throw new Error("not a function");
      return "function";
    }),
  ];
}

function testPluginRegistry(mod: PackageModule): TestResult[] {
  return [
    runTest("PluginRegistry class", () => {
      if (typeof mod.PluginRegistry !== "function") throw new Error("not a class");
      return "class";
    }),
    runTest("getRegistry()", () => {
      const r = (mod.getRegistry as () => unknown)();
      if (!r) throw new Error("null");
      return typeof r;
    }),
    runTest("registry singleton", () => {
      if (!mod.registry) throw new Error("undefined");
      return typeof mod.registry;
    }),
  ];
}

function testSvelte(mod: PackageModule): TestResult[] {
  return [
    runTest("cv is function", () => {
      if (typeof mod.cv !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("tw is function", () => {
      if (typeof mod.tw !== "function") throw new Error("not a function");
      return "function";
    }),
  ];
}

function testVue(mod: PackageModule): TestResult[] {
  return [
    runTest("cv is function", () => {
      if (typeof mod.cv !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("tw is function", () => {
      if (typeof mod.tw !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("extend is function", () => {
      if (typeof mod.extend !== "function") throw new Error("not a function");
      return "function";
    }),
    runTest("TailwindStyledPlugin exists", () => {
      if (!mod.TailwindStyledPlugin) throw new Error("undefined");
      return typeof mod.TailwindStyledPlugin;
    }),
  ];
}

function testSyntax(mod: PackageModule): TestResult[] {
  return [
    runTest("parseClasses is function", () => {
      if (typeof mod.parseClasses !== "function") throw new Error("not a function");
      return "function";
    }),
  ];
}

type PackageSpec =
  | { type: "run"; name: string; importPath: string; category: string; testFn: PackageTestFn }
  | { type: "skip"; name: string; importPath: string; category: string; reason: string };

const packageSpecs: PackageSpec[] = [
  { type: "run", name: "core", importPath: "tailwind-styled-v4", category: "Runtime", testFn: testCore },
  { type: "run", name: "runtime", importPath: "tailwind-styled-v4/runtime", category: "Runtime", testFn: testRuntime },
  { type: "run", name: "runtime-css", importPath: "tailwind-styled-v4/runtime-css", category: "Runtime", testFn: testRuntimeCss },
  { type: "run", name: "devtools", importPath: "tailwind-styled-v4/devtools", category: "Runtime", testFn: testDevtools },
  { type: "run", name: "theme", importPath: "tailwind-styled-v4/theme", category: "Runtime", testFn: testTheme },
  { type: "run", name: "animate", importPath: "tailwind-styled-v4/animate", category: "Runtime", testFn: testAnimate },
  { type: "run", name: "atomic", importPath: "tailwind-styled-v4/atomic", category: "Utilities", testFn: testAtomic },
  { type: "run", name: "shared", importPath: "tailwind-styled-v4/shared", category: "Utilities", testFn: testShared },
  { type: "run", name: "preset", importPath: "tailwind-styled-v4/preset", category: "Utilities", testFn: testPreset },
  { type: "run", name: "testing", importPath: "tailwind-styled-v4/testing", category: "Utilities", testFn: testTesting },
  { type: "run", name: "storybook-addon", importPath: "tailwind-styled-v4/storybook-addon", category: "Utilities", testFn: testStorybookAddon },
  { type: "run", name: "syntax", importPath: "tailwind-styled-v4/syntax", category: "Utilities", testFn: testSyntax },
  { type: "run", name: "compiler", importPath: "tailwind-styled-v4/compiler", category: "Build Tools", testFn: testCompiler },
  { type: "run", name: "engine", importPath: "tailwind-styled-v4/engine", category: "Build Tools", testFn: testEngine },
  { type: "run", name: "scanner", importPath: "tailwind-styled-v4/scanner", category: "Build Tools", testFn: testScanner },
  { type: "run", name: "analyzer", importPath: "tailwind-styled-v4/analyzer", category: "Build Tools", testFn: testAnalyzer },
  { type: "run", name: "next", importPath: "tailwind-styled-v4/next", category: "Bundler Adapters", testFn: testNext },
  { type: "run", name: "vite", importPath: "tailwind-styled-v4/vite", category: "Bundler Adapters", testFn: testVite },
  { type: "run", name: "rspack", importPath: "tailwind-styled-v4/rspack", category: "Bundler Adapters", testFn: testRspack },
  { type: "run", name: "plugin", importPath: "tailwind-styled-v4/plugin", category: "Plugin System", testFn: testPlugin },
  { type: "run", name: "plugin-api", importPath: "tailwind-styled-v4/plugin-api", category: "Plugin System", testFn: testPluginApi },
  { type: "run", name: "plugin-registry", importPath: "tailwind-styled-v4/plugin-registry", category: "Plugin System", testFn: testPluginRegistry },
  { type: "run", name: "svelte", importPath: "tailwind-styled-v4/svelte", category: "Framework Adapters", testFn: testSvelte },
  { type: "run", name: "vue", importPath: "tailwind-styled-v4/vue", category: "Framework Adapters", testFn: testVue },
  { type: "run", name: "dashboard", importPath: "tailwind-styled-v4/dashboard", category: "Observability", testFn: testDashboard },
  { type: "skip", name: "cli", importPath: "create-tailwind-styled/bin", category: "Skipped", reason: "CLI tool designed for terminal. Run via `npx create-tailwind-styled` in terminal instead." },
  { type: "skip", name: "vscode", importPath: "@tailwind-styled/vscode", category: "Skipped", reason: "VS Code extension requires `vscode` API only available in VS Code extension host." },
  { type: "skip", name: "studio-desktop", importPath: "@tailwind-styled/studio-desktop", category: "Skipped", reason: "Electron desktop application, not a library - no exports to test." },
];

async function runAllPackageTests(): Promise<PackageTestResult[]> {
  return Promise.all(
    packageSpecs.map((spec) =>
      spec.type === "run"
        ? testPackage(spec.name, spec.importPath, spec.category, spec.testFn)
        : Promise.resolve(skippedPackage(spec.name, spec.importPath, spec.category, spec.reason))
    )
  );
}

export const dynamic = "force-dynamic";

export async function GET() {
  const results = await runAllPackageTests();
  return NextResponse.json({ generatedAt: new Date().toISOString(), results });
}
