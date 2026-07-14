FROM node:20-slim

# Pin pnpm to exact version from packageManager field
RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copy manifests and patches
COPY package.json pnpm-lock.yaml pnpm.yaml ./
COPY patches/ ./patches/

# Install deps — pnpm.yaml defines patches, overrides, and onlyBuiltDependencies
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
