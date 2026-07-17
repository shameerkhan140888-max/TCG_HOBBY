import path from 'node:path';
import { configureWindowsPrismaEngine, defaultWorkspaceRoot, loadRootDatabaseEnv } from './lib/database-env.mjs';
import type { validateProductImportFolder } from '../packages/database/src/product-import';

type Command = 'validate' | 'dry-run' | 'import' | 'import-all';
type PrismaDisconnectable = {
  $disconnect(): Promise<void>;
};

let prismaClient: PrismaDisconnectable | undefined;

function bootstrapDatabaseEnv(command: Command): void {
  loadRootDatabaseEnv({
    rootDir: defaultWorkspaceRoot,
    env: process.env,
    requireDatabaseUrl: command !== 'validate',
    logger: command === 'validate' ? undefined : console.log,
  });
  configureWindowsPrismaEngine({ rootDir: defaultWorkspaceRoot, env: process.env });
}

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function resolveImportPath(): string {
  const requestedPath = readArg('--path');
  if (!requestedPath) {
    throw new Error('Provide --path product-imports/{game}/{product-slug}.');
  }

  return path.resolve(process.cwd(), requestedPath);
}

function printValidationResult(result: Awaited<ReturnType<typeof validateProductImportFolder>>): void {
  if (result.valid) {
    console.log(`Valid product import: ${result.input?.name}`);
  } else {
    console.log('Product import is invalid.');
  }

  for (const warning of result.warnings) {
    console.log(`Warning: ${warning}`);
  }

  for (const error of result.errors) {
    console.log(`Error: ${error}`);
  }
}

async function main(): Promise<void> {
  const command = process.argv[2] as Command | undefined;

  if (!command || !['validate', 'dry-run', 'import', 'import-all'].includes(command)) {
    throw new Error('Use one of: validate, dry-run, import, import-all.');
  }

  bootstrapDatabaseEnv(command);
  const {
    createProductImportPlan,
    discoverProductImportFolders,
    importProductFromFolder,
    validateProductImportFolder: validateFolder,
  } = await import('../packages/database/src/product-import');
  const { prisma } = await import('../packages/database/src/client');
  prismaClient = prisma;

  if (command === 'validate') {
    printValidationResult(await validateFolder(resolveImportPath()));
    return;
  }

  if (command === 'dry-run') {
    const folderPath = resolveImportPath();
    const plan = await createProductImportPlan(folderPath);
    console.log(JSON.stringify({
      product: plan.input.name,
      slug: plan.input.slug,
      match: plan.productMatch,
      lifecycleState: plan.input.lifecycleState,
      visible: plan.input.visible,
      publicStockState: plan.input.stockQuantity <= 0 ? 'OUT_OF_STOCK' : plan.input.stockQuantity <= 3 ? 'LOW_STOCK' : 'IN_STOCK',
      stages: plan.stages,
      media: plan.media.map((item) => ({
        source: item.sourceFilename,
        output: item.publicUrl,
        role: item.role,
        primary: item.isPrimary,
      })),
      warnings: plan.warnings,
    }, null, 2));
    return;
  }

  if (command === 'import') {
    const result = await importProductFromFolder(resolveImportPath());
    console.log(JSON.stringify({
      productId: result.productId,
      slug: result.productSlug,
      lifecycleState: result.input.lifecycleState,
      match: result.productMatch,
      auditId: result.auditId,
      changes: result.changes,
      warnings: result.warnings,
    }, null, 2));
    return;
  }

  const rootPath = path.resolve(process.cwd(), 'product-imports');
  const folders = await discoverProductImportFolders(rootPath);
  const results: Array<{ folder: string; ok: boolean; message: string }> = [];

  for (const folder of folders) {
    try {
      const result = await importProductFromFolder(folder);
      results.push({ folder, ok: true, message: `${result.productSlug}: ${result.changes.join(' ')}` });
    } catch (error) {
      results.push({ folder, ok: false, message: error instanceof Error ? error.message : String(error) });
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prismaClient?.$disconnect();
  });
