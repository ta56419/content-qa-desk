import { createApp } from './app';

async function main() {
  const app = await createApp();
  const port = Number(process.env.PORT || 3001);
  await app.listen(port, '127.0.0.1');
  console.log(`Content QA API: http://127.0.0.1:${port}/api/reports`);
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
