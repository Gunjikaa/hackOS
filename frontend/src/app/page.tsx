'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Activity, Terminal, ArrowRight, Layers, Database } from 'lucide-react';

interface HealthData {
  status: string;
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  database: {
    status: string;
    latencyMs: number | null;
  };
  durationMs: number;
}

export default function HomePage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Queries Next.js rewrite: /api/v1/health -> proxies to Express on :5000
    fetch('/api/v1/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setHealth(json.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen flex flex-col justify-between p-6 sm:p-12 max-w-6xl mx-auto">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-lg tracking-wider">
            H
          </div>
          <span className="font-semibold text-xl tracking-tight text-white">HackOS</span>
          <span className="text-xs px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 font-mono">
            v1.0-alpha · Phase 1
          </span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Foundation Scaffolding</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="my-16 space-y-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border border-border bg-surface text-gray-300">
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <span>Unified Monolith Architecture Active</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          College-First Hackathon & <br className="hidden sm:inline" />
          Event Management Platform.
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Centralizing event operations, transactional team formation, deadline-enforced submissions,
          rubric-based judging, and contextual communication into one reliable system.
        </p>

        {/* Backend Connectivity Status Card */}
        <div className="p-6 rounded-xl border border-border bg-surface max-w-xl mt-8">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-sm text-gray-200">Express API Gateway (/api/v1/health)</span>
            </div>
            <span className="text-xs font-mono text-muted">Proxied via Next.js rewrites</span>
          </div>

          <div className="pt-4 space-y-3 text-sm">
            {loading && (
              <p className="text-muted flex items-center space-x-2">
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full"></span>
                <span>Connecting to Express backend on port 5000...</span>
              </p>
            )}

            {error && (
              <div className="text-amber-400 text-xs font-mono bg-amber-400/10 p-3 rounded border border-amber-400/20">
                Backend ping pending (ensure backend is running on port 5000): {error}
              </div>
            )}

            {health && (
              <div className="space-y-2 font-mono text-xs text-gray-300">
                <div className="flex justify-between">
                  <span className="text-muted">API Service:</span>
                  <span className="text-emerald-400">{health.service} ({health.status})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">PostgreSQL State:</span>
                  <span className={health.database.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}>
                    {health.database.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Process Uptime:</span>
                  <span>{health.uptimeSeconds}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Roundtrip Latency:</span>
                  <span>{health.durationMs}ms</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Pillar Summary */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        <div className="p-5 rounded-lg border border-border bg-surface/60 space-y-2">
          <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-white text-base">Modular Monolith</h3>
          <p className="text-sm text-muted">
            Separated domain modules (Auth, Events, Teams, Submissions, Judging, Communication) within one clean Express codebase.
          </p>
        </div>

        <div className="p-5 rounded-lg border border-border bg-surface/60 space-y-2">
          <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-white text-base">Relational Source of Truth</h3>
          <p className="text-sm text-muted">
            ACID transactions, slot locking on team size limits, unique constraints on registration, and server-side deadline rules.
          </p>
        </div>

        <div className="p-5 rounded-lg border border-border bg-surface/60 space-y-2">
          <div className="w-8 h-8 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-white text-base">Event-Scoped Permissions</h3>
          <p className="text-sm text-muted">
            Strict isolation: participants see own submissions and support tickets; judges only evaluate assigned projects.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted">
        <div>HackOS Baseline v1.0 · College Hackathon Lifecycle Management</div>
        <div className="flex items-center space-x-4 mt-2 sm:mt-0">
          <span>PostgreSQL + Express + Next.js</span>
        </div>
      </footer>
    </main>
  );
}
