using System;
using System.Runtime.InteropServices;

namespace TailwindStyled;

public sealed class TailwindCompiler
{
    private const string Lib = "tailwind_styled_parser";

    [DllImport(Lib, CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr tailwind_compile(string source);

    [DllImport(Lib, CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr tailwind_compile_with_stats(string source);

    [DllImport(Lib, CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr tailwind_version();

    [DllImport(Lib, CallingConvention = CallingConvention.Cdecl)]
    private static extern void tailwind_clear_cache();

    [DllImport(Lib, CallingConvention = CallingConvention.Cdecl)]
    private static extern void tailwind_free(IntPtr ptr);

    public string Compile(string source) => TakeOwned(tailwind_compile(source));

    public string CompileWithStats(string source) => TakeOwned(tailwind_compile_with_stats(source));

    public string Version => Marshal.PtrToStringAnsi(tailwind_version()) ?? string.Empty;

    public void ClearCache() => tailwind_clear_cache();

    private static string TakeOwned(IntPtr ptr)
    {
        if (ptr == IntPtr.Zero) return string.Empty;
        try
        {
            return Marshal.PtrToStringAnsi(ptr) ?? string.Empty;
        }
        finally
        {
            tailwind_free(ptr);
        }
    }
}
