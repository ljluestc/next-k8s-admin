import 'dotenv/config';
import fs from 'node:fs/promises';
import yaml from 'yaml';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { clusters } from '@/lib/db/schema';
import { encrypt } from '@/lib/crypto';

interface ParsedKubeconfig {
  clusters?: Array<{
    cluster?: {
      server?: string;
    };
  }>;
}

interface CliArgs {
  name?: string;
  displayName?: string;
  kubeconfigPath?: string;
  help?: boolean;
}

function usage() {
  console.log('Usage: npx tsx scripts/upsert-cluster-from-kubeconfig.ts --name <cluster-name> --display-name <display-name> --kubeconfig <path>');
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (let i = 0; i < argv.length; i++) {
    const current = argv[i];
    if (current === '--help' || current === '-h') {
      args.help = true;
      continue;
    }
    if (current === '--name') {
      args.name = argv[++i];
      continue;
    }
    if (current === '--display-name') {
      args.displayName = argv[++i];
      continue;
    }
    if (current === '--kubeconfig') {
      args.kubeconfigPath = argv[++i];
      continue;
    }
  }

  return args;
}

function getApiServerUrl(kubeconfigContent: string): string {
  const parsed = yaml.parse(kubeconfigContent) as ParsedKubeconfig | null;
  const apiServerUrl = parsed?.clusters?.[0]?.cluster?.server;

  if (!apiServerUrl) {
    throw new Error('kubeconfig does not contain clusters[0].cluster.server');
  }

  return apiServerUrl;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  if (!args.name || !args.displayName || !args.kubeconfigPath) {
    usage();
    throw new Error('missing required args');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is required');
  }

  const kubeconfigContent = await fs.readFile(args.kubeconfigPath, 'utf8');
  const apiServerUrl = getApiServerUrl(kubeconfigContent);
  const encryptedKubeconfig = encrypt(kubeconfigContent);
  const now = new Date();
  const description = 'Managed by Terraform';

  const [existing] = await db
    .select({ id: clusters.id })
    .from(clusters)
    .where(eq(clusters.name, args.name))
    .limit(1);

  if (existing) {
    await db
      .update(clusters)
      .set({
        displayName: args.displayName,
        apiServerUrl,
        authType: 'kubeconfig',
        kubeconfig: encryptedKubeconfig,
        saToken: null,
        caCert: null,
        description,
        updatedAt: now,
      })
      .where(eq(clusters.id, existing.id));

    console.log(`Updated existing cluster "${args.name}"`);
    return;
  }

  await db.insert(clusters).values({
    name: args.name,
    displayName: args.displayName,
    apiServerUrl,
    authType: 'kubeconfig',
    kubeconfig: encryptedKubeconfig,
    saToken: null,
    caCert: null,
    description,
    createdBy: null,
    notifyEnabled: false,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`Inserted new cluster "${args.name}"`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
