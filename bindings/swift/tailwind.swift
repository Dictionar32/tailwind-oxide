import Foundation

@_silgen_name("tailwind_compile")
private func tailwind_compile(_ source: UnsafePointer<CChar>) -> UnsafeMutablePointer<CChar>?

@_silgen_name("tailwind_compile_with_stats")
private func tailwind_compile_with_stats(_ source: UnsafePointer<CChar>) -> UnsafeMutablePointer<CChar>?

@_silgen_name("tailwind_version")
private func tailwind_version() -> UnsafePointer<CChar>

@_silgen_name("tailwind_clear_cache")
private func tailwind_clear_cache()

@_silgen_name("tailwind_free")
private func tailwind_free(_ ptr: UnsafeMutablePointer<CChar>)

final class TailwindCompiler {
  func compile(_ source: String) -> String {
    source.withCString { cSource in
      guard let ptr = tailwind_compile(cSource) else { return "" }
      defer { tailwind_free(ptr) }
      return String(cString: ptr)
    }
  }

  func compileWithStats(_ source: String) -> String {
    source.withCString { cSource in
      guard let ptr = tailwind_compile_with_stats(cSource) else { return "" }
      defer { tailwind_free(ptr) }
      return String(cString: ptr)
    }
  }

  var version: String { String(cString: tailwind_version()) }

  func clearCache() {
    tailwind_clear_cache()
  }
}
