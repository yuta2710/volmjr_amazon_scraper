import * as path from "path";

const executablePath = path.join(
  __dirname,
  "../../scripts/normal+captcha.py"
);
const command = `python ${executablePath} remoteurl`;

console.log(command);