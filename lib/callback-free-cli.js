"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var callback_free_1 = require("./callback-free");
function main(filenames) {
    filenames.forEach(function (filename) {
        console.log(callback_free_1.transform(fs_1.readFileSync(filename).toString()));
    });
    return 0;
}
// CLI entry point
if (require.main === module) {
    process.exit(main(process.argv.splice(2)));
}
