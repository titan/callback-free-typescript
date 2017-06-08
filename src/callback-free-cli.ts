import { readFileSync } from "fs";
import { transform } from "./callback-free";

function main(filenames: string[]) {
  filenames.forEach(filename => {
    console.log(transform(readFileSync(filename).toString()));
  });
  return 0;
}

// CLI entry point
if (require.main === module) {
  process.exit(main(process.argv.splice(2)));
}
