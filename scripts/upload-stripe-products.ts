/**
 * Creates the pricing-page subscription products in Stripe (idempotent).
 *
 * Source of truth: scripts/stripe-products.csv
 * (Worker £10/year or £1/month, Employer £100/year or £10/month).
 * Usage: npm run stripe:upload-products
 *
 * Requires STRIPE_SECRET_KEY in .env.local (use a test key first).
 * After it runs, copy the printed price ids into .env.local.
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config({ path: ".env.local" });
dotenv.config();

type CatalogRow = {
  name: string;
  description: string;
  statementDescriptor: string;
  price: string;
  currency: string;
  interval: "year" | "month" | "week" | "day";
  lookupKey: string;
  productId: string;
  tier: string;
  envVar: string;
};

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  fields.push(current);
  return fields;
}

async function readCatalog(csvPath: string): Promise<CatalogRow[]> {
  const rows: CatalogRow[] = [];
  const rl = createInterface({ input: createReadStream(csvPath, "utf8") });
  let header = true;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line.replace(/\r$/, ""));
    if (header) {
      header = false;
      continue;
    }
    const interval = cols[5];
    if (
      interval !== "year" &&
      interval !== "month" &&
      interval !== "week" &&
      interval !== "day"
    ) {
      throw new Error(`Unsupported interval: ${interval}`);
    }
    rows.push({
      name: cols[0],
      description: cols[1],
      statementDescriptor: cols[2],
      price: cols[3],
      currency: cols[4],
      interval,
      lookupKey: cols[6],
      productId: cols[7],
      tier: cols[8],
      envVar: cols[9],
    });
  }

  return rows;
}

function amountToPence(price: string): number {
  const pence = Math.round(Number(price) * 100);
  if (!Number.isFinite(pence) || pence <= 0) {
    throw new Error(`Invalid price: ${price}`);
  }
  return pence;
}

async function ensureProduct(stripe: Stripe, row: CatalogRow): Promise<Stripe.Product> {
  const fields = {
    name: row.name,
    description: row.description,
    statement_descriptor: row.statementDescriptor,
    metadata: { tier: row.tier },
  };

  try {
    await stripe.products.retrieve(row.productId);
    return stripe.products.update(row.productId, { ...fields, active: true });
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status !== 404) throw err;
  }

  return stripe.products.create({
    id: row.productId,
    ...fields,
  });
}

async function ensurePrice(
  stripe: Stripe,
  productId: string,
  row: CatalogRow
): Promise<Stripe.Price> {
  const existing = await stripe.prices.list({
    lookup_keys: [row.lookupKey],
    limit: 1,
  });
  if (existing.data[0]) return existing.data[0];

  return stripe.prices.create({
    product: productId,
    currency: row.currency,
    unit_amount: amountToPence(row.price),
    recurring: { interval: row.interval },
    lookup_key: row.lookupKey,
    nickname: `${row.name} ${row.interval === "year" ? "yearly" : "monthly"}`,
    metadata: { tier: row.tier },
  });
}

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is missing. Add it to .env.local.");
  }

  const stripe = new Stripe(secret);
  const csvPath = path.join(process.cwd(), "scripts", "stripe-products.csv");
  const catalog = await readCatalog(csvPath);
  if (catalog.length === 0) {
    throw new Error(`No products found in ${csvPath}`);
  }

  console.log(`Uploading ${catalog.length} products to Stripe…\n`);

  const envLines: string[] = [];
  for (const row of catalog) {
    const product = await ensureProduct(stripe, row);
    const price = await ensurePrice(stripe, product.id, row);
    envLines.push(`${row.envVar}=${price.id}`);
    console.log(`${row.name}: product ${product.id} · price ${price.id} (${row.price} ${row.currency}/${row.interval})`);
  }

  console.log("\nAdd these to .env.local:\n");
  console.log(envLines.join("\n"));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
