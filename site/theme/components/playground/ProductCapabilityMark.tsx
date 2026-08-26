import type { ProductCapabilityDefinition } from "./product-capability-state";
import { ProductExpertAvatar } from "./ProductExpertAvatar";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

function stableVisualIndex(id: string, count: number) {
  let hash = 0;
  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return (hash % count) + 1;
}

export function capabilityVisualTone(id: string) {
  return stableVisualIndex(id, 5);
}

export function capabilityIconName(definition: ProductCapabilityDefinition) {
  return (
    definition.icon ?? (definition.tab === "skills" ? "checklist" : "link")
  );
}

export function ProductCapabilityMark({
  definition,
  size = 44,
}: {
  definition: ProductCapabilityDefinition;
  size?: number;
}) {
  if (definition.tab === "assistants") {
    return <ProductExpertAvatar expertId={definition.id} size={size} />;
  }

  return (
    <ProductPlaygroundIcon
      height={size}
      name={capabilityIconName(definition)}
      width={size}
    />
  );
}
