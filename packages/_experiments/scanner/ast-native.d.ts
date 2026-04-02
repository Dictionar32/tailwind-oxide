export interface AstExtractResult { classes: string[]; componentNames: string[]; hasUseClient: boolean; imports: string[]; engine: "rust" }
export function astExtractClasses(source: string, filename?: string): AstExtractResult
