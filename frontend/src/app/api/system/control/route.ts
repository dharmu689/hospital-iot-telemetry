import { NextRequest, NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import path from "path";

const ROOT = path.resolve(process.cwd(), "..", "..");

export async function POST(req: NextRequest) {
  const { target, action } = await req.json();

  try {
    if (action === "start") {
      const folder = target === "simulator" ? "simulator" : "agent";
      const script = target === "simulator" ? "simulator.py" : "agent.py";
      const fullPath = path.resolve(process.cwd(), "..", folder);
      
      const child = spawn(path.join(fullPath, "venv", "Scripts", "python.exe"), [script], {
        cwd: fullPath,
        detached: true,
        stdio: "ignore",
      });
      child.unref();

      return NextResponse.json({ success: true, message: `${target} started` });
    } else if (action === "stop") {
      const scriptName = target === "simulator" ? "simulator.py" : "agent.py";
      const cmd = `powershell "Get-WmiObject Win32_Process -Filter 'Name = ''python.exe'' AND CommandLine LIKE ''%${scriptName}%''' | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"`;
      
      exec(cmd);
      return NextResponse.json({ success: true, message: `${target} stopped` });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: false }, { status: 400 });
}
