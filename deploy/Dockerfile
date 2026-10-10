FROM node:24-alpine@sha256:333f6b3eca25980d5682c26207665b93c9417786b21760b2764d5821d9704c8a
WORKDIR /app
COPY --chown=1000:1000 server ./server
COPY --chown=1000:1000 dist ./dist
COPY --chown=1000:1000 node_modules ./node_modules
COPY --chown=1000:1000 package.json ./package.json
USER 1000:1000
CMD ["node", "--use-env-proxy", "server/index.mjs"]
