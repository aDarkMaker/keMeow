/** @type {import("@commitlint/types").UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "perf", "refactor", "docs", "test", "build", "ci", "chore", "revert"],
    ],
    "scope-enum": [2, "always", ["web", "api", "game-core", "ui", "repo"]],
    "scope-empty": [2, "never"],
    "subject-case": [2, "always", ["lower-case"]],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 72],
    "body-max-line-length": [2, "always", 100],
  },
};
