interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
  variant?: "default" | "pill";
}

export function Tabs({ tabs, activeTab, onChange, variant = "default" }: TabsProps) {
  return (
    <div className={`tabs tabs--${variant}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`tabs__tab${activeTab === tab.key ? " tabs__tab--active" : ""}`}
          onClick={() => onChange(tab.key)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
