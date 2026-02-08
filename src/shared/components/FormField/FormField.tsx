import type { InputFieldProps, SelectFieldProps, TextareaFieldProps, FormRowProps } from '../../types/component.types';

export function InputField({
  label,
  error,
  required,
  helpText,
  id,
  ...props
}: InputFieldProps) {
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <div className={`form-field ${error ? 'has-error' : ''}`}>
      <label htmlFor={fieldId}>
        {label}
        {required && <span className="required">*</span>}
      </label>
      <input id={fieldId} {...props} />
      {helpText && <span className="help-text">{helpText}</span>}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

export function SelectField({
  label,
  error,
  required,
  helpText,
  options,
  placeholder,
  id,
  ...props
}: SelectFieldProps) {
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <div className={`form-field ${error ? 'has-error' : ''}`}>
      <label htmlFor={fieldId}>
        {label}
        {required && <span className="required">*</span>}
      </label>
      <select id={fieldId} {...props}>
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helpText && <span className="help-text">{helpText}</span>}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

export function TextareaField({
  label,
  error,
  required,
  helpText,
  rows = 4,
  id,
  ...props
}: TextareaFieldProps) {
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <div className={`form-field ${error ? 'has-error' : ''}`}>
      <label htmlFor={fieldId}>
        {label}
        {required && <span className="required">*</span>}
      </label>
      <textarea id={fieldId} rows={rows} {...props} />
      {helpText && <span className="help-text">{helpText}</span>}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

export function FormRow({ children }: FormRowProps) {
  return <div className="form-row">{children}</div>;
}
