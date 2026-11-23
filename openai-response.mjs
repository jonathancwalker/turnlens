export async function requestOpenAIText({ apiKey, signal, ...options }) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is required.');
  let response;
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...options, store: false }),
    });
  } catch {
    throw new Error(signal?.aborted ? 'OpenAI request timed out or was canceled.' : 'OpenAI connection failed.');
  }
  if (!response.ok) throw new Error(`OpenAI returned HTTP ${response.status}.`);
  const result = await response.json();
  const parts = result.output?.flatMap(item => item.type === 'message' ? item.content : []) ?? [];
  const text = parts.filter(part => part.type === 'output_text').map(part => part.text).join('');
  if (result.status !== 'completed' || !text.trim() || parts.some(part => part.type === 'refusal')) {
    throw new Error('OpenAI did not return a completed text response.');
  }
  return { text, model: result.model };
}
