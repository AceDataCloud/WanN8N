const { test } = require('node:test');
const assert = require('node:assert/strict');
const { WanVideo, videoBody, taskResult } = require('../dist/nodes/WanVideo/WanVideo.node.js');
const { AceDataWanVideoApi } = require('../dist/credentials/AceDataWanVideoApi.credentials.js');

const base = {
  resource: 'video', operation: 'create', model: 'wan2.6-t2v',
  prompt: 'A paper sphere rolls across a tabletop', imageUrl: '', referenceVideoUrls: '',
  resolution: '720P', duration: 5, audio: false,
};
function body(parameters) { return videoBody(name => parameters[name] ?? ''); }
function context(parameters, responses = [], continueOnFail = false, credentials = { apiToken: 'test-token' }) {
  const calls = [];
  let next = 0;
  return {
    calls,
    getInputData: () => parameters.map(() => ({ json: {} })),
    getNode: () => ({ name: 'Wan Video', type: '@acedatacloud/n8n-nodes-wan-video.wanVideo', typeVersion: 1, position: [0, 0], parameters: {} }),
    getNodeParameter: (name, index, fallback) => parameters[index][name] ?? fallback,
    getCredentials: async () => credentials,
    continueOnFail: () => continueOnFail,
    helpers: { httpRequestWithAuthentication: async (credential, options) => {
      calls.push({ credential, ...options });
      const response = responses[next++];
      if (response instanceof Error) throw response;
      return response;
    } },
  };
}

const node = new WanVideo();
test('one input submits one asynchronous video task with no retry', async () => {
  const ctx = context([base], [{ task_id: 'video-1', trace_id: 'trace-1', success: true }]);
  const [items] = await node.execute.call(ctx);
  assert.equal(ctx.calls.length, 1);
  assert.equal(ctx.calls[0].credential, 'aceDataWanVideoApi');
  assert.equal(ctx.calls[0].url, 'https://api.acedata.cloud/wan/videos');
  assert.equal(ctx.calls[0].method, 'POST');
  assert.equal(ctx.calls[0].disableFollowRedirect, true);
  assert.deepEqual(ctx.calls[0].body, {
    model: base.model, action: 'text2video', prompt: base.prompt,
    resolution: '720P', duration: 5, audio: false, async: true,
  });
  assert.deepEqual(items[0], {
    json: { taskId: 'video-1', status: 'submitted', finished: false, successful: null, traceId: 'trace-1' },
    pairedItem: { item: 0 },
  });
});

test('invalid model and image combinations stop before a paid request', async () => {
  const bad = [
    { ...base, model: 'other' },
    { ...base, model: 'wan2.6-i2v', imageUrl: '' },
    { ...base, model: 'wan2.6-r2v', referenceVideoUrls: '' },
    { ...base, prompt: '' },
    { ...base, imageUrl: 'http://example.com/image.jpg' },
    { ...base, model: 'wan2.6-i2v', imageUrl: 'https://user:secret@example.com/image.jpg' },
    { ...base, referenceVideoUrls: 'https://example.com/reference.mp4' },
    { ...base, resolution: '8k' }, { ...base, duration: 6 },
    { ...base, audio: 'yes' },
  ];
  for (const parameters of bad) {
    const ctx = context([parameters]);
    await assert.rejects(node.execute.call(ctx));
    assert.equal(ctx.calls.length, 0);
  }
});

test('image and reference-video models send only their documented inputs', () => {
  const image = body({ ...base, model: 'wan2.6-i2v', imageUrl: 'https://example.com/a.jpg' });
  assert.equal(image.action, 'image2video');
  assert.equal(image.image_url, 'https://example.com/a.jpg');
  const reference = body({ ...base, model: 'wan2.6-r2v', referenceVideoUrls: 'https://example.com/reference.mp4' });
  assert.equal(reference.action, 'image2video');
  assert.deepEqual(reference.reference_video_urls, ['https://example.com/reference.mp4']);
});

test('Get queries the original task and exposes only completed media', async () => {
  const task = { id: 'video-1', finished_at: '2026-10-11T00:00:00Z',
    request: { prompt: 'private' }, credential_id: 'private',
    response: { success: true, trace_id: 'trace-1', data: [{ state: 'succeeded', video_url: 'https://example.com/video.mp4', supplier: 'private' }] } };
  const ctx = context([{ resource: 'task', operation: 'get', taskId: 'video-1' }], [task]);
  const [items] = await node.execute.call(ctx);
  assert.deepEqual(ctx.calls[0].body, { action: 'retrieve', id: 'video-1' });
  assert.equal(items[0].json.status, 'succeeded');
  assert.deepEqual(items[0].json.videoUrls, ['https://example.com/video.mp4']);
  assert.equal(items[0].json.data[0].supplier, undefined);
  assert.equal(items[0].json.taskId, 'video-1');
});

test('documented Wan task response returns the completed video URL', async () => {
  const task = {
    id: 'wan-task', finished_at: 1769263509.094,
    request: { prompt: 'private input' }, credential_id: 'private',
    response: { success: true, state: 'completed', task_id: 'wan-task', video_url: 'https://example.com/final.mp4' },
  };
  const ctx = context([{ resource: 'task', operation: 'get', taskId: 'wan-task' }], [task]);
  const [items] = await node.execute.call(ctx);
  assert.equal(items[0].json.status, 'succeeded');
  assert.deepEqual(items[0].json.videoUrls, ['https://example.com/final.mp4']);
  assert.equal(items[0].json.data.video_url, 'https://example.com/final.mp4');
  assert.equal(JSON.stringify(items[0].json).includes('private'), false);
});

test('pending is not complete; failed task does not expose media', () => {
  const pending = taskResult({ id: 'video-1', finished_at: null, response: { success: true, data: [{ state: 'pending' }] } });
  assert.equal(pending.status, 'processing');
  assert.equal(pending.finished, false);
  assert.deepEqual(pending.videoUrls, []);
  const failed = taskResult({ id: 'video-2', finished_at: 'now', response: { success: false, data: [{ state: 'failed', video_url: 'https://example.com/bad.mp4' }] } });
  assert.equal(failed.status, 'failed');
  assert.deepEqual(failed.videoUrls, []);
});

test('Get Many uses the task query endpoint without generation', async () => {
  const ctx = context([{ resource: 'task', operation: 'getMany', taskIds: 'video-1,video-2' }], [
    { items: [{ id: 'video-1', finished_at: null }, { id: 'video-2', finished_at: null }] },
  ]);
  const [items] = await node.execute.call(ctx);
  assert.equal(ctx.calls.length, 1);
  assert.equal(ctx.calls[0].url, 'https://api.acedata.cloud/wan/tasks');
  assert.deepEqual(ctx.calls[0].body, { action: 'retrieve_batch', ids: ['video-1', 'video-2'] });
  assert.equal(items.length, 2);
});

test('uncertain transport failure never retries generation', async () => {
  const ctx = context([base, base], [new Error('connection lost'), { task_id: 'video-2' }], true);
  const [items] = await node.execute.call(ctx);
  assert.equal(ctx.calls.length, 2);
  assert.match(items[0].json.error, /request history/i);
  assert.equal(items[1].json.taskId, 'video-2');
});

test('credential is masked and tested on free metadata route', async () => {
  const credential = new AceDataWanVideoApi();
  assert.equal(credential.properties[0].typeOptions.password, true);
  assert.match(credential.authenticate.properties.headers.Authorization, /Bearer/);
  assert.equal(credential.test.request.url, '/openai/models');
  const ctx = context([base], [], false, { apiToken: '' });
  await assert.rejects(node.execute.call(ctx), /credential is required/i);
  assert.equal(ctx.calls.length, 0);
});
