S3_BUCKET = city-bureau-projects

# DEPLOY_PATH = il-2020-election-maps
DEPLOY_PATH = il-2020-precinct-maps-stg

.PHONY: deploy-site
deploy-site:
	aws s3 sync dist/ s3://$(S3_BUCKET)/$(DEPLOY_PATH) --size-only --acl=public-read --cache-control "public, max-age=31536000" --exclude "*.html" --exclude "manifest.json" --exclude "style.json"
	aws s3 sync dist/ s3://$(S3_BUCKET)/$(DEPLOY_PATH) --acl=public-read --cache-control "public, max-age=0, must-revalidate" --exclude "*" --include "*.html" --include "manifest.json" --include "style.json"
	aws cloudfront create-invalidation --distribution-id $(CLOUDFRONT_ID) --paths "/$(DEPLOY_PATH)/*"

.PHONY: deploy-tiles
deploy-tiles:
	aws s3 cp tiles/vector/ s3://$(S3_BUCKET)/$(DEPLOY_PATH)/tiles --recursive --acl=public-read --cache-control "public, max-age=86400" --content-encoding=gzip
	aws s3 cp tiles/raster/ s3://$(S3_BUCKET)/$(DEPLOY_PATH)/tiles --recursive --acl=public-read --cache-control "public, max-age=86400"
	aws cloudfront create-invalidation --distribution-id $(CLOUDFRONT_ID) --paths "/$(DEPLOY_PATH)/*"

tiles/raster/%: data/points/%.csv
	npm run env -- node -r esm ./scripts/points-to-raster-tiles.js $< $@

data/points/il-constitution.csv: data/points/il-constitution-yes.csv data/points/il-constitution-no.csv
	xsv cat rows $^ > $@

data/points/us-president.csv: data/points/us-president-dem.csv data/points/us-president-rep.csv data/points/us-president-otr.csv
	xsv cat rows $^ > $@

data/points/us-senate.csv: data/points/us-senate-dem.csv data/points/us-senate-rep.csv data/points/us-senate-wil.csv data/points/us-senate-otr.csv
	xsv cat rows $< > $@

data/points/%.csv: data/points/il.geojson
	aggspread -agg $< -prop '$*' -output - | \
	npx mapshaper -i - format=csv -points -each 'vote = "$*"' -o $@

data/points/il.geojson: data/precincts/il-no-water.geojson
	npx mapshaper -i $< \
	-filter 'this.properties["il-constitution-yes"] !== null && this.properties["us-president-dem"] !== null' remove-empty \
	-each 'this.properties["us-president-otr"] = this.properties["us-president-votes"] - this.properties["us-president-dem"] - this.properties["us-president-rep"]' \
	-each 'this.properties["us-senate-otr"] = this.properties["us-senate-votes"] - this.properties["us-senate-dem"] - this.properties["us-senate-rep"] - this.properties["us-senate-wil"]' \
	-o $@

tiles/vector: data/precincts/il.mbtiles
	mkdir $@
	tile-join --no-tile-size-limit --force -e $@ $<

data/precincts/il.mbtiles: data/precincts/il-no-water.geojson
	tippecanoe \
	--simplification=10 \
	--simplify-only-low-zooms \
	--minimum-zoom=5 \
	--maximum-zoom=12 \
	--no-tile-stats \
	--generate-ids \
	--detect-shared-borders \
	--grid-low-zooms \
	--coalesce-smallest-as-needed \
	--accumulate-attribute=registered:sum \
	--accumulate-attribute=ballots:sum \
	--accumulate-attribute=us-president-dem:sum \
	--accumulate-attribute=us-president-rep:sum \
	--accumulate-attribute=us-president-votes:sum \
	--accumulate-attribute=il-constitution-yes:sum \
	--accumulate-attribute=il-constitution-no:sum \
	--accumulate-attribute=il-constitution-votes:sum \
	--accumulate-attribute=us-senate-dem:sum \
	--accumulate-attribute=us-senate-rep:sum \
	--accumulate-attribute=us-senate-wil:sum \
	--accumulate-attribute=us-senate-votes:sum \
	--force \
	-L precincts:$< -o $@

# Removing rivers from precinct boundaries to improve display
data/precincts/il-no-water.geojson: data/osm/gis_osm_water_a_free_1.shp
	npx mapshaper -i $< -filter '["river", "riverbank"].includes(fclass)' -o $@

data/osm/gis_osm_water_a_free_1.shp: data/osm/illinois-latest-free.shp.zip
	unzip -u $< -d $(dir $@)

data/osm/illinois-latest-free.shp.zip:
	wget -O $@ http://download.geofabrik.de/north-america/us/illinois-latest-free.shp.zip

data/precincts/il.geojson:
	wget -O $@ https://raw.githubusercontent.com/pjsier/il-2020-election-precinct-data/main/output/il.geojson
