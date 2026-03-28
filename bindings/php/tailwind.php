<?php

final class TailwindCompiler {
    private FFI $ffi;

    public function __construct(?string $libraryPath = null) {
        if ($libraryPath === null) {
            $libraryPath = $this->defaultLibraryPath();
        }

        $this->ffi = FFI::cdef('
            char* tailwind_compile(const char* code);
            char* tailwind_compile_with_stats(const char* code);
            void tailwind_free(char* ptr);
            const char* tailwind_version(void);
            void tailwind_clear_cache(void);
        ', $libraryPath);
    }

    public function compile(string $source): string {
        $ptr = $this->ffi->tailwind_compile($source);
        try {
            return FFI::string($ptr);
        } finally {
            $this->ffi->tailwind_free($ptr);
        }
    }

    public function compileWithStats(string $source): string {
        $ptr = $this->ffi->tailwind_compile_with_stats($source);
        try {
            return FFI::string($ptr);
        } finally {
            $this->ffi->tailwind_free($ptr);
        }
    }

    public function version(): string {
        return FFI::string($this->ffi->tailwind_version());
    }

    public function clearCache(): void {
        $this->ffi->tailwind_clear_cache();
    }

    private function defaultLibraryPath(): string {
        $root = dirname(__DIR__, 2);
        if (PHP_OS_FAMILY === 'Windows') {
            return $root . '\\native\\target\\release\\tailwind_styled_parser.dll';
        }
        if (PHP_OS_FAMILY === 'Darwin') {
            return $root . '/native/target/release/libtailwind_styled_parser.dylib';
        }
        return $root . '/native/target/release/libtailwind_styled_parser.so';
    }
}
