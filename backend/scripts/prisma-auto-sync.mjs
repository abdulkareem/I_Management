import { execSync } from "node:child_process";

const schemaPath = "backend/prisma/schema.prisma";

execSync(`npx prisma generate --schema=${schemaPath}`, { stdio: "inherit" });
execSync(`npx prisma db push --schema=${schemaPath}`, { stdio: "inherit" });
