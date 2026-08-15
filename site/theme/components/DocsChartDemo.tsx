import { useEffect, useId, useMemo, useRef } from "react";
import Chart, { type ChartConfiguration } from "chart.js/auto";
import { useLang } from "@rspress/core/runtime";

type ChartDemoVariant = "bar" | "line" | "step" | "stacked" | "donut" | "radar";

type ChartTable = {
  caption: string;
  columns: string[];
  rows: Array<Array<number | string>>;
  summary: string;
};

type Palette = {
  border: string;
  foreground: string;
  series: string[];
  subtle: string;
};

function readToken(element: HTMLElement, token: string, fallback: string) {
  return getComputedStyle(element).getPropertyValue(token).trim() || fallback;
}

function readPalette(element: HTMLElement): Palette {
  return {
    border: readToken(element, "--border", "rgba(123, 132, 148, 0.24)"),
    foreground: readToken(element, "--foreground", "#111113"),
    series: [
      readToken(element, "--chart-1", "#1456f0"),
      readToken(element, "--chart-2", "#16845b"),
      readToken(element, "--chart-3", "#8a5bd6"),
      readToken(element, "--chart-4", "#a86412"),
      readToken(element, "--chart-5", "#c93d45"),
    ],
    subtle: readToken(element, "--muted-foreground", "#71717a"),
  };
}

function chartTable(variant: ChartDemoVariant, zh: boolean): ChartTable {
  if (variant === "donut") {
    const columns = zh ? ["来源", "占比"] : ["Source", "Share"];
    const rows = zh
      ? [["直接访问", "42%"], ["搜索", "31%"], ["社交", "17%"], ["引荐", "10%"]]
      : [["Direct", "42%"], ["Search", "31%"], ["Social", "17%"], ["Referral", "10%"]];
    return {
      caption: zh ? "访问来源占比" : "Traffic source share",
      columns,
      rows,
      summary: zh
        ? "直接访问占 42%，搜索占 31%，社交占 17%，引荐占 10%。"
        : "Direct traffic is 42%, search 31%, social 17%, and referrals 10%.",
    };
  }

  if (variant === "radar") {
    const labels = zh
      ? ["速度", "质量", "安全", "覆盖", "控制", "清晰度"]
      : ["Speed", "Quality", "Safety", "Reach", "Control", "Clarity"];
    const values = [86, 92, 88, 78, 91, 94];
    return {
      caption: zh ? "界面质量维度" : "Interface quality dimensions",
      columns: zh ? ["维度", "评分"] : ["Dimension", "Score"],
      rows: labels.map((label, index) => [label, values[index]]),
      summary: zh
        ? "六项质量评分中清晰度最高为 94，覆盖最低为 78。"
        : "Clarity is highest at 94; reach is lowest at 78.",
    };
  }

  const labels = zh
    ? ["1 月", "2 月", "3 月", "4 月", "5 月", "6 月"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const desktop = [186, 305, 237, 273, 209, 314];
  const mobile = [80, 200, 120, 190, 130, 220];
  return {
    caption: zh ? "按设备划分的月访问量" : "Monthly visits by device",
    columns: zh ? ["月份", "桌面端", "移动端"] : ["Month", "Desktop", "Mobile"],
    rows: labels.map((label, index) => [label, desktop[index], mobile[index]]),
    summary: zh
      ? "桌面端访问量在 6 月达到 314，移动端在 6 月达到 220。"
      : "Desktop visits peak at 314 in June; mobile visits peak at 220.",
  };
}

function chartConfiguration(
  variant: ChartDemoVariant,
  palette: Palette,
  table: ChartTable,
  zh: boolean,
): ChartConfiguration {
  const baseOptions = {
    animation: false as const,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          boxHeight: 8,
          boxWidth: 8,
          color: palette.subtle,
          padding: 16,
          usePointStyle: true,
        },
      },
    },
    responsive: true,
  };

  if (variant === "donut") {
    return {
      type: "doughnut",
      data: {
        labels: table.rows.map(([label]) => String(label)),
        datasets: [
          {
            backgroundColor: palette.series.slice(0, 4),
            borderWidth: 0,
            data: [42, 31, 17, 10],
            label: zh ? "访问占比" : "Traffic share",
          },
        ],
      },
      options: baseOptions,
    };
  }

  if (variant === "radar") {
    return {
      type: "radar",
      data: {
        labels: table.rows.map(([label]) => String(label)),
        datasets: [
          {
            backgroundColor: palette.series[0],
            borderColor: palette.series[0],
            data: table.rows.map(([, value]) => Number(value)),
            fill: false,
            label: "A3S UI",
            pointBackgroundColor: palette.series[0],
          },
        ],
      },
      options: {
        ...baseOptions,
        scales: {
          r: {
            angleLines: { color: palette.border },
            grid: { color: palette.border },
            pointLabels: { color: palette.subtle },
            suggestedMax: 100,
            suggestedMin: 0,
            ticks: { display: false },
          },
        },
      },
    };
  }

  const isLine = variant === "line" || variant === "step";
  const desktop = table.rows.map(([, value]) => Number(value));
  const mobile = table.rows.map(([, , value]) => Number(value));
  return {
    type: isLine ? "line" : "bar",
    data: {
      labels: table.rows.map(([label]) => String(label)),
      datasets: [
        {
          backgroundColor: palette.series[0],
          borderColor: palette.series[0],
          data: desktop,
          fill: false,
          label: zh ? "桌面端" : "Desktop",
          stack: variant === "stacked" ? "traffic" : undefined,
          stepped: variant === "step",
          tension: variant === "line" ? 0.35 : 0,
        },
        {
          backgroundColor: palette.series[1],
          borderColor: palette.series[1],
          data: mobile,
          fill: false,
          label: zh ? "移动端" : "Mobile",
          stack: variant === "stacked" ? "traffic" : undefined,
          tension: variant === "line" ? 0.35 : 0,
        },
      ],
    },
    options: {
      ...baseOptions,
      scales: {
        x: {
          grid: { display: false },
          stacked: variant === "stacked",
          ticks: { color: palette.subtle },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: palette.border },
          stacked: variant === "stacked",
          ticks: { color: palette.subtle },
        },
      },
    },
  };
}

export function ChartDemo({ variant = "bar" }: { variant?: ChartDemoVariant }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const descriptionId = useId();
  const language = useLang();
  const zh = language === "zh";
  const table = useMemo(() => chartTable(variant, zh), [variant, zh]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let chart: Chart | null = null;
    const render = () => {
      chart?.destroy();
      chart = new Chart(
        canvas,
        chartConfiguration(variant, readPalette(canvas), table, zh),
      );
    };

    render();
    const observer = new MutationObserver(render);
    observer.observe(document.documentElement, {
      attributeFilter: ["class", "data-style-variant", "data-theme"],
      attributes: true,
    });

    return () => {
      observer.disconnect();
      chart?.destroy();
    };
  }, [table, variant, zh]);

  return (
    <figure className="a3s-chart-demo m-0 w-full">
      <div className="chart">
        <canvas ref={canvasRef} aria-describedby={descriptionId}>
          {table.summary}
        </canvas>
      </div>
      <figcaption id={descriptionId} className="sr-only">
        {table.summary}
      </figcaption>
      <table className="sr-only">
        <caption>{table.caption}</caption>
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th key={column} scope="col">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={String(row[0])}>
              {row.map((value, index) =>
                index === 0 ? (
                  <th key={String(value)} scope="row">{value}</th>
                ) : (
                  <td key={`${row[0]}-${index}`}>{value}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
