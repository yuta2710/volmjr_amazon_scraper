"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var executablePath = path.join(__dirname, "../../scripts/normal+captcha.py");
var command = "python ".concat(executablePath, " remoteurl");
console.log(command);
