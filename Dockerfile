# syntax=docker/dockerfile:1

# Node dependencies for puphpeteer (Chromium itself comes from Debian below).
FROM node:22-bookworm-slim AS node_modules
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"
ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# PHP runtime: Apache + mod_php 8.4, Node 22, Chromium, poppler-utils.
FROM php:8.4-apache AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium fonts-liberation fonts-noto-color-emoji \
        poppler-utils \
        libzip-dev libxslt1-dev unzip git \
    && docker-php-ext-install -j"$(nproc)" \
        calendar exif gettext mysqli pdo_mysql sockets xsl zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=node_modules /usr/local/bin/node /usr/local/bin/node
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=true \
    COMPOSER_ALLOW_SUPERUSER=1

COPY docker/zz-email-to-ics.conf /etc/apache2/conf-available/zz-email-to-ics.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-email-to-ics.ini
RUN a2enmod rewrite remoteip setenvif headers \
    && a2enconf zz-email-to-ics \
    # Chromium/Node need a writable HOME for www-data (/var/www).
    && mkdir -p /var/www/.cache /var/www/.config /var/www/.local \
    && chown www-data:www-data /var/www /var/www/.cache /var/www/.config /var/www/.local

WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress --no-scripts
COPY --from=node_modules /app/node_modules ./node_modules
COPY . .
RUN composer dump-autoload --no-dev --optimize \
    && mkdir -p processed uploads /tmp/confirm_cache \
    && chown -R www-data:www-data processed uploads /tmp/confirm_cache

COPY docker/entrypoint.sh /usr/local/bin/email-to-ics-entrypoint
RUN chmod 0755 /usr/local/bin/email-to-ics-entrypoint
ENTRYPOINT ["email-to-ics-entrypoint"]
CMD ["apache2-foreground"]

# Test image: same runtime plus dev dependencies (PHPUnit).
FROM base AS test
# Dotenv needs a file; the template only holds placeholder values.
RUN composer install --optimize-autoloader --no-interaction --no-progress --no-scripts \
    && cp .env.template .env
CMD ["vendor/bin/phpunit"]

# Production image (default target).
FROM base AS production
