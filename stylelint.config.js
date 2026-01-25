module.exports = {
  // Use the SCSS parser
  customSyntax: "postcss-scss",

  // Recommended rules for general CSS + SCSS
  extends: [
    "stylelint-config-standard", // Standard rules
    "stylelint-config-recommended-scss", // SCSS-specific rules
  ],

  // Add extra plugins if needed
  plugins: ["stylelint-scss"],

  // Your custom rules
  rules: {
    // Example: allow hex colors in lowercase only
    "color-hex-case": "lower",

    // Example: enforce 2-space indentation
    indentation: 2,

    // Example: disallow trailing whitespace
    "no-eol-whitespace": true,

    // Example: SCSS variables must start with $
    "scss/dollar-variable-pattern": "^\\$[a-z0-9\\-]+$",

    // Example: max nesting depth
    "max-nesting-depth": 3,
  },

  // Ignore files if needed
  ignoreFiles: ["**/node_modules/**", "dist/**"],
};
