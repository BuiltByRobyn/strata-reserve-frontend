import { useMediaQuery } from '../hooks/useMediaQuery';
import { MobileDropdown } from './MobileDropdown';
import type { TabsProps } from '../types/component.types';

export function Tabs({ tabs, activeTab, onChange, variant = "default" }: TabsProps) {
  const isDesktop = useMediaQuery('(min-width: 750px)');

  if (!isDesktop) {
    return (
      <MobileDropdown
        label="Categories"
        value={activeTab}
        options={tabs.map(t => ({ key: t.key, label: t.label }))}
        onChange={onChange}
      />
    );
  }

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
