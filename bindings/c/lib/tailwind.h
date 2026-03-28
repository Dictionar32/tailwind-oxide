#ifndef TAILWIND_STYLED_PARSER_H
#define TAILWIND_STYLED_PARSER_H

#ifdef __cplusplus
extern "C" {
#endif

const char* tailwind_compile(const char* code);
const char* tailwind_compile_with_stats(const char* code);
void tailwind_free(char* ptr);
const char* tailwind_version(void);
void tailwind_clear_cache(void);

#ifdef __cplusplus
}
#endif

#endif
