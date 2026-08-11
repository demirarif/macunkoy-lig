import next from "eslint-config-next";

/**
 * eslint-config-next 16 doğrudan flat config dizisi veriyor;
 * FlatCompat köprüsüne artık gerek yok.
 */
const config = [
  ...next,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      ".data/**",
      "next-env.d.ts",
    ],
  },
];

export default config;
