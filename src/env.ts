import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    GOOGLE_API_KEY: z.string().trim().min(1).optional(),
  },
  runtimeEnv: {
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  },
  emptyStringAsUndefined: true,
});
