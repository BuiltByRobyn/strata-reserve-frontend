import type { TabsProps } from '../types/component.types';

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
