public final class TailwindCompiler {
  static {
    System.loadLibrary("tailwind_styled_parser");
  }

  private native String tailwind_compile(String source);
  private native String tailwind_compile_with_stats(String source);
  private native String tailwind_version();
  private native void tailwind_clear_cache();

  public String compile(String source) {
    return tailwind_compile(source);
  }

  public String compileWithStats(String source) {
    return tailwind_compile_with_stats(source);
  }

  public String version() {
    return tailwind_version();
  }

  public void clearCache() {
    tailwind_clear_cache();
  }
}
