require "fiddle"
require "fiddle/import"

module Tailwind
  extend Fiddle::Importer

  lib =
    if RUBY_PLATFORM =~ /mingw|mswin/
      "tailwind_styled_parser.dll"
    elsif RUBY_PLATFORM =~ /darwin/
      "libtailwind_styled_parser.dylib"
    else
      "libtailwind_styled_parser.so"
    end

  dlload File.expand_path("../../native/target/release/#{lib}", __dir__)

  extern "char* tailwind_compile(const char*)"
  extern "char* tailwind_compile_with_stats(const char*)"
  extern "void tailwind_free(char*)"
  extern "const char* tailwind_version()"
  extern "void tailwind_clear_cache()"

  class Compiler
    def compile(source)
      ptr = Tailwind.tailwind_compile(source)
      value = ptr.to_s
      Tailwind.tailwind_free(ptr)
      value
    end

    def compile_with_stats(source)
      ptr = Tailwind.tailwind_compile_with_stats(source)
      value = ptr.to_s
      Tailwind.tailwind_free(ptr)
      value
    end

    def version
      Tailwind.tailwind_version.to_s
    end

    def clear_cache
      Tailwind.tailwind_clear_cache
    end
  end
end
