const runId = String(Date.now()).slice(-10);
const payload = {
  0: {
    json: {
      actionId: 'step2_person_signup',
      state: {
        runId,
        personEmail: `dataprev.pd.published.recheck.${runId}@example.com`,
      },
    },
  },
};

const response = await fetch('https://dwalletgovbr-mmipedog.manus.space/api/trpc/dataprev.executeAction?batch=1', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
});

const text = await response.text();
console.log(JSON.stringify({ transportStatus: response.status, transportOk: response.ok, body: text }, null, 2));
