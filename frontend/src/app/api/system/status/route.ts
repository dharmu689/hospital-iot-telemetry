import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout: simOut } = await execAsync(`powershell "Get-WmiObject Win32_Process -Filter 'Name = ''python.exe'' AND CommandLine LIKE ''%simulator.py%''' | Select-Object -ExpandProperty ProcessId"`).catch(() => ({ stdout: "" }));
    
    const { stdout: agentOut } = await execAsync(`powershell "Get-WmiObject Win32_Process -Filter 'Name = ''python.exe'' AND CommandLine LIKE ''%agent.py%''' | Select-Object -ExpandProperty ProcessId"`).catch(() => ({ stdout: "" }));

    return NextResponse.json(
      {
        simulator: simOut.trim() !== "",
        agent: agentOut.trim() !== "",
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    return NextResponse.json({ simulator: false, agent: false });
  }
}
