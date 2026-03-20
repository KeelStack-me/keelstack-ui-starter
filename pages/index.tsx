import { useEffect } from "react";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/Layout";
import { useAuth } from "../lib/auth-context";
import { healthApi, billingApi, type SubscriptionPlan } from "../lib/api-client";

const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  free: "text-fg-muted",
  basic: "text-info",
  premium: "text-accent",
};

export default function OverviewPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/auth/login");
  }, [isAuthenticated, isLoading, router]);

  const { data: sub } = useQuery({
    queryKey: ["billing", "current"],
    queryFn: () => billingApi.getCurrentSubscription(),
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: healthData } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const [auth, billing, users, v2] = await Promise.allSettled([
        healthApi.auth(),
        healthApi.billing(),
        healthApi.users(),
        healthApi.v2(),
      ]);
      return {
        auth: auth.status === "fulfilled",
        billing: billing.status === "fulfilled",
        users: users.status === "fulfilled",
        v2: v2.status === "fulfilled",
      };
    },
    refetchInterval: 30_000,
  });

  if (isLoading || !isAuthenticated) return null;

  const plan = sub?.subscription?.plan ?? "free";
  const modules = [
    { name: "auth", ok: healthData?.auth },
    { name: "billing", ok: healthData?.billing },
    { name: "users", ok: healthData?.users },
    { name: "v2", ok: healthData?.v2 },
  ];

  return (
    <Layout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-xs text-accent mb-1">KeelStack Engine — Reference UI</p>
          <h1 className="font-display font-bold text-2xl text-fg">
            Welcome{user?.email ? `, ${user.email.split("@")[0]}` : ""}
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Connected to your KeelStack Engine backend.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Current Plan"
            value={plan.toUpperCase()}
            valueClass={PLAN_COLORS[plan as SubscriptionPlan] ?? "text-fg"}
            sub={sub?.subscription?.provider ?? "—"}
          />
          <StatCard
            label="Role"
            value={user?.role?.toUpperCase() ?? "—"}
            valueClass="text-fg"
            sub="user role"
          />
          <StatCard
            label="MFA"
            value={user?.mfaEnabled ? "ENABLED" : "DISABLED"}
            valueClass={user?.mfaEnabled ? "text-success" : "text-warning"}
            sub="multi-factor auth"
          />
          <StatCard
            label="Email"
            value={user?.emailVerified ? "VERIFIED" : "UNVERIFIED"}
            valueClass={user?.emailVerified ? "text-success" : "text-warning"}
            sub={user?.email ?? "—"}
          />
        </div>

        {/* Module health */}
        <div
          className="rounded-xl border border-border p-6 mb-6"
          style={{ background: "var(--surface)" }}
        >
          <h2 className="font-display font-semibold text-sm text-fg mb-4 uppercase tracking-wider">
            Engine Module Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {modules.map(({ name, ok }) => (
              <div
                key={name}
                className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5"
                style={{ background: "var(--bg)" }}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    ok === undefined
                      ? "bg-muted animate-pulse2"
                      : ok
                      ? "bg-success"
                      : "bg-danger"
                  }`}
                />
                <span className="font-mono text-xs text-fg-muted">/api/{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid md:grid-cols-3 gap-4">
          <QuickCard
            title="Billing"
            desc="Manage subscriptions. Powered by KeelStack's idempotent webhook + Stripe gateway layer."
            href="/billing"
            accent="text-info"
          />
          <QuickCard
            title="Background Jobs"
            desc="Submit async tasks. KeelStack's RetryableJobRunner handles failure + re-enqueue."
            href="/jobs"
            accent="text-warning"
          />
          <QuickCard
            title="AI Usage"
            desc="Per-user token budgets enforced by LLMClient's boundary layer."
            href="/llm"
            accent="text-accent"
          />
        </div>
      </div>
    </Layout>
  );
}

function StatCard({
  label,
  value,
  valueClass,
  sub,
}: {
  label: string;
  value: string;
  valueClass: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-xl border border-border p-4"
      style={{ background: "var(--surface)" }}
    >
      <p className="text-xs font-mono text-fg-muted mb-2 uppercase tracking-wider">{label}</p>
      <p className={`font-display font-bold text-lg ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function QuickCard({
  title,
  desc,
  href,
  accent,
}: {
  title: string;
  desc: string;
  href: string;
  accent: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-xl border border-border p-5 hover:border-accent/50 transition-all"
      style={{ background: "var(--surface)" }}
    >
      <h3 className={`font-display font-semibold text-sm mb-2 ${accent}`}>{title}</h3>
      <p className="text-xs text-fg-muted leading-relaxed">{desc}</p>
      <p className="text-xs text-accent mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        Open →
      </p>
    </a>
  );
}
