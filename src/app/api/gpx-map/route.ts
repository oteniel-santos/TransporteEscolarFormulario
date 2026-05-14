import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const gpxDir = path.join(process.cwd(), "public", "gpx");
  let files: string[];
  try {
    files = fs.readdirSync(gpxDir).filter((f) => f.endsWith(".gpx"));
  } catch {
    return NextResponse.json({});
  }

  const map: Record<number, string> = {};
  for (const file of files) {
    const match = file.match(/^(\d{2})-/);
    if (match) {
      map[parseInt(match[1], 10)] = `/gpx/${file}`;
    }
  }

  return NextResponse.json(map);
}
