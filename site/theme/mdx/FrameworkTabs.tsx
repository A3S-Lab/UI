import { ComponentPreviewIntegration } from "../components/ComponentPreviewIntegration";

type FrameworkTabsProps = {
  html: string;
  htmlInstall?: string;
  react: string;
  reactInstall?: string;
  vue: string;
  vueInstall?: string;
};

export default function FrameworkTabs({
  html,
  htmlInstall,
  react,
  reactInstall,
  vue,
  vueInstall,
}: FrameworkTabsProps) {
  return (
    <ComponentPreviewIntegration
      html={html}
      htmlInstall={htmlInstall}
      react={react}
      reactInstall={reactInstall}
      vue={vue}
      vueInstall={vueInstall}
    />
  );
}
