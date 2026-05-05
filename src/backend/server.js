import app from './app.js';
import { config } from './config/config.js';
import { closeDatabase } from './config/db.js';

const PORT = config.port;

/**
 * Start server
 */
async function startServer() {
  try {
    console.log('Starting UniHub Workshop API Server...');
    console.log(`Environment: ${config.nodeEnv}`);

    // Start listening
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API Base URL: http://localhost:${PORT}/api`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down server...');
      server.close(async () => {
        await closeDatabase();
        console.log('Server stopped');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('\nShutting down server...');
      server.close(async () => {
        await closeDatabase();
        console.log('Server stopped');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();
