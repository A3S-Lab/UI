import { useEffect, useRef, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import type { ProductExtension } from "./product-marketplace-data";
import {
  ProductPlaygroundIcon,
  type ProductPlaygroundIconName,
} from "./ProductPlaygroundIcon";

export function ProductExtensionHost({
  extension,
  locale,
  onBack,
}: {
  extension: ProductExtension;
  locale: ProductPlaygroundLocale;
  onBack: () => void;
}) {
  const zh = locale === "zh";
  const reloadTimerRef = useRef<number | null>(null);
  const [proposal, setProposal] = useState<"accepted" | "pending" | "rejected">(
    "pending",
  );
  const [reloadCount, setReloadCount] = useState(0);
  const [reloading, setReloading] = useState(false);

  useEffect(
    () => () => {
      if (reloadTimerRef.current !== null) {
        window.clearTimeout(reloadTimerRef.current);
      }
    },
    [],
  );

  const reloadHost = () => {
    if (reloading) return;
    setReloading(true);
    reloadTimerRef.current = window.setTimeout(() => {
      reloadTimerRef.current = null;
      setReloading(false);
      setReloadCount((count) => count + 1);
      setProposal((current) => (current === "accepted" ? current : "pending"));
    }, 650);
  };

  return (
    <section
      aria-busy={reloading}
      className="product-extension-host"
      data-product-surface="extension-host"
      data-reload-count={reloadCount}
      data-reload-state={reloading ? "reloading" : "ready"}
    >
      <header>
        <button
          aria-label={zh ? "返回扩展市场" : "Back to extensions"}
          onClick={onBack}
          type="button"
        >
          <ProductPlaygroundIcon name="back" />
        </button>
        <span data-extension-icon>
          <ProductPlaygroundIcon name={extension.icon} />
        </span>
        <div>
          <strong>{extension.name[locale]}</strong>
          <small>{zh ? "隔离扩展宿主" : "Isolated extension host"}</small>
        </div>
        <em data-host-status={reloading ? "reloading" : "verified"}>
          <i />
          {reloading
            ? zh
              ? "正在重载"
              : "Reloading"
            : zh
              ? "已验证"
              : "Verified"}
        </em>
        <button
          aria-label={zh ? "重新加载扩展宿主" : "Reload extension host"}
          disabled={reloading}
          onClick={reloadHost}
          type="button"
        >
          <ProductPlaygroundIcon name="refresh" />
          {reloading
            ? zh
              ? "正在加载"
              : "Reloading"
            : zh
              ? "重新加载"
              : "Reload"}
        </button>
      </header>
      {reloadCount > 0 && !reloading ? (
        <output className="product-extension-host__reload-feedback">
          <ProductPlaygroundIcon name="check" />
          {zh
            ? "扩展宿主已重新加载，权限边界保持不变。"
            : "Extension host reloaded with its permission boundary intact."}
        </output>
      ) : null}
      <main>
        <section className="product-extension-host__summary">
          <span>
            <ProductPlaygroundIcon name="report" />
          </span>
          <div>
            <small>{zh ? "发布候选" : "Release candidate"}</small>
            <h1>v0.3.0</h1>
            <p>
              {zh
                ? "关键检查已完成，可以开始最终评审。"
                : "Critical checks are complete and ready for final review."}
            </p>
          </div>
          <em>{zh ? "就绪" : "Ready"}</em>
        </section>
        <section className="product-extension-host__checks">
          {[
            [zh ? "构建与类型检查" : "Build and typecheck", "28s", "check"],
            [zh ? "交互路径" : "Interaction paths", "12 / 12", "check"],
            [
              zh ? "视觉证据" : "Visual evidence",
              zh ? "双端齐全" : "Both viewports",
              "eye",
            ],
            [zh ? "未解决风险" : "Open risks", "0", "shield"],
          ].map(([label, value, icon]) => (
            <article key={label}>
              <ProductPlaygroundIcon name={icon as ProductPlaygroundIconName} />
              <span>
                <strong>{label}</strong>
                <small>{value}</small>
              </span>
            </article>
          ))}
        </section>
        <section
          className="product-extension-host__proposal"
          data-state={proposal}
        >
          <header>
            <ProductPlaygroundIcon name="task-add" />
            <div>
              <strong>
                {zh ? "建议添加到任务上下文" : "Proposed task context"}
              </strong>
              <small>
                {zh
                  ? "由扩展提出，尚未写入当前任务"
                  : "Proposed by the extension; not yet added"}
              </small>
            </div>
          </header>
          <blockquote>
            {zh
              ? "发布候选 v0.3.0 已通过构建、交互和双端视觉验收，没有未解决风险。"
              : "Release candidate v0.3.0 passed build, interaction, and both viewport reviews with no open risks."}
          </blockquote>
          {proposal === "pending" ? (
            <footer>
              <button onClick={() => setProposal("rejected")} type="button">
                {zh ? "忽略" : "Dismiss"}
              </button>
              <button
                data-primary
                onClick={() => setProposal("accepted")}
                type="button"
              >
                {zh ? "添加到当前任务" : "Add to current task"}
              </button>
            </footer>
          ) : (
            <output>
              <ProductPlaygroundIcon
                name={proposal === "accepted" ? "check" : "close"}
              />
              {proposal === "accepted"
                ? zh
                  ? "已添加到任务草稿"
                  : "Added to the task draft"
                : zh
                  ? "已忽略提议"
                  : "Proposal dismissed"}
            </output>
          )}
        </section>
      </main>
      <footer>
        <ProductPlaygroundIcon name="shield" />
        {zh
          ? "扩展无法直接读取页面状态；上下文通过受审查的提议传递。"
          : "The extension cannot read ambient page state; context moves through reviewed proposals."}
      </footer>
    </section>
  );
}
