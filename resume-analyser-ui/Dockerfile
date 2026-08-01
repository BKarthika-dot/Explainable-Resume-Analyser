# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Bake the API URL in at build time. Override with:
#   docker build --build-arg VITE_API_URL=https://api.example.com .
ARG VITE_API_URL=https://explainable-resume-analyser.onrender.com
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- Serve stage ---
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
