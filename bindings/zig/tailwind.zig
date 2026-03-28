const std = @import("std");

const c = @cImport({
    @cInclude("../c/tailwind.h");
});

pub const TailwindCompiler = struct {
    pub fn compile(allocator: std.mem.Allocator, source: []const u8) ![]u8 {
        const c_source = try allocator.dupeZ(u8, source);
        defer allocator.free(c_source);

        const ptr = c.tailwind_compile(c_source.ptr);
        if (ptr == null) return allocator.dupe(u8, "");
        defer c.tailwind_free(@constCast(ptr));

        return allocator.dupe(u8, std.mem.sliceTo(ptr, 0));
    }

    pub fn compileWithStats(allocator: std.mem.Allocator, source: []const u8) ![]u8 {
        const c_source = try allocator.dupeZ(u8, source);
        defer allocator.free(c_source);

        const ptr = c.tailwind_compile_with_stats(c_source.ptr);
        if (ptr == null) return allocator.dupe(u8, "");
        defer c.tailwind_free(@constCast(ptr));

        return allocator.dupe(u8, std.mem.sliceTo(ptr, 0));
    }

    pub fn version() []const u8 {
        return std.mem.sliceTo(c.tailwind_version(), 0);
    }
};
