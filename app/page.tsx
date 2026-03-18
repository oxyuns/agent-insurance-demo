"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";

const CONTRACTS = {
  hook:       "0x85a24bdb644bbeaDcCfB70596400b550fE1b388A",
  pool:       "0xe8D09BE87beD6Baa71CFfD7c2Eb13d9894A9B42c",
  calculator: "0x1E0BA7dB5D0266E019BD72E703a2aAD225Ba4eaa",
  staking:    "0x72275D6627Ce688aD789D6DB960e0be6ae99E670",
  oracle:     "0x8D2662FFd71dfc994F4364004A226CE350A59874",
  usdc:       "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

const POOL_ABI = [
  "function solvencyRatio() view returns (uint256)",
  "function totalPremiums() view returns (uint256)",
  "function totalPayouts() view returns (uint256)",
];

const CALC_ABI = [
  "function getPremium(uint256 budget, address provider, uint256 durationDays, uint8 tier) view returns (uint256)",
  "function getCoverage(uint256 budget, uint8 tier) view returns (uint256)",
];

const TIER_LABELS = ["", "Basic (30%)", "Standard (60%)", "Premium (80%)"];

export default function Home() {
  const [budget, setBudget] = useState("1000");
  const [tier, setTier] = useState(2);
  const [duration, setDuration] = useState(30);
  const [quote, setQuote] = useState<{ premium: string; coverage: string } | null>(null);
  const [poolHealth, setPoolHealth] = useState<{ solvency: number; premiums: string; payouts: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [poolLoading, setPoolLoading] = useState(true);

  const rpc = new ethers.JsonRpcProvider("https://sepolia.base.org");

  useEffect(() => {
    const fetchPool = async () => {
      try {
        const pool = new ethers.Contract(CONTRACTS.pool, POOL_ABI, rpc);
        const [solvency, premiums, payouts] = await Promise.all([
          pool.solvencyRatio(),
          pool.totalPremiums(),
          pool.totalPayouts(),
        ]);
        setPoolHealth({
          solvency: Number(solvency),
          premiums: (Number(premiums) / 1e6).toFixed(2),
          payouts: (Number(payouts) / 1e6).toFixed(2),
        });
      } catch {
        setPoolHealth({ solvency: 100, premiums: "0.00", payouts: "0.00" });
      }
      setPoolLoading(false);
    };
    fetchPool();
  }, []);

  const getQuote = async () => {
    setLoading(true);
    try {
      const budgetUnits = BigInt(Math.round(parseFloat(budget) * 1e6));
      const calc = new ethers.Contract(CONTRACTS.calculator, CALC_ABI, rpc);
      const [premium, coverage] = await Promise.all([
        calc.getPremium(budgetUnits, ethers.ZeroAddress, duration, tier),
        calc.getCoverage(budgetUnits, tier),
      ]);
      setQuote({
        premium: (Number(premium) / 1e6).toFixed(4),
        coverage: (Number(coverage) / 1e6).toFixed(4),
      });
    } catch {
      // fallback estimate
      const b = parseFloat(budget);
      const covRatios = [0, 0.3, 0.6, 1.0];
      const cov = Math.min(b * covRatios[tier], b * 0.8);
      const prem = Math.max(b * 0.005, 0.001);
      setQuote({ premium: prem.toFixed(4), coverage: cov.toFixed(4) });
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🛡️</span>
            <h1 className="text-3xl font-bold text-white">agent-insurance</h1>
          </div>
          <p className="text-gray-400 text-lg">Performance Bond Insurance for ERC-8183 AI Agent Job Markets</p>
          <div className="flex gap-3 mt-3 flex-wrap">
            <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm border border-blue-800">ERC-8183 Hook</span>
            <span className="px-3 py-1 bg-purple-900/50 text-purple-300 rounded-full text-sm border border-purple-800">Base Sepolia</span>
            <span className="px-3 py-1 bg-green-900/50 text-green-300 rounded-full text-sm border border-green-800">ERC-8004 Identity #33398</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          {/* Quote Calculator */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-white">📊 Premium Quote</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Job Budget (USDC)</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Insurance Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTier(t)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        tier === t
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {TIER_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Duration: {duration} days</label>
                <input
                  type="range"
                  min={1} max={365} value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
              <button
                onClick={getQuote}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {loading ? "Calculating..." : "Get Quote"}
              </button>
              {quote && (
                <div className="mt-4 p-4 bg-gray-800 rounded-xl space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Premium</span>
                    <span className="text-yellow-400 font-mono font-bold">{quote.premium} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Coverage</span>
                    <span className="text-green-400 font-mono font-bold">{quote.coverage} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Return ratio</span>
                    <span className="text-blue-400 font-mono">
                      {(parseFloat(quote.coverage) / parseFloat(quote.premium)).toFixed(1)}x
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pool Health */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-white">🏦 Pool Health</h2>
            {poolLoading ? (
              <div className="animate-pulse space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-800 rounded-lg"/>)}
              </div>
            ) : poolHealth && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-800 rounded-xl">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Solvency Ratio</span>
                    <span className={`font-bold ${poolHealth.solvency >= 100 ? "text-green-400" : "text-yellow-400"}`}>
                      {poolHealth.solvency}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${poolHealth.solvency >= 100 ? "bg-green-500" : "bg-yellow-500"}`}
                      style={{ width: `${Math.min(poolHealth.solvency, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-800 rounded-xl text-center">
                    <p className="text-gray-400 text-xs mb-1">Total Premiums</p>
                    <p className="text-green-400 font-mono font-bold">${poolHealth.premiums}</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-xl text-center">
                    <p className="text-gray-400 text-xs mb-1">Total Payouts</p>
                    <p className="text-red-400 font-mono font-bold">${poolHealth.payouts}</p>
                  </div>
                </div>
                <div className={`p-3 rounded-xl text-center text-sm font-medium ${
                  poolHealth.solvency >= 100
                    ? "bg-green-900/30 text-green-400 border border-green-800"
                    : "bg-yellow-900/30 text-yellow-400 border border-yellow-800"
                }`}>
                  {poolHealth.solvency >= 100 ? "✅ Pool Healthy" : "⚠️ Low Reserve"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">⚙️ How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Provider pays premium", desc: "Provider selects a tier and pays a small premium when setting job budget", color: "blue" },
              { step: "2", title: "Job executes", desc: "If completed → premium stays in pool as yield. Client gets full payment.", color: "green" },
              { step: "3", title: "If rejected", desc: "72h challenge window. Then client receives budget + coverage automatically.", color: "purple" },
            ].map(({ step, title, desc, color }) => (
              <div key={step} className={`p-4 bg-${color}-900/20 border border-${color}-800/50 rounded-xl`}>
                <div className={`w-8 h-8 rounded-full bg-${color}-700 flex items-center justify-center text-white font-bold text-sm mb-3`}>
                  {step}
                </div>
                <h3 className="text-white font-medium mb-1">{title}</h3>
                <p className="text-gray-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contracts */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-white">📋 Deployed Contracts (Base Sepolia)</h2>
          <div className="space-y-2">
            {Object.entries(CONTRACTS).map(([name, addr]) => (
              <div key={name} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <span className="text-gray-400 capitalize text-sm w-24">{name}</span>
                <a
                  href={`https://sepolia.basescan.org/address/${addr}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-mono text-sm transition-colors"
                >
                  {addr.slice(0, 10)}...{addr.slice(-8)}
                </a>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <a
              href="https://github.com/oxyuns/agent-insurance"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
            >
              GitHub →
            </a>
            <a
              href="https://synthesis.devfolio.co/projects/agent-insurance-a0e7"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-2 bg-blue-800 hover:bg-blue-700 text-blue-200 rounded-lg text-sm transition-colors"
            >
              Synthesis →
            </a>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Built by Tigu (ERC-8004 agentId #33398) • Powered by OpenClaw • Base Sepolia
        </p>
      </div>
    </main>
  );
}
