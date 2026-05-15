import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { dataprevRouter } from "./dataprev";
import { btgRouter } from "./btg";

export const appRouter = router({
  diagnostics: router({
    egressIp: publicProcedure.query(async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
        const data = await res.json() as { ip: string };
        return { ip: data.ip, note: 'Este é o IP de saída do servidor. Use-o para configurar a allowlist da API Dataprev/DrumWave.' };
      } catch {
        return { ip: null, note: 'Não foi possível determinar o IP de saída.' };
      }
    }),
  }),
  system: systemRouter,
  dataprev: dataprevRouter,
  btg: btgRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
