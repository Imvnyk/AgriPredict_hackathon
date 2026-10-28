"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CaretDown,
  Check,
  CloudRain,
  Drop,
  Flask,
  Globe,
  Info,
  Leaf,
  MapPin,
  Plant,
  ShieldCheck,
  SlidersHorizontal,
  Sparkle,
  SquaresFour,
  Sun,
  Thermometer,
  Warning,
  Waves,
  Wind,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { assess } from "@/lib/api/assessment";
import { forecastSchema, type AssessmentInput } from "@/lib/api/schema";
import {
  defaultFarm,
  estimateStage,
  exampleForecast,
  farmSchema,
  locations,
  stages,
  type Farm,
} from "@/lib/farm";

type Forecast = AssessmentInput["forecast"];
type Assessment = ReturnType<typeof assess>;
type Tab = "overview" | "weather" | "risks" | "scenarios";
const names = {
  overview: "Overview",
  weather: "Weather forecast",
  risks: "Risk assessment",
  scenarios: "Scenario lab",
};
const dayName = (date: string, short = true) =>
  new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: short ? "short" : "long",
  });
async function api<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(
    url,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error?.message || "Request failed. Please try again.");
  return data.data;
}

const subscribeDate = (notify: () => void) => {
  const timer = setInterval(notify, 60000);
  return () => clearInterval(timer);
};
const currentDate = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });
const serverDate = () => "";

export default function HomePage() {
  const today = useSyncExternalStore(subscribeDate, currentDate, serverDate);
  const [farm, setFarm] = useState<Farm>(defaultFarm);
  const [draft, setDraft] = useState<Farm>(defaultFarm);
  const [forecast, setForecast] = useState<Forecast>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [tab, setTab] = useState<Tab>("overview");
  const [modal, setModal] = useState<"farm" | "sources" | null>(null);
  const [formError, setFormError] = useState("");
  const [language, setLanguage] = useState<"fr" | "ar">("fr");
  const [advice, setAdvice] = useState("");
  const [adviceError, setAdviceError] = useState("");
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [delta, setDelta] = useState(4);
  const [metric, setMetric] = useState<"temperature" | "rainfall" | "et0">(
    "temperature",
  );
  const [selected, setSelected] = useState(0);
  const adviceVersion = useRef(0);
  const location = locations[farm.location];
  useEffect(() => {
    let active = true;
    // Clear stale provider data before synchronizing a changed location or mode.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    setForecast([]);
    setAssessment(null);
    if (demo) {
      setForecast(exampleForecast(true));
      setLoading(false);
      return;
    }
    api<{ days: Forecast }>(
      `/api/weather?latitude=${farm.latitude}&longitude=${farm.longitude}`,
    )
      .then((data) => {
        if (active) setForecast(forecastSchema.parse(data.days));
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [farm.latitude, farm.longitude, demo, refresh]);
  useEffect(() => {
    let active = true;
    adviceVersion.current++;
    // Invalidate recommendations when their evidence changes before fetching new screening.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAdvice("");
    setAdviceError("");
    setAdviceLoading(false);
    setAssessment(null);
    if (!forecast.length) return;
    api<Assessment>("/api/assess", {
      crop: farm.crop,
      growthStage: farm.growthStage,
      waterAvailability: farm.waterAvailability,
      forecast,
    })
      .then((data) => {
        if (active) setAssessment(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [farm, forecast]);
  useEffect(() => {
    if (!modal) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModal(null);
    };
    document.addEventListener("keydown", close);
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLDivElement>("[role=dialog]");
    dialog?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = dialog?.querySelectorAll<HTMLElement>(
        "button, input, select, a[href]",
      );
      if (!items?.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [modal]);
  const activeDay = forecast[selected];
  const todayWeather = forecast[0];
  const hot = assessment?.heat;
  const water = assessment?.water;
  const openFarm = () => {
    setDraft(farm);
    setFormError("");
    setModal("farm");
  };
  const input = {
    crop: farm.crop,
    growthStage: farm.growthStage,
    waterAvailability: farm.waterAvailability,
    forecast,
  };
  const scenario = forecast.length
    ? assess({
        ...input,
        forecast: forecast.map((d) => ({
          ...d,
          temperatureMaxC: Math.min(65, d.temperatureMaxC + delta),
          temperatureMinC: Math.min(65, d.temperatureMinC + delta),
        })),
      })
    : null;
  async function generateAdvice() {
    const version = ++adviceVersion.current;
    setAdviceLoading(true);
    setAdviceError("");
    try {
      const result = await api<{ advice: string }>("/api/advice", {
        assessmentInput: input,
        language,
      });
      if (adviceVersion.current === version) setAdvice(result.advice);
    } catch (e) {
      if (adviceVersion.current === version)
        setAdviceError(e instanceof Error ? e.message : "Advice unavailable");
    } finally {
      if (adviceVersion.current === version) setAdviceLoading(false);
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Plant size={28} weight="fill" />
          </span>
          agri<span>predict</span>
          <span className="brand-dot" />
        </Link>
        <div className="workspace-label">Your growing companion</div>
        <button className="farm-switch" onClick={openFarm}>
          <span className="farm-icon">
            <Plant size={22} />
          </span>
          <span>
            <strong>{farm.name}</strong>
            <small>{location.name}, Morocco</small>
          </span>
          <CaretDown size={14} />
        </button>
        <div className="nav-caption">Workspace</div>
        <nav aria-label="Main navigation">
          {(
            [
              ["overview", SquaresFour],
              ["weather", Sun],
              ["risks", ShieldCheck],
              ["scenarios", Flask],
            ] as const
          ).map(([id, Icon]) => (
            <button
              key={id}
              className={`nav-item ${tab === id ? "active" : ""}`}
              onClick={() => setTab(id)}
            >
              <Icon size={21} weight={tab === id ? "fill" : "regular"} />
              <span>{names[id]}</span>
              {id === "risks" && assessment && (
                <span className="nav-count">
                  {Number(hot?.level !== "low") +
                    Number(water?.level !== "low")}
                </span>
              )}
              {id === "scenarios" && <span className="new-tag">New</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-note">
            <span className="note-sun">
              <Sun size={24} />
            </span>
            <h3>
              A little foresight.
              <br />A healthier harvest.
            </h3>
            <p>Make informed decisions, one forecast at a time.</p>
            <button onClick={() => setModal("sources")}>
              How Agripredict works <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="resource-link" onClick={() => setModal("sources")}>
            <BookOpen size={19} />
            Resources & methodology
            <ArrowUpRight size={15} />
          </button>
          <div className="farmer-profile">
            <span>F</span>
            <div>
              <strong>Farmer workspace</strong>
              <small>No account needed</small>
            </div>
            <Leaf size={18} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>{names[tab]}</strong>
          </div>
          <div className="topbar-actions">
            <span className="morocco">
              <span>🇲🇦</span> Made for Morocco
            </span>
            <button
              className="language-button"
              onClick={() => {
                adviceVersion.current++;
                setLanguage(language === "fr" ? "ar" : "fr");
                setAdvice("");
                setAdviceError("");
                setAdviceLoading(false);
              }}
            >
              <Globe size={18} />
              {language === "fr" ? "FR" : "عربي"}
              <CaretDown size={12} />
            </button>
            <button
              className="icon-button"
              aria-label="View risk alerts"
              onClick={() => setTab("risks")}
            >
              <Bell size={20} />
              {hot && hot.level !== "low" && <i />}
            </button>
            <span className="avatar">F</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="date-label">
                {today &&
                  new Date(today + "T12:00:00").toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "Africa/Casablanca",
                  })}
              </div>
              <h1>
                {tab === "overview"
                  ? "A clearer outlook for your farm."
                  : names[tab]}
              </h1>
              <p>
                {tab === "overview"
                  ? "Understand the weather. Anticipate risks. Grow with confidence."
                  : tab === "weather"
                    ? "Your next seven days, with the details that matter in the field."
                    : tab === "risks"
                      ? "Transparent screening to help you decide what to check next."
                      : "Explore what a warmer week could mean for your crop."}
              </p>
            </div>
            <button className="button secondary edit-farm" onClick={openFarm}>
              <SlidersHorizontal size={17} />
              Farm settings
            </button>
          </div>
          <section className="farm-hero">
            <div className="hero-content">
              <span className="hero-location">
                <MapPin size={15} weight="fill" />
                {location.name} · {location.region}
              </span>
              <h2>
                Your land.
                <br />
                One step ahead.
              </h2>
              <p>A local outlook for better everyday decisions.</p>
              <div className="hero-tags">
                <span>
                  <Plant size={16} />
                  {farm.crop === "wheat" ? "Wheat" : "Tomato"}
                </span>
                <span>
                  <Leaf size={16} />
                  {stages[farm.growthStage]}
                </span>
                <span>
                  <Drop size={16} />
                  {farm.waterAvailability === "limited"
                    ? "Limited water"
                    : farm.waterAvailability === "adequate"
                      ? "Water available"
                      : "Water unknown"}
                </span>
              </div>
            </div>
            <div className="hero-weather">
              <Sun size={45} weight="duotone" />
              <div>
                {todayWeather
                  ? `${Math.round(todayWeather.temperatureMaxC)}°`
                  : "—°"}
              </div>
              <span>
                {demo ? "Hypothetical daytime high" : "Today's forecast high"}
              </span>
              <small>
                {todayWeather
                  ? `${Math.round(todayWeather.temperatureMinC)}° low · ${Math.round(todayWeather.windMaxKmh)} km/h wind`
                  : "Waiting for forecast"}
              </small>
            </div>
            <span className="hero-credit">
              A little foresight goes a long way.
            </span>
          </section>
          <div className={`data-bar ${demo ? "is-demo" : ""}`}>
            <span>
              <span className={`status-dot ${demo ? "amber" : ""}`} />
              {demo
                ? "Hypothetical heatwave · synthetic data, not a real forecast"
                : loading
                  ? "Connecting to Open-Meteo…"
                  : error
                    ? "Live forecast unavailable"
                    : "Open-Meteo forecast · refreshed on request"}
            </span>
            <button onClick={() => setDemo(!demo)}>
              <Flask size={16} />
              {demo ? "Return to live forecast" : "Try heatwave demo"}
              <ArrowRight size={14} />
            </button>
          </div>
          {error && (
            <div role="alert" className="error-banner">
              <Warning size={20} />
              <span>
                {error}. Try again or explore the clearly labeled heatwave demo.
              </span>
              <button onClick={() => setRefresh((r) => r + 1)}>Retry</button>
            </div>
          )}
          {loading && (
            <div className="loading-line" role="status">
              Fetching your seven-day forecast…
            </div>
          )}
          {(tab === "overview" || tab === "risks") && (
            <section className="metrics">
              <Metric
                icon={<Thermometer size={21} />}
                label="Heat risk"
                value={hot?.level || "Pending"}
                note={
                  hot
                    ? `${hot.hotDays.length} days at or above ${hot.screeningTemperatureC}°C`
                    : "Waiting for weather data"
                }
                tone={hot?.level === "high" ? "red" : "amber"}
              />
              <Metric
                icon={<Drop size={21} />}
                label="Water pressure"
                value={water?.level || "Pending"}
                note={
                  water
                    ? "Screening, not measured soil stress"
                    : "Waiting for weather data"
                }
                tone="blue"
              />
              <Metric
                icon={<CloudRain size={21} />}
                label="Expected rainfall"
                value={water ? `${water.rainfallMm.toFixed(1)} mm` : "—"}
                note="Total over the next 7 days"
                tone="blue"
              />
              <Metric
                icon={<Waves size={21} />}
                label="Reference ET₀"
                value={water ? `${water.et0Mm.toFixed(1)} mm` : "—"}
                note="Atmospheric water demand · 7 days"
                tone="green"
              />
            </section>
          )}
          {(tab === "overview" || tab === "weather") && (
            <div className="dashboard-grid">
              <section className="panel forecast-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      Weather, at a glance{" "}
                      <span className="subtle-tag">7 days</span>
                    </h2>
                    <p>Plan your week around what’s ahead.</p>
                  </div>
                  <Sun size={22} className="muted" />
                </div>
                <div className="chart-toolbar">
                  <div className="segmented">
                    {(["temperature", "rainfall", "et0"] as const).map((m) => (
                      <button
                        key={m}
                        className={metric === m ? "selected" : ""}
                        onClick={() => setMetric(m)}
                      >
                        {m === "temperature"
                          ? "Temperature"
                          : m === "rainfall"
                            ? "Rainfall"
                            : "ET₀"}
                      </button>
                    ))}
                  </div>
                  <span className="chart-legend">
                    <i />
                    {metric === "temperature"
                      ? "Max. temperature"
                      : metric === "rainfall"
                        ? "Rainfall (mm)"
                        : "Reference ET₀ (mm)"}
                  </span>
                </div>
                <div
                  className="chart-container"
                  aria-label="Seven day forecast chart"
                >
                  {forecast.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={forecast.map((d) => ({
                          ...d,
                          name: dayName(d.date),
                        }))}
                        margin={{ top: 15, right: 12, left: -25, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="chartFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#d3ac4c"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="100%"
                              stopColor="#d3ac4c"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="4 5"
                          vertical={false}
                          stroke="#e9ebe5"
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#899087" }}
                          dy={9}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#899087" }}
                          unit={metric === "temperature" ? "°" : ""}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e3e7df",
                            fontSize: 12,
                          }}
                          formatter={(v) => [
                            `${v}${metric === "temperature" ? "°C" : " mm"}`,
                            metric === "temperature"
                              ? "Daytime high"
                              : metric === "rainfall"
                                ? "Rainfall"
                                : "ET₀",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey={
                            metric === "temperature"
                              ? "temperatureMaxC"
                              : metric === "rainfall"
                                ? "rainfallMm"
                                : "et0Mm"
                          }
                          stroke="#c7a347"
                          strokeWidth={2.5}
                          fill="url(#chartFill)"
                          dot={{ r: 3, fill: "#fff", strokeWidth: 2 }}
                          activeDot={{ r: 5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-chart">
                      {loading
                        ? "Your forecast is on its way…"
                        : "Weather will appear here once connected."}
                    </div>
                  )}
                </div>
                <div className="day-strip">
                  {forecast.map((d, i) => (
                    <button
                      key={d.date}
                      className={selected === i ? "current" : ""}
                      onClick={() => setSelected(i)}
                      aria-label={`Weather details for ${dayName(d.date, false)}`}
                    >
                      <span>{i === 0 ? "Today" : dayName(d.date)}</span>
                      {d.rainfallMm > 1 ? (
                        <CloudRain size={22} weight="duotone" />
                      ) : (
                        <Sun size={23} weight="duotone" />
                      )}
                      <strong>
                        {Math.round(d.temperatureMaxC)}°{" "}
                        <small>{Math.round(d.temperatureMinC)}°</small>
                      </strong>
                      <span className="rain-value">
                        <Drop size={11} />
                        {d.rainfallMm} mm
                      </span>
                    </button>
                  ))}
                </div>
                <div className="forecast-foot">
                  <Wind size={15} />
                  {activeDay
                    ? `${dayName(activeDay.date)}: wind ${activeDay.windMaxKmh} km/h · humidity ${activeDay.humidityMeanPercent}% · ET₀ ${activeDay.et0Mm} mm`
                    : "Daily details will appear here"}
                </div>
              </section>
              <section className="panel recommendations">
                <div className="panel-heading">
                  <div>
                    <div className="ai-label">
                      <Sparkle size={16} weight="fill" />
                      Your field companion
                    </div>
                    <h2>
                      A little guidance.
                      <br />A better next step.
                    </h2>
                  </div>
                  <span className="gemma-badge">Gemma 4</span>
                </div>
                <p className="advice-intro">
                  Turn the forecast into practical, evidence-grounded advice for
                  your crop.
                </p>
                <div className="guidance-item">
                  <span>
                    <Leaf size={18} />
                  </span>
                  <div>
                    <strong>Start with your field</strong>
                    <p>
                      Check leaves and soil moisture. A forecast can flag
                      conditions, but cannot measure crop stress.
                    </p>
                  </div>
                </div>
                <div className="guidance-item">
                  <span>
                    <Drop size={18} />
                  </span>
                  <div>
                    <strong>Make water decisions locally</strong>
                    <p>
                      Review water availability with a local adviser before
                      changing irrigation.
                    </p>
                  </div>
                </div>
                {advice && (
                  <div
                    className="generated-advice"
                    dir={language === "ar" ? "rtl" : "ltr"}
                    lang={language}
                  >
                    {advice}
                    <small>
                      {demo
                        ? "Based on the hypothetical heatwave scenario."
                        : "Based on your current forecast and risk screening."}{" "}
                      AI-generated; verify locally.
                    </small>
                  </div>
                )}
                {adviceError && (
                  <div role="alert" className="advice-error">
                    {adviceError}
                  </div>
                )}
                <button
                  className="button primary advice-button"
                  disabled={!assessment || adviceLoading}
                  onClick={generateAdvice}
                >
                  <Sparkle size={18} />
                  {adviceLoading
                    ? "Preparing your advice…"
                    : language === "ar"
                      ? "احصل على نصائح بالعربية"
                      : "Obtenir mes conseils en français"}
                  <ArrowRight size={16} />
                </button>
                <div className="advice-disclaimer">
                  <ShieldCheck size={13} />
                  Decision support, informed by evidence.
                </div>
              </section>
            </div>
          )}
          {(tab === "overview" || tab === "risks") && (
            <section className="panel risk-panel">
              <div className="panel-heading">
                <div>
                  <h2>Ahead of the risks</h2>
                  <p>Early signals. Clear explanations. No guesswork.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setModal("sources")}
                >
                  View methodology
                  <ArrowUpRight size={15} />
                </button>
              </div>
              <div className="risk-content">
                <div className="risk-alert">
                  <span className="risk-alert-icon">
                    <Thermometer size={23} />
                  </span>
                  <div>
                    <div className="risk-title">
                      <h3>
                        {hot
                          ? hot.hotDays.length
                            ? "Warmer days need a closer look"
                            : "No heat signal in this forecast"
                          : "Your heat screening is pending"}
                      </h3>
                      <span className="risk-pill">
                        {hot?.level || "Pending"}
                      </span>
                    </div>
                    <p>
                      {hot
                        ? `${hot.hotDays.length} forecast days reach the ${hot.screeningTemperatureC}°C ${farm.crop} screening temperature. Variety, growth stage and exposure duration affect sensitivity.`
                        : "Connect to live weather or try the hypothetical heatwave demo."}
                    </p>
                    <small>
                      <Info size={13} />A screening signal, not a prediction of
                      damage or crop loss.
                    </small>
                  </div>
                </div>
                <div className="water-alert">
                  <div>
                    <Drop size={19} />
                    <h3>Keep an eye on water availability</h3>
                  </div>
                  <p>
                    {water
                      ? `Approximate crop demand (${water.estimatedEtcMm} mm) ${water.demandExceedsRain ? "exceeds" : "does not exceed"} gross forecast rainfall (${water.rainfallMm} mm).`
                      : "Water screening will appear with your forecast."}{" "}
                    Soil storage, runoff and irrigation are unknown.
                  </p>
                  <span>This is not an irrigation quantity or schedule.</span>
                </div>
              </div>
            </section>
          )}
          {(tab === "overview" || tab === "scenarios") && (
            <section
              className={`scenario-section ${tab === "scenarios" ? "expanded" : ""}`}
            >
              <div className="scenario-icon">
                <Flask size={27} />
              </div>
              <div>
                <span className="scenario-eyebrow">
                  A safe space for “what if”
                </span>
                <h2>Different conditions. Better prepared.</h2>
                <p>
                  Compare your current outlook with a hypothetical warmer week.
                </p>
              </div>
              {tab === "overview" ? (
                <button
                  className="button secondary"
                  onClick={() => setTab("scenarios")}
                >
                  Explore scenario lab
                  <ArrowUpRight size={17} />
                </button>
              ) : (
                <div className="scenario-controls">
                  <label>
                    Hypothetical warming <strong>+{delta}°C</strong>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={delta}
                      onChange={(e) => setDelta(Number(e.target.value))}
                    />
                  </label>
                  <div className="comparison-grid">
                    <div>
                      <span>
                        {demo ? "Heatwave demo baseline" : "Current forecast"}
                      </span>
                      <strong>{hot?.maxTemperatureC ?? "—"}°C</strong>
                      <p>
                        {hot?.hotDays.length ?? "—"} heat-screen days ·{" "}
                        {hot?.level ?? "pending"}
                      </p>
                    </div>
                    <div>
                      <span>Hypothetical +{delta}°C</span>
                      <strong>{scenario?.heat.maxTemperatureC ?? "—"}°C</strong>
                      <p>
                        {scenario?.heat.hotDays.length ?? "—"} heat-screen days
                        · {scenario?.heat.level ?? "pending"}
                      </p>
                    </div>
                  </div>
                  <p className="scenario-caveat">
                    Only temperature changes. Rainfall, wind and ET₀ stay fixed
                    to isolate the heat signal. This is a sensitivity test, not
                    a weather or crop-loss prediction.
                  </p>
                </div>
              )}
            </section>
          )}
          <footer>
            <span>
              <Plant size={15} />
              Rooted in science. Built for your field.
            </span>
            <div>
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
              >
                Weather by Open-Meteo
              </a>
              <span>·</span>
              <button onClick={() => setModal("sources")}>
                Sources & limitations
              </button>
            </div>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {(
          [
            ["overview", SquaresFour],
            ["weather", Sun],
            ["risks", ShieldCheck],
            ["scenarios", Flask],
          ] as const
        ).map(([id, Icon]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            <Icon size={22} />
            <span>
              {id === "weather"
                ? "Weather"
                : id === "risks"
                  ? "Risks"
                  : id === "scenarios"
                    ? "Scenarios"
                    : "Overview"}
            </span>
          </button>
        ))}
      </nav>
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            tabIndex={-1}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={22} />
            </button>
            {modal === "farm" ? (
              <>
                <div className="modal-symbol">
                  <Plant size={28} />
                </div>
                <h2 id="dialog-title">Let’s get to know your farm.</h2>
                <p>
                  A few details make your outlook more relevant. Stored in
                  memory for this session only.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const result = farmSchema.safeParse(draft);
                    if (!result.success) {
                      setFormError(result.error.issues[0].message);
                      return;
                    }
                    setFarm(result.data);
                    setModal(null);
                  }}
                >
                  <label>
                    Farm name
                    <input
                      required
                      maxLength={60}
                      value={draft.name}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Nearest location
                    <select
                      value={draft.location}
                      onChange={(e) => {
                        const l = locations[Number(e.target.value)];
                        setDraft({
                          ...draft,
                          location: Number(e.target.value),
                          latitude: l.latitude,
                          longitude: l.longitude,
                        });
                      }}
                    >
                      {locations.map((l, i) => (
                        <option value={i} key={l.name}>
                          {l.name} · {l.region}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-row">
                    <label>
                      Latitude
                      <input
                        type="number"
                        required
                        step="any"
                        min="20"
                        max="37"
                        value={
                          Number.isFinite(draft.latitude) ? draft.latitude : ""
                        }
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            latitude: e.target.valueAsNumber,
                          })
                        }
                      />
                    </label>
                    <label>
                      Longitude
                      <input
                        type="number"
                        required
                        step="any"
                        min="-18"
                        max="0"
                        value={
                          Number.isFinite(draft.longitude)
                            ? draft.longitude
                            : ""
                        }
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            longitude: e.target.valueAsNumber,
                          })
                        }
                      />
                    </label>
                  </div>
                  <small className="form-help">
                    Use your field coordinates for a closer forecast; the city
                    is a starting point.
                  </small>
                  <div className="form-row">
                    <label>
                      Crop
                      <select
                        value={draft.crop}
                        onChange={(e) => {
                          const crop = e.target.value as Farm["crop"];
                          setDraft({
                            ...draft,
                            crop,
                            growthStage: draft.plantingDate
                              ? estimateStage(crop, draft.plantingDate)
                              : draft.growthStage,
                          });
                        }}
                      >
                        <option value="wheat">Wheat</option>
                        <option value="tomato">Tomato</option>
                      </select>
                    </label>
                    <label>
                      Planting date (optional)
                      <input
                        type="date"
                        value={draft.plantingDate}
                        max={
                          today
                            ? new Date(today + "T12:00:00").toLocaleDateString(
                                "en-CA",
                                {
                                  timeZone: "Africa/Casablanca",
                                },
                              )
                            : undefined
                        }
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            plantingDate: e.target.value,
                            growthStage: e.target.value
                              ? estimateStage(draft.crop, e.target.value)
                              : draft.growthStage,
                          })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Growth stage · correct the estimate if needed
                    <select
                      value={draft.growthStage}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          growthStage: e.target.value as Farm["growthStage"],
                        })
                      }
                    >
                      {Object.entries(stages).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <small className="form-help">
                    {draft.plantingDate
                      ? "Approximate calendar estimate using FAO-56 Table 11. Local varieties and weather change development; confirm in your field."
                      : "No date? Select the stage you observe in the field."}
                  </small>
                  <label>
                    Water availability
                    <select
                      value={draft.waterAvailability}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          waterAvailability: e.target
                            .value as Farm["waterAvailability"],
                        })
                      }
                    >
                      <option value="limited">Limited or unreliable</option>
                      <option value="adequate">Adequate water available</option>
                      <option value="unknown">Not sure yet</option>
                    </select>
                  </label>
                  {formError && (
                    <p role="alert" className="advice-error">
                      {formError}
                    </p>
                  )}
                  <button type="submit" className="button primary">
                    <Check size={18} />
                    Save my farm
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="modal-symbol">
                  <BookOpen size={28} />
                </div>
                <h2 id="dialog-title">Science, with its limits.</h2>
                <p>
                  Agripredict screens forecast conditions. It does not diagnose
                  damage, predict yield loss, or prescribe irrigation.
                </p>
                <h3>How screening works</h3>
                <p>
                  Heat flags daily maxima at or above 30°C for wheat and 35°C
                  for tomato. These source-informed screening points are not
                  universal damage thresholds. One or two days give a moderate
                  flag; three days, or two at mid-season, give a high flag.
                  These categories are product heuristics, not validated
                  probabilities.
                </p>
                <p>
                  Approximate crop demand = ET₀ × standard FAO Kc. Development
                  and late-season Kc use midpoint approximations. Comparing this
                  to gross rainfall ignores effective rainfall, soil storage and
                  irrigation. “High” water pressure means reported limited water
                  plus demand above rain; “moderate” means demand above rain
                  with reported adequate water. Unknown water remains unknown. A
                  low flag does not establish safe conditions.
                </p>
                <h3>Sources you can check</h3>
                <a
                  href="https://open-meteo.com/en/docs"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open-Meteo · forecast variables and uncertainty{" "}
                  <ArrowUpRight size={14} />
                </a>
                <a
                  href="https://www.fao.org/4/x0490e/x0490e0b.htm"
                  target="_blank"
                  rel="noreferrer"
                >
                  FAO-56 · Tables 11–12, stages and crop coefficients{" "}
                  <ArrowUpRight size={14} />
                </a>
                <a
                  href="https://www.fao.org/4/X8234E/x8234e09.htm"
                  target="_blank"
                  rel="noreferrer"
                >
                  FAO · wheat development and temperature{" "}
                  <ArrowUpRight size={14} />
                </a>
                <a
                  href="https://www.fao.org/3/i6787e/i6787e.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  FAO · greenhouse vegetables, tomato heat sensitivity{" "}
                  <ArrowUpRight size={14} />
                </a>
                <p className="source-note">
                  Forecasts represent a model grid, not measurements at your
                  farm. Field observations and advice from local agricultural
                  services remain essential. Wind and humidity are shown as
                  context; no unsupported risk thresholds are applied.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-label">
        {label}
        <span>{icon}</span>
      </div>
      <div
        className={`metric-value ${["high", "moderate", "low", "unknown", "Pending"].includes(value) ? "capitalize" : ""}`}
      >
        {value}
        {["high", "moderate", "low", "unknown"].includes(value) && (
          <span className="mini-status" />
        )}
      </div>
      <p>{note}</p>
    </div>
  );
}
