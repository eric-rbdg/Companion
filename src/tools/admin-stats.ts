import "dotenv/config";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    process.stderr.write(`Missing required env var: ${name}\n`);
    process.exit(1);
  }
  return v.trim();
}

type Stats = {
  status: "ok";
  users: { total: number };
  messages: { total: number };
  optIns: { total: number; last24h: number };
  visits: { total: number; last24h: number };
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

async function main(): Promise<void> {
  const url = requireEnv("ADMIN_STATS_URL");
  const key = requireEnv("ADMIN_API_KEY");

  const res = await fetch(url, {
    headers: { "x-admin-key": key },
  });

  const text = await res.text();
  if (!res.ok) {
    process.stderr.write(`Request failed: ${res.status} ${res.statusText}\n`);
    if (text) {
      process.stderr.write(`${text}\n`);
    }
    process.exit(1);
  }

  const data = JSON.parse(text) as Stats;

  process.stdout.write(
    [
      "",
      "Apricity — Admin Stats",
      `URL: ${url}`,
      "----------------------------------------",
      `Site visits      (24h): ${formatNumber(data.visits.last24h)}`,
      `Site visits    (total): ${formatNumber(data.visits.total)}`,
      "",
      `Opt-ins          (24h): ${formatNumber(data.optIns.last24h)}`,
      `Opt-ins        (total): ${formatNumber(data.optIns.total)}`,
      "",
      `Users         (unique): ${formatNumber(data.users.total)}`,
      `Messages       (total): ${formatNumber(data.messages.total)}`,
      "",
    ].join("\n"),
  );
}

void main().catch((err) => {
  process.stderr.write(
    `${err instanceof Error ? err.stack ?? err.message : String(err)}\n`,
  );
  process.exit(1);
});

