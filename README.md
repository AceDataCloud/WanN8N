# Wan Video for n8n: first video

Create one Wan video, then query its task until the video is ready. This community package connects only the Wan Video service through Ace Data Cloud. The screenshots show a real self-hosted n8n 2.42.3 instance in English. n8n Creator Portal verification is pending.

**Package:** `@acedatacloud/n8n-nodes-wan-video` · [Wan Video API and pricing](https://platform.acedata.cloud/documents/wan-videos) · [Source](https://github.com/AceDataCloud/WanN8N)

## Quick start

### 1. Install the node

In self-hosted n8n, sign in as an owner or admin. Open **Settings → Community nodes → Install**, enter `@acedatacloud/n8n-nodes-wan-video`, check that the author is **Ace Data Cloud**, accept the installation notice and select **Install**. Your server needs HTTPS access to npm and `api.acedata.cloud`. See [n8n's installation guide](https://docs.n8n.io/integrations/community-nodes/installation-and-management/gui-installation/) for prerequisites. n8n Cloud shows a community node in its picker only after verification.

![Wan Video in the local n8n node picker](https://raw.githubusercontent.com/AceDataCloud/WanN8N/main/_assets/tutorial/01-node-picker.png)

### 2. Get an API key with Wan access

1. Sign in at [Ace Data Cloud → Applications](https://platform.acedata.cloud/console/applications).
2. Open **General application** and copy its API key, or choose **Manage Keys → Create** for a separate n8n key.
3. Check Wan access, current price for **Wan 2.6 Text to Video** at 720P for 5 seconds, and your balance. If you enable **Allowed APIs**, include `/wan/videos` and `/wan/tasks`. The optional n8n credential test also uses the read-only `/openai/models` metadata route.

![Copy a key or open Manage Keys](https://raw.githubusercontent.com/AceDataCloud/WanDify/04bcfeea981b4f5b4a3178d0119f94383c98b2fc/_assets/tutorial/get-api-key-en.png)

![Create a separate key](https://raw.githubusercontent.com/AceDataCloud/WanDify/04bcfeea981b4f5b4a3178d0119f94383c98b2fc/_assets/tutorial/create-api-key-en.png)

Copy only the application token. Do not add `Bearer ` or quotation marks, and do not use a platform management token. Keep the token out of workflow exports and screenshots.

### 3. Save the credential in n8n

Add **Wan Video by Ace Data Cloud** to a workflow. In **Credential**, choose **Connect to Wan Video by Ace Data Cloud** and create a new credential. Paste the token into **API Token**. Set **Allowed HTTP Request Domains** to **Specific Domains → `api.acedata.cloud`** and save. Select the same credential on **Create** and **Get Task**.

The credential test checks the token through the read-only `/openai/models` route. If your key restricts API paths, allow that route for the test or check access through the first Wan task query; a successful metadata test alone does not prove Wan access.

![Wan Video credential form in n8n](https://raw.githubusercontent.com/AceDataCloud/WanN8N/main/_assets/tutorial/02-credential.png)

### 4. Import and run the smallest workflow

[Download the credential-free quickstart](https://github.com/AceDataCloud/WanN8N/raw/refs/heads/main/examples/quickstart.json). In a new n8n workflow, choose **⋯ → Import → From file** and assign your credential to both Wan Video nodes. The path is **Start → Create → Wait 30 Seconds → Get Task**.

![Imported Wan Video workflow in n8n 2.42.3](https://raw.githubusercontent.com/AceDataCloud/WanN8N/main/_assets/tutorial/03-workflow.png)

| Create field | First-run value |
| --- | --- |
| Resource / Operation | Video / Create |
| Model | Wan 2.6 Text to Video (`wan2.6-t2v`) |
| Prompt | `A red paper kite floating above a green meadow, steady camera, no text. n8n validation.` |
| Image URL / Reference Video URLs | Empty |
| Resolution / Duration / Audio | 720P / 5 seconds / Off |

Check the current price and balance before running. Keep **Retry On Fail** off and select **Execute workflow** once. Create submits `action=text2video` with `async=true`, then returns `taskId` and `status=submitted`. Submission is not a completed video. **Get Task** uses the expression from **Create → taskId**, so it queries the same task after the wait.

![Wan Video creation settings](https://raw.githubusercontent.com/AceDataCloud/WanN8N/main/_assets/tutorial/04-configure.png)

### 5. Confirm the result and charge

Open **Get Task** output. A completed video has `status=succeeded`, `finished=true`, `successful=true`, and a link in `videoUrls`. Open the returned link. If the task is still processing, **do not rerun the full workflow**: that would submit another paid video. Import the [query-only workflow](https://github.com/AceDataCloud/WanN8N/raw/refs/heads/main/examples/query-existing-task.json), replace its placeholder with the original task ID and execute it again later. The [bounded polling workflow](https://github.com/AceDataCloud/WanN8N/raw/refs/heads/main/examples/generate-and-wait.json) queries that same ID every 15 seconds for at most 30 minutes; it never resubmits Create.

Compare the task's trace ID and time with [Ace Data Cloud usage history](https://platform.acedata.cloud/console). Any `cost.amount` is in **Credits**, not USD. Price varies by model, resolution, duration, audio option and your account package. A previously completed Dify example used **Wan 3.0**, a different model from this quickstart; it is not an n8n call or evidence that this Wan 2.6 workflow completed. A credentialed n8n result and matching bill have not yet been verified for this release.

## Other options and troubleshooting

**Wan 2.6 Image to Video** and **Image to Video Flash** need one public HTTPS first-frame image. **Wan 2.6 Reference Video** needs one or two public HTTPS reference videos. The node validates model, input, duration and resolution before generation. **Task → Get Many** queries up to 50 existing task IDs without creating a video. Wan 3.0, additional generation controls and other Wan endpoints are not part of this first release; the previously tested Dify Wan 3.0 result must not be used as validation for these Wan 2.6 options.

| What you see | What to check |
| --- | --- |
| 401 or 403 | Check the application token, expiry, Wan access, balance and Allowed APIs for both Wan endpoints. |
| 400 | Check the model, HTTPS media inputs, duration and resolution; try the documented text-to-video fields first. |
| submitted or processing | Query the original task ID. Do not rerun Create to poll. |
| 429 | Reduce concurrency and keep automatic retries off. |
| Timeout or 5xx | Inspect the original task and usage history before submitting again; the first request may have been accepted. |
| Video link fails | Wait for terminal success, then open the returned URL directly. |

Each input item can create one paid task. The node never automatically retries or follows HTTP redirects, and task output omits known credential, request and internal routing fields. Process only media you are authorized to use. [Privacy](https://github.com/AceDataCloud/WanN8N/blob/main/PRIVACY.md) · [Report an issue](https://github.com/AceDataCloud/WanN8N/issues) · dev@acedata.cloud
