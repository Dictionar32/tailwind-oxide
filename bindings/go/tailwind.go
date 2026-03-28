package tailwind

/*
#cgo CFLAGS: -I../c
#include "../c/tailwind.h"
#include <stdlib.h>
*/
import "C"
import "unsafe"

type Compiler struct{}

func NewCompiler() *Compiler {
	return &Compiler{}
}

func (c *Compiler) Compile(source string) string {
	csrc := C.CString(source)
	defer C.free(unsafe.Pointer(csrc))

	ptr := C.tailwind_compile(csrc)
	if ptr == nil {
		return ""
	}
	defer C.tailwind_free(ptr)
	return C.GoString(ptr)
}

func (c *Compiler) CompileWithStats(source string) string {
	csrc := C.CString(source)
	defer C.free(unsafe.Pointer(csrc))

	ptr := C.tailwind_compile_with_stats(csrc)
	if ptr == nil {
		return ""
	}
	defer C.tailwind_free(ptr)
	return C.GoString(ptr)
}

func (c *Compiler) Version() string {
	return C.GoString(C.tailwind_version())
}
