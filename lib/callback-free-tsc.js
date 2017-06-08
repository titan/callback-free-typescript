"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var fs = require("fs");
var path = require("path");
var callback_free_1 = require("./callback-free");
function check(diagnostics) {
    if (diagnostics && diagnostics.length > 0) {
        console.error(ts.formatDiagnostics(diagnostics, {
            getCurrentDirectory: function () { return ts.sys.getCurrentDirectory(); },
            getNewLine: function () { return ts.sys.newLine; },
            // Print filenames including their rootDir, so they can be located on disk
            getCanonicalFileName: function (f) { return f; }
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
function loadTscConfig(args, allDiagnostics) {
    // Gather tsc options/input files from command line.
    // Bypass visibilty of parseCommandLine, see
    // https://github.com/Microsoft/TypeScript/issues/2620
    // tslint:disable-next-line:no-any
    var _a = ts.parseCommandLine(args), options = _a.options, fileNames = _a.fileNames, errors = _a.errors;
    if (errors.length > 0) {
        allDiagnostics.push.apply(allDiagnostics, errors);
        return null;
    }
    // Store file arguments
    var tsFileArguments = fileNames;
    // Read further settings from tsconfig.json.
    var projectDir = options.project || '.';
    var configFileName = path.join(projectDir, 'tsconfig.json');
    var _b = ts.readConfigFile(configFileName, function (path) { return fs.readFileSync(path, 'utf-8'); }), json = _b.config, error = _b.error;
    if (error) {
        allDiagnostics.push(error);
        return null;
    }
    (_c = ts.parseJsonConfigFileContent(json, ts.sys, projectDir, options, configFileName), options = _c.options, fileNames = _c.fileNames, errors = _c.errors);
    if (errors.length > 0) {
        allDiagnostics.push.apply(allDiagnostics, errors);
        return null;
    }
    // if file arguments were given to the typescript transpiler than transpile only those files
    fileNames = tsFileArguments.length > 0 ? tsFileArguments : fileNames;
    return { options: options, fileNames: fileNames };
    var _c;
}
function createSourceReplacingCompilerHost(delegate) {
    return {
        getSourceFile: getSourceFile,
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
    function getSourceFile(fileName, languageVersion, onError) {
        var path = ts.sys.resolvePath(fileName);
        if (!/\.d\.ts$/.test(fileName)) {
            return ts.createSourceFile(fileName, callback_free_1.transform(fs.readFileSync(fileName).toString()), languageVersion);
        }
        else {
            return delegate.getSourceFile(path, languageVersion, onError);
        }
    }
}
exports.createSourceReplacingCompilerHost = createSourceReplacingCompilerHost;
function main(args) {
    var diagnostics = [];
    var config = loadTscConfig(args, diagnostics);
    if (config === null) {
        check(diagnostics);
        return 1;
    }
    // Do the normal compilation flow
    var compilerHost = createSourceReplacingCompilerHost(ts.createCompilerHost(config.options));
    for (var _i = 0, _a = config.fileNames; _i < _a.length; _i++) {
        var fileName = _a[_i];
        var program = ts.createProgram([fileName], config.options, compilerHost);
        check(ts.getPreEmitDiagnostics(program));
        var result = program.emit();
        check(result.diagnostics);
    }
    return 0;
}
// CLI entry point
if (require.main === module) {
    process.exit(main(process.argv.splice(2)));
}
