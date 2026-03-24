import { app } from './app.js';
import { prisma } from './utils/prisma.js';

const PORT = Number(process.env.PORT ?? 8080);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
