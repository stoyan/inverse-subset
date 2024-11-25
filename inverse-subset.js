const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const fontkit = require('fontkit');
const {Command} = require('commander');

const program = new Command();

// CLI
program
  .name('inverse-subset')
  .description(
    'Generates an inverse subset font from a complete font and a subset font.',
  )
  .version('1.0.0')
  .requiredOption('-c, --complete <path>', 'Path to the complete font file')
  .requiredOption('-s, --subset <path>', 'Path to the subset font file')
  .option(
    '-o, --output <directory>',
    'Directory for the inverse subset font',
    process.cwd(),
  )
  .parse(process.argv);

// read command-line arguments
const options = program.opts();
const completeFontPath = options.complete;
const subsetFontPath = options.subset;
const outputDir = options.output;

// validate
if (!fs.existsSync(completeFontPath)) {
  console.error(`Error: Complete font file not found at "${completeFontPath}"`);
  process.exit(1);
}
if (!fs.existsSync(subsetFontPath)) {
  console.error(`Error: Subset font file not found at "${subsetFontPath}"`);
  process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, {recursive: true});
}

// Generate file name for the inverse subset
const baseName = path.basename(
  completeFontPath,
  path.extname(completeFontPath),
);
const inverseSubsetFile = path.join(
  outputDir,
  `${baseName}-inverse-subset.woff2`,
);

// Function to get supported Unicode characters from a font
function getUnicodeCharacters(fontPath) {
  const font = fontkit.openSync(fontPath);
  return new Set(
    font.characterSet.map(
      (codePoint) => `U+${codePoint.toString(16).toUpperCase()}`,
    ),
  );
}

const allFontChars = getUnicodeCharacters(completeFontPath);
const subsetFontChars = getUnicodeCharacters(subsetFontPath);
const inverseSubset = [...allFontChars]
  .filter((char) => !subsetFontChars.has(char))
  .join(',');

// Function to create a subset using glyphhanger
function createSubset(inputFont, outputFont, whitelist) {
  const command = `glyphhanger --formats=woff2 --subset="${inputFont}" --whitelist=${whitelist}`;
  console.log(`Running: ${command}`);
  execSync(command);

  // Rename the result cuz glyphhanger always adds `-subset` to the file name
  const tempSubsetFile = inputFont.replace(/\.ttf$/, '-subset.woff2');
  if (fs.existsSync(tempSubsetFile)) {
    fs.renameSync(tempSubsetFile, outputFont);
    console.log(`Created: ${outputFont}`);
  } else {
    console.error(`Subset file not found: ${tempSubsetFile}`);
  }
}

// Create the inverse subset
console.log('Creating the inverse subset...');
createSubset(completeFontPath, inverseSubsetFile, inverseSubset);

console.log('Inverse subset generation complete.');
