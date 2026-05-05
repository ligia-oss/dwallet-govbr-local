import { appRouter } from './server/routers.ts';

const ctx = {
  req: {},
  res: { clearCookie: () => undefined },
  user: null,
};

const runId = String(Date.now()).slice(-10);
const caller = appRouter.createCaller(ctx);
const evidence = await caller.dataprev.executeAction({
  actionId: 'step2_person_signup',
  state: {
    runId,
    personEmail: `dataprev.pd.recheck.${runId}@example.com`,
  },
});

console.log(JSON.stringify(evidence, null, 2));
