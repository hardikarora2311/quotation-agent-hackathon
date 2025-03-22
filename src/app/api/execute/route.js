// This file should be placed in app/api/execute/route.js
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";

// Make sure this is a server-side only file
export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // NOT 'edge'

/**
 * Executes a Python script with the given arguments
 */
function executePythonScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    // Ensure scripts directory exists
    const scriptsDir = path.join(process.cwd(), "scripts");
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    // Escape arguments to handle spaces and special characters
    const escapedArgs = args
      .map((arg) => `"${arg.replace(/"/g, '\\"')}"`)
      .join(" ");

    // Construct the full path to the script
    const scriptPath = path.join(scriptsDir, scriptName);

    // Get Python command - try python3 first, then fall back to python
    const pythonCmd =
      process.env.PYTHON_CMD ||
      (process.platform === "win32"
        ? "python"
        : fs.existsSync("/usr/bin/python3")
        ? "python3"
        : "python");

    // Execute the command with increased buffer size for large outputs
    exec(
      `${pythonCmd} "${scriptPath}" ${escapedArgs}`,
      { maxBuffer: 1024 * 1024 * 10 }, // 10MB buffer
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing Python script: ${error.message}`);
          console.error(`stderr: ${stderr}`);
          return reject(error);
        }

        if (stderr) {
          console.warn(`Python script warning: ${stderr}`);
        }

        try {
          // Parse the JSON output
          let result;
          try {
            result = JSON.parse(stdout.trim());
          } catch (parseError) {
            console.error(`Error parsing Python script output as JSON:`);
            console.error(`Raw output: ${stdout.substring(0, 500)}...`);

            // Try to extract JSON from potential mixed output
            const jsonMatch = stdout.match(/(\[.*\]|\{.*\})/s);
            if (jsonMatch) {
              result = JSON.parse(jsonMatch[0]);
            } else {
              throw parseError;
            }
          }
          resolve(result);
        } catch (parseError) {
          console.error(
            `Failed to parse any JSON from output: ${parseError.message}`
          );
          reject(parseError);
        }
      }
    );
  });
}

export async function POST(req) {
  try {
    const { scriptName, args } = await req.json();

    // Validate script name for security
    if (
      !scriptName ||
      !scriptName.endsWith(".py") ||
      scriptName.includes("..")
    ) {
      return NextResponse.json(
        { error: "Invalid script name" },
        { status: 400 }
      );
    }

    // Validate args are strings
    if (
      args &&
      (!Array.isArray(args) || !args.every((arg) => typeof arg === "string"))
    ) {
      return NextResponse.json({ error: "Invalid arguments" }, { status: 400 });
    }

    // Execute the script
    const result = await executePythonScript(scriptName, args);

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error executing script:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute script" },
      { status: 500 }
    );
  }
}
