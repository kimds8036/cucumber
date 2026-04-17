export async function sendBatchFailureAlert({ jobName, error, meta = {} }) {
  const webhookUrl = process.env.BATCH_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const payload = {
    level: 'error',
    service: 'batch-job',
    jobName,
    message: error?.message || 'unknown error',
    meta,
    at: new Date().toISOString(),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[BatchAlert] webhook 실패 job=${jobName} status=${response.status}`
      );
    }
  } catch (alertError) {
    console.error(
      `[BatchAlert] webhook 예외 job=${jobName} error=${alertError.message}`
    );
  }
}
