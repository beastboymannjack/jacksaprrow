# Secondary Replit Bot Hosting Server

This is a standalone server that runs on your secondary Replit to host Discord bots remotely.

## Setup Instructions

1. **Create a new Node.js Replit**
   - Go to replit.com and create a new Replit
   - Choose "Node.js" as the template

2. **Copy files to your secondary Replit**
   - Copy `index.js` to your secondary Replit
   - Copy `package.json` to your secondary Replit

3. **Set up the environment variable**
   - Go to the "Secrets" tab in your secondary Replit
   - Add a secret: `REMOTE_LOG_API_KEY` = (use the same key as your main Replit)
   - You can find your key in the main Replit's Secrets tab

4. **Run the server**
   - Click the "Run" button
   - The server will start on port 5000
   - You should see: "Ready to receive bot deployments!"

5. **Update your main Replit**
   - In your main Replit, update the `REMOTE_LOG_URL` environment variable
   - Set it to your secondary Replit's URL (e.g., `https://your-replit-name.your-username.repl.co`)
   - Make sure there's no trailing slash after the URL

## API Endpoints

- `GET /` - Server info and available endpoints
- `GET /api/health` - Health check
- `POST /api/deploy-bot` - Deploy a new bot (requires API key)
- `GET /api/bots` - List all bots (requires API key)
- `POST /api/bots/:botKey/start` - Start a bot (requires API key)
- `POST /api/bots/:botKey/stop` - Stop a bot (requires API key)
- `POST /api/bots/:botKey/restart` - Restart a bot (requires API key)
- `DELETE /api/bots/:botKey` - Delete a bot (requires API key)

## Testing

You can test if the server is running by visiting the root URL in your browser. You should see:
```json
{
  "name": "Secondary Replit Bot Hosting Server",
  "status": "running",
  ...
}
```
