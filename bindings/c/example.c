#include <stdio.h>
#include "tailwind.h"

int main(void) {
  const char* source = "bg-blue-500 text-white px-4 py-2";
  char* css = (char*)tailwind_compile(source);
  char* json = (char*)tailwind_compile_with_stats(source);

  printf("version: %s\n", tailwind_version());
  printf("css:\n%s\n", css);
  printf("stats:\n%s\n", json);

  tailwind_free(css);
  tailwind_free(json);
  return 0;
}
