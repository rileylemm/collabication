# Fluentd Dockerfile for Collabication logging

FROM fluent/fluentd:v1.16-1

# Use root account for installation
USER root

# Install dependencies and plugins
RUN apk add --no-cache --update \
    sudo \
    build-base \
    ruby-dev \
    libffi-dev \
    && gem install \
    fluent-plugin-elasticsearch \
    fluent-plugin-rewrite-tag-filter \
    fluent-plugin-record-reformer \
    && sudo gem sources --clear-all \
    && apk del build-base ruby-dev \
    && rm -rf /tmp/* /var/tmp/* /usr/lib/ruby/gems/*/cache/*.gem

# Create log directories
RUN mkdir -p /fluentd/log/errors

# Copy Fluentd configuration
COPY fluent.conf /fluentd/etc/

# Set proper permissions
RUN chown -R fluent:fluent /fluentd

# Switch back to fluent user
USER fluent

# Expose ports for log collection
EXPOSE 24224 24224/udp

# Start Fluentd
CMD ["fluentd", "-c", "/fluentd/etc/fluent.conf", "-p", "/fluentd/plugins"] 