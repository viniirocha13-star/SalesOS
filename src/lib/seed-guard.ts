export function isDevSeedAllowed(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "production" && env.ALLOW_DEV_SEED !== "1") return false;
  return true;
}

export function assertDevSeedAllowed(env: NodeJS.ProcessEnv = process.env) {
  if (!isDevSeedAllowed(env)) {
    throw new Error(
      "SEED_BLOCKED_IN_PRODUCTION: o seed de desenvolvimento apaga dados e cria senhas de demo. Não rode em produção. Para forçar (não recomendado): ALLOW_DEV_SEED=1",
    );
  }
}
