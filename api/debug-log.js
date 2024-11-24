import fs from 'fs';
import path from 'path';
import os from 'os';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Use the home directory instead
  const logPath = path.join(os.homedir(), 'stream-viewer-debug.log');
  const timestamp = new Date().toISOString();
  const logData = `${timestamp}: ${JSON.stringify(req.body, null, 2)}\n\n`;

  try {
    fs.appendFileSync(logPath, logData);
    console.log('Debug log written to:', logPath);  // This will show in your terminal
    res.status(200).json({ message: 'Logged', path: logPath });
  } catch (error) {
    console.error('Error writing log:', error);
    res.status(500).json({ error: error.message, attemptedPath: logPath });
  }
}