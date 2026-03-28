import ctypes
import platform
from pathlib import Path


def _default_library_path() -> Path:
    system = platform.system()
    if system == "Windows":
        lib = "tailwind_styled_parser.dll"
    elif system == "Darwin":
        lib = "libtailwind_styled_parser.dylib"
    else:
        lib = "libtailwind_styled_parser.so"
    return Path(__file__).resolve().parents[2] / "native" / "target" / "release" / lib


class TailwindCompiler:
    def __init__(self, library_path: str | None = None):
        path = library_path or str(_default_library_path())
        self._lib = ctypes.CDLL(path)
        self._lib.tailwind_compile.argtypes = [ctypes.c_char_p]
        self._lib.tailwind_compile.restype = ctypes.c_void_p
        self._lib.tailwind_compile_with_stats.argtypes = [ctypes.c_char_p]
        self._lib.tailwind_compile_with_stats.restype = ctypes.c_void_p
        self._lib.tailwind_free.argtypes = [ctypes.c_void_p]
        self._lib.tailwind_free.restype = None
        self._lib.tailwind_version.argtypes = []
        self._lib.tailwind_version.restype = ctypes.c_char_p

    def _take_string(self, ptr: int) -> str:
        if not ptr:
            return ""
        try:
            return ctypes.cast(ptr, ctypes.c_char_p).value.decode("utf-8")
        finally:
            self._lib.tailwind_free(ptr)

    def compile(self, source: str) -> str:
        ptr = self._lib.tailwind_compile(source.encode("utf-8"))
        return self._take_string(ptr)

    def compile_with_stats(self, source: str) -> str:
        ptr = self._lib.tailwind_compile_with_stats(source.encode("utf-8"))
        return self._take_string(ptr)

    @property
    def version(self) -> str:
        return self._lib.tailwind_version().decode("utf-8")
