#!/bin/sh
# Make bind-mounted runtime dirs writable by Apache (www-data), then hand off
# to the stock php:apache entrypoint.
set -e

for dir in /var/www/html/processed /var/www/html/uploads /tmp/confirm_cache; do
    mkdir -p "$dir"
    chown -R www-data:www-data "$dir"
done

exec docker-php-entrypoint "$@"
