import { useState } from "react";
import { todayStr } from "@/lib/format";

export function useRange() {
  return useState({ start: todayStr(), end: todayStr() });
}
