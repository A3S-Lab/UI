import type {
  ProductLocalizedText,
  ProductPlaygroundLocale,
} from "./product-playground-data";
import type { ProductTaskArtifact } from "./product-task-session-state";

export const seededSessionCopy: Record<
  ProductPlaygroundLocale,
  readonly [string, string, string, string]
> = {
  en: [
    "After a failed sign-in token refresh, focus is lost and the return route is not preserved. Find the cause, fix it, and add regression coverage.",
    "I reproduced the issue. The failure branch cleared the recovery target before redirecting and skipped focus restoration for the trigger.",
    "I changed the cleanup order, restored focus after navigation, and added coverage for the return route and accessibility announcement.",
    "The recovery path and its regression tests now pass.",
  ],
  zh: [
    "登录令牌刷新失败后，焦点会丢失，返回路径也没有保留。请定位原因、修复并补充回归测试。",
    "已复现问题。失败分支在重定向前清除了恢复目标，同时跳过了触发控件的焦点恢复。",
    "我调整了清理顺序，在导航完成后恢复焦点，并为返回路由和无障碍公告增加覆盖。",
    "恢复路径及其回归测试现已通过。",
  ],
};

export const seededSessionArtifacts: readonly ProductTaskArtifact[] = [
  {
    content: `export async function restoreSession(returnTo: string) {
  const recoveryTarget = normalizeReturnPath(returnTo);

  await refreshSessionToken();
  navigate(recoveryTarget);
  restoreTriggerFocus();
}`,
    id: "session",
    kind: "TypeScript",
    name: "src/auth/session.ts",
    summary: {
      en: "Preserves the recovery target until navigation completes.",
      zh: "保留恢复目标，直到导航完成。",
    },
  },
  {
    content: `export function SignInRecovery() {
  const returnTo = useRecoveryTarget();

  return (
    <SignInForm
      onRecovered={() => restoreSession(returnTo)}
    />
  );
}`,
    id: "sign-in",
    kind: "TSX",
    name: "src/routes/sign-in.tsx",
    summary: {
      en: "Restores focus after the return route is committed.",
      zh: "在返回路由提交后恢复焦点。",
    },
  },
  {
    content: `test("keeps the return route after refresh failure", async () => {
  await failNextTokenRefresh();
  await recoverFromSignIn("/projects/alpha");

  expect(currentRoute()).toBe("/projects/alpha");
  expect(trigger()).toHaveFocus();
});`,
    id: "tests",
    kind: "TypeScript",
    name: "tests/session.test.ts",
    summary: {
      en: "Covers route recovery, focus, and status announcements.",
      zh: "覆盖路由恢复、焦点与状态公告。",
    },
  },
  {
    content: `# Session recovery review

- Recovery target survives token refresh failures.
- Focus returns to the action that opened sign-in.
- Status changes use a bounded live region.
- All 12 focused regression tests pass.`,
    id: "review",
    kind: "Markdown",
    name: "release-review.md",
    summary: {
      en: "Records verification scope and release evidence.",
      zh: "记录验证范围与发布证据。",
    },
  },
];

export const seededSessionTitle: ProductLocalizedText = {
  en: "Fix session recovery",
  zh: "修复会话恢复",
};
