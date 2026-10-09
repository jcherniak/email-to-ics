<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Guards against missing `use` imports in namespaced src/ files. A short class
 * name without an import resolves to the file's own namespace and only fails at
 * runtime when that code path executes.
 */
final class SourceClassReferencesTest extends TestCase
{
    public function testShortClassReferencesInSrcResolve(): void
    {
        $root = dirname(__DIR__) . '/src';
        $unresolved = [];

        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
        foreach ($files as $file) {
            if ($file->getExtension() !== 'php') {
                continue;
            }

            $source = file_get_contents($file->getPathname());
            $namespace = preg_match('/^namespace\s+([^;]+);/m', $source, $match) ? $match[1] : '';

            $imports = [];
            preg_match_all('/^use\s+([\w\\\\]+)(?:\s+as\s+(\w+))?;/m', $source, $uses, PREG_SET_ORDER);
            foreach ($uses as $use) {
                $parts = explode('\\', $use[1]);
                $imports[$use[2] ?? end($parts)] = $use[1];
            }

            // Scan code only (no comments/strings), and skip classes declared in this file.
            $code = '';
            $declared = [];
            $tokens = token_get_all($source);
            foreach ($tokens as $i => $token) {
                if (is_array($token) && in_array($token[0], [T_COMMENT, T_DOC_COMMENT, T_CONSTANT_ENCAPSED_STRING, T_ENCAPSED_AND_WHITESPACE, T_INLINE_HTML], true)) {
                    $code .= ' ';
                    continue;
                }
                if (is_array($token) && in_array($token[0], [T_CLASS, T_INTERFACE, T_ENUM, T_TRAIT], true)) {
                    $next = $tokens[$i + 2] ?? null;
                    if (is_array($next) && $next[0] === T_STRING) {
                        $declared[] = $next[1];
                    }
                }
                $code .= is_array($token) ? $token[1] : $token;
            }

            preg_match_all(
                '/(?:new\s+|catch\s*\(\s*|instanceof\s+|(?<![\\\\\w$>:]))([A-Z]\w*)(?=::|\s*\(|\s+\$)/',
                $code,
                $references
            );

            foreach (array_unique($references[1]) as $name) {
                if (in_array($name, ['STDOUT', 'STDERR'], true) || in_array($name, $declared, true)) {
                    continue;
                }

                $resolved = $imports[$name] ?? ($namespace !== '' ? $namespace . '\\' . $name : $name);
                if (!class_exists($resolved) && !interface_exists($resolved) && !enum_exists($resolved)) {
                    $unresolved[] = substr($file->getPathname(), strlen($root) + 1) . ': ' . $name . ' -> ' . $resolved;
                }
            }
        }

        $this->assertSame([], $unresolved);
    }
}
