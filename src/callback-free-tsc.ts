import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { transform } from "./callback-free";

function check(diagnostics: ts.Diagnostic[]) {
  if (diagnostics && diagnostics.length > 0) {
    console.error(ts.formatDiagnostics(diagnostics, {
      getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
      getNewLine: () => ts.sys.newLine,
      // Print filenames including their rootDir, so they can be located on disk
      getCanonicalFileName: (f: string) => f
    }));
  }
}

/**
 * Loads the tsconfig.json from a directory.
 * Unfortunately there's a ton of logic in tsc.ts related to searching
 * for tsconfig.json etc. that we don't really want to replicate, e.g.
 * tsc appears to allow -p path/to/tsconfig.json while this only works
 * with -p path/to/containing/dir.
 *
 * @param args tsc command-line arguments.
 */
function loadTscConfig(args: string[], allDiagnostics: ts.Diagnostic[]):
    {options: ts.CompilerOptions, fileNames: string[]}|null {
  // Gather tsc options/input files from command line.
  // Bypass visibilty of parseCommandLine, see
  // https://github.com/Microsoft/TypeScript/issues/2620
  // tslint:disable-next-line:no-any
  let {options, fileNames, errors} = (ts as any).parseCommandLine(args);
  if (errors.length > 0) {
    allDiagnostics.push(...errors);
    return null;
  }

  // Store file arguments
  const tsFileArguments = fileNames;

  // Read further settings from tsconfig.json.
  const projectDir = options.project || '.';
  const configFileName = path.join(projectDir, 'tsconfig.json');
  const {config: json, error} =
      ts.readConfigFile(configFileName, path => fs.readFileSync(path, 'utf-8'));
  if (error) {
    allDiagnostics.push(error);
    return null;
  }
  ({options, fileNames, errors} =
       ts.parseJsonConfigFileContent(json, ts.sys, projectDir, options, configFileName));
  if (errors.length > 0) {
    allDiagnostics.push(...errors);
    return null;
  }

  // if file arguments were given to the typescript transpiler than transpile only those files
  fileNames = tsFileArguments.length > 0 ? tsFileArguments : fileNames;

  return {options, fileNames};
}

export function createSourceReplacingCompilerHost(delegate: ts.CompilerHost): ts.CompilerHost {
  return {
    getSourceFile,
    getCancellationToken: delegate.getCancellationToken,
    getDefaultLibFileName: delegate.getDefaultLibFileName,
    writeFile: delegate.writeFile,
    getCurrentDirectory: delegate.getCurrentDirectory,
    getCanonicalFileName: delegate.getCanonicalFileName,
    useCaseSensitiveFileNames: delegate.useCaseSensitiveFileNames,
    getNewLine: delegate.getNewLine,
    fileExists: delegate.fileExists,
    readFile: delegate.readFile,
    directoryExists: delegate.directoryExists,
    getDirectories: delegate.getDirectories,
  };

  function getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void): ts.SourceFile {
    const path: string = ts.sys.resolvePath(fileName);
    if (!/\.d\.ts$/.test(fileName)) {
      return ts.createSourceFile(fileName, transform(fs.readFileSync(fileName).toString()), languageVersion);
    } else {
      return delegate.getSourceFile(path, languageVersion, onError);
    }
  }
}

function main(args: string[]): number {
  const diagnostics: ts.Diagnostic[] = [];
  const config = loadTscConfig(args, diagnostics);
  if (config === null) {
    check(diagnostics);
    return 1;
  }

  // Do the normal compilation flow
  const compilerHost = createSourceReplacingCompilerHost(ts.createCompilerHost(config.options));
  for (const fileName of config.fileNames) {
    const program = ts.createProgram([fileName], config.options, compilerHost);

    check(ts.getPreEmitDiagnostics(program));

    const result = program.emit();
    check(result.diagnostics);
  }

  return 0;
}

// CLI entry point
if (require.main === module) {
  process.exit(main(process.argv.splice(2)));
}
