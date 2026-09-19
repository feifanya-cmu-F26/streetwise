import "server-only";
import { requireDemoMode } from "@/lib/env";
import {
  createDemoRepository,
  type IssueRepository,
} from "@/lib/demo/repository";

const demoGlobal = globalThis as typeof globalThis & {
  streetwiseDemoRepository?: IssueRepository;
};

export function getIssueRepository(): IssueRepository {
  requireDemoMode();
  // One local Node process only. Replace this boundary with Supabase for shared persistence.
  demoGlobal.streetwiseDemoRepository ??= createDemoRepository();
  return demoGlobal.streetwiseDemoRepository;
}
