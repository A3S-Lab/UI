import { useId, useState, type ChangeEvent } from "react";
import { useLang } from "@rspress/core/runtime";

type SliderDemoVariant = "field" | "labeled" | "standalone";

type SliderDemoProps = {
  direction?: "ltr" | "rtl";
  disabled?: boolean;
  id?: string;
  initialValue?: number;
  variant?: SliderDemoVariant;
};

const sliderCopy = {
  en: {
    budgetPrefix: "Maximum budget: ",
    budgetSuffix: ".",
    priceRange: "Price range",
    temperature: "Temperature",
    volume: "Volume",
  },
  zh: {
    budgetPrefix: "最高预算：",
    budgetSuffix: "。",
    priceRange: "价格范围",
    temperature: "温度",
    volume: "音量",
  },
} as const;

export default function SliderDemo({
  direction = "ltr",
  disabled = false,
  id,
  initialValue,
  variant = "standalone",
}: SliderDemoProps) {
  const language = useLang() === "zh" ? "zh" : "en";
  const copy = sliderCopy[language];
  const maximum = variant === "field" ? 1000 : 100;
  const step = variant === "field" ? 10 : 1;
  const [value, setValue] = useState(
    initialValue ?? (variant === "field" ? 800 : 50),
  );
  const generatedInputId = useId();
  const inputId = id ?? generatedInputId;
  const descriptionId = `${inputId}-description`;
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.currentTarget.valueAsNumber);
  };
  const currency = new Intl.NumberFormat(
    language === "zh" ? "zh-CN" : "en-US",
    {
      currency: "USD",
      maximumFractionDigits: 0,
      style: "currency",
    },
  ).format(value);
  const accessibleName = direction === "rtl" ? "مستوى الصوت" : copy.volume;
  const accessibleValueText =
    direction === "rtl"
      ? `${value} بالمائة`
      : language === "zh"
        ? `${value}%`
        : `${value} percent`;

  if (variant === "field") {
    return (
      <div className="field" data-slider-demo="field">
        <label htmlFor={inputId}>{copy.priceRange}</label>
        <p id={descriptionId}>
          {copy.budgetPrefix}
          <output htmlFor={inputId}>{currency}</output>
          {copy.budgetSuffix}
        </p>
        <input
          id={inputId}
          className="input"
          type="range"
          min="0"
          max={maximum}
          step={step}
          value={value}
          aria-describedby={descriptionId}
          aria-valuetext={currency}
          disabled={disabled}
          onChange={handleInput}
        />
      </div>
    );
  }

  if (variant === "labeled") {
    return (
      <div
        className="grid w-full gap-1"
        data-slider-demo="labeled"
        dir={direction}
      >
        <div className="flex items-center justify-between gap-2">
          <label className="label" htmlFor={inputId}>
            {copy.temperature}
          </label>
          <output className="text-muted-foreground text-sm" htmlFor={inputId}>
            {value} °C
          </output>
        </div>
        <input
          id={inputId}
          className="input w-full"
          type="range"
          min="0"
          max={maximum}
          step={step}
          value={value}
          aria-valuetext={`${value} ${
            language === "zh" ? "摄氏度" : "degrees Celsius"
          }`}
          disabled={disabled}
          onChange={handleInput}
        />
      </div>
    );
  }

  return (
    <input
      id={inputId}
      className="input w-full"
      data-slider-demo="standalone"
      type="range"
      min="0"
      max={maximum}
      step={step}
      value={value}
      aria-label={accessibleName}
      aria-valuetext={accessibleValueText}
      dir={direction}
      disabled={disabled}
      onChange={handleInput}
    />
  );
}
