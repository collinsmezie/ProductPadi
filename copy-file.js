import fs from 'fs';
import path from 'path';

// Use process.cwd() to get the root directory
const rootDir = process.cwd();

const source = path.join(rootDir, 'swagger.yaml');
const destination = path.join(rootDir, 'dist', 'swagger.yaml');

// Ensure the destination directory exists
const destinationDir = path.dirname(destination);
if (!fs.existsSync(destinationDir)) {
  fs.mkdirSync(destinationDir, { recursive: true });
}

// Copy the file
fs.copyFileSync(source, destination);
console.log('YAML file copied to dist folder.');