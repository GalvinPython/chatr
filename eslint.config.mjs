// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
// @ts-expect-error no declaration file
import nextjsConfig from "eslint-config-neon/flat/next.js";

export default tseslint.config(
	{
		ignores: ["web/.next"],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.stylistic,
	{
		files: ["apps/web/**/*.{ts,tsx,js,jsx}"],
		...nextjsConfig[0],
		rules: {
			...nextjsConfig[0].rules,
			"@next/next/no-duplicate-head": 0,
		},
	},
);
