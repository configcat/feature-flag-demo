#!/bin/sh

set -eu

DIST_BASE_DIR=/usr/share/nginx/html/

for JSFILE in $DIST_BASE_DIR/*.js
do 
    echo replacing variable in $JSFILE
    VARIABLES=$(grep -o "$JSFILE" -e '\$\{CC_[a-zA-Z_0-9]*\}' -E | tr '\n' ' ')
    envsubst "$VARIABLES" < "$JSFILE" > "$DIST_BASE_DIR/tempjsfile.js"
    mv "$DIST_BASE_DIR/tempjsfile.js" "$JSFILE"
done

if [ -n "${CC_CdnUrl:-}" ]; then
    CONF=/etc/nginx/security-headers.conf
    sed -i "s|# CONNECTPLACEHOLDER|set \$CONNECT \"\${CONNECT} $CC_CdnUrl\";|" "$CONF"
fi

nginx -g 'daemon off;'