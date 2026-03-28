/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "scanner-no-compiler-source",
      severity: "error",
      comment: "scanner harus lewat @tailwind-styled/syntax, bukan compiler source.",
      from: { path: "^packages/scanner/src" },
      to: { path: "^packages/compiler/src" }
    },
    {
      name: "scanner-no-engine",
      severity: "error",
      comment: "scanner adalah leaf di pipeline; tidak boleh tarik orchestrator.",
      from: { path: "^packages/scanner/src" },
      to: { path: "^packages/engine/src" }
    },
    {
      name: "analyzer-no-compiler-or-engine",
      severity: "error",
      comment: "analyzer bergantung pada scan result, bukan transform atau orchestrator.",
      from: { path: "^packages/analyzer/src" },
      to: { path: "^packages/(compiler|engine)/src" }
    },
    {
      name: "compiler-no-plugin-implementation-source",
      severity: "error",
      comment: "compiler hanya boleh tergantung ke plugin-api, bukan implementasi plugin package.",
      from: { path: "^packages/compiler/src" },
      to: { path: "^packages/plugin/src" }
    },
    {
      name: "compiler-no-engine",
      severity: "error",
      comment: "compiler adalah internal; tidak boleh tarik orchestrator.",
      from: { path: "^packages/compiler/src" },
      to: { path: "^packages/engine/src" }
    },
    {
      name: "plugin-api-no-plugin-or-engine",
      severity: "error",
      comment: "kontrak harus independen dari wrapper dan orchestrator.",
      from: { path: "^packages/plugin-api/src" },
      to: { path: "^packages/(plugin|engine)/src" }
    },
    {
      name: "syntax-no-pipeline",
      severity: "error",
      comment: "syntax adalah helper paling dasar; tidak boleh bergantung pada pipeline.",
      from: { path: "^packages/syntax/src" },
      to: { path: "^packages/(scanner|analyzer|compiler|engine)/src" }
    },
    {
      name: "shared-no-upper-layer",
      severity: "error",
      comment: "shared harus menjadi leaf; tidak boleh tarik layer lebih tinggi.",
      from: { path: "^packages/shared/src" },
      to: {
        path: "^packages/(?!shared)[^/]+/src",
        dependencyTypesNot: ["npm"]
      }
    },
    {
      name: "adapter-no-internal-imports",
      severity: "error",
      comment: "adapter tidak boleh import internal file package lain — harus lewat public export @tailwind-styled/*.",
      from: { path: "^packages/(vite|next|rspack|vue|svelte)/src" },
      to: {
        path: "^packages/(?!vite|next|rspack|vue|svelte)[^/]+/src/(?!index\\.ts$)",
        dependencyTypesNot: ["npm"]
      }
    }
  ],
  options: {
    tsConfig: {
      fileName: "tsconfig.base.json"
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "default"]
    },
    doNotFollow: {
      path: "node_modules"
    },
    includeOnly: "^packages",
    exclude: {
      path: "\\.(d\\.ts|test\\.[cm]?[jt]sx?)$"
    }
  }
}
