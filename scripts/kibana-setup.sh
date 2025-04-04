#!/bin/bash
# Kibana setup script for Collabication log visualization

# Wait for Kibana to be available
echo "Waiting for Kibana to become available..."
until curl -s http://kibana:5601/api/status | grep -q '"overall":{"level":"available"'; do
    echo "Kibana not yet available, waiting..."
    sleep 10
done
echo "Kibana is available."

# Wait a bit more to ensure Elasticsearch indexes are created
sleep 30

# Create index patterns
echo "Creating index patterns..."
curl -X POST -H "Content-Type: application/json" -H "kbn-xsrf: true" \
    http://kibana:5601/api/saved_objects/index-pattern/collabication \
    -d '{"attributes":{"title":"collabication-*","timeFieldName":"@timestamp"}}'

echo "Configuring default index pattern..."
curl -X POST -H "Content-Type: application/json" -H "kbn-xsrf: true" \
    http://kibana:5601/api/kibana/settings \
    -d '{"changes":{"defaultIndex":"collabication"}}'

# Create visualizations
echo "Creating visualizations..."

# API status codes visualization
curl -X POST -H "Content-Type: application/json" -H "kbn-xsrf: true" \
    http://kibana:5601/api/saved_objects/visualization/api-status-codes \
    -d '{
  "attributes": {
    "title": "API Status Codes",
    "visState": "{\"title\":\"API Status Codes\",\"type\":\"pie\",\"params\":{\"type\":\"pie\",\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"isDonut\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"status\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"collabication\",\"filter\":[],\"query\":{\"query\":\"log:*\",\"language\":\"kuery\"}}"
    }
  }
}'

# Error counts by service
curl -X POST -H "Content-Type: application/json" -H "kbn-xsrf: true" \
    http://kibana:5601/api/saved_objects/visualization/errors-by-service \
    -d '{
  "attributes": {
    "title": "Errors by Service",
    "visState": "{\"title\":\"Errors by Service\",\"type\":\"histogram\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":\"true\",\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"container_name\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
    "uiStateJSON": "{}",
    "description": "",
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"collabication\",\"filter\":[{\"meta\":{\"index\":\"collabication\",\"negate\":false,\"disabled\":false,\"alias\":null,\"type\":\"phrase\",\"key\":\"log\",\"value\":\"*error*\",\"params\":{\"query\":\"*error*\",\"type\":\"phrase\"}},\"query\":{\"match\":{\"log\":{\"query\":\"*error*\",\"type\":\"phrase\"}}},\"$state\":{\"store\":\"appState\"}}],\"query\":{\"query\":\"\",\"language\":\"kuery\"}}"
    }
  }
}'

# Create dashboard
echo "Creating dashboard..."
curl -X POST -H "Content-Type: application/json" -H "kbn-xsrf: true" \
    http://kibana:5601/api/saved_objects/dashboard/collabication-overview \
    -d '{
  "attributes": {
    "title": "Collabication Overview",
    "hits": 0,
    "description": "Overview dashboard for Collabication services",
    "panelsJSON": "[{\"embeddableConfig\":{},\"gridData\":{\"h\":15,\"i\":\"1\",\"w\":24,\"x\":0,\"y\":0},\"id\":\"api-status-codes\",\"panelIndex\":\"1\",\"type\":\"visualization\",\"version\":\"7.17.1\"},{\"embeddableConfig\":{},\"gridData\":{\"h\":15,\"i\":\"2\",\"w\":24,\"x\":24,\"y\":0},\"id\":\"errors-by-service\",\"panelIndex\":\"2\",\"type\":\"visualization\",\"version\":\"7.17.1\"}]",
    "optionsJSON": "{\"darkTheme\":false,\"useMargins\":true,\"hidePanelTitles\":false}",
    "version": 1,
    "timeRestore": false,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"query\":{\"language\":\"kuery\",\"query\":\"\"},\"filter\":[]}"
    }
  }
}'

echo "Kibana setup completed!" 